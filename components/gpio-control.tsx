"use client";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

type PinKind = "gpio" | "ground" | "power";

type HeaderPin = {
    physical: number;
    label: string;
    kind: PinKind;
    bcm?: number;
};

const CONTROLLED_GPIO_PINS = [
    5,
    6,
    16,
    17,
    22,
    23,
    24,
    25,
    26,
    27,
] as const;

type ControlledGPIO =
    (typeof CONTROLLED_GPIO_PINS)[number];

const controlledPinSet = new Set<number>(
    CONTROLLED_GPIO_PINS,
);

const initialStates = Object.fromEntries(
    CONTROLLED_GPIO_PINS.map((pin) => [pin, false]),
) as Record<ControlledGPIO, boolean>;

const PIN_ROWS: Array<[HeaderPin, HeaderPin]> = [
    [
        {
            physical: 1,
            label: "3.3V Power",
            kind: "power",
        },
        {
            physical: 2,
            label: "5V Power",
            kind: "power",
        },
    ],
    [
        {
            physical: 3,
            label: "GPIO 2",
            kind: "gpio",
            bcm: 2,
        },
        {
            physical: 4,
            label: "5V Power",
            kind: "power",
        },
    ],
    [
        {
            physical: 5,
            label: "GPIO 3",
            kind: "gpio",
            bcm: 3,
        },
        {
            physical: 6,
            label: "Ground",
            kind: "ground",
        },
    ],
    [
        {
            physical: 7,
            label: "GPIO 4",
            kind: "gpio",
            bcm: 4,
        },
        {
            physical: 8,
            label: "GPIO 14",
            kind: "gpio",
            bcm: 14,
        },
    ],
    [
        {
            physical: 9,
            label: "Ground",
            kind: "ground",
        },
        {
            physical: 10,
            label: "GPIO 15",
            kind: "gpio",
            bcm: 15,
        },
    ],
    [
        {
            physical: 11,
            label: "GPIO 17",
            kind: "gpio",
            bcm: 17,
        },
        {
            physical: 12,
            label: "GPIO 18",
            kind: "gpio",
            bcm: 18,
        },
    ],
    [
        {
            physical: 13,
            label: "GPIO 27",
            kind: "gpio",
            bcm: 27,
        },
        {
            physical: 14,
            label: "Ground",
            kind: "ground",
        },
    ],
    [
        {
            physical: 15,
            label: "GPIO 22",
            kind: "gpio",
            bcm: 22,
        },
        {
            physical: 16,
            label: "GPIO 23",
            kind: "gpio",
            bcm: 23,
        },
    ],
    [
        {
            physical: 17,
            label: "3.3V Power",
            kind: "power",
        },
        {
            physical: 18,
            label: "GPIO 24",
            kind: "gpio",
            bcm: 24,
        },
    ],
    [
        {
            physical: 19,
            label: "GPIO 10",
            kind: "gpio",
            bcm: 10,
        },
        {
            physical: 20,
            label: "Ground",
            kind: "ground",
        },
    ],
    [
        {
            physical: 21,
            label: "GPIO 9",
            kind: "gpio",
            bcm: 9,
        },
        {
            physical: 22,
            label: "GPIO 25",
            kind: "gpio",
            bcm: 25,
        },
    ],
    [
        {
            physical: 23,
            label: "GPIO 11",
            kind: "gpio",
            bcm: 11,
        },
        {
            physical: 24,
            label: "GPIO 8",
            kind: "gpio",
            bcm: 8,
        },
    ],
    [
        {
            physical: 25,
            label: "Ground",
            kind: "ground",
        },
        {
            physical: 26,
            label: "GPIO 7",
            kind: "gpio",
            bcm: 7,
        },
    ],
    [
        {
            physical: 27,
            label: "GPIO 0",
            kind: "gpio",
            bcm: 0,
        },
        {
            physical: 28,
            label: "GPIO 1",
            kind: "gpio",
            bcm: 1,
        },
    ],
    [
        {
            physical: 29,
            label: "GPIO 5",
            kind: "gpio",
            bcm: 5,
        },
        {
            physical: 30,
            label: "Ground",
            kind: "ground",
        },
    ],
    [
        {
            physical: 31,
            label: "GPIO 6",
            kind: "gpio",
            bcm: 6,
        },
        {
            physical: 32,
            label: "GPIO 12",
            kind: "gpio",
            bcm: 12,
        },
    ],
    [
        {
            physical: 33,
            label: "GPIO 13",
            kind: "gpio",
            bcm: 13,
        },
        {
            physical: 34,
            label: "Ground",
            kind: "ground",
        },
    ],
    [
        {
            physical: 35,
            label: "GPIO 19",
            kind: "gpio",
            bcm: 19,
        },
        {
            physical: 36,
            label: "GPIO 16",
            kind: "gpio",
            bcm: 16,
        },
    ],
    [
        {
            physical: 37,
            label: "GPIO 26",
            kind: "gpio",
            bcm: 26,
        },
        {
            physical: 38,
            label: "GPIO 20",
            kind: "gpio",
            bcm: 20,
        },
    ],
    [
        {
            physical: 39,
            label: "Ground",
            kind: "ground",
        },
        {
            physical: 40,
            label: "GPIO 21",
            kind: "gpio",
            bcm: 21,
        },
    ],
];

export default function GPIOControl() {
    const [pinStates, setPinStates] =
        useState(initialStates);

    const [loadingPin, setLoadingPin] =
        useState<ControlledGPIO | null>(null);

    const [message, setMessage] = useState("");

    const refreshPinStates = useCallback(async () => {
        try {
            const response = await fetch("/api/gpio", {
                method: "GET",
                cache: "no-store",
            });

            if (!response.ok) {
                return;
            }

            const data: Record<string, unknown> =
                await response.json();

            setPinStates((current) => {
                const updated = { ...current };

                for (const pin of CONTROLLED_GPIO_PINS) {
                    const realState = data[String(pin)];

                    if (typeof realState === "boolean") {
                        updated[pin] = realState;
                    }
                }

                return updated;
            });
        } catch {
            // Ignore temporary polling errors.
        }
    }, []);

    useEffect(() => {
        const initialRefresh = window.requestAnimationFrame(() => {
            void refreshPinStates();
        });
        
        const timer = window.setInterval(() => {
            void refreshPinStates();
        }, 2000);

        return () => {
            window.cancelAnimationFrame(initialRefresh);
            window.clearInterval(timer);
        };
    }, [refreshPinStates]);

    async function togglePin(pin: ControlledGPIO) {
        const nextState = !pinStates[pin];

        setLoadingPin(pin);
        setMessage("");

        try {
            const response = await fetch("/api/gpio", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: String(pin),
                    on: nextState,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ?? "GPIO request failed",
                );
            }

            setPinStates((current) => ({
                ...current,
                [pin]: data.on,
            }));

            await refreshPinStates();

            setMessage(
                `GPIO ${pin} turned ${
                    data.on ? "on" : "off"
                }`,
            );
        } catch (error) {
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Something went wrong",
            );
        } finally {
            setLoadingPin(null);
        }
    }

    function pinCircle(pin: HeaderPin) {
        const isControlled =
            pin.bcm !== undefined &&
            controlledPinSet.has(pin.bcm);

        if (isControlled) {
            const bcm = pin.bcm as ControlledGPIO;
            const isOn = pinStates[bcm];
            const loading = loadingPin === bcm;

            return (
                <button
                    type="button"
                    aria-label={`Toggle BCM GPIO ${bcm}, physical pin ${pin.physical}`}
                    aria-pressed={isOn}
                    disabled={loading}
                    onClick={() => togglePin(bcm)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black transition ${
                        isOn
                            ? "bg-green-500 text-white shadow-[0_0_18px_rgba(34,197,94,0.8)]"
                            : "bg-muted text-foreground ring-2 ring-indigo-500"
                    } hover:scale-110 disabled:animate-pulse disabled:opacity-50`}
                >
                    {pin.physical}
                </button>
            );
        }

        let color = "bg-sky-500 text-white";

        if (pin.kind === "ground") {
            color = "bg-slate-800 text-white";
        } else if (pin.label.includes("3.3V")) {
            color = "bg-yellow-500 text-slate-950";
        } else if (pin.label.includes("5V")) {
            color = "bg-red-500 text-white";
        }

        return (
            <span
                title={`${pin.label}, physical pin ${pin.physical}`}
                className={`flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full text-sm font-bold opacity-60 ${color}`}
            >
                {pin.physical}
            </span>
        );
    }

    return (
        <section className="w-full max-w-3xl rounded-3xl border border-border bg-card p-4 text-card-foreground shadow-xl sm:p-8">
            <div className="text-center">
                <h1 className="text-3xl font-black">
                    Raspberry Pi Pinout
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Click an outlined GPIO pin to toggle it
                </p>
            </div>

            <div className="mt-8 rounded-3xl bg-emerald-950 p-3 text-white sm:p-6">
                <div className="space-y-2">
                    {PIN_ROWS.map(
                        ([leftPin, rightPin]) => (
                            <div
                                key={leftPin.physical}
                                className="grid grid-cols-[minmax(0,1fr)_40px_40px_minmax(0,1fr)] items-center gap-2"
                            >
                                <span className="truncate text-right text-xs font-semibold sm:text-sm">
                                    {leftPin.label}
                                </span>

                                {pinCircle(leftPin)}
                                {pinCircle(rightPin)}

                                <span className="truncate text-left text-xs font-semibold sm:text-sm">
                                    {rightPin.label}
                                </span>
                            </div>
                        ),
                    )}
                </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span>🟢 On</span>
                <span>⭕ Controlled/off</span>
                <span>🔵 Unconfigured GPIO</span>
                <span>⚫ Ground</span>
                <span>🔴/🟡 Power</span>
            </div>

            {message && (
                <p className="mt-5 text-center font-semibold text-foreground">
                    {message}
                </p>
            )}
        </section>
    );
}
