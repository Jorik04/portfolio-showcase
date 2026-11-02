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
        headers: await headers(),
    });
}

export async function PATCH(
    _request: Request,
    context: {
        params: Promise<{ id: string }>;
    },
) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    await ensureFriendsSchema();

    const { id } = await context.params;

    const result = await database.query(
        `
            UPDATE friendship
            SET 
                status = 'accepted',
                responded_at = NOW()
            WHERE id = $1
                AND addressee_id = $2
                AND status = 'pending'
            RETURNING id, requester_id
        `,
        [id, session.user.id],
    );

    const acceptedFriendship = result.rows[0];

    if (!acceptedFriendship) {
        return NextResponse.json(
            { error: "Request not found" },
            { status: 404 },
        );
    }

    try {
        await sendPushToUser(
            acceptedFriendship.requester_id,
            {
                title: "Friend request accepted 🎉",
                body: `${
                    session.user.name ||
                    session.user.email
                } accepted your friend request.`,
                url: "/profile",
                tag: `friend-accepted-${acceptedFriendship.id},`
            },
        );
    } catch (error) {
        console.error(
            "The request was accepted, but its notification failed:",
            error,
        );
    }

    return NextResponse.json({ ok: true });
}

export async function DELETE(
    _request: Request,
    context: {
        params: Promise<{ id: string }>;
    },
) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    await ensureFriendsSchema();

    const { id } = await context.params;

    const result = await database.query(
        `
            DELETE FROM friendship
            WHERE id = $1
                AND (
                    requester_id = $2
                    OR addressee_id = $2
                )
            RETURNING id
        `,
        [id, session.user.id],
    );

    if (!result.rows[0]) {
        return NextResponse.json(
            { error: "Friendship not found" },
            { status: 404 },
        );
    }

    return NextResponse.json({ ok: true });
}