"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, UserRound } from "lucide-react"

type Message = {
    role: "user" | "assistant";
    content: string;
}

type AiChatProps = {
    userName: string;
};

export default function AiChat({
    userName,
}: AiChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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

            const data: unknown = await response.json();

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
                    : "The assistant could not answer."
            )
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-full flex-1 bg-muted/40 px-4 py-8">
            <section className="mx-auto flex min-h-[70dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm">
                <header className="border-b border-border px-6 py-5">
                    <h1 className="text-2xl font-black">
                        AI assistant
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Chatting as {userName}
                    </p>
                </header>

                <div 
                    aria-live="polite"
                    className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6"
                >
                    {messages.length === 0 && (
                        <div className="m-auto text-center">
                            <Bot
                                size={42}
                                className="mx-auto text-indigo-600 dark:text-indigo-400"
                            />

                            <h2 className="mt-4 text-xl font-black">
                                What can I help with?
                            </h2>
                        </div>
                    )}

                    {messages.map((message, index) => (
                        <article
                            key={index}
                            className={`flex max-w-[85%] gap-3 ${
                                message.role === "user"
                                    ? "ml-auto flex-row-reverse"
                                    : "mr-auto"
                            }`}
                        >
                            <div 
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                    message.role === "user"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-muted text-foreground"
                                }`}
                            >
                                {message.role === "user" ? (
                                    <UserRound size={18} />
                                ) : (
                                    <Bot size={18} />
                                )}
                            </div>

                            <p
                                className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                                    message.role === "user"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-muted text-foreground"
                                }`}
                            >
                                {message.content}
                            </p>
                        </article>
                    ))}

                    {loading && (
                        <p className="text-sm text-muted-foreground">
                            The assistant is thinking...
                        </p>
                    )}
                </div>

                <div className="border-t border-border p-4">
                    {error && (
                        <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">
                            {error}
                        </p>
                    )}

                    <form
                        onSubmit={sendMessage}
                        className="flex items-end gap-3"
                    >
                        <label
                            htmlFor="ai-message"
                            className="sr-only"
                        >
                            Message
                        </label>

                        <textarea
                            id="ai-message"
                            value={input}
                            onChange={(event) =>
                                setInput(event.target.value)
                            }
                            disabled={loading}
                            required
                            maxLength={4000}
                            rows={2}
                            placeholder="Ask me anything..."
                            className="min-h-14 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                        />

                        <button
                            type="submit"
                            disabled={
                                loading ||
                                input.trim().length === 0
                            }
                            aria-label="Send message"
                            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Send size={21} />
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}