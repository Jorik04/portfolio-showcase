"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Settings } from "lucide-react";
import { authClient } from "@/lib/auth-client"
import { useEffect, useRef } from "react";

type PageAccess = "public" | "signedIn" | "admin" | "gpio";

type NavigationPage = {
    href: string;
    label: string;
    access: PageAccess;
}
const allPages: NavigationPage[] = [
    //{ href: "/", label: "Home", access: "public" },
    //{ href: "/game", label: "Game", access: "public" },
    { href: "/admin/gpio", label: "GPIO", access: "gpio"},
    { href: "/stats", label: "Stats", access: "admin" },
    { href: "/admin", label: "Admin", access: "admin" },
    //{ href: "/photo-wall", label: "Photos", access: "signedIn", },
    { href: "/ai", label: "AI", access: "signedIn" },
    { href: "/cv", label: "CV", access: "public" },
    { href: "/projects", label: "Projects", access: "public" },
    { href: "/about", label: "About", access: "public" },
];

type SiteHeaderProps = {
    canControlGPIO: boolean;
    isAdmin: boolean;
}

export default function SiteHeader({
    canControlGPIO,
    isAdmin,
}: SiteHeaderProps) {
    const pathname = usePathname();
    const { data: session, isPending } = authClient.useSession();
    const profileMenuRef = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        profileMenuRef.current?.removeAttribute("open");
    }, [pathname]);

    useEffect(() => {
        function closeProfileMenu(event: PointerEvent) {
            const profileMenu = profileMenuRef.current;

            if (
                profileMenu?.open &&
                event.target instanceof Node &&
                !profileMenu.contains(event.target)
            ) {
                profileMenu.removeAttribute("open");
            }
        }

        function closeProfileMenuWithEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                profileMenuRef.current?.removeAttribute("open");
            }
        }

        document.addEventListener("pointerdown", closeProfileMenu);
        document.addEventListener("keydown", closeProfileMenuWithEscape);

        return () => {
            document.removeEventListener("pointerdown", closeProfileMenu);
            document.removeEventListener("keydown", closeProfileMenuWithEscape);
        };
    }, []);

    const pages = allPages.filter((page) => {
        if (page.access === "public") {
            return true;
        }

        if (page.access === "gpio") {
            return canControlGPIO;
        }

        if (page.access === "admin") {
            return isAdmin;
        }

        if (page.access === "signedIn") {
            return Boolean(session);
        }

        return false;
    });

    async function signOut() {
        await authClient.signOut();
        window.location.assign("/login");
    }

    const initial = 
        session?.user.name?.charAt(0).toUpperCase() ||
        session?.user.email?.charAt(0).toUpperCase() ||
        "?";

    return (
        <header className="browser-only sticky top-0 z-50 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
                <Link href="/" className="text-lg font-black text-indigo-600">
                    My App
                </Link>

                {/* Desktop navigation */}

                <nav className="hidden flex-1 items-center gap-1 md:flex">
                    {pages.map((page) => {
                        const active = pathname === page.href;

                        return (
                            <Link
                                key={page.href}
                                href={page.href}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                    active
                                        ? "bg-indigo-100 text-indigo-700"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                            >
                                {page.label}
                            </Link>   
                        );
                    })}
                </nav>

                {/* mobile navigatio */}
                <details 
                    name="header-menu"
                    className="relative ml-auto md:hidden"
                >
                    <summary className="flex cursor-pointer list-none items-center justify-center rounded-full p-2 text-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
                        <Menu size={23} />
                    </summary>

                    <nav className="absolute right-0 mt-3 w-52 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
                        {pages.map((page) => (
                            <Link
                                key={page.href}
                                href={page.href}
                                onClick={(event) =>
                                    event.currentTarget.closest("details")?.removeAttribute("open")
                                }
                                className={`block rounded-xl px-4 py-3 font-semibold ${
                                    pathname === page.href
                                        ? "bg-indigo-100 text-indigo-700"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                            >
                                {page.label}
                            </Link>
                        ))}
                    </nav>
                </details>

                {/* account area */}
                {isPending ? (
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                ) : session ? (
                    <details 
                        name="header-menu"
                        ref={profileMenuRef}
                        className="relative"
                    >
                        <summary
                            aria-label="Open profile menu"
                            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-indigo-600 font-bold text-white hover:bg-indigo-700 [&::-webkit-details-marker]:hidden"
                        >
                            {initial}
                        </summary>

                        <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl">
                            <div className="border-b border-border px-3 py-3">
                                <p className="truncate font-bold text-foreground">
                                    {session.user.name}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {session.user.email}
                                </p>
                            </div>

                            <Link
                                href="/profile"
                                onClick={(event) =>
                                    event.currentTarget.closest("details")?.removeAttribute("open")
                                }
                                className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-foreground hover:bg-accent"
                            >
                                <Settings size={19} />
                                Profile settings
                            </Link>

                            <button
                                type="button"
                                onClick={signOut}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400"
                            >
                                <LogOut size={19} />
                                Sign out
                            </button>
                        </div>
                    </details>
                ) : (
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        <Link   
                            href="/login"
                            className="rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-accent sm:px-3 sm:text-base"
                        >
                            Sign in
                        </Link>

                        <Link
                            href="/sign-up"
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:px-4 sm:text-base"
                        >
                            Sign up
                        </Link>
                    </div>
                )}
            </div>
        </header>
    );
}
