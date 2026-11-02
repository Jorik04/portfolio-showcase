import { randomUUID } from "crypto";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import { getRoles } from "@/lib/friends";
import {
    MAX_COMMENT_LENGTH,
} from "@/lib/photo-wall";
import {
    getAccessiblePhoto,
} from "@/lib/photo-wall-access";
import {
    sendPushToUser,
} from "@/lib/push-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CommentRow = {
    id: string;
    user_id: string;
    author_name: string;
    body: string;
    created_at: Date;
}

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

    const isAdmin = getRoles(
        session.user.role,
    ).includes("admin");

    const result = await database.query<CommentRow>(
        `
            SELECT
                comment.id,
                comment.user_id,
                account.name AS author_name,
                comment.body,
                comment.created_at
            FROM photo_wall_comment comment
            JOIN "user" account
                ON account.id = comment.user_id
            WHERE comment.photo_id = $1
            ORDER BY comment.created_at ASC
            LIMIT 100
        `,
        [id],
    );

    return NextResponse.json({
        comments: result.rows.map((comment) => ({
            id: comment.id,
            userId: comment.user_id,
            authorName: comment.author_name,
            body: comment.body,
            createdAt: comment.created_at,
            canDelete: 
                isAdmin ||
                comment.user_id === session.user.id,
        })),
    });
}

export async function POST(
    request: Request,
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

    const requestBody = await request
        .json()
        .catch(() => null);

    const body = 
        typeof requestBody?.body === "string"
        ? requestBody.body.trim()
        : "";

    if (
        body.length === 0 ||
        body.length > MAX_COMMENT_LENGTH
    ) {
        return NextResponse.json(
            { error: `Comments must be between 1 and ${MAX_COMMENT_LENGTH} characters.`},
            { status: 400 },
        );
    }

    const commentId = randomUUID();

    const result = await database.query<CommentRow>(
        `
            INSERT INTO photo_wall_comment (
                id,
                photo_id,
                user_id,
                body,
                created_at
            )
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING
                    id,
                    user_id,
                    $5::TEXT AS author_name,
                    body,
                    created_at
        `,
        [
            commentId,
            id,
            session.user.id,
            body,
            session.user.name ||
                session.user.email,
        ],
    );

    const comment = result.rows[0];

    if (photo.userId !== session.user.id) {
        try {
            await sendPushToUser(
                photo.userId,
                {
                    title: "New photo comment 💬",
                    body: `${
                        session.user.name ||
                        session.user.email
                    }: ${body.slice(0, 120)}`,
                    url: "/",
                    tag: `photo-comment-${commentId}`,
                },
            );
        } catch (error) {
            console.error(
                "The comment was posted, but its notification failed:",
                error,
            );
        }
    }

    return NextResponse.json(
        {
            comment: {
                id: comment.id,
                userId: comment.user_id,
                authorName: comment.author_name,
                body: comment.body,
                createdAt: comment.created_at,
                canDelete: true,
            },
        },
        { status: 201 },
    );
}