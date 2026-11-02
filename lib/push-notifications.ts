import webPush from "web-push";

import { database } from "@/lib/auth";

let schemaPromise: Promise<void> | null = null;
let webPushConfigured = false;

export function ensurePushNotificationSchema() {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            await database.query(`
                    CREATE TABLE IF NOT EXISTS push_subscription (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL
                            REFERENCES "user"(id)
                            ON DELETE CASCADE,
                        endpoint TEXT NOT NULL UNIQUE,
                        p256dh TEXT NOT NULL,
                        auth TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL
                            DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL
                            DEFAULT NOW()
                    )
                `);

                await database.query(`
                    CREATE INDEX IF NOT EXISTS
                        push_subscription_user_id_idx
                    ON push_subscription (user_id)
                `);
        })().catch((err) => {
            schemaPromise = null;
            throw err;
        });
    }

    return schemaPromise;
}

function configureWebPush() {
    if (webPushConfigured) {
        return;
    }

    const publicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
        process.env.VAPID_PRIVATE_KEY;

    const subject =
        process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
        throw new Error(
            "The VAPID notification settings are missing.",
        );
    }

    webPush.setVapidDetails(
        subject,
        publicKey,
        privateKey,
    );

    webPushConfigured = true;
}

export type PushNotificationPayload = {
    title: string;
    body: string;
    url?: string;
    tag?: string;
};

type SubscriptionRow = {
    endpoint: string;
    p256dh: string;
    auth: string;
};

export async function sendPushToUser(
    userId: string,
    payload: PushNotificationPayload,
) {
    await ensurePushNotificationSchema();
    configureWebPush();

    const result = 
        await database.query<SubscriptionRow>(
            `
                SELECT endpoint, p256dh, auth
                FROM push_subscription
                WHERE user_id = $1
            `,
            [userId],
        );

    let sent = 0;
    let removed = 0;
    let failed = 0;

    await Promise.all(
        result.rows.map(async (subscription) => {
            try {
                await webPush.sendNotification(
                    {
                        endpoint:
                            subscription.endpoint,
                        keys: {
                            p256dh:
                                subscription.p256dh,
                            auth: subscription.auth,
                        },
                    },
                    JSON.stringify(payload),
                    {
                        TTL: 60 * 60,
                    },
                );

                sent += 1;
            } catch (error) {
                const statusCode =
                    error &&
                    typeof error == "object" && 
                    "statusCode" in error
                        ? Number(error.statusCode)
                        : undefined;
                
                if (
                    statusCode === 404 || 
                    statusCode === 410
                ) {
                    await database.query(
                        `
                            DELETE FROM push_subscription
                            WHERE endpoint = $1
                        `,
                        [subscription.endpoint],
                    );

                    removed += 1;
                    return;
                }

                failed += 1;

                console.error(
                    "Could not send push notification:",
                    statusCode ?? "unknown error",
                );
            }
        }),
    );

    return {
        sent, 
        removed,
        failed,
    };
}