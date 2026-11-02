"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    Check,
    LoaderCircle,
    MessageCircle,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ChatFriend = {
    id: string;
    name: string;
    email: string;
    deviceCount: number;
    conversationId: string | null;
    canMessage: boolean;
};

type Conversation = {
    id: string;
    createdAt: string;

    friend: {
        id: string;
        name: string;
        email: string;
        deviceCount: number;
    };
};

type ConversationResponse = {
    conversations: Conversation[];
    friends: ChatFriend[];
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
            "Chat API returned invalid JSON:",
            response.status,
            text,
        );

        throw new Error(
            `The server returned HTTP ${response.status}.`,
        );
    }
}

function getInitial(name: string) {
    return name.trim().charAt(0).toUpperCase() || "?";
}

export default function ChatConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    const [friends, setFriends] = useState<ChatFriend[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [creatingFor, setCreatingFor] = useState<string | null>(null);

    const router = useRouter();

    const loadConversations = useCallback(
        async () => {
            setError("");

            try {
                const response = await fetch(
                    "/api/chats/conversations",
                    {
                        method: "GET",
                        cache: "no-store",
                    },
                );

                const data =
                    (await readJsonResponse(
                        response,
                    )) as ConversationResponse & {
                        error?: string;
                    };

                if (!response.ok) {
                    throw new Error(
                        data.error ??
                            "Could not load chats.",
                    );
                }

                setConversations(
                    data.conversations ?? [],
                );

                setFriends(data.friends ?? []);
            } catch (error) {
                setError(
                    error instanceof Error
                        ? error.message
                        : "Could not load chats.",
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        // Load conversations from the chat API when this component mounts.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadConversations();
    }, [loadConversations]);

    async function startConversation(
        friend: ChatFriend,
    ) {
        setCreatingFor(friend.id);
        setError("");

        try {
            const response = await fetch(
                "/api/chats/conversations",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        friendId: friend.id,
                    }),
                },
            );

            const data =
                (await readJsonResponse(response)) as {
                    conversation: Conversation;
                    error?: string;
                };

            if (!response.ok) {
                throw new Error(
                    data.error ??
                        "Could not create conversation.",
                );
            }

            router.push(
                `/chats/${data.conversation.id}`
            );
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Could not create conversation.",
            );
        } finally {
            setCreatingFor(null);
        }
    }

    if (loading) {
        return (
            <section className="mt-6 flex min-h-56 items-center justify-center rounded-3xl border border-border/60 bg-card/60">
                <div className="text-center">
                    <LoaderCircle
                        size={30}
                        className="mx-auto animate-spin text-indigo-500"
                    />

                    <p className="mt-3 font-bold text-muted-foreground">
                        Loading chats...
                    </p>
                </div>
            </section>
        );
    }

    return (
        <div className="mt-6 space-y-6">
            {error && (
                <section
                    aria-live="polite"
                    className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-4"
                >
                    <p className="text-sm font-bold text-red-500">
                        {error}
                    </p>

                    <button
                        type="button"
                        aria-label="Try loading chats again"
                        onClick={() => {
                            setLoading(true);
                            void loadConversations();
                        }}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500"
                    >
                        <RefreshCw size={18} />
                    </button>
                </section>
            )}

            <section>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-500">
                            Messages
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-foreground">
                            Your conversations
                        </h2>
                    </div>

                    <MessageCircle
                        size={25}
                        className="text-indigo-500"
                    />
                </div>

                {conversations.length === 0 ? (
                    <div className="mt-4 rounded-3xl border border-dashed border-border p-7 text-center">
                        <p className="font-bold text-foreground">
                            No conversations yet
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Start one with a friend below.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {conversations.map(
                            (conversation) => (
                                <Link 
                                    key={conversation.id}
                                    href={`/chats/${conversation.id}`}
                                    className="flex items-center gap-4 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur transition hover:border-indigo-500/40 hover:bg-card"
                                >
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-lg font-black text-white">
                                        {getInitial(
                                            conversation.friend
                                                .name,
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-black text-foreground">
                                            {
                                                conversation.friend
                                                    .name
                                            }
                                        </p>

                                        <p className="truncate text-sm text-muted-foreground">
                                            {
                                                conversation.friend
                                                    .email
                                            }
                                        </p>
                                    </div>

                                    <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                                            <Check size={19} />
                                    </div>
                                </Link>
                            ),
                        )}
                    </div>
                )}
            </section>

            <section>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-indigo-500">
                            Friends
                        </p>

                        <h2 className="mt-1 text-2xl font-black text-foreground">
                            Start a conversation
                        </h2>
                    </div>

                    <UserRound
                        size={25}
                        className="text-indigo-500"
                    />
                </div>

                {friends.length === 0 ? (
                    <div className="mt-4 rounded-3xl border border-dashed border-border p-7 text-center">
                        <p className="font-bold text-foreground">
                            No accepted friends yet
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Add friends from your profile first.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {friends.map((friend) => {
                            const conversationExists = 
                                Boolean(
                                    friend.conversationId,
                                );
                            
                            const creating =
                                creatingFor === friend.id;

                            return (
                                <article
                                    key={friend.id}
                                    className="flex items-center gap-4 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur"
                                >
                                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-lg font-black text-indigo-500">
                                        {getInitial(
                                            friend.name,
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-black text-foreground">
                                            {friend.name}
                                        </p>

                                        <p className="truncate text-sm text-muted-foreground">
                                            {friend.email}
                                        </p>

                                        <p
                                            className={`mt-1 flex items-center gap-1 text-xs font-bold ${
                                                friend.canMessage
                                                    ? "text-emerald-500"
                                                    : "text-amber-500"
                                            }`}
                                        >
                                            {friend.canMessage ? (
                                                <>
                                                    <ShieldCheck
                                                        size={14}
                                                    />

                                                    {
                                                        friend.deviceCount
                                                    } secure{" "}
                                                    {friend.deviceCount ===
                                                    1
                                                        ? "device"
                                                        : "devices"}
                                                </>
                                            ) : (
                                                <>
                                                    <Smartphone
                                                        size={14}
                                                    />

                                                    Waiting for
                                                    device setup
                                                </>
                                            )}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={
                                            creating ||
                                            conversationExists ||
                                            !friend.canMessage
                                        }
                                        onClick={() => {
                                            void startConversation(
                                                friend,
                                            );
                                        }}
                                        className="shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-500 disabled:bg-muted disabled:text-muted-foreground"
                                    >
                                        {creating
                                            ? "Starting..."
                                            : conversationExists
                                                ? "Created"
                                                : friend.canMessage
                                                    ? "Start"
                                                    : "Not ready"}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    )
}