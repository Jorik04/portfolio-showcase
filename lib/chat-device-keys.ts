"use client";

const DATABASE_NAME = "jorik-chat";
const DATABASE_VERSION = 1;
const DEVICE_STORE = "chat-device";
const CURRENT_DEVICE_KEY = "current-device";

type StoredChatDeviceKeys = {
    storageId: typeof CURRENT_DEVICE_KEY;
    deviceId: string;

    identityPrivateKey: CryptoKey;
    identityPublicKey: CryptoKey;

    signedPrekeyPrivate: CryptoKey;
    signedPrekeyPublic: CryptoKey;

    createdAt: string;
};

export type ChatDevicePublicBundle = {
    deviceId: string;
    deviceName: string;
    identityPublicKey: string;
    signedPrekeyPublic: string;
    signedPrekeySignature: string;
};


function requestResult<T>(
    request: IDBRequest<T>,
) {
    return new Promise<T>((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(
                request.error ??
                    new Error(
                        "IndexedDB request failed.",
                    ),
            );
        };
    });
}

function transactionFinished(
    transaction: IDBTransaction,
) {
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = () => {
            reject(
                transaction.error ??
                    new Error(
                        "IndexedDB transaction failed.",
                    ),
            );
        };

        transaction.onabort = () => {
            reject(
                transaction.error ??
                    new Error(
                        "IndexedDB transaction was aborted.",
                    ),
            );
        };
    });
}

function openChatDatabase() {
    return new Promise<IDBDatabase>(
        (resolve, reject) => {
            const request = indexedDB.open(
                DATABASE_NAME,
                DATABASE_VERSION,
            );

            request.onupgradeneeded = () => {
                const database = request.result;

                if (
                    !database.objectStoreNames.contains(
                        DEVICE_STORE,
                    )
                ) {
                    database.createObjectStore(
                        DEVICE_STORE,
                        {
                            keyPath: "storageId",
                        },
                    );
                }
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(
                    request.error ??
                        new Error(
                            "Could not open chat storage.",
                        ),
                );
            };
        },
    );
}

async function loadStoredKeys() {
    const database = await openChatDatabase();

    try {
        const transaction = database.transaction(
            DEVICE_STORE,
            "readonly",
        );

        const finished =
            transactionFinished(transaction);

        const request =
            transaction
                .objectStore(DEVICE_STORE)
                .get(CURRENT_DEVICE_KEY);

        const result = 
            await requestResult<
                StoredChatDeviceKeys | undefined
            >(request);

        await finished;

        return result ?? null;
    } finally {
        database.close();
    }
}

async function saveStoredKeys(
    keys: StoredChatDeviceKeys,
) {
    const database = await openChatDatabase();

    try {
        const transaction = database.transaction(
            DEVICE_STORE,
            "readwrite",
        );

        const finished =
            transactionFinished(transaction);

        transaction
            .objectStore(DEVICE_STORE)
            .put(keys);

        await finished;
    } finally {
        database.close();
    }
}

async function generateDeviceKeys():
    Promise<StoredChatDeviceKeys> {
        const identityKeyPair =
        (await crypto.subtle.generateKey(
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            false,
            ["sign", "verify"],
        )) as CryptoKeyPair;
    

    const signedPrekeyPair =
        (await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            ["deriveBits", "deriveKey"],
        )) as CryptoKeyPair;

    const keys: StoredChatDeviceKeys = {
        storageId: CURRENT_DEVICE_KEY,
        deviceId: crypto.randomUUID(),
        
        identityPrivateKey:
            identityKeyPair.privateKey,
        identityPublicKey: 
            identityKeyPair.publicKey,

        signedPrekeyPrivate:
            signedPrekeyPair.privateKey,
        signedPrekeyPublic:
            signedPrekeyPair.publicKey,

        createdAt: new Date().toISOString(),
    };

    await saveStoredKeys(keys);

    return keys;
}

async function getOrCreateStoredKeys() {
    const existingKeys = await loadStoredKeys();

    if (existingKeys) {
        return existingKeys;
    }

    return generateDeviceKeys();
}

function arrayBufferToBase64(
    buffer: ArrayBuffer,
) {
    const bytes = new Uint8Array(buffer);

    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return window.btoa(binary);
}

function suggestDeviceName() {
    const installed = 
        window.matchMedia(
            "(display-mode: standalone)",
        ).matches;

    const userAgent = navigator.userAgent;

    if (/iPhone/i.test(userAgent)) {
        return installed
            ? "iPhone app"
            : "iPhone Safari";
    }

    if (/iPad/i.test(userAgent)) {
        return installed
            ? "iPad app"
            : "iPad Safari";
    }

    if (/Macintosh/i.test(userAgent)) {
        return "Mac browser";
    }

    return installed
        ? "Installed app"
        : "Web browser";
}

export async function getChatDevicePublicBundle():
    Promise<ChatDevicePublicBundle> {
        if (
            typeof window === "undefined" ||
            !window.crypto?.subtle ||
            !window.indexedDB
        ) {
            throw new Error(
                "This browser dows not support local chat keys.",
            );
        }

        const keys = await getOrCreateStoredKeys();

        const identityPublicKey =
            await crypto.subtle.exportKey(
                "spki",
                keys.identityPublicKey,
            );
        
            const signedPrekeyPublic =
                await crypto.subtle.exportKey(
                    "spki",
                    keys.signedPrekeyPublic,
                );

            const signedPrekeySignature =
                await crypto.subtle.sign(
                    {
                        name: "ECDSA",
                        hash: "SHA-256",
                    },
                    keys.identityPrivateKey,
                    signedPrekeyPublic,
                );
            
            return {
                deviceId: keys.deviceId,
                deviceName: suggestDeviceName(),

                identityPublicKey: 
                    arrayBufferToBase64(
                        identityPublicKey,
                    ),
                
                    signedPrekeyPublic:
                        arrayBufferToBase64(
                            signedPrekeyPublic,
                        ),

                    signedPrekeySignature:
                        arrayBufferToBase64(
                            signedPrekeySignature,
                        ),
            };
    }

export type EncryptedMessageEnvelope = {
    recipientDeviceId: string;
    encryptedPayload: string;
    protocolHeader: {
        version: 1;
        algorithm: "P-256+AES-256-GCM";
        senderDeviceId: string;
        recipientDeviceId: string;
        ephemeralPublicKey: string;
        senderIdentityPublicKey: string;
        iv: string;
        signature: string;
    };
};

type RecipientPublicDevice = {
    id: string;
    identityPublicKey: string;
    signedPrekeyPublic: string;
    signedPrekeySignature: string; 
};

function base64ToArrayBuffer(
    value: string,
) : ArrayBuffer {
    const binary = window.atob(value);
    const bytes = new Uint8Array(binary.length);

    for (
        let index = 0;
        index < binary.length;
        index += 1
    ) {
        bytes[index] =
            binary.charCodeAt(index);
    }

    return bytes.buffer;
}

function createAdditionalData(
    senderDeviceId: string,
    recipientDeviceId: string,
) {
    return new TextEncoder().encode(
        JSON.stringify({
            version: 1,
            senderDeviceId,
            recipientDeviceId,
        }),
    );
}

function createSignatureData(input: {
    senderDeviceId: string;
    recipientDeviceId: string;
    ephemeralPublicKey: string;
    iv: string;
}) {
    return new TextEncoder().encode(
        JSON.stringify({
            version: 1,
            senderDeviceId: input.senderDeviceId,
            recipientDeviceId: input.recipientDeviceId,
            ephemeralPublicKey: input.ephemeralPublicKey,
            iv: input.iv,
        }),
    );
}

export async function getCurrentChatDeviceId() {
    const keys = await getOrCreateStoredKeys();

    return keys.deviceId;
}

export async function encryptChatMessageForDevice(
    plaintext: string,
    recipient: RecipientPublicDevice,
): Promise<EncryptedMessageEnvelope> {
    const message = plaintext.trim();

    if (!message) {
        throw new Error(
            "The message cannot be empty.",
        );
    }

    if (message.length > 4000) {
        throw new Error(
            "The message is too long.",
        );
    }

    const senderKeys =
        await getOrCreateStoredKeys();

    const recipientIdentityBytes =
        base64ToArrayBuffer(recipient.identityPublicKey);

    const recipientPrekeyBytes =
        base64ToArrayBuffer(recipient.signedPrekeyPublic);

    const recipientSignatureBytes =
        base64ToArrayBuffer(recipient.signedPrekeySignature);

    const recipientIdentityKey =
        await crypto.subtle.importKey(
            "spki",
            recipientIdentityBytes,
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            false,
            ["verify"],
    );

    const prekeyIsValid =
        await crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: "SHA-256",
            },
            recipientIdentityKey,
            recipientSignatureBytes,
            recipientPrekeyBytes,
        );

    if (!prekeyIsValid) {
        throw new Error(
            "The recipient device signature is invalid.",
        );
    }

    const recipientPrekey =
        await crypto.subtle.importKey(
            "spki",
            recipientPrekeyBytes,
            {
                name: "ECDH",
                namedCurve:"P-256",
            },
            false,
            [],
        );

    const ephemeralKeyPair =
        (await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            true,
            ["deriveKey"],
        )) as CryptoKeyPair;

    const encryptionKey = 
        await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: recipientPrekey,
            },
            ephemeralKeyPair.privateKey,
            {
                name: "AES-GCM",
                length: 256,
            },
            false,
            ["encrypt"],
        );

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const additionalData =
        createAdditionalData(
            senderKeys.deviceId,
            recipient.id,

        );

    const encryptedPayload =
        await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
                additionalData,
                tagLength: 128,
            },
            encryptionKey,
            new TextEncoder().encode(message),
        );
    
    const ephemeralPublicKeyBytes =
        await crypto.subtle.exportKey(
            "spki",
            ephemeralKeyPair.publicKey,
        );

    const senderIdentityPublicKeyBytes =
        await crypto.subtle.exportKey(
            "spki",
            senderKeys.identityPublicKey,
        );

    const ephemeralPublicKey =
        arrayBufferToBase64(ephemeralPublicKeyBytes);

    const encodedIv = arrayBufferToBase64(iv.buffer);

    const signatureData =
        createSignatureData({
            senderDeviceId: 
                senderKeys.deviceId,
            recipientDeviceId: 
                recipient.id,
            ephemeralPublicKey,
            iv: encodedIv,
        });

    const signature = 
        await crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: "SHA-256",
            },
            senderKeys.identityPrivateKey,
            signatureData,
        );

    return {
        recipientDeviceId: recipient.id,

        encryptedPayload:
            arrayBufferToBase64(encryptedPayload),

        protocolHeader: {
            version: 1,
            algorithm: 
                "P-256+AES-256-GCM",

            senderDeviceId: senderKeys.deviceId,

            recipientDeviceId: recipient.id,

            ephemeralPublicKey,

            senderIdentityPublicKey:
                arrayBufferToBase64(senderIdentityPublicKeyBytes),

            iv: encodedIv,

            signature: 
                arrayBufferToBase64(signature),
        },
    };
}

type EncryptedProtocolHeader = {
    version: 1;
    algorithm: "P-256+AES-256-GCM";
    senderDeviceId: string;
    recipientDeviceId: string;
    ephemeralPublicKey: string;
    senderIdentityPublicKey: string;
    iv: string;
    signature: string;
};

export type EncryptedChatMessage = {
    senderDeviceId: string;

    senderIdentityPublicKey: string;

    encryptedPayload: string;
    protocolHeader: EncryptedProtocolHeader;
};

function arrayBuffersEqual(
    first: ArrayBuffer,
    second: ArrayBuffer,
) {
    const firstBytes =
        new Uint8Array(first);

    const secondBytes =
        new Uint8Array(second);

    if (
        firstBytes.length !==
        secondBytes.length
    ) {
        return false;
    }

    let difference = 0;

    for (let index = 0; index < firstBytes.length; index += 1) {
        difference |=
            firstBytes[index] ^
            secondBytes[index];
    }

    return difference === 0;
}

export async function decryptChatMessage(
    message: EncryptedChatMessage,
) {
    const keys =
        await getOrCreateStoredKeys();

    const header = 
        message.protocolHeader;

    if (
        header.version !== 1 || 
        header.algorithm !==
            "P-256+AES-256-GCM"
    ) {
        throw new Error(
            "Unsupported encryption format.",
        );
    }

    if (
        header.senderDeviceId !==
            message.senderDeviceId
    ) {
        throw new Error(
            "The sender device does not match.",
        );
    }

    if (
        header.recipientDeviceId !==
            keys.deviceId
    ) {
        throw new Error(
            "This message belongs to another device.",
        );
    }

    const trustedIdentityBytes =
        base64ToArrayBuffer(
            message.senderIdentityPublicKey,
        );

    const headerIdentityBytes =
        base64ToArrayBuffer(header.senderIdentityPublicKey);

    if (
        !arrayBuffersEqual(
            trustedIdentityBytes,
            headerIdentityBytes,
        )
    ) {
        throw new Error(
            "The sender identity key has changed.",
        );
    }

    const senderIdentityKey =
        await crypto.subtle.importKey(
            "spki",
            trustedIdentityBytes,
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            false,
            ["verify"],
        );

    const signatureData =
        createSignatureData({
            senderDeviceId:
                header.senderDeviceId,

            recipientDeviceId: 
                header.recipientDeviceId,

            ephemeralPublicKey: 
                header.ephemeralPublicKey,

            iv: header.iv,
        });

    const signatureIsValid =
        await crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: "SHA-256",
            },
            senderIdentityKey,
            base64ToArrayBuffer(
                header.signature,
            ),
            signatureData,
        );

    if (!signatureIsValid) {
        throw new Error(
            "The message signature is invalid.",
        );
    }

    const ephemeralPublicKey = 
        await crypto.subtle.importKey(
            "spki",
            base64ToArrayBuffer(
                header.ephemeralPublicKey,
            ),
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            [],
        );

    const decryptionKey =
        await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public:
                    ephemeralPublicKey,
            },
            keys.signedPrekeyPrivate,
            {
                name: "AES-GCM",
                length: 256,
            },
            false,
            ["decrypt"],
        );

    const additionalData =
        createAdditionalData(
            header.senderDeviceId,
            header.recipientDeviceId,
        );

    let decryptedBytes: ArrayBuffer;

    try {
        decryptedBytes = 
            await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",

                    iv: base64ToArrayBuffer(
                        header.iv
                    ),

                    additionalData,
                    tagLength: 128,
                },
                decryptionKey,
                base64ToArrayBuffer(
                    message.encryptedPayload,
                )
            );
    } catch {
        throw new Error(
            "The message could not be decrypted.",
        );
    }

    return new TextDecoder(
        "utf-8",
        {
            fatal: true,
        },
    ).decode(decryptedBytes);
}

