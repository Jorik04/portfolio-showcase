"use client";

import Link from "next/link"
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SignUpForm() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setLoading(true);


        const form = new FormData(event.currentTarget);

        const name = String(form.get("name"));
        const email = String(form.get("email"));
        const password = String(form.get("password"));

        const result = await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: "/",
        });

        if (result.error) {
            setError(result.error.message || "Could not create account.");
            setLoading(false);
            return;
        }

        setVerificationEmail(email);
        setLoading(false);
    }

    if (verificationEmail) {
        return (
            <main className="flex min-h-0 flex-1 overflow-hidden items-center justify-center bg-muted/50 px-5">
                <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center text-card-foreground shadow-xl">
                    <h1 className="text-3xl font-black">
                        Check your email
                    </h1>

                    <p className="mt-4 leading-7 text-muted-foreground">
                        We sent a verification link to{" "}
                        <strong className="text-foreground">
                            {verificationEmail}
                        </strong>
                        . Open it to activate your account.
                    </p>

                    <Link
                        href="/login"
                        className="mt-7 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700"
                    >
                        Return to sign in
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="flex min-h-0 flex-1 overflow-hidden items-center justify-center bg-muted/50 px-5">
            <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-xl">
                <h1 className="text-center text-3xl font-black">
                    Create an account
                </h1>

                <p className="mt-2 text-center text-muted-foreground">
                    Enter your details to get started.
                </p>

                <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                    <input
                        name="name"
                        type="text"
                        required
                        placeholder="Your name"
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                    />

                    <input
                        name="email"
                        type="email"
                        required
                        placeholder="Email address"
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                    />

                    <input
                        name="password"
                        type="password"
                        required
                        minLength={8}
                        maxLength={128}
                        autoComplete="new-password"
                        placeholder="Password - at least 8 characters"
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                    />

                    {error && (
                        <p className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="font-bold text-indigo-600">
                        Sign in
                    </Link>
                </p>
            </section>
        </main>
    );
}
