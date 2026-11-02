import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

const ALLOWED_GPIO_PINS = new Set([
    "5",
    "6",
    "16",
    "17",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
]);

async function getAccessError() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const roles =
        session.user.role
            ?.split(",")
            .map((role) => role.trim()) ?? [];

    const canControlGPIO =
        roles.includes("admin") || roles.includes("gpio");

    if (!canControlGPIO) {
        return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 },
        );
    }

    return null;
}

export async function GET() {
    const accessError = await getAccessError();

    if (accessError) {
        return accessError;
    }

    const token = process.env.GPIO_SERVICE_TOKEN;

    if (!token) {
        return NextResponse.json(
            { error: "GPIO service is not configured" },
            { status: 500 },
        );
    }

    try {
        const response = await fetch(
            "http://127.0.0.1:5000/gpio",
            {
                method: "GET",
                headers: {
                    "X-GPIO-Token": token,
                },
                cache: "no-store",
                signal: AbortSignal.timeout(3000),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                {
                    error:
                        data.error ??
                        "Could not read GPIO states",
                },
                { status: 502 },
            );
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: "GPIO service is unavailable" },
            { status: 502 },
        );
    }
}

export async function POST(request: Request) {
    const accessError = await getAccessError();

    if (accessError) {
        return accessError;
    }

    const token = process.env.GPIO_SERVICE_TOKEN;

    if (!token) {
        return NextResponse.json(
            { error: "GPIO service is not configured" },
            { status: 500 },
        );
    }

    let body: {
        name?: unknown;
        on?: unknown;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON" },
            { status: 400 },
        );
    }

    const name = String(body.name ?? "");
    const on = body.on;

    if (
        !ALLOWED_GPIO_PINS.has(name) ||
        typeof on !== "boolean"
    ) {
        return NextResponse.json(
            { error: "Invalid GPIO request" },
            { status: 400 },
        );
    }

    try {
        const response = await fetch(
            "http://127.0.0.1:5000/gpio",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-GPIO-Token": token,
                },
                body: JSON.stringify({ name, on }),
                cache: "no-store",
                signal: AbortSignal.timeout(3000),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                {
                    error:
                        data.error ?? "GPIO request failed",
                },
                { status: 502 },
            );
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json(
            { error: "GPIO service is unavailable" },
            { status: 502 },
        );
    }
}