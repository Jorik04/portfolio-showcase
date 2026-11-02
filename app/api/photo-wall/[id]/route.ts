import { unlink } from "node:fs/promises";

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth, database } from "@/lib/auth";
import {
    cleanupExpiredPhotos,
    ensurePhotoWallSchema,
    getPhotoFilePath,
} from "@/lib/photo-wall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeleteRow = {
    user_id: string;
    stored_filename: string;
};

export async function DELETE(
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

    await ensurePhotoWallSchema();
    await cleanupExpiredPhotos();

    const { id } = await context.params;

    const result = await database.query<DeleteRow>(
        `
            SELECT user_id, stored_filename
            FROM photo_wall_photo
            WHERE id = $1
                AND expires_at > NOW()
            LIMIT 1
        `,
        [id],
    );

    const photo = result.rows[0];

    if (!photo) {
        return NextResponse.json(
            { error: "Photo not found" },
            { status: 404 },
        );
    }

    const roles = 
        session.user.role
        ?.split(",")
        .map((role) => role.trim()) ?? [];
    

    const canDelete = 
        roles.includes("admin") ||
        photo.user_id === session.user.id;
    
    if (!canDelete) {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 },
        );
    }

    await database.query(
        `
            DELETE FROM photo_wall_photo
            WHERE id = $1
        `,
        [id],
    );

    await unlink(
        getPhotoFilePath(photo.stored_filename),
    ).catch(() => undefined);

    return NextResponse.json({
        ok: true,
    });
}

