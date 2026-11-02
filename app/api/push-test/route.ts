import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
    sendPushToUser
} from "@/lib/push-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "Not signed in" },
            { status: 401 },
        );
    }

    const result = await sendPushToUser(
        session.user.id,
        {
            title: "Notifications work! 🎉",
            body:
                "Your device is connected to Jorik's website.",
                url: "/profile",
                tag: "test-notification",
        },
    );

    if (result.sent === 0) {
        return NextResponse.json(
            {
                error :
                    "No notification could be sent. Enable notifications on this device first.",
                details: result,
            },
            { status: 409 },
        );
    }

    return NextResponse.json({
        ok: true,
        details: result,
    });
}