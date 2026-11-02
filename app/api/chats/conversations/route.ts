import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import { ensureChatSchema } from "@/lib/chats";
import { ensureFriendsSchema } from "@/lib/friends";

export const dynamic = "force-dynamic";

async function getSession() {
    return auth.api.getSession({
        headers: await headers(),
    });
}

function createPairKey(
    firstUserId: string,
    secondUserId: string,
) {
    return [firstUserId, secondUserId]
        .sort()
        .join(":");
}

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in." },
            { status: 401 },
        );
    }

    try {
        await Promise.all([
            ensureChatSchema(),
            ensureFriendsSchema(),
        ]);

        const conversations = 
            await database.query<{
                id: string;
                created_at: Date;
                friend_id: string;
                friend_name: string;
                friend_email: string;
                device_count: number;
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
                            AS friend_email,
                        
                        COUNT (
                            DISTINCT friend_device.id
                        )::INTEGER
                            AS device_count
                    
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

                    LEFT JOIN chat_device
                        AS friend_device
                        ON friend_device.user_id = 
                            friend_user.id
                    
                    GROUP BY 
                        conversation.id,
                        conversation.created_at,
                        friend_user.id,
                        friend_user.name,
                        friend_user.email

                    ORDER BY 
                        conversation.created_at DESC
                `,
                [session.user.id],
            );
        
        const friends =
            await database.query<{
                id: string;
                name: string;
                email: string;
                device_count: number;
                conversation_id: string | null;
            }>(
                `
                    SELECT
                        friend_user.id,
                        friend_user.name,
                        friend_user.email,

                        (
                            SELECT
                                COUNT(*)::INTEGER
                            FROM chat_device
                                AS device
                            WHERE device.user_id =
                                friend_user.id
                        ) AS device_count,

                        conversation.id
                            AS conversation_id
                    
                    FROM friendship
                        AS friend

                    JOIN "user"
                        AS friend_user
                        ON friend_user.id =
                            CASE
                                WHEN friend.requester_id = $1
                                    THEN friend.addressee_id
                                ELSE friend.requester_id
                            END
                    
                    LEFT JOIN chat_conversation
                        AS conversation
                        ON conversation.direct_pair_key =
                            LEAST(
                            $1::TEXT,
                            friend_user.id
                            )
                            || ':' || 
                            GREATEST(
                                $1::TEXT,
                                friend_user.id
                            )
                    WHERE friend.status = 'accepted'
                        AND (
                            friend.requester_id = $1
                            OR friend.addressee_id = $1
                        )
                    
                    ORDER BY
                        LOWER(friend_user.name),
                        LOWER(friend_user.email)

                `,
                [session.user.id],
            );

        return NextResponse.json({
            conversations:
                conversations.rows.map(
                    (conversation) => ({
                        id: conversation.id,

                        createdAt: 
                            conversation.created_at
                                .toISOString(),

                        friend: {
                            id: 
                                conversation.friend_id,

                            name: 
                                conversation.friend_name,

                            email:
                                conversation.friend_email,

                            deviceCount:
                                conversation.device_count,
                        },
                    }),
                ),
            
            friends: friends.rows.map(
                (friend) => ({
                    id: friend.id,
                    name: friend.name,
                    email: friend.email,

                    deviceCount: 
                        friend.device_count,

                    conversationId:
                        friend.conversation_id,

                    canMessage:
                        friend.device_count > 0,
                }),
            ),
            
        });
    } catch (error) {
        console.error(
            "Failed to load conversation.",
            error,
        );

        return NextResponse.json(
            { error: "Could not load conversations." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
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

    const friendId = 
        typeof body?.friendId === "string"
            ? body.friendId.trim()
            : "";

    if (
        !friendId ||
        friendId === session.user.id || 
        friendId.length > 100
    ) {
        return NextResponse.json(
            { error: "Invalid friend." },
            { status: 400 },
        );
    }

    try {
        await Promise.all([
            ensureChatSchema(),
            ensureFriendsSchema(),
        ]);

        const friendship = 
            await database.query<{
                id: string;
            }>(
                `
                    SELECT id
                    FROM friendship
                    WHERE status = 'accepted'
                        AND (
                            (
                                requester_id = $1
                                AND addressee_id = $2
                            )
                            OR
                            (
                                requester_id = $2
                                AND addressee_id = $1
                            )
                        )
                    LIMIT 1
                `,
                [
                    session.user.id,
                    friendId,
                ],
            );
        
        if (!friendship.rows[0]) {
            return NextResponse.json(
                { error: "You can only message accepted friends." },
                { status: 403 },
            );
        }

        const friend = 
            await database.query<{
                id: string;
                name: string;
                email: string;
                device_count: number;
            }>(
                `
                    SELECT
                        user_account.id,
                        user_account.name,
                        user_account.email,

                        COUNT(
                            chat_device.id
                        )::INTEGER AS device_count
                    
                    FROM "user"
                        AS user_account

                    LEFT JOIN chat_device
                        ON chat_device.user_id = 
                            user_account.id
                    
                    WHERE user_account.id = $1

                    GROUP BY
                        user_account.id,
                        user_account.name,
                        user_account.email
                `,
                [friendId],
            );
        
        if (!friend.rows[0]) {
            return NextResponse.json(
                { error: "Friend not found." },
                { status: 404 },
            );
        }

        const pairKey = createPairKey(
            session.user.id,
            friendId,
        );

        const client = await database.connect();

        try {
            await client.query("BEGIN");

            const conversationResult = 
                await client.query<{
                    id: string;
                    created_at: Date;
                }>(
                    `
                        INSERT INTO chat_conversation (
                            id,
                            direct_pair_key
                        )
                        VALUES ($1, $2)

                        ON CONFLICT (direct_pair_key)
                        DO UPDATE SET
                            direct_pair_key = 
                                EXCLUDED.direct_pair_key

                        RETURNING
                            id,
                            created_at
                    `,
                    [
                        randomUUID(),
                        pairKey,
                    ],
                );

            const conversation =
                conversationResult.rows[0];

            await client.query(
                `
                    INSERT INTO
                        chat_conversation_member (
                            conversation_id,
                            user_id
                        )
                    VALUES
                        ($1, $2),
                        ($1, $3)

                    ON CONFLICT (
                        conversation_id,
                        user_id
                    )
                    DO NOTHING
                `,
                [
                    conversation.id,
                    session.user.id,
                    friendId,
                ],
            );

            await client.query("COMMIT");

            const friendAccount = friend.rows[0];

            return NextResponse.json(
                {
                    conversation: {
                        id: conversation.id,

                        createdAt: 
                            conversation.created_at
                                .toISOString(),
                            
                        friend: {
                            id: 
                                friendAccount.id,
                            
                            name:
                                friendAccount.name,

                            email:
                                friendAccount.email,

                            deviceCount: 
                                friendAccount.device_count,
                        },
                    },
                },
                {
                    status: 201,
                },
            );
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error(
            "Failed to create conversation:",
            error,
        );

        return NextResponse.json(
            { error: "Could not create conversation."},
            { status: 500 },
        );
    }
}