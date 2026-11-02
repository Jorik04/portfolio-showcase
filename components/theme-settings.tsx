"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const themeOptions = [
    {
        value: "system",
        label: "System",
        description: "Follow this device",
        Icon: Monitor,
    },
    {
        value: "light",
        label: "Light",
        description: "Always use light mode",
        Icon: Sun,
    },
    {
        value: "dark",
        label: "Dark",
        description: "Always use dark mode",
        Icon: Moon,
    },
] as const;

export default function ThemeSettings() {
    const { theme, setTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false,
    );

    return (
        <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    <Moon size={28} />
                </div>

                <div>
                    <h2 className="text-xl font-black">
                        Appearance
                    </h2>

                    <p className="text-muted-foreground">
                        Choose how the app looks on this device.
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {themeOptions.map(
                    ({
                        value,
                        label,
                        description,
                        Icon,
                    }) => {
                        const active = 
                            mounted && theme === value;
                        
                        return (
                            <button
                                key={value}
                                type="button"
                                disabled={!mounted}
                                onClick={() => 
                                    setTheme(value)
                                }
                                className={`flex flex-col items-center rounded-2xl border p-4 text-center transition disabled:opacity-50 ${
                                    active
                                        ? "border-indigo-600 bg-indigo-600 text-white"
                                        : "border-border bg-muted text-foreground hover:border-indigo-300 hover:bg-accent"
                                }`}
                            >
                                <Icon size={23} />

                                <span className="mt-2 font-black">
                                    {label}
                                </span>

                                <span
                                    className={`mt-1 text-xs ${
                                        active
                                            ? "text-indigo-100"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {description}
                                </span>
                            </button>
                        );
                    },
                )}
            </div>
        </section>
    );
}
