import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth, database } from "@/lib/auth";
import {
    cleanupExpiredPhotos,
    getPhotoFilePath,
} from "@/lib/photo-wall";
import {
    ensureFriendsSchema,
    getRoles,
} from "@/lib/friends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImageRow = {
    stored_filename: string;
    mime_type: string;
};

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

    //await ensurePhotoWallSchema();
    await cleanupExpiredPhotos();

    const { id } = await context.params;

    await ensureFriendsSchema();

    const isAdmin = getRoles(
        session.user.role,
    ).includes("admin");

    const result = await database.query<ImageRow>(
        `
            SELECT photo.stored_filename, photo.mime_type
            FROM photo_wall_photo photo
            WHERE photo.id = $1
                AND photo.expires_at > NOW()
                AND (
                    $3::BOOLEAN = TRUE
                    OR photo.user_id = $2
                    OR photo.visibility = 'everyone'
                    OR EXISTS (
                        SELECT 1
                        FROM friendship friend
                        WHERE friend.status = 'accepted'
                            AND (
                                (
                                    friend.requester_id = $2
                                    AND friend.addressee_id = photo.user_id
                                )
                                OR
                                (
                                    friend.addressee_id = $2
                                    AND friend.requester_id = photo.user_id
                                )
                            )
                    )
                )
            LIMIT 1
        `,
        [id, session.user.id, isAdmin],
    );

    const photo = result.rows[0];

    if (!photo) {
        return NextResponse.json(
            { error: "Photo not found" },
            { status: 404 },
        );
    }

    try {
        const bytes = await readFile(
            getPhotoFilePath(
                photo.stored_filename,
            ),
        );

        return new Response(
            new Uint8Array(bytes),
            {
                status: 200,
                headers: {
                    "Content-Type":
                        photo.mime_type,
                    "Content-Length":
                        String(bytes.length),
                    "Cache-Control":
                        "private, max-age=60",
                    "X-Content-Type-Options":
                        "nosniff",
                },
            },
        );
    } catch {
        return NextResponse.json(
            { error: "Photo file not found" },
            { status: 404 },
        );
    }
}