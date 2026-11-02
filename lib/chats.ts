import { database } from "./auth";

let schemaPromise: Promise<void> | null = null;

export function ensureChatSchema() {
    if (!schemaPromise) {
        schemaPromise = createChatSchema().catch(
            (error) => {
                schemaPromise = null;
                throw error;
            },
        );
    }

    return schemaPromise;
}

async function createChatSchema() {
    await database.query(`
        CREATE TABLE IF NOT EXISTS chat_device (
            id TEXT PRIMARY KEY,

            user_id TEXT NOT NULL
                REFERENCES "user"(id)
                ON DELETE CASCADE,

            device_name TEXT NOT NULL,

            identity_public_key BYTEA NOT NULL,
            signed_prekey_public BYTEA NOT NULL,
            signed_prekey_signature BYTEA NOT NULL,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);


    await database.query(`
        CREATE INDEX IF NOT EXISTS chat_device_user_index
        ON chat_device (user_id)
    `);

    await database.query(`
        CREATE TABLE IF NOT EXISTS chat_conversation (
            id TEXT PRIMARY KEY,

            direct_pair_key TEXT UNIQUE,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await database.query(`
        CREATE TABLE IF NOT EXISTS chat_conversation_member (
            conversation_id TEXT NOT NULL
                REFERENCES chat_conversation(id)
                ON DELETE CASCADE,

            user_id TEXT NOT NULL
                REFERENCES "user"(id)
                ON DELETE CASCADE,
            
            joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            PRIMARY KEY (
                conversation_id,
                user_id
            )
        )
    `);

    await database.query(`
        CREATE INDEX IF NOT EXISTS chat_member_user_index
        ON chat_conversation_member (user_id)
    `);

    await database.query(`
        CREATE TABLE IF NOT EXISTS chat_one_time_prekey (
            id TEXT PRIMARY KEY,

            device_id TEXT NOT NULL
                REFERENCES chat_device(id)
                ON DELETE CASCADE,
            
            public_key BYTEA NOT NULL,

            claimed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await database.query(`
        CREATE INDEX IF NOT EXISTS chat_prekey_available_index
        ON chat_one_time_prekey (
            device_id,
            claimed_at
        )    
    `);

    await database.query(`
        CREATE TABLE IF NOT EXISTS chat_message (
            id TEXT PRIMARY KEY,

            conversation_id TEXT NOT NULL
                REFERENCES chat_conversation(id)
                ON DELETE CASCADE,
            
            sender_user_id TEXT NOT NULL
                REFERENCES "user"(id)
                ON DELETE CASCADE,

            sender_device_id TEXT NOT NULL
                REFERENCES chat_device(id),
            
            recipient_device_id TEXT NOT NULL
                REFERENCES chat_device(id),

            encrypted_payload BYTEA NOT NULL,
            protocol_header JSONB NOT NULL,

            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            delivered_at TIMESTAMPTZ,
            read_at TIMESTAMPTZ
        )
    `);

    await database.query(`
        CREATE INDEX IF NOT EXISTS chat_message_conversation_index
        ON chat_message (
            conversation_id,
            created_at DESC
        )
    `);

    await database.query(`
        CREATE INDEX IF NOT EXISTS chat_message_recipient_index
        ON chat_message (
            recipient_device_id,
            delivered_at,
            created_at
        )
    `);
}