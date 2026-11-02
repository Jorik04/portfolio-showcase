import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import { ensureChatSchema } from "@/lib/chats";

type RegisterDeviceBody = {
    deviceId?: string;
    deviceName?: string;
    identityPublicKey?: string;
    signedPrekeyPublic?: string;
    signedPrekeySignature?: string;
};

function decodePublicKey(
    value: unknown,
    fieldName: string,
) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`${fieldName} is missing`);
    }

    const cleanedValue = value.trim();

    if (
        !/^[A-Za-z0-9+/]+={0,2}$/.test(cleanedValue)
    ) {
        throw new Error(
            `${fieldName} is not valid Base64.`,
        );
    }

    const decoded = Buffer.from(
        cleanedValue,
        "base64",
    );

    if (
        decoded.length < 16 ||
        decoded.length > 8192
    ) {
        throw new Error(
            `${fieldName} has an invalid size.`,
        );
    }

    return decoded;
}

export async function GET() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in."},
            { status: 401 },
        );
    }

    await ensureChatSchema();

    const result = await database.query<{
        id: string;
        device_name: string;
        created_at: Date;
        last_seen_at: Date;
    }>(
        `
            SELECT
                id,
                device_name,
                created_at,
                last_seen_at
            FROM chat_device
            WHERE user_id = $1
            ORDER BY created_at DESC
        `,
        [session.user.id],
    );

    return NextResponse.json({
        devices: result.rows.map((device) => ({
            id: device.id,
            deviceName: device.device_name,
            createdAt: 
                device.created_at.toISOString(),
            lastSeenAt:
                device.last_seen_at.toISOString(),
        })),
    });
}

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in."},
            { status: 401 },
        );
    }

    let body: RegisterDeviceBody;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON request."},
            { status: 400 },
        );
    }

    const deviceName =
        typeof body.deviceName === "string"
            ? body.deviceName.trim()
            : "";

    if (
        deviceName.length < 1 || 
        deviceName.length > 80  
    ) {
        return NextResponse.json(
            { error: "Device name must contain between 1 and 80 characters." },
            { status: 400 },
        );
    }

    let identityPublicKey: Buffer;
    let signedPrekeyPublic: Buffer;
    let signedPrekeySignature: Buffer;

    try {
        identityPublicKey = decodePublicKey(
            body.identityPublicKey,
            "identityPublicKey",
        );

        signedPrekeyPublic = decodePublicKey(
            body.signedPrekeyPublic,
            "signedPrekeyPublic"
        );
        
        signedPrekeySignature = decodePublicKey(
            body.signedPrekeySignature,
            "signedPrekeySignature",
        );
    } catch (error) {
        return NextResponse.json(
            { error: 
                error instanceof Error
                    ? error.message
                    : "Invalid public keys.",
            },
            {
                status: 400,
            },
        );
    }

    const deviceId = 
        typeof body.deviceId === "string" &&
        body.deviceId.trim().length > 0
            ? body.deviceId.trim()
            : randomUUID();
    
        if (
            deviceId.length > 100 || 
            !/^[A-Za-z0-9_-]+$/.test(deviceId)
        ) {
            return NextResponse.json(
                { error: "Invalid device ID."},
                { status: 400 },
            );
        }

        await ensureChatSchema();

        const client = await database.connect();

        try {
            await client.query("BEGIN");

            const existingDevice = 
                await client.query<{
                    user_id: string;
                }>(
                    `
                        SELECT user_id
                        FROM chat_device
                        WHERE id = $1
                        FOR UPDATE
                    `,
                    [deviceId],
                );

            if (
                existingDevice.rows.length > 0 &&
                existingDevice.rows[0].user_id !==
                    session.user.id
            ) {
                await client.query("ROLLBACK");

                return NextResponse.json(
                    { error: "This device ID is already registered." },
                    { status: 409 },
                );
            }

            const result = await client.query<{
                id: string;
                device_name: string;
                created_at: Date;
                last_seen_at: Date;
            }>(
                `
                    INSERT INTO chat_device (
                        id,
                        user_id,
                        device_name,
                        identity_public_key,
                        signed_prekey_public,
                        signed_prekey_signature,
                        last_seen_at
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        NOW()
                    )
                    ON CONFLICT (id)
                    DO UPDATE SET
                        device_name =
                            EXCLUDED.device_name,
                        identity_public_key =
                            EXCLUDED.identity_public_key,
                        signed_prekey_public =
                            EXCLUDED.signed_prekey_public,
                        signed_prekey_signature = 
                            EXCLUDED.signed_prekey_signature,
                        last_seen_at = NOW()
                    RETURNING
                        id,
                        device_name,
                        created_at,
                        last_seen_at
                `,
                [
                    deviceId,
                    session.user.id,
                    deviceName,
                    identityPublicKey,
                    signedPrekeyPublic,
                    signedPrekeySignature,
                ],
            );

            await client.query("COMMIT");

            const device = result.rows[0];

            return NextResponse.json(
                {
                    device: {
                        id: device.id,
                        deviceName: 
                            device.device_name,
                        createdAt: 
                            device.created_at.toISOString(),
                        lastSeenAt: 
                            device.last_seen_at.toISOString(),
                    },
                },
                {
                    status:
                        existingDevice.rows.length > 0
                            ? 200
                            : 201,
                },
            );
        } catch (error) {
            await client.query("ROLLBACK");

            console.error(
                "Failed to register chat device:",
                error,
            );

            return NextResponse.json(
                { error: "Could not register this device."},
                { status: 500 },
            );
        } finally {
            client.release();
        }
}

