"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type ResetPasswordFormProps = {
    token?: string;
    tokenError?: string;
};

export default function ResetPasswordForm({
    token,
    tokenError
}: ResetPasswordFormProps) {
    const [error, setError] = useState("");
    const [sucess, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function resetPassword(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!token) {
            setError(
                "This password reset link is invalid or has expired.",
            );
            return;
        }

        const form = new FormData(event.currentTarget);
        const password = String(form.get("password"));
        const confirmPassword = String(
            form.get("confirmPassword")
        );

        if (password !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        setError("");
        setLoading(true);

        const result = await authClient.resetPassword({
            newPassword: password,
            token,
        });

        if (result.error) {
            setError(
                result.error.message ||
                "This password reset link is invalid or has expired.",
            );
            setLoading(false);
            return;
        }

        await authClient.signOut();

        setSuccess(true);
        setLoading(false);
    }

    if (sucess) {
        return (
            <main className="flex min-h-0 flex-1 overflow-hidden items-center justify-center bg-muted/50 px-5">
                <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center text-card-foreground shadow-xl">
                    <h1 className="text-3xl font-black">
                        Password changed
                    </h1>

                    <p className="mt-3 text-muted-foreground">
                        Your password has been updated successfully.
                    </p>

                    <Link
                        href="/login"
                        className="mt-7 inline-flex rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700"
                    >
                        Sign in
                    </Link>
                </section>
            </main>
        );
    }

    const invalidToken =
        !token || tokenError === "INVALID_TOKEN";

    return (
        <main className="flex min-h-0 flex-1 overflow-hidden items-center justify-center bg-muted/50 px-5">
            <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center text-card-foreground shadow-xl">
                <h1 className="text-center text-3xl font-black">
                    Choose a new password
                </h1>

                {invalidToken ? (
                    <>
                        <p className="mt-4 rounded-xl bg-red-500/10 p-4 text-sm font-semibold text-red-600 dark:text-red-400">
                            This password reset link is invalid or
                            has expired.
                        </p>

                        <Link
                            href="/login"
                            className="mt-6 inline-flex w-full justify-center rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700"
                        >
                            Return to sign in
                        </Link>
                    </>
                ) : (
                    <form 
                        onSubmit={resetPassword}
                        className="mt-7 space-y-4"
                    >

                        <input 
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            placeholder="New password"
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-indigo-500"
                        />

                        <input 
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            placeholder="Confirm new password"
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
                            className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading 
                                ? "Changing password..."
                                : "Change password"}
                        </button>
                    </form>
                )}
            </section>
        </main>
    );
}