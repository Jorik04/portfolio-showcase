import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import { ensureFriendsSchema } from "@/lib/friends";

import {
    sendPushToUser
} from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

async function getSession() {
    return auth.api.getSession({
        headers: await headers()
    });
}

export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    await ensureFriendsSchema();

    const search = new URL(request.url).searchParams
        .get("search")
        ?.trim()
        .slice(0, 100) ?? "";

    const [friends, incoming, outgoing] = await Promise.all([
        database.query(
            `
                SELECT
                    f.id AS friendship_id,
                    u.id,
                    u.name,
                    u.email
                FROM friendship f
                JOIN "user" u
                    ON u.id = CASE
                        WHEN f.requester_id = $1
                            THEN f.addressee_id
                        ELSE f.requester_id
                    END
                WHERE f.status = 'accepted'
                    AND (
                        f.requester_id = $1
                        OR f.addressee_id = $1
                    )
                ORDER BY LOWER(u.name), LOWER(u.email)
            `,
            [session.user.id],
        ),
        
        database.query(
            `
                SELECT 
                    f.id AS friendship_id,
                    u.id, 
                    u.name,
                    u.email
                FROM friendship f
                JOIN "user" u
                    ON u.id = f.requester_id
                WHERE f.addressee_id = $1
                    AND f.status = 'pending'
                ORDER BY f.created_at DESC
            `,
            [session.user.id],
        ),

        database.query(
            `
                SELECT
                    f.id AS friendship_id,
                    u.id,
                    u.name,
                    u.email
                FROM friendship f
                JOIN "user" u
                    ON u.id = f.addressee_id
                WHERE f.requester_id = $1
                    AND f.status = 'pending'
                ORDER BY f.created_at DESC
            `,
            [session.user.id],
        ),
    ]);

    let users: unknown[] = [];

    if (search.length >= 2) {
        const result = await database.query(
            `
                SELECT id, name, email
                FROM "user"
                WHERE id <> $1
                    AND (
                        name ILIKE $2
                        OR email ILIKE $2
                    )
                ORDER BY LOWER(name), LOWER(email)
                LIMIT 20
            `,
            [session.user.id, `%${search}%`],
        );

        users = result.rows;
    }

    return NextResponse.json({
        friends: friends.rows,
        incoming: incoming.rows,
        outgoing: outgoing.rows,
        users,
    });
}

export async function POST(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    await ensureFriendsSchema();

    const body = await request.json().catch(() => null);
    const addresseeId = 
        typeof body?.addresseeId === "string"
            ? body.addresseeId
            : "";

    if (
        !addresseeId ||
        addresseeId === session.user.id
    ) {
        return NextResponse.json(
            { error: "Invalid user" },
            { status: 400 },
        );
    }

    const userExists = await database.query(
        `
            SELECT id
            FROM "user"
            WHERE id = $1
            LIMIT 1
        `,
        [addresseeId],
    );

    if (!userExists.rows[0]) {
        return NextResponse.json(
            { error: "User not found" },
            { status: 404 },
        );
    }

    try {
        await database.query(
            `
                INSERT INTO friendship (
                    id,
                    requester_id,
                    addressee_id,
                    status
                )
                VALUES ($1, $2, $3, 'pending')
            `,
            [
                randomUUID(),
                session.user.id,
                addresseeId,
            ],
        );
    } catch (err) {
        const code = 
            err &&
            typeof err === "object" &&
            "code" in err
                ? err.code
                : undefined;
        
        if (code === "23505") {
            return NextResponse.json(
                {
                    error: 
                        "A friendship or request already exists.",
                },
                { status: 409 },
            );
        }

        throw err;
    }

    try {
        await sendPushToUser(
            addresseeId,
            {
                title: "New friend request 👋",
                body: `${
                    session.user.name ||
                    session.user.email
                } sent you a friend request.`,
                url: "/profile",
                tag: `friend-request-${session.user.id}`,
            },
        );
    } catch (error) {
        console.error(
            "The friend request was created but its notification failed:",
            error,
        );
    }

    return NextResponse.json(
        { ok: true },
        { status: 201 },
    );
}