"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useState,
    useLayoutEffect,
    useRef,
} from "react";
import {
    ArrowLeft,
    LoaderCircle,
    LockKeyhole,
    RefreshCw,
    Send,
    ShieldCheck,
} from "lucide-react";
import {
    decryptChatMessage,
    encryptChatMessageForDevice,
    getChatDevicePublicBundle,
    type EncryptedChatMessage,
} from "@/lib/chat-device-keys"

type PublicDevice = {
    id: string;
    deviceName: string;
    identityPublicKey: string;
    signedPrekeyPublic: string;
    signedPrekeySignature: string;
    lastSeenAt: string;
};

type ConversationDetails = {
    id: string;
    createdAt: string;

    friend: {
        id: string;
        name: string;
        email: string;
    };
};

type ConversationResponse = {
    conversation: ConversationDetails;
    devices: PublicDevice[];
    error?: string;
};

type StoredEncryptedMessage =
    EncryptedChatMessage & {
        id: string;
        senderUserId: string;
        senderName: string;
        createdAt: string;
        deliveredAt: string | null;
        readAt: string | null;
    };

type MessagesResponse = {
    messages: StoredEncryptedMessage[];
    error?: string;
};

type DisplayMessage = {
    id: string;
    text: string;
    senderName: string;
    createdAt: string;
    fromMe: boolean;
    couldNotDecrypt: boolean;
};

type ChatConversationProps = {
    conversationId: string;
};

async function readJsonResponse(
    response: Response,
) {
    const text = await response.text();

    if (!text) {
        throw new Error(
            `The server returned HTTP ${response.status}.`,
        );
    }

    try {
        return JSON.parse(text);
    } catch {
        console.error(
            "Conversation API returned invalid JSON:",
            response.status,
            text,
        );

        throw new Error(
            `The server returned HTTP ${response.status}.`,
        );
    }
}

export default function ChatConversation({
    conversationId,
}: ChatConversationProps) {
    const [conversation, setConversation] =
        useState<ConversationDetails | null>(
            null,
        );

    const [devices, setDevices] =
        useState<PublicDevice[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] = useState("");

    const [message, setMessage] = useState("");

    const [sending, setSending] = useState(false);

    const [sendError, setSendError] = useState("");

    const [sendSuccess, setSendSuccess] = useState("");

    const [messages, setMessages] = useState<DisplayMessage[]>([]);

    const [messagesLoading, setMessagesLoading] = useState(true);

    const [messagesError, setMessagesError] = 
        useState("");

    const messagesContainerRef = useRef<HTMLElement | null>(null);

    const shouldStickToBottomRef = useRef(true);

    const latestMessageId = 
        messages[messages.length - 1]?.id;

    const loadConversation = useCallback(
        async () => {
            setError("");

            try {
                const response = await fetch(
                    `/api/chats/conversations/${conversationId}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    },
                );

                const data =
                    (await readJsonResponse(
                        response,
                    )) as ConversationResponse;

                if (!response.ok) {
                    throw new Error(
                        data.error ??
                            "Could not load conversation.",
                    );
                }

                setConversation(
                    data.conversation,
                );

                setDevices(data.devices ?? []);
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Could not load conversation.",
                );
            } finally {
                setLoading(false);
            }
        },
        [conversationId],
    );

    const loadMessages = useCallback(
        async () => {
            if (!conversation) {
                return;
            }

            try {
                setMessagesError("");

                const currentDevice =
                    await getChatDevicePublicBundle();

                const response = await fetch(
                    `/api/chats/conversations/${conversationId}/messages?deviceId=${encodeURIComponent(
                        currentDevice.deviceId
                    )}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    },
                );

                const data =
                    (await readJsonResponse(
                        response
                    )) as MessagesResponse;

                if (!response.ok) {
                    throw new Error(
                        data.error ??
                            "Could not load messages.",
                    );
                }

                const decryptedMessages = 
                    await Promise.all(
                        (data.messages ?? []).map(
                            async (
                                encryptedMessage,
                            ) : Promise<DisplayMessage> => {
                                try {
                                    const text = await decryptChatMessage(
                                        encryptedMessage,
                                    );

                                    return {
                                        id: encryptedMessage.id,
                                        text,

                                        senderName: 
                                            encryptedMessage.senderName,

                                        createdAt:
                                            encryptedMessage.createdAt,

                                        fromMe:
                                            encryptedMessage.senderUserId !== conversation.friend.id,

                                        couldNotDecrypt: false,
                                    };
                                } catch (error) {
                                    console.error(
                                        "Could not decrypt message:",
                                        encryptedMessage.id,
                                        error,
                                    );

                                    return {
                                        id: encryptedMessage.id,

                                        text: "This message could not be decrypted.",

                                        senderName: encryptedMessage.senderName,

                                        createdAt: encryptedMessage.createdAt,

                                        fromMe: encryptedMessage.senderUserId !== conversation.friend.id,

                                        couldNotDecrypt: true,
                                    };
                                }
                            },
                        ),
                    );

                setMessages(decryptedMessages);
            } catch (error) {
                setMessagesError(
                    error instanceof Error
                        ? error.message
                        : "Could not load messages.",
                );
            } finally {
                setMessagesLoading(false);
            }
        },
        [
            conversation,
            conversationId,
        ],
    );

    useEffect(() => {
        // Load the conversation from the external chat API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadConversation();
    }, [loadConversation]);

    async function sendMessage() {
        const plaintext = message.trim();

        if (!plaintext || sending || devices.length === 0) {
            return
        }

        setSending(true);
        setSendError("");
        setSendSuccess("");

        try {
            const currentDevice =
                await getChatDevicePublicBundle();

            const recipientDevices = [
                ...devices,
                {
                    id: currentDevice.deviceId,
                    identityPublicKey: currentDevice.identityPublicKey,
                    signedPrekeyPublic: currentDevice.signedPrekeyPublic,
                    signedPrekeySignature: currentDevice.signedPrekeySignature,
                },
            ];

            const envelopes =
                await Promise.all(
                    recipientDevices.map((device) => 
                        encryptChatMessageForDevice(
                            plaintext,
                            device,
                        ),
                    ),
                );

            const response = await fetch(
                `/api/chats/conversations/${conversationId}/messages`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        senderDeviceId: currentDevice.deviceId,
                        envelopes,
                    }),
                },
            );

            const data = 
                (await readJsonResponse(
                    response,
                )) as {
                    messageIds?: string[];
                    error?: string;
                };

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not send message.",
                );
            }

            setMessage("");
            setSendSuccess("Message sent securely.");

            shouldStickToBottomRef.current = true;
            await loadMessages();
        } catch (error) {
            setSendError(
                error instanceof Error
                    ? error.message
                    : "Could not send message.",
            );
        } finally {
            setSending(false);
        }
        
    }

    useEffect(() => {
        if (!conversation) {
            return;
        }

        // Load messages immediately before polling begins.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadMessages();

        const timer = window.setInterval(
            () => {
                void loadMessages();
            },
            3000,
        );

        return () => {
            window.clearInterval(timer);
        };
    }, [
        conversation,
        loadMessages,
    ]);

    useLayoutEffect(() => {
        const container = 
            messagesContainerRef.current;

        if (
            !container || 
            messagesLoading || 
            !latestMessageId ||
            !shouldStickToBottomRef.current
        ) {
            return;
        }

        container.scrollTop =
            container.scrollHeight;
    }, [
        latestMessageId,
        messagesLoading,
    ]);

    if (loading) {
        return (
            <main className="flex flex-1 items-center justify-center bg-background px-5">
                <LoaderCircle
                    size={34}
                    className="animate-spin text-indigo-500"
                />
            </main>
        );
    }

    if (error || !conversation) {
        return (
            <main className="flex flex-1 items-center justify-center bg-background px-5">
                <section className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                    <p className="font-bold text-red-500">
                        {error ||
                            "Conversation not found."}
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            void loadConversation();
                        }}
                        className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-bold text-background"
                    >
                        <RefreshCw size={17} />
                        Try again
                    </button>
                </section>
            </main>
        );
    }

    const recipientReady =
        devices.length > 0;

    return (
        <main className="chat-conversation-shell flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-indigo-50/70 via-background to-background dark:from-indigo-950/20">
            <header className="z-20 flex shrink-0 items-center gap-3 border-b border-border/60 bg-background/75 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
                <Link
                    href="/chats"
                    aria-label="Return to conversations"
                    className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
                >
                    <ArrowLeft size={23} />
                </Link>

                <div className="flex size-11 items-center justify-center rounded-full bg-indigo-600 text-lg font-black text-white">
                    {conversation.friend.name
                        .trim()
                        .charAt(0)
                        .toUpperCase() || "?"}
                </div>

                <div className="min-w-0">
                    <h1 className="truncate font-black text-foreground">
                        {conversation.friend.name}
                    </h1>

                    <p className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                        <LockKeyhole size={12} />

                        {recipientReady
                            ? "Secure devices available"
                            : "Waiting for device setup"}
                    </p>
                </div>
            </header>

            <section 
                ref={messagesContainerRef}
                onScroll={(event) => {
                    const container = event.currentTarget;

                    const distanceFromBottom =
                        container.scrollHeight -
                        container.scrollTop -
                        container.clientHeight;

                    shouldStickToBottomRef.current = 
                        distanceFromBottom < 120;
                }}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6"
            >
                <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
                    {messagesError && (
                        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm font-bold text-red-500">
                            {messagesError}
                        </div>
                    )}

                    {messagesLoading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <LoaderCircle
                                size={30}
                                className="animate-spin text-indigo-500"
                            />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center text-center">
                            <div className="flex size-20 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                                <ShieldCheck size={38} />
                            </div>

                            <h2 className="mt-5 text-2xl font-black text-foreground">
                                Start the conversation
                            </h2>

                            <p className="mt-2 max-w-sm text-muted-foreground">
                                Your messages will be encrypted before they leave this device.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-auto space-y-3">
                            {messages.map((chatMessage) => (
                                <div 
                                    key={chatMessage.id}
                                    className={`flex ${
                                        chatMessage.fromMe
                                            ? "justify-end"
                                            : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[82%] rounded-3xl px-4 py-3 sm:max-w-[70%] ${
                                            chatMessage.fromMe
                                                ? "rounded-br-md bg-indigo-600 text-white"
                                                : "rounded-bl-md border border-border/60 bg-card text-card-foreground"
                                        } ${
                                            chatMessage.couldNotDecrypt
                                                ? "border border-red-500/30 bg-red-500/10 text-red-500"
                                                : ""
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap break-words">
                                            {chatMessage.text}
                                        </p>

                                        <time 
                                            dateTime={
                                                chatMessage.createdAt
                                            }
                                            className={`mt-1 block text-right text-[11px] ${
                                                chatMessage.fromMe
                                                    ? "text-indigo-100"
                                                    : "text-muted-foreground"
                                            }`}
                                        >
                                            {new Date(
                                                chatMessage.createdAt,
                                            ).toLocaleTimeString(
                                                [],
                                                {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                }
                                            )}
                                        </time>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <footer className="shrink-0 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl">
                <form  
                    onSubmit={(event) => {
                        event.preventDefault();
                        void sendMessage();
                    }}
                    className="mx-auto max-w-2xl"
                >
                    {sendError && (
                        <p className="mb-2 px-3 text-sm font-bold text-red-500">
                            {sendError}
                        </p>
                    )}

                    {sendSuccess && (
                        <p className="mb-2 px-3 text-sm font-bold text-emerald-500">
                            {sendSuccess}
                        </p>
                    )}

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(event) => {
                                setMessage(
                                    event.target.value,
                                );

                                setSendError("");
                                setSendSuccess("");
                            }}
                            maxLength={4000}
                            disabled={
                                !recipientReady ||
                                sending
                            }
                            autoComplete="off"
                            placeholder={
                                recipientReady
                                    ? "Write a message..."
                                    : "Friend has no secure device"
                            }
                            className="min-w-0 flex-1 rounded-full border border-input bg-muted/60 px-5 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />

                        <button
                            type="submit"
                            disabled={
                                !recipientReady ||
                                ! message.trim() ||
                                sending
                            }
                            aria-label="Send message"
                            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {sending ? (
                                <LoaderCircle
                                    size={20}
                                    className="animate-spin"
                                />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                </form>
            </footer>
        </main>
    );
}