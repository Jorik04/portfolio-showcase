import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAdmin() {
    const requestHeaders = await headers();

    const session = await auth.api.getSession({
        headers: requestHeaders,
    });

    if (!session) {
        redirect("/login");
    }

    const roles = session.user.role
        ?.split(",")
        .map((role) => role.trim()) ?? [];

    if (!roles.includes("admin")) {
        notFound();
    }

    return {
        session,
        requestHeaders,
    };
}