import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import {
    getAccessiblePhoto,
} from "@/lib/photo-wall-access";
import {
    sendPushToUser,
} from "@/lib/push-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    context: {
        params: Promise<{ id: string }>;
    },
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const { id } = await context.params;

    const photo = await getAccessiblePhoto({
        photoId: id,
        userId: session.user.id,
        userRole: session.user.role,
    });

    if (!photo) {
        return NextResponse.json(
            { error: "Photo not found" },
            { status: 404 },
        );
    }

    if (photo.userId !== session.user.id) {
        return NextResponse.json(
            { error: "Only the photo owner can view its likes" },
            { status: 403 },
        );
    }

    const result = await database.query<{
        id: string;
        name: string;
        email: string;
        created_at: Date;
    }>(
        `
            SELECT
                account.id,
                account.name,
                account.email,
                photo_like.created_at
            FROM photo_wall_like photo_like
            JOIN "user" account
                ON account.id = photo_like.user_id
            WHERE photo_like.photo_id = $1
            ORDER BY photo_like.created_at DESC
        `,
        [id],
    );

    return NextResponse.json({
        likers: result.rows.map((liker) => ({
            id: liker.id,
            name: liker.name,
            email: liker.email,
            likedAt: liker.created_at,
        })),
    });
}

export async function POST(
    _request: Request,
    context: {
        params: Promise<{ id: string }>;
    },
) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const { id } = await context.params;

    const photo = await getAccessiblePhoto({
        photoId: id,
        userId: session.user.id,
        userRole: session.user.role,
    });

    if (!photo) {
        return NextResponse.json(
            { error: "Photo not found" },
            { status: 404 },
        );
    }

    const inserted = await database.query(
        `
            INSERT INTO photo_wall_like (
                photo_id,
                user_id
            )
            VALUES ($1, $2)
            ON CONFLICT (photo_id, user_id)
            DO NOTHING
            RETURNING photo_id
        `,
        [id, session.user.id],
    );

    const liked = Boolean(inserted.rows[0]);

    if (!liked) {
        await database.query(
            `
                DELETE FROM photo_wall_like
                WHERE photo_id = $1
                    AND user_id = $2
            `,
            [id, session.user.id],
        );
    }

    const countResult = await database.query<{
        count: string;
    }>(
        `
            SELECT COUNT(*)::TEXT AS count
            FROM photo_wall_like
            WHERE photo_id = $1
        `,
        [id]
    );

    if (
        liked &&
        photo.userId !== session.user.id
    ) {
        try {
            await sendPushToUser(
                photo.userId,
                {
                    title: "New photo like ❤️",
                    body: `${
                        session.user.name ||
                        session.user.email
                    } liked your photo.`,
                    url: "/",
                    tag:
                        `photo-like-${id}-${session.user.id}`,
                },
            );
        } catch (error) {
            console.error(
                "The photo was liked, but its notification failed:",
                error,
            );
        }
    }

    return NextResponse.json({
        liked,
        likeCount: Number(
            countResult.rows[0]?.count ?? 0,
        ),
    });
}