import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import { ensureChatSchema } from "@/lib/chats";

export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

function bufferToBase64(value: Buffer) {
    return value.toString("base64");
}

export async function GET(
    _request: Request,
    context: RouteContext,
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in." },
            { status: 401 },
        );
    }

    const { id } = await context.params;

    if (!id || id.length > 100) {
        return NextResponse.json(
            { error: "Invalid conversation." },
            { status: 400 },
        );
    }

    try {
        await ensureChatSchema();

        const conversationResult =
            await database.query<{
                id: string;
                created_at: Date;
                friend_id: string;
                friend_name: string;
                friend_email: string;
            }>(
                `
                    SELECT
                        conversation.id,
                        conversation.created_at,

                        friend_user.id
                            AS friend_id,

                        friend_user.name 
                            AS friend_name,

                        friend_user.email
                            AS friend_email
                    
                    FROM chat_conversation
                        AS conversation

                    JOIN chat_conversation_member
                        AS my_membership
                        ON my_membership.conversation_id =
                            conversation.id
                        AND my_membership.user_id = $1
                    
                    JOIN chat_conversation_member
                        AS friend_membership
                        ON friend_membership.conversation_id =
                            conversation.id
                        AND friend_membership.user_id <> $1
                    
                    JOIN "user"
                        AS friend_user
                        ON friend_user.id =
                            friend_membership.user_id
                    
                    WHERE conversation.id = $2
                    LIMIT 1
                `,
                [session.user.id, id],
            );
        const conversation = 
            conversationResult.rows[0];

        if (!conversation) {
            return NextResponse.json(
                { error: "Conversation not found." },
                { status: 404 },
            );
        }

        const devices = 
            await database.query<{
                id: string;
                device_name: string;
                identity_public_key: Buffer;
                signed_prekey_public: Buffer;
                signed_prekey_signature: Buffer;
                last_seen_at: Date;
            }>(
                `
                    SELECT
                        id,
                        device_name,
                        identity_public_key,
                        signed_prekey_public,
                        signed_prekey_signature,
                        last_seen_at
                    
                    FROM chat_device
                    WHERE user_id = $1
                    ORDER BY created_at ASC
                `,
                [conversation.friend_id],
            );

        return NextResponse.json({
            conversation: {
                id: conversation.id,

                createdAt:
                    conversation.created_at
                        .toISOString(),

                friend: {
                    id: conversation.friend_id,
                    name: conversation.friend_name,
                    email: conversation.friend_email,
                },
            },

            devices: devices.rows.map(
                (device) => ({
                    id: device.id,

                    deviceName: device.device_name,

                    identityPublicKey:
                        bufferToBase64(device.identity_public_key),

                    signedPrekeyPublic:
                        bufferToBase64(device.signed_prekey_public),

                    signedPrekeySignature: 
                        bufferToBase64(device.signed_prekey_signature),

                    lastSeenAt:
                        device.last_seen_at
                            .toISOString(),
                }),
            ),
        });
    } catch (error) {
        console.error(
            "Failed to load conversation:",
            error,
        );

        return NextResponse.json(
            { error: "Could not load conversation." },
            { status: 500 },
        );
    }
}