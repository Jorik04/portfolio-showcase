"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppTopBar() {
    const pathname = usePathname();

    const isConversation =
        /^\/chats\/[^/]+$/.test(pathname);

    const hideTopBar =
        isConversation || 
        pathname === "/login" ||
        pathname === "/sign-up";

    if (hideTopBar) {
        return null;
    }

    return (
        <header className="app-only z-50 shrink-0 items-center border-b border-border/50 bg-background/85 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
            <Link
                href="/"
                aria-label="Go to the photo wall"
                className="text-2xl font-black tracking-tight text-foreground"
            >
                My App
            </Link>
        </header>
        
    );
}
