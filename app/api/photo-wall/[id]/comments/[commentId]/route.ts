import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, database } from "@/lib/auth";
import { getRoles } from "@/lib/friends";
import {
    ensurePhotoWallSchema,
} from "@/lib/photo-wall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
    _request: Request,
    context: {
        params: Promise<{
            id: string;
            commentId: string;
        }>;
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

    const { id, commentId } = await context.params;

    const isAdmin = getRoles(
        session.user.role,
    ).includes("admin");

    const result = await database.query(
        `
            DELETE FROM photo_wall_comment
            WHERE id = $1
                AND photo_id = $2
                AND (
                    user_id = $3
                    OR $4::BOOLEAN = TRUE
                )
            RETURNING id
        `,
        [
            commentId, 
            id, 
            session.user.id,
            isAdmin,
        ],
    );

    if (!result.rows[0]) {
        return NextResponse.json(
            { error: "Comment not found " },
            { status: 404 },
        );
    }

    return NextResponse.json({ ok: true });
}