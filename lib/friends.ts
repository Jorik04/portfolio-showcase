import { database } from "@/lib/auth";

let schemaPromise: Promise<void> | null = null;

export function ensureFriendsSchema() {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            await database.query(`
                CREATE TABLE IF NOT EXISTS friendship (
                    id TEXT PRIMARY KEY,
                    requester_id TEXT NOT NULL,
                    addressee_id TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    responded_at TIMESTAMPTZ,
                    CHECK (requester_id <> addressee_id),
                    CHECK (status IN ('pending', 'accepted'))
                )
            `);

            await database.query(`
               CREATE UNIQUE INDEX IF NOT EXISTS friendship_unique_pair
               ON friendship (
                    LEAST(requester_id, addressee_id),
                    GREATEST(requester_id, addressee_id)
               ) 
            `);
        })().catch((err) => {
            schemaPromise = null;
            throw err;
        });
    }

    return schemaPromise;
}

export function getRoles(role: string | null | undefined) {
    return (
        role
            ?.split(",")
            .map((item) => item.trim())
            .filter(Boolean) ?? []
    );
}