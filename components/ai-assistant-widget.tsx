"use client";

import {
    FormEvent,
    useState,
} from "react";
import { usePathname } from "next/navigation";
import {
    Bot,
    MessageCircle,
    Send,
    X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Message = {
    role: "user" | "assistant";
    content: string;
};

export default function AiAssistant() {
    const pathname = usePathname();
    const { data: session, isPending } =
        authClient.useSession();

    const [open, setOpen] = useState(false);
    const [messages, setMessages] =
        useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const shouldHide = 
        pathname === "/ai" || 
        pathname === "/login" ||
        pathname === "/sign-up" ||
        pathname === "/camera" ||
        /^\/chats\/[^/]+$/.test(pathname);

    if (isPending || !session || shouldHide) {
        return null;
    }

    async function sendMessage(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const message = input.trim();

        if (!message || loading) {
            return;
        }

        setMessages((current) => [
            ...current,
            {
                role: "user",
                content: message,
            },
        ]);

        setInput("");
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message,
                }),
            });

            const data: unknown =
                await response.json();

            if (
                !response.ok ||
                typeof data !== "object" ||
                data === null ||
                !("answer" in data) ||
                typeof data.answer !== "string"
            ) {
                const errorMessage = 
                    typeof data === "object" &&
                    data !== null &&
                    "error" in data &&
                    typeof data.error === "string"
                        ? data.error
                        : "The assistant could not answer.";

                throw new Error(errorMessage);
            }

            const answer = data.answer;

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: answer,
                },
            ]);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "The assistant could not answer.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-5 z-[70] md:bottom-6 md:right-6">
            {open && (
                <section className="mb-4 flex h-[min(32rem,70dvh)] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-border bg-popover text-popover-foreground shadow-2xl">
                    <header className="flex items-center justify-between border-b border-border px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white">
                                <Bot size={19} />
                            </div>

                            <div>
                                <h2 className="font-black">
                                    AI assistant
                                </h2>

                                <p className="text-xs text-muted-foreground">
                                    Ask about this website
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Close AI assistant"
                            className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                            <X size={20} />
                        </button>
                    </header>

                    <div    
                        aria-live="polite"
                        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
                    >
                        {messages.length === 0 && (
                            <div className="m-auto text-center">
                                <Bot
                                    size={34}
                                    className="mx-auto text-indigo-600 dark:text-indigo-400"
                                />

                                <p className="mt-3 font-bold">
                                    How can I help?
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Ask about the website, CV or projects.
                                </p>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <p 
                                key={index}
                                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${
                                    message.role === "user"
                                        ? "ml-auto bg-indigo-600 text-white"
                                        : "mr-auto bg-muted text-foreground"
                                }`}
                            >
                                {message.content}
                            </p>
                        ))}

                        {loading && (
                            <p className="mr-auto rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                                Thinking...
                            </p>
                        )}
                    </div>

                    <div className="border-t border-border p-3">
                        {error && (
                            <p className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        <form
                            onSubmit={sendMessage}
                            className="flex items-end gap-2"
                        >
                            <label
                                htmlFor="widget-ai-message"
                                className="sr-only"
                            >
                                Message
                            </label>

                            <textarea
                                id="widget-ai-message"
                                value={input}
                                onChange={(event) =>
                                    setInput(
                                        event.target.value,
                                    )
                                }
                                disabled={loading}
                                required
                                maxLength={4000}
                                rows={1}
                                placeholder="Ask a question..."
                                className="min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                            />

                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    input.trim().length === 0
                                }
                                aria-label="Send message"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </section>
            )}

            <button
                type="button"
                onClick={() =>
                    setOpen((current) => !current)
                }
                aria-label={
                    open    
                        ? "Close AI assistant"
                        : "Open AI assistant"
                }
                className="ml-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl transition hover:scale-105 hover:bg-indigo-700"
            >
                {open ? (
                    <X size={27} />
                ) : (
                    <MessageCircle size={27} />
                )}
            </button>
        </div>
    );
}
