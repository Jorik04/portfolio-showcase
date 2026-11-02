import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";

import { database } from "@/lib/auth";

export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
export const MAX_ACTIVE_PHOTOS_PER_USER = 20;
export const PHOTO_LIFETIME = 24 * 60 * 60 * 1000;
export const MAX_COMMENT_LENGTH = 300;

export const photoWallDirectory = 
    process.env.PHOTO_WALL_DIR ??
       (process.env.NODE_ENV === "production"
            ? path.join(
                process.env.HOME ?? process.cwd(),
                "my-app-data",
                "photo-wall"
            )
        : path.join(process.cwd(), ".data", "photo-wall"));

let schemaPromise: Promise<void> | null = null;

export function ensurePhotoWallSchema() {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            await database.query(`
                CREATE TABLE IF NOT EXISTS photo_wall_photo (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    uploader_name TEXT NOT NULL,
                    stored_filename TEXT NOT NULL UNIQUE,
                    original_name TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    caption VARCHAR(160) NOT NULL DEFAULT '',
                    created_at TIMESTAMPTZ NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    visibility TEXT NOT NULL DEFAULT 'everyone'
                )
            `);

            await database.query(`
                CREATE TABLE IF NOT EXISTS photo_wall_like (
                    photo_id TEXT NOT NULL
                        REFERENCES photo_wall_photo(id)
                        ON DELETE CASCADE,
                    user_id TEXT NOT NULL
                        REFERENCES "user"(id)
                        ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL
                        DEFAULT NOW(),
                    PRIMARY KEY (photo_id, user_id)
                )
            `);

            await database.query(`
                CREATE TABLE IF NOT EXISTS photo_wall_comment (
                    id TEXT PRIMARY KEY,
                    photo_id TEXT NOT NULL
                        REFERENCES photo_wall_photo(id)
                        ON DELETE CASCADE,
                    user_id TEXT NOT NULL
                        REFERENCES "user"(id)
                        ON DELETE CASCADE,
                    body VARCHAR(300) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL
                        DEFAULT NOW(),
                    CHECK (
                        CHAR_LENGTH(TRIM(body)) BETWEEN 1 AND 300
                    )
                )
            `);

            await database.query(`
                ALTER TABLE photo_wall_comment
                ALTER COLUMN body DROP DEFAULT
            `);

            await database.query(`
                ALTER TABLE photo_wall_comment
                ADD COLUMN IF NOT EXISTS created_at
                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            `);

            await database.query(`
                ALTER TABLE photo_wall_photo
                ADD COLUMN IF NOT EXISTS visibility TEXT
                NOT NULL DEFAULT 'everyone'
            `);

            await database.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'photo_wall_visibility_check'
                    ) THEN
                        ALTER TABLE photo_wall_photo
                        ADD CONSTRAINT photo_wall_visibility_check
                        CHECK (
                            visibility IN ('everyone', 'friends')
                        );
                    END IF;
                END
                $$
            `);

            await database.query(`
                CREATE INDEX IF NOT EXISTS photo_wall_expires_at_idx
                ON photo_wall_photo (expires_at)
            `);

            await database.query(`
                CREATE INDEX IF NOT EXISTS photo_wall_user_id_idx
                ON photo_wall_photo (user_id)
            `);

            await database.query(`
                CREATE INDEX IF NOT EXISTS
                    photo_wall_like_photo_id_idx
                ON photo_wall_like (photo_id)
            `);

            await database.query(`
                CREATE INDEX IF NOT EXISTS
                    photo_wall_comment_photo_id_idx
                ON photo_wall_comment (
                    photo_id,
                    created_at
                )
            `);
        })().catch((err) => {
            schemaPromise = null;
            throw err;
        });
    }

    return schemaPromise;
}

export async function ensurePhotoWallDirectory() {
    await mkdir(photoWallDirectory, { recursive: true });
}

export function getPhotoFilePath(storedFilename: string) {
    const safeFilename = path.basename(storedFilename);

    if (safeFilename !== storedFilename) {
        throw new Error("Invalid stored filename");
    }

    return path.join(photoWallDirectory, safeFilename);
}

export async function cleanupExpiredPhotos() {
    await ensurePhotoWallSchema();
    await ensurePhotoWallDirectory();

    const result = await database.query<{
        stored_filename: string;
    }>(`
        DELETE FROM photo_wall_photo
        WHERE expires_at < NOW()
        RETURNING stored_filename
    `);

    await Promise.all(
        result.rows.map(async ({ stored_filename }) => {
            try {
                await unlink(
                    getPhotoFilePath(stored_filename),
                );
            } catch (err) {
                const code = 
                    err instanceof Error &&
                    "code" in err
                        ? err.code
                        : undefined;

                if (code !== "ENOENT") {
                    console.error(
                        "Could not remove expired photo:",
                        err
                    );
                }
            }
        }),
    );
}

export type DetectedImage = {
    mimeType: string;
    extension: string;
};

export function detectImageType(
    bytes: Buffer,
): DetectedImage | null {
    if (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
    ) {
        return {
            mimeType: "image/jpeg",
            extension: "jpg",
        };
    }

    if (
        bytes.length >= 8 &&
        bytes.subarray(0,8).equals(
            Buffer.from([
                0x89, 0x50, 0x4e, 0x47,
                0x0d, 0x0a, 0x1a, 0x0a,
            ]),
        )
    ) {
        return {
            mimeType: "image/png",
            extension: "png",
        };
    }

    if (bytes.length >= 6) {
        const signature = bytes
            .subarray(0,6)
            .toString("ascii");
            
        if (
            signature === "GIF87a" ||
            signature === "GIF89a"
        ) {
            return {
                mimeType: "image/gif",
                extension: "gif",
            };
        }
    }

    if (
        bytes.length >= 12 && 
        bytes.subarray(0,4).toString("ascii") ===
            "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") ===
            "WEBP"
    ) {
        return {
            mimeType: "image/webp",
            extension: "webp",
        };
    }

    return null;
}