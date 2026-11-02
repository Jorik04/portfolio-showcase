"use client";

import {
    FormEvent,
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    Check,
    Search,
    UserMinus,
    UserPlus,
    Users,
    X,
} from "lucide-react";

type Person = {
    friendship_id?: string;
    id: string;
    name: string;
    email: string;
};

type FriendsResponse = {
    friends: Person[];
    incoming: Person[];
    outgoing: Person[];
    users: Person[];
};

const emptyData: FriendsResponse = {
    friends: [],
    incoming: [],
    outgoing: [],
    users: [],
};

export default function FriendsPanel() {
    const [data, setData] = useState<FriendsResponse>(emptyData);
    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    const loadFriends = useCallback(
        async (searchValue = "") => {
            setLoading(true);

            try {
                const query = searchValue
                    ? `?search=${encodeURIComponent(searchValue)}`
                    : "";

                const response = await fetch(
                    `/api/friends${query}`,
                    { cache: "no-store" },
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error ??
                            "Could not load friends.",
                    );
                }

                setData(result);
            } catch (err) {
                setMessage(
                    err instanceof Error
                        ? err.message
                        : "Could not load friends.",
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        // Load the user's current friendship data from the API.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadFriends();
    }, [loadFriends]);

    async function runAction(
        url: string,
        method: "POST" | "PATCH" | "DELETE",
        body?: object,
    ) {
        setMessage("");

        const response = await fetch(url, {
            method,
            headers: body
                ? { "Content-Type": "application/json" }
                : undefined,
            body: body
                ? JSON.stringify(body)
                : undefined,
        });

        const result = await response.json();

        if (!response.ok) {
            setMessage(
                result.error ?? "Something went wrong.",
            );
            return;
        }

        setMessage("Done.");
        await loadFriends(search);
    }

    function searchUsers(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (search.trim().length < 2) {
            setMessage(
                "Enter at least 2 characters.",
            );
            return;
        }

        setMessage("");
        void loadFriends(search.trim());
    }

    const unavailableIds = new Set([
        ...data.friends.map((person) => person.id),
        ...data.incoming.map((person) => person.id),
        ...data.outgoing.map((person) => person.id),
    ]);

    return (
        <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                    <Users size={28} />
                </div>

                <div>
                    <h2 className="text-2xl font-black">
                        Friends
                    </h2>

                    <p className="text-muted-foreground">
                        {data.friends.length}{" "}
                        {data.friends.length === 1
                            ? "friend"
                            : "friends"}
                    </p>
                </div>
            </div>

            <form
                onSubmit={searchUsers}
                className="mt-6 flex gap-2"
            >
                <input 
                    value={search}
                    onChange={(event) => 
                        setSearch(event.target.value)
                    }
                    placeholder="Search name or email"
                    className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                />

                <button
                    type="submit"
                    aria-label="Search users"
                    className="rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-700"
                >
                    <Search size={20} />
                </button>
            </form>

            {message && (
                <p
                    aria-live="polite"
                    className="mt-4 rounded-xl bg-muted p-3 text-sm font-semibold text-foreground"
                >
                    {message}
                </p>
            )}

            {data.incoming.length > 0 && (
                <div className="mt-7">
                    <h3 className="font-black text-foreground">
                        Friend requests
                    </h3>

                    <div className="mt-3 space-y-3">
                        {data.incoming.map((person) => (
                            <PersonRow
                                key={person.friendship_id}
                                person={person}
                                actions={
                                    <>
                                        <button
                                            type="button"
                                            aria-label="Accept request"
                                            onClick={() =>
                                                runAction(
                                                    `/api/friends/${person.friendship_id}`,
                                                    "PATCH",
                                                )
                                            }
                                            className="rounded-full bg-green-100 p-2 text-green-700"
                                        >
                                            <Check size={18} />
                                        </button>

                                        <button
                                            type="button"
                                            aria-label="Reject request"
                                            onClick={() => 
                                                runAction(
                                                    `/api/friends/${person.friendship_id}`,
                                                    "DELETE",
                                                )
                                            }
                                            className="rounded-full bg-red-100 p-2 text-red-700"
                                        >
                                            <X size={18} />
                                        </button>
                                    </>
                                }
                            />
                        ))}
                    </div>
                </div>
            )}

            {data.outgoing.length > 0 && (
                <div className="mt-7">
                    <h3 className="font-black text-foreground">
                        Sent requests
                    </h3>

                    <div className="mt-3 space-y-3">
                        {data.outgoing.map((person) => (
                            <PersonRow
                                key={person.friendship_id}
                                person={person}
                                actions={
                                    <button
                                        type="button"
                                        onClick={() =>
                                            runAction(
                                                `/api/friends/${person.friendship_id}`,
                                                "DELETE",
                                            )
                                        }
                                        className="text-sm font-bold text-red-600"
                                    >
                                        Cancel
                                    </button>
                                }
                            />
                        ))}
                    </div>
                </div>
            )}

            {search.trim().length >= 2 &&
                data.users.length > 0 && (
                    <div className="mt-7">
                        <h3 className="font-black text-foreground">
                            Search results
                        </h3>

                        <div className="mt-3 space-y-3">
                            {data.users.map((person) => {
                                const unavaliable = 
                                    unavailableIds.has(
                                        person.id,
                                    );

                                return (
                                    <PersonRow 
                                        key={person.id}
                                        person={person}
                                        actions={
                                            unavaliable ? (
                                                <span className="text-xs font-bold text-muted-foreground">
                                                    Connected
                                                </span>
                                            ) : (
                                                <button 
                                                    type="button"
                                                    aria-label="Add friend"
                                                    onClick={() =>
                                                        runAction(
                                                            "/api/friends",
                                                            "POST",
                                                            {
                                                                addresseeId: 
                                                                    person.id
                                                            },
                                                        )
                                                    }
                                                    className="rounded-full bg-indigo-100 p-2 text-indigo-700"
                                                >
                                                    <UserPlus
                                                        size={
                                                            18
                                                        }
                                                    />
                                                </button>
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

            <div className="mt-7">
                <h3 className="font-black text-foreground">
                    Your friends
                </h3>

                {loading ? (
                    <p className="mt-3 text-muted-foreground">
                        Loading...
                    </p>
                ) : data.friends.length === 0 ? (
                    <p className="mt-3 text-muted-foreground">
                        You have not added any friends yet.
                    </p>
                ) : (
                    <div className="mt-3 space-y-3">
                        {data.friends.map((person) => (
                            <PersonRow
                                key={person.friendship_id}
                                person={person}
                                actions={
                                    <button 
                                        type="button"
                                        aria-label="Remove friend"
                                        onClick={() => 
                                            runAction(
                                                `/api/friends/${person.friendship_id}`,
                                                "DELETE",
                                            )
                                        }
                                        className="rounded-full bg-red-50 p-2 text-red-600"
                                    >
                                        <UserMinus size={18} />
                                    </button>
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function PersonRow({
    person,
    actions,
}: {
    person: Person;
    actions: React.ReactNode;
}) {
    const initial =
        person.name?.charAt(0).toUpperCase() ||
        person.email.charAt(0).toUpperCase();

    return (
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-background/40 p-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-black text-white">
                {initial}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-foreground">
                    {person.name}
                </p>

                <p className="truncate text-sm text-muted-foreground">
                    {person.email}
                </p>
            </div>

            <div className="flex items-center gap-2">
                {actions}
            </div>
        </div>
    );
}
