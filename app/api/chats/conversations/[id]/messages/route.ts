import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import { ensureChatSchema } from "@/lib/chats";
import { sendPushToUser } from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

type MessageEnvelope = {
    recipientDeviceId?: string;
    encryptedPayload?: string;
    protocolHeader?: Record<string, unknown>;
};

type SendMessageBody = {
    senderDeviceId?: string;
    envelopes?: MessageEnvelope[];
};

function isValidId(value: unknown) : value is string {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= 100 &&
        /^[A-Za-z0-9_-]+$/.test(value)
    );
}

function decodePayload(value: unknown) {
    if (
        typeof value !== "string" ||
        value.length === 0 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(value)
    ) {
        throw new Error("Invalid encrypted payload.");
    }

    const payload = Buffer.from(value, "base64");

    if (
        payload.length === 0 ||
        payload.length > 250 * 1024
    ) {
        throw new Error("Encrypted payload is too large.");

    }

    return payload;
}

function validateProtocolHeader(value: unknown) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new Error("Invalid protocol header.");
    }

    const size = Buffer.byteLength(
        JSON.stringify(value),
        "utf8",
    );

    if (size > 16 * 1024) {
        throw new Error("Protocol header is too large.");
    }

    return value as Record<string, unknown>;
}

async function getSession() {
    return auth.api.getSession({
        headers: await headers(),
    });
}

export async function GET(
    request: Request,
    context: RouteContext,
) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const { id: conversationId } =
        await context.params;

    const url = new URL(request.url);

    const deviceId = 
        url.searchParams.get("deviceId");

    if (
        !isValidId(conversationId) || 
        !isValidId(deviceId)
    ) {
        return NextResponse.json(
            { error: "Invalid conversation or deivce."},
            { status: 400 },
        );
    }

    try {
        await ensureChatSchema();

        const access =
            await database.query(
                `
                    SELECT 1
                    FROM chat_conversation_member
                        AS member
                    
                    JOIN chat_device
                        AS device
                        ON device.user_id =
                            member.user_id

                    WHERE member.conversation_id = $1
                        AND member.user_id = $2
                        AND device.id = $3
                    
                    LIMIT 1
                `,
                [
                    conversationId,
                    session.user.id,
                    deviceId,
                ],
            );
        
        if (!access.rows[0]) {
            return NextResponse.json(
                { error: "You cannot access this conversation." },
                { status: 403 },
            );
        }

        const result = 
            await database.query<{
                id: string;
                sender_user_id: string;
                sender_device_id: string;
                sender_name: string;
                encrypted_payload: Buffer;
                protocol_header: Record<string, unknown>;
                created_at: Date;
                delivered_at: Date | null;
                read_at: Date | null;
                sender_identity_public_key: Buffer;
            }>(
                `
                    SELECT
                        message.id,
                        message.sender_user_id,
                        message.sender_device_id,
                        sender.name AS sender_name,
                        message.encrypted_payload,
                        message.protocol_header,
                        message.created_at,
                        message.delivered_at,
                        message.read_at,
                        sender_device.identity_public_key
                            AS sender_identity_public_key
                    
                    FROM chat_message AS message 

                    JOIN "user" AS sender
                        ON sender.id =
                            message.sender_user_id

                    JOIN chat_device AS sender_device
                        ON sender_device.id =
                            message.sender_device_id
                        AND sender_device.user_id = 
                            message.sender_user_id
                    
                    WHERE message.conversation_id = $1
                        AND message.recipient_device_id = $2

                    ORDER BY message.created_at ASC
                    LIMIT 200
                `,
                [
                    conversationId,
                    deviceId,
                ],
            );
        
        return NextResponse.json({
            messages: result.rows.map(
                (message) => ({
                    id:message.id,

                    senderUserId: message.sender_user_id,

                    senderDeviceId: message.sender_device_id,

                    senderName: message.sender_name,

                    encryptedPayload: message.encrypted_payload.toString ("base64"),

                    protocolHeader: message.protocol_header,

                    createdAt: message.created_at.toISOString(),

                    deliveredAt: message.delivered_at?.toISOString() ?? null,

                    readAt: message.read_at?.toISOString() ?? null,

                    senderIdentityPublicKey:
                        message.sender_identity_public_key
                            .toString("base64"),
                }),
            ),
        });
    } catch (error) {
        console.error(
            "Failed to load messages:",
            error,
        );

        return NextResponse.json(
            { error: "Could not load messages." },
            { status: 500 },
        );
    }
}

export async function POST(
    request: Request,
    context: RouteContext,
) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const { id: conversationId } =
        await context.params;

    if (!isValidId(conversationId)) {
        return NextResponse.json(
            { error: "Invalid conversation." },
            { status: 400 },
        );
    }

    const body = 
        (await request
            .json()
            .catch(() => null)) as
            | SendMessageBody
            | null;

    if (
        !body ||
        !isValidId(body.senderDeviceId) || 
        !Array.isArray(body.envelopes) ||
        body.envelopes.length === 0 ||
        body.envelopes.length > 20
    ) {
        return NextResponse.json(
            { error: "Invalid message request." },
            { status: 400 },
        );
    }

    try {
        const envelopes = body.envelopes.map(
            (envelope) => {
                if (
                    !isValidId(envelope.recipientDeviceId)
                ) {
                    throw new Error("Invalid recipient device.");
                }

                return {
                    recipientDeviceId: envelope.recipientDeviceId,

                    encryptedPayload: decodePayload(envelope.encryptedPayload),

                    protocolHeader: validateProtocolHeader(envelope.protocolHeader),
                };
            },
        );

        const recipientIds = [
            ...new Set(
                envelopes.map(
                    (envelope) => 
                        envelope.recipientDeviceId,
                ),
            ),
        ];

        if (recipientIds.length !== envelopes.length) {
            return NextResponse.json(
                { error: "Duplicate recipient device." },
                { status: 400 },
            );
        }

        await ensureChatSchema();

        const client = 
            await database.connect();

        try {
            await client.query("BEGIN");

            const senderAccess =
                await client.query(
                    `
                        SELECT 1

                        FROM chat_conversation_member
                            AS member

                        JOIN chat_device
                            AS device
                            ON device.user_id =
                                member.user_id

                        WHERE member.conversation_id = $1
                            AND member.user_id = $2
                            AND device.id = $3

                        LIMIT 1
                    `,
                    [
                        conversationId,
                        session.user.id,
                        body.senderDeviceId,
                    ],
                );

            if (!senderAccess.rows[0]) {
                await client.query("ROLLBACK");

                return NextResponse.json(
                    { error: "Invalid sending device." },
                    { status: 403 },
                );
            }

            const recipients =
                await client.query<{
                    id: string;
                    user_id: string;
                }>(
                    `
                        SELECT device.id, device.user_id

                        FROM chat_device AS device

                        JOIN chat_conversation_member
                            AS member
                            ON member.user_id = 
                                device.user_id

                        WHERE member.conversation_id = $1
                            AND device.id =
                                ANY($2::TEXT[])
                    `,
                    [
                        conversationId,
                        recipientIds,
                    ],
                );

            if (
                recipients.rows.length !==
                recipientIds.length
            ) {
                await client.query("ROLLBACK");

                return NextResponse.json(
                    { error: "A recipient device is not part of this conversation." },
                    { status: 403 },
                );
            }

            const recipientUserIds = [
                ...new Set(
                    recipients.rows
                        .map((recipient) => recipient.user_id)
                        .filter(
                            (userId) => 
                                userId !== session.user.id,
                        ),
                ),
            ];

            const messageIds: string[] = [];

            for (const envelope of envelopes) {
                const messageId = 
                    randomUUID();

                await client.query(
                    `
                        INSERT INTO chat_message (
                            id,
                            conversation_id,
                            sender_user_id,
                            sender_device_id,
                            recipient_device_id,
                            encrypted_payload,
                            protocol_header
                        )
                        VALUES (
                            $1,
                            $2,
                            $3,
                            $4,
                            $5,
                            $6,
                            $7::JSONB
                        )
                    `,
                    [
                        messageId,
                        conversationId,
                        session.user.id,
                        body.senderDeviceId,
                        envelope.recipientDeviceId,
                        envelope.encryptedPayload,
                        JSON.stringify(
                            envelope.protocolHeader,
                        ),
                    ],
                );

                messageIds.push(messageId);
            }

            await client.query("COMMIT");

            const pushResults = await Promise.allSettled(
                recipientUserIds.map((userId) =>
                    sendPushToUser(userId, {
                        title: `New chat from ${session.user.name} 💬`,
                        body: "Tap to open the conversation.",
                        url: `/chats/${conversationId}`,
                        tag: `chat-${conversationId}`,
                    }),
                ),
            );

            for (const result of pushResults) {
                if (result.status === "rejected") {
                    console.error(
                        "The message was saved, but its notification failed:",
                        result.reason,
                    );
                }
            }

            return NextResponse.json(
                { messageIds },
                { status: 201 },
            );
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally { 
            client.release();
        }
    } catch (error) {
        console.error(
            "Failed to send encrypted message.",
            error,
        );

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Could not send message.",
            },
            { status: 400 },
        );
    }
        
}