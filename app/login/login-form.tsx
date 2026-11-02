"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [resetError, setResetError] = useState("");
    const [sendingReset, setSendingReset] = useState(false);

    async function signInWithPasskey() {
        setError("");
        setPasskeyLoading(true);

        try {
            const result = await authClient.signIn.passkey();

            if (result?.error) {
                setError(
                    result.error.message ||
                    "Could not sign in with your passkey.",
                );
                return;
            }

            window.location.assign("/");
        } catch {
            setError("Passkey sign-in was cancelled or unavailable.");
        } finally {
            setPasskeyLoading(false);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setLoading(true);


        const form = new FormData(event.currentTarget);

        const email = String(form.get("email"));
        const password = String(form.get("password"));

        const result = await authClient.signIn.email({
            email,
            password,
            rememberMe: true,
        });

        if (result.error) {
            const needsVerification = 
                result.error.status === 403 ||
                result.error.code === "EMAIL_NOT_VERIFIED";

            setError(
                needsVerification
                    ? "Please verify your email. We sent you a new verification link."
                    : "Incorrect email or password."
            );

            setLoading(false);
            return;
        }

        window.location.assign("/");
    }

    async function requestPasswordReset(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setSendingReset(true);
        setResetMessage("");
        setResetError("");

        const result = await authClient.requestPasswordReset({
            email: resetEmail.trim(),
            redirectTo: "/reset-password",
        });

        if (result.error) {
            setResetError(
                result.error.message ||
                "Could not send the password reset email.",
            );
        } else {
            setResetMessage(
                "If an account exists for this email, a password reset link has been sent.",
            );
        }

        setSendingReset(false);
    }

    return (
        <main className="flex min-h-0 flex-1 overflow-hidden items-center justify-center bg-muted/50 px-5">
            <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-xl">
                <h1 className="text-center text-3xl font-black">
                    Welcome Back
                </h1>

                <p className="mt-2 text-center text-muted-foreground">
                    Sign in to your account.
                </p>

                <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                    <input
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="Email address"
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                    />

                    <input
                        name="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="Password"
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                    />

                    <div className="text-right">
                        <button 
                            type="button"
                            onClick={() => {
                                setResetEmail("");
                                setResetMessage("");
                                setResetError("");
                                setForgotPasswordOpen(true);
                            }}
                            className="text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            Forgot password?
                        </button>
                    </div>

                    {error && (
                        <p className="rounded-xl bg-red-500/10 p-3 font-semibold text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-sm text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <button
                    type="button"
                    onClick={() => void signInWithPasskey()}
                    disabled={passkeyLoading}
                    className="w-full rounded-xl border border-input bg-background px-5 py-3 font-bold text-foreground transition hover:bg-accent disabled:opacity-50"
                >
                    {passkeyLoading
                        ? "Opening passkey..."
                        : "Sign in with a passkey"}
                </button>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Don&apos;t have an account{" "}
                    <Link href="/sign-up" className="font-bold text-indigo-600">
                        Create one
                    </Link>
                </p>
            </section>

            {forgotPasswordOpen && (
                <div
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !sendingReset) {
                            setForgotPasswordOpen(false);
                        }
                    }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm"
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="forgot-password-title"
                        className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-2xl"
                    >
                        <h2
                            id="forgot-password-title"
                            className="text-2xl font-black"
                        >
                            Reset your password
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Enter the email address connected to your account.
                            We&apos;ll send you a password reset link.
                        </p>

                        <form
                            onSubmit={requestPasswordReset}
                            className="mt-6 space-y-4"
                        >
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(event) => setResetEmail(event.target.value)}
                                required
                                autoFocus
                                autoComplete="email"
                                placeholder="Email address"
                                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                            />

                            {resetMessage && (
                                <p className="rounded-xl bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                    {resetMessage}
                                </p>
                            )}

                            {resetError && (
                                <p className="rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-400">
                                    {resetError}
                                </p>
                            )}

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setForgotPasswordOpen(false)}
                                    disabled={sendingReset}
                                    className="rounded-xl border-border-input bg-background px-5 py-3 font-bold text-foreground hover:bg-accent disabled:opacity-50"
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        sendingReset ||
                                        Boolean(resetMessage)
                                    }
                                    className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {sendingReset
                                        ? "Sending..."
                                        : "Send reset link"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}
