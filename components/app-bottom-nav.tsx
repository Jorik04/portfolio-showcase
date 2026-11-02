"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { 
    Home,
    Camera,
    MessageCircle,
    UserRound,
} from "lucide-react";

const BOTTOM_NAV_OVERLAY_EVENT =
    "app-bottom-nav-overlay-change";


const navigation = [
    {
        href: "/",
        label: "Home",
        icon: Home,
    },
    {
        href: "/camera",
        label: "Camera",
        icon: Camera,
    },
    {
        href: "/chats",
        label: "Chats",
        icon: MessageCircle,
    },
    {
        href: "/profile",
        label: "Profile",
        icon: UserRound,
    },
];

function routeIsActive(
    pathname: string,
    href: string,
) {
    if (href === "/") {
        return pathname === "/";
    }

    return pathname.startsWith(href);
}

export default function AppBottomNav() {
    const pathname = usePathname();

    const [hiddenByScroll, setHiddenByScroll] = useState(false);
    const [hiddenByOverlay, setHiddenByOverlay] = useState(false);
    const lastScrollY = useRef(0);

    const isConversation =
        /^\/chats\/[^/]+$/.test(pathname);

    const isCamera = pathname === "/camera";

    const isAuthRoute =
        pathname === "/login" ||
        pathname === "/sign-up" ||
        pathname.startsWith("/reset-password");


    useEffect(() => {
        function updateOverlayVisibility() {
            setHiddenByOverlay(
                document.body.classList.contains(
                    "app-bottom-nav-overlay-open",
                ),
            );
        }

        updateOverlayVisibility();

        window.addEventListener(
            BOTTOM_NAV_OVERLAY_EVENT,
            updateOverlayVisibility,
        );

        return () => {
            window.removeEventListener(
                BOTTOM_NAV_OVERLAY_EVENT,
                updateOverlayVisibility,
            );
        };
    }, []);

    useEffect(() => {
        const resetFrame = window.requestAnimationFrame(() => {
            setHiddenByScroll(false);
        });

        if (isConversation || isCamera || isAuthRoute) {
            return () => {
                window.cancelAnimationFrame(resetFrame);
            };
        }

        const scrollArea =
            document.querySelector<HTMLElement>(
                ".app-page-content",
            );

        if (!scrollArea) {
            return () => {
                window.cancelAnimationFrame(resetFrame);
            };
        }

        lastScrollY.current = scrollArea.scrollTop;

        function handleScroll() {
            if (!scrollArea) {
                return;
            }

            const currentScrollY = Math.max(
                scrollArea.scrollTop,
                0,
            );

            const difference =
                currentScrollY - lastScrollY.current;

            const distanceFromBottom = Math.max(
                0,
                scrollArea.scrollHeight -
                    scrollArea.clientHeight -
                    currentScrollY,
            );

            const isNearBottom =
                currentScrollY > 60 &&
                distanceFromBottom < 80;

            if (isNearBottom) {
                setHiddenByScroll(true);
            } else if (currentScrollY < 60) {
                setHiddenByScroll(false);
            } else if (difference > 6) {
                setHiddenByScroll(true);
            } else if (difference < -6) {
                setHiddenByScroll(false);
            }

            if (Math.abs(difference) > 6) {
                lastScrollY.current = currentScrollY;
            }
        }

        scrollArea.addEventListener(
            "scroll",
            handleScroll,
            { passive: true },
        );

        return () => {
            window.cancelAnimationFrame(resetFrame);
            scrollArea.removeEventListener(
                "scroll",
                handleScroll,
            );
        };
    }, [pathname, isConversation, isCamera, isAuthRoute]);

    if (isConversation || isCamera || isAuthRoute) {
        return null;
    }

    const foundIndex = navigation.findIndex(
        (item) => routeIsActive(pathname, item.href),
    );

    const activeIndex = foundIndex === -1 ? 0 : foundIndex;
    const isHidden = hiddenByScroll || hiddenByOverlay;

    

    return (
        <nav
            aria-label="App navigation"
            className={`app-only app-bottom-nav fixed inset-x-6 z-[60] h-[58px] items-center overflow-hidden rounded-full border border-white/[0.08] bg-slate-950/35 p-1.5 shadow-[0_12px_35px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 transition-[transform,opacity] duration-300 ease-out dark:border-white/[0.04] ${
                isHidden
                    ? "pointer-events-none translate-y-[calc(100%+3rem)] opacity-0"
                    : "translate-y-0 opacity-100"
            }`}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1.5 top-1.5 h-[46px] rounded-full border border-white/[0.07] bg-white/[0.14] shadow-[inset_0_1px_1px_rgba(255,255,255,0.16),0_5px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                    width: "calc((100% - 0.75rem) / 4)",
                    transform: `translateX(${activeIndex * 100}%)`,
                }}
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-5 rounded-full bg-gradient-to-b from-white/[0.10] to-transparent blur-md"
            />

            {navigation.map((item, index) => {
                const Icon = item.icon;
                const active = index === activeIndex;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className={`relative z-10 flex h-full min-w-0 flex-1 items-center justify-center transition-colors duration-300 ${
                            active
                                ? "text-white"
                                : "text-white/50"
                        }`}
                    >
                        <Icon
                            size={27}
                            strokeWidth={active ? 2.8 : 2.2}
                        />
                    </Link>
                );
            })}
        </nav>
    );
}
