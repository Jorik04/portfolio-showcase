import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireGPIOAcess() {
    const requestHeaders = await headers();

    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session) {
        redirect("/login");
    }

    const roles = 
        session.user.role
            ?.split(",")
            .map((role) => role.trim()) ?? [];

    const canControlGPIO =
        roles.includes("admin") || roles.includes("gpio");

    if (!canControlGPIO) {
        notFound();
    }

    return {
        session,
        requestHeaders,
    };
}