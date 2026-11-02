import { database } from "@/lib/auth";
import {
    ensureFriendsSchema,
    getRoles,
} from "@/lib/friends";
import {
    ensurePhotoWallSchema,
} from "@/lib/photo-wall";

export type AccessiblePhoto = {
    id: string;
    userId: string;
    uploaderName: string;
};

export async function getAccessiblePhoto({
    photoId,
    userId, 
    userRole,
}: {
    photoId: string;
    userId: string;
    userRole: string | null | undefined;
}): Promise<AccessiblePhoto | null> {
    await ensurePhotoWallSchema();
    await ensureFriendsSchema();

    const isAdmin = getRoles(userRole).includes("admin");

    const result = await database.query<{
        id: string;
        user_id: string;
        uploader_name: string;
    }>(
        `
            SELECT
                photo.id,
                photo.user_id,
                photo.uploader_name
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
        [photoId, userId, isAdmin],
    );

    const photo = result.rows[0];

    if (!photo) {
        return null;
    }

    return {
        id: photo.id,
        userId: photo.user_id,
        uploaderName: photo.uploader_name,
    };
}