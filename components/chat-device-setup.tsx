"use client";

import { useCallback, useEffect, useState } from "react";
import {
    CheckCircle2,
    KeyRound,
    LoaderCircle,
    RefreshCw,
    TriangleAlert,
} from "lucide-react";

import {
    getChatDevicePublicBundle,
} from "@/lib/chat-device-keys";

type RegistrationStatus =
    | "loading"
    | "ready"
    | "error";

type RegisteredDevice = {
    id: string;
    deviceName: string;
    createdAt: string;
    lastSeenAt: string;
};

export default function ChatDeviceSetup() {
    const [status, setStatus] = 
        useState<RegistrationStatus>("loading");

    const [device, setDevice] =
        useState<RegisteredDevice | null>(null);
    const [error, setError] = useState("");
    
    const registeredDevice = useCallback(
        async () => {
            setStatus("loading");
            setError("");

            try {
                const publicBundle = 
                    await getChatDevicePublicBundle();

                    const response = await fetch(
                        "/api/chats/devices",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json",
                            },

                            body: JSON.stringify(
                                publicBundle,
                            ),
                        },
                    );

                    const contentType =
                        response.headers.get("content-type") ?? "";

                    if (!contentType.includes("application/json")) {
                        const responseText = await response.text();

                        console.error(
                            "Chat API returned a non-JSON response:",
                            response.status,
                            responseText,
                        );

                        throw new Error(
                            `Chat API returned HTTP ${response.status}. Check the server terminal.`,
                        );
                    }

                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            data.error ??
                                "Could not register this device.",
                        );
                    }

                    setDevice(data.device);
                    setStatus("ready");
            } catch (error) {
                console.error(
                    "Chat device registration failed:",
                    error,
                );

                setError(
                    error instanceof Error
                        ? error.message
                        : "Could not prepare secure chats.",
                );

                setStatus("error");
            }
        },
        [],
    );

    useEffect(() => {
        // Register or retrieve this browser's external chat device.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void registeredDevice();
    }, [registeredDevice]);

    if (status === "loading") {
        return (
            <section className="flex items-center gap-4 rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
                    <LoaderCircle
                        size={24}
                        className="animate-spin"
                    />
                </div>

                <div>
                    <h2 className="font-black text-foreground">
                        Preparing secure chats
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Creating or loading this device&apos;s
                        private keys.
                    </p>
                </div>
            </section>
        );
    }

    if (status === "error") {
        return (
            <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                        <TriangleAlert size={24} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="font-black text-foreground">
                            Secure chat setup failed
                        </h2>

                        <p className="mt-1 break-words text-sm text-red-500">
                            {error}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        void registeredDevice();
                    }}
                    className="mt-5 flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-bold text-background"
                >
                    <RefreshCw size={17} />
                    Try again
                </button>
            </section>
        );
    }

    return (
        <section className="flex items-center gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <KeyRound size={23} />

                <CheckCircle2
                    size={16}
                    className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background"
                />
            </div>

            <div className="min-w-0">
                <h2 className="font-black text-foreground">
                    This device is registered
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {device?.deviceName}
                </p>

                <p className="mt-1 truncate font-mono text-xs text-muted-foreground/70">
                    {device?.id}
                </p>
            </div>
        </section>
    );
}