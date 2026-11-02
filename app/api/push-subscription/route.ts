import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import {
    ensurePushNotificationSchema
} from "@/lib/push-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSession() {
    return auth.api.getSession({
        headers: await headers(),
    });
}

type SubscriptionBody = {
    endpoint?: unknown;
    keys?: {
        p256dh?: unknown;
        auth?: unknown;
    };
};

function validateSubscription(
    body: SubscriptionBody | null,
) {
    const endpoint = 
        typeof body?.endpoint === "string"
            ? body.endpoint
            : "";
    
    const p256dh =
        typeof body?.keys?.p256dh === "string"
            ? body.keys.p256dh
            : "";

    const authKey =
        typeof body?.keys?.auth === "string"
            ? body.keys.auth
            : "";
    
    if (
        !endpoint ||
        !p256dh ||
        !authKey ||
        endpoint.length > 4096 ||
        p256dh.length > 2048 ||
        authKey.length > 2048
    ) {
        return null;
    }

    try {
        const url = new URL(endpoint);

        if (url.protocol !== "https:") {
            return null;
        }
    } catch {
        return null;
    }

    return {
        endpoint,
        p256dh,
        authKey,
    };
}

export async function POST(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const body = 
        (await request
            .json()
            .catch(() => null)) as 
            | SubscriptionBody
            | null;

    const subscription = 
        validateSubscription(body);

    if (!subscription) {
        return NextResponse.json(
            { error: "Invalid push subscription" },
            { status: 400 },
        );
    }

    await ensurePushNotificationSchema();

    await database.query(
        `
            INSERT INTO push_subscription (
                id,
                user_id,
                endpoint,
                p256dh,
                auth,
                created_at,
                updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5,
                NOW(), NOW()
            )
            ON CONFLICT (endpoint)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                updated_at = NOW()
        `,
        [
            randomUUID(),
            session.user.id,
            subscription.endpoint,
            subscription.p256dh,
            subscription.authKey,
        ],
    );

    return NextResponse.json(
        { ok: true },
        { status: 201 },
    );
}

export async function DELETE(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const body = await request
        .json()
        .catch(() => null);

    const endpoint = 
        typeof body?.endpoint === "string"
            ? body.endpoint
            : "";

    if (!endpoint || endpoint.length > 4096) {
        return NextResponse.json(
            { error: "Invalid endpoint" },
            { status: 400 },
        );
    }

    await ensurePushNotificationSchema();

    await database.query(
        `
            DELETE FROM push_subscription
            WHERE endpoint = $1
                AND user_id = $2
        `,
        [endpoint, session.user.id],
    );

    return NextResponse.json({ ok: true });
}
