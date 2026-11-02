"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type NotificationStatus = 
    | "checking"
    | "unsupported"
    | "needs-install"
    | "disabled"
    | "enabled";


function urlBase64ToUint8Array(
    base64String: string,
) {
    const padding = "=".repeat(
        (4 - (base64String.length % 4)) % 4,
    );

    const base64 = (
        base64String + padding
    )
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const output = new Uint8Array(
        rawData.length,
    );

    for (
        let index = 0;
        index < rawData.length;
        index += 1
    ) {
        output[index] = 
            rawData.charCodeAt(index);
    }

    return output;
}

async function saveSubscription(
    subscription: PushSubscription,
) {
    const response = await fetch (
        "/api/push-subscription",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(
                subscription.toJSON(),
            ),
        },
    );

    const result = await response.json();

    if (!response.ok ) {
        throw new Error(
            result.error ??
                "Could not save notification settings.",
        );
    }
}

export default function NotificationSettings() {
    const [status, setStatus] =
        useState<NotificationStatus>("checking");

    const [working, setWorking] =
        useState(false);
    
    const [message, setMessage] =
        useState("");

    useEffect(() => {
        async function checkNotifications() {
            const isIOS = 
                /iPad|iPhone|iPod/.test(
                    navigator.userAgent,
                );

            const navigatorWIthStandAlone =
                navigator as Navigator & {
                    standalone?:boolean;
                };

            const isStandalone = 
                window.matchMedia(
                    "(display-mode: standalone)",
                ).matches ||
                navigatorWIthStandAlone.standalone ===
                    true;

            if (isIOS && !isStandalone) {
                setStatus("needs-install");
                return;
            }

            if (
                !("serviceWorker" in navigator) ||
                !("PushManager" in window) ||
                !("Notification" in window)
            ) {
                setStatus("unsupported");
                return;
            }

            try {
                const registration = 
                    await navigator.serviceWorker.register(
                        "/sw.js",
                        {
                            scope: "/",
                            updateViaCache: "none",
                        },
                    );

                const subscription =
                    await registration.pushManager
                        .getSubscription();

                if (subscription) {
                    await saveSubscription(
                        subscription,
                    );

                    setStatus("enabled");
                } else {
                    setStatus("disabled");
                }
            } catch {
                setStatus("disabled");
            }
        }

        void checkNotifications();
    }, []);

    async function enableNotifications() {
        setWorking(true);
        setMessage("");

        try {
            const publicKey = 
                process.env
                    .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

            if (!publicKey) {
                throw new Error(
                    "The notification public key is missing."
                );
            }

            const permission =
                await Notification.requestPermission();

            if (permission !== "granted") {
                throw new Error (
                    "Notification permission was not granted.",
                );
            }

            const registration =
                await navigator.serviceWorker.register(
                    "/sw.js",
                    {
                        scope: "/",
                        updateViaCache: "none",
                    },
                );

            const existingSubscription =
                await registration.pushManager
                    .getSubscription();

            const subscription =
                existingSubscription ??
                (await registration.pushManager
                    .subscribe({
                        userVisibleOnly: true,
                        applicationServerKey:
                            urlBase64ToUint8Array(
                                publicKey,
                            ),
                    }));
            await saveSubscription(subscription);

            setStatus("enabled");
            setMessage(
                "Notifications are enabled on this device.",
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ?error.message
                    : "Could not enable notifications.",
            );
        } finally {
            setWorking(false);
        }
    }

    async function disableNotifications() {
        setWorking(true);
        setMessage("");

        try {
            const registration = 
                await navigator.serviceWorker.ready;

            const subscription = 
                await registration.pushManager
                    .getSubscription();

            if (subscription) {
                const response = await fetch(
                    "/api/push-subscription",
                    {
                        method: "DELETE",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify({
                            endpoint:
                                subscription.endpoint,
                        }),
                    },
                );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error ??
                            "Could not disable notifications.",
                    );
                }

                await subscription.unsubscribe();
            }

            setStatus("disabled");
            setMessage("Notifications are disabled on this device.");
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not disable notifications.",
            );
        } finally {
            setWorking(false);
        }
    }

    async function sendTestNotification() {
        setWorking(true);
        setMessage("");

        try {
            const response = await fetch(
                "/api/push-test",
                {
                    method: "POST",
                },
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error ??
                        "Could not send test notification.",
                );
            }

            setMessage("Test notification sent.");
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not send test notification.",
            );
        } finally {
            setWorking(false);
        }
    }

    return (
        <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                    <Bell size={28} />
                </div>

                <div>
                    <h2 className="text-xl font-black">
                        Notifications
                    </h2>

                    <p className="text-muted-foreground">
                        Receive friend and photo updates.
                    </p>
                </div>
            </div>

            {status === "needs-install" && (
                <p className="mt-5 rounded-xl bg-amber-500/10 p-4 font-semibold text-amber-800 dark:text-amber-300">
                    On iPhone, add this website to your
                    Home Screen first. Then open the
                    installed app and enable notifications.
                </p>
            )}

            {status === "unsupported" && (
                <p className="mt-5 rounded-xl bg-muted p-4 text-foreground">
                    Notifications are not supported by
                    this browser.
                </p>
            )}

            {status === "disabled" && (
                <button
                    type="button"
                    disabled={working}
                    onClick={enableNotifications}
                    className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    <Bell size={19} />

                    {working
                        ? "Enabling..."
                        : "Enable notifications"}
                </button>
            )}

            {status === "enabled" && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        disabled={working}
                        onClick={sendTestNotification}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {working
                            ? "Sending..."
                            : "Send test notification"}
                    </button>

                    <button
                        type="button"
                        disabled={working}
                        onClick={disableNotifications}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 font-bold text-secondary-foreground hover:bg-accent disabled:opacity-50"
                    >
                        <BellOff size={19} />

                        {working
                            ? "Disabling..."
                            : "Disable notifications"}
                    </button>
                </div>
            )}

            {message && (
                <p  
                    aria-live="polite"
                    className="mt-4 rounded-xl bg-muted p-3 text-sm font-semibold text-foreground"
                >
                    {message}
                </p>
            )}

        </section>
    );


}
