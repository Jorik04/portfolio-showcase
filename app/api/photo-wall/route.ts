import path from "node:path";
import { randomUUID } from "node:crypto";
import {
    unlink,
    writeFile,
} from "node:fs/promises";

import {
    sendPushToUser,
} from "@/lib/push-notifications";

import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth, database } from "@/lib/auth";
import { ensureFriendsSchema } from "@/lib/friends";

import {
    cleanupExpiredPhotos,
    detectImageType,
    ensurePhotoWallDirectory,
    ensurePhotoWallSchema,
    getPhotoFilePath,
    MAX_ACTIVE_PHOTOS_PER_USER,
    MAX_PHOTO_SIZE,
    PHOTO_LIFETIME,
} from "@/lib/photo-wall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PhotoRow = {
    id: string;
    user_id: string;
    uploader_name: string;
    caption: string;
    mime_type: string;
    created_at: Date;
    expires_at: Date;
    visibility: "everyone" | "friends";
    like_count?: number | string;
    liked_by_me?: boolean;
    comment_count?: number | string;
};

async function getSession() {
    return auth.api.getSession({
        headers: await headers(),
    });
}

function getRoles(role: string | null | undefined) {
    return (
        role
            ?.split(",")
            .map((item) => item.trim())
            .filter(Boolean) ?? []
    );
}

function serializePhoto(
    photo: PhotoRow,
    currentUserId: string,
    isAdmin: boolean,
) {
    return {
        id: photo.id,
        uploaderName: photo.uploader_name,
        caption: photo.caption,
        mimeType: photo.mime_type,
        createdAt: photo.created_at,
        expiresAt: photo.expires_at,
        imageUrl: `/api/photo-wall/${photo.id}/image`,
        canDelete:
            isAdmin ||
            photo.user_id === currentUserId,
        visibility: photo.visibility,
        likeCount: Number(photo.like_count ?? 0),
        likedByMe: Boolean(photo.liked_by_me),
        commentCount: Number(
            photo.comment_count ?? 0,
        ),
        isOwner: photo.user_id === currentUserId,
    };
}

type NotificationRecipient = {
    id: string;
};

async function notifyPhotoRecipients({
    uploaderId,
    uploaderName,
    photoId,
    caption,
    visibility,
}: {
    uploaderId: string;
    uploaderName: string;
    photoId: string;
    caption: string;
    visibility: "everyone" | "friends";
}) {
    await ensureFriendsSchema();

    const recipients = 
        await database.query<NotificationRecipient>(
            `
                SELECT DISTINCT recipient.id
                FROM "user" recipient
                WHERE recipient.id <> $1
                    AND (
                        $2::TEXT = 'everyone'
                        OR EXISTS (
                            SELECT 1
                            FROM friendship friend
                            WHERE friend.status = 'accepted'
                                AND (
                                    (
                                        friend.requester_id = $1
                                        AND friend.addressee_id = recipient.id
                                    )
                                    OR
                                    (
                                        friend.addressee_id = $1
                                        AND friend.requester_id = recipient.id
                                    )
                                )
                        )
                    )
            `,
            [uploaderId, visibility],
        );
    
    const body = caption
        ? `${uploaderName}: ${caption}`
        : `${uploaderName} posted a new photo.`;

    const results = await Promise.allSettled(
        recipients.rows.map((recipient) =>
            sendPushToUser(recipient.id, {
                title: "New photo 📸",
                body,
                url: "/",
                tag: `photo-${photoId}`,
            }),
        ),
    );

    const failedCount = results.filter(
        (result) => result.status === "rejected",
    ).length;

    if (failedCount > 0) {
        console.error(
            `Photo ${photoId}: notifications failed for ${failedCount} users.`,
        );
    }
}

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    await ensurePhotoWallSchema();
    await cleanupExpiredPhotos();

    const roles = getRoles(session.user.role);
    const isAdmin = roles.includes("admin");

    await ensureFriendsSchema();

    const result = await database.query<PhotoRow>(`
        SELECT
            photo.id, 
            photo.user_id,
            photo.uploader_name,
            photo.caption,
            photo.mime_type,
            photo.created_at,
            photo.expires_at,
            photo.visibility,

            (
                SELECT COUNT(*)::INTEGER
                FROM photo_wall_like photo_like
                WHERE photo_like.photo_id = photo.id
            ) AS like_count,

            EXISTS (
                SELECT 1
                FROM photo_wall_like my_like
                WHERE my_like.photo_id = photo.id
                    AND my_like.user_id = $1
            ) AS liked_by_me,

            (
                SELECT COUNT(*)::INTEGER
                FROM photo_wall_comment comment
                WHERE comment.photo_id = photo.id
            ) AS comment_count

        FROM photo_wall_photo photo
        WHERE photo.expires_at > NOW()
            AND (
                $2::BOOLEAN = TRUE
                OR photo.user_id = $1
                OR photo.visibility = 'everyone'
                OR EXISTS (
                    SELECT 1
                    FROM friendship friend
                    WHERE friend.status = 'accepted'
                        AND (
                            (
                                friend.requester_id = $1
                                AND friend.addressee_id = photo.user_id
                            )
                            OR
                            (
                                friend.addressee_id = $1
                                AND friend.requester_id = photo.user_id
                            )
                        )
                )
            )
        ORDER BY photo.created_at DESC
        LIMIT 200
    `,
    [session.user.id, isAdmin],
);

    return NextResponse.json({
        photos: result.rows.map((photo) =>
            serializePhoto(
                photo,
                session.user.id,
                isAdmin
            ),
        ),
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

    const contentLength = Number(
        request.headers.get("content-length") ?? 0,
    );

    if (
        contentLength >
        MAX_PHOTO_SIZE + 512 * 1024
    ) {
        return NextResponse.json(
            { error: "The photo is larger than 5 MB." },
            { status: 413 },
        );
    }

    await ensurePhotoWallSchema();
    await cleanupExpiredPhotos();

    const countResult = await database.query<{
        count: string;
    }>(
        `
            SELECT COUNT(*)::TEXT AS count
            FROM photo_wall_photo
            WHERE user_id = $1
                AND expires_at > NOW()
        `,
        [session.user.id],
    );

    if (
        Number(countResult.rows[0]?.count ?? 0) >=
        MAX_ACTIVE_PHOTOS_PER_USER
    ) {
        return NextResponse.json(
            {
                error: 
                    "You already have 20 active photos. Delete one or wait for it to expire.",
            },
            { status: 429 },
        );
    }

    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { error: "Invalid upload form." },
            { status: 400 },
        );
    }

    const uploadedPhoto = formData.get("photo");
    const caption = String(
        formData.get("caption") ?? "",
    ).trim();

    if (!(uploadedPhoto instanceof File)) {
        return NextResponse.json(
            { error: "Choose a photo to upload."},
            { status: 400 },
        );
    }

    if (
        uploadedPhoto.size === 0 || 
        uploadedPhoto.size > MAX_PHOTO_SIZE
    ) {
        return NextResponse.json(
            {
                error: 
                    "The photo must be between 1 byte and 5 MB.",
            },
            { status: 400 },
        );
    }

    if (caption.length > 160) {
        return NextResponse.json(
            { 
                error:
                    "The caption must be 160 characters or fewer.",
            },
            { status: 400 },
        );
    }

    const bytes = Buffer.from(
        await uploadedPhoto.arrayBuffer(),
    );

    const detectedImage = detectImageType(bytes);

    if (!detectedImage) {
        return NextResponse.json(
            {
                error:
                    "Only JPG, PNG, WebP, and GIF images are allowed.",
            },
            { status: 400 },
        );
    }

    await ensurePhotoWallDirectory();

    const id = randomUUID();
    const storedFilename = 
        `${id}.${detectedImage.extension}`;
    const filePath = getPhotoFilePath(storedFilename);

    const createdAt = new Date();
    const expiresAt = new Date(
        createdAt.getTime() + PHOTO_LIFETIME,
    );
    const visibilityValue = String(
        formData.get("visibility") ?? "friends",
    );

    const visibility = 
        visibilityValue === "everyone"
            ? "everyone"
            : "friends";

    await writeFile(filePath, bytes, {
        flag: "wx",
    });

    try {
        const result = await database.query<PhotoRow>(
            `
                INSERT INTO photo_wall_photo (
                    id,
                    user_id,
                    uploader_name,
                    stored_filename,
                    original_name,
                    mime_type,
                    caption,
                    created_at,
                    expires_at,
                    visibility
                )
                VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9, $10
                )
                RETURNING
                    id, 
                    user_id,
                    uploader_name,
                    caption,
                    mime_type,
                    created_at,
                    expires_at,
                    visibility
            `,
            [
                id,
                session.user.id,
                session.user.name ||
                    session.user.email,
                storedFilename,
                path
                    .basename(
                        uploadedPhoto.name || 
                            "photo",
                    )
                    .slice(0,200),
                detectedImage.mimeType,
                caption,
                createdAt,
                expiresAt,
                visibility,
            ],
        );

        const savedPhoto = result.rows[0];

        try {
            await notifyPhotoRecipients({
                uploaderId: session.user.id,
                uploaderName: 
                    session.user.name ||
                    session.user.email,
                photoId: savedPhoto.id,
                caption: savedPhoto.caption,
                visibility: savedPhoto.visibility,
            });
        } catch (error) {
            console.error(
                "The photo was uploaded, but notifications failed:",
                error,
            );
        }

        return NextResponse.json(
            {
                photo: serializePhoto(
                    savedPhoto,
                    session.user.id,
                    getRoles(
                        session.user.role,
                    ).includes("admin"),
                ),
            },
            { status: 201 },
        );
    } catch (err) {
        await unlink(filePath).catch(() => undefined);
        throw err;
    }
}