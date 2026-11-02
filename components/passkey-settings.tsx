"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type UserPasskey = {
    id: string;
    name?: string | null;
};

export default function PasskeySettings() {
    const [passkeys, setPasskeys] = useState<UserPasskey[]>([]);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function loadPasskeys() {
        const result =
            await authClient.passkey.listUserPasskeys();

        if (result.data) {
            setPasskeys(result.data);
        }
    }

    useEffect(() => {
        // Synchronize the component with passkeys stored by Better Auth.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadPasskeys();
    }, []);

    async function addPasskey() {
        setLoading(true);
        setMessage("");

        try {
            const result = await authClient.passkey.addPasskey({
                name: "My passkey",
            });

            if (result.error) {
                setMessage(
                    result.error.message ||
                    "Could not create the passkey.",
                );
                return;
            }

            setMessage("Passkey added successfully.");
            await loadPasskeys();
        } catch {
            setMessage("Passkey creation was cancelled.")
        } finally {
            setLoading(false);
        }
    }

    async function deletePasskey(id: string) {
        const result =
            await authClient.passkey.deletePasskey({ id });

        if (result.error) {
            setMessage(
                result.error.message ||
                "Could not delete the passkey.",
            );
            return;
        }

        setMessage("Passkey deleted.");
        await loadPasskeys();
    }

    return (
        <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex size-14 items-center jusify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <KeyRound size={26} />
                </div>

                <div>
                    <h2 className="text-xl font-black">
                        Passkeys
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        Sign in using your fingerprint, face,
                        device PIN or security key.
                    </p>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {passkeys.map((passkey) => (
                    <div
                        key={passkey.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
                    >
                        <span className="font-semibold">
                            {passkey.name || "Passkey"}
                        </span>

                        <button
                            type="button"
                            aria-label="Delete passkey"
                            onClick={() =>
                                void deletePasskey(passkey.id)
                            }
                            className="rounded-lg p-2 text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                {passkeys.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        You haven&apos;t added a passkey yet.
                    </p>
                )}
            </div>

            {message && (
                <p className="mt-4 rounded-xl bg-muted p-3 text-sm font-semibold text-foreground">
                    {message}
                </p>
            )}

            <button
                type="button"
                onClick={() => void addPasskey()}
                disabled={loading}
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
                {loading ? "Creating..." : "Add a passkey"}
            </button>
        </section>
    );
}