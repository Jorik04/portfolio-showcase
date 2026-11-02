"use client";

import type {
    ReactNode,
    TouchEvent,
} from "react";
import {
    useRef,
    useState,
} from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";

type AppViewportProps = {
    children: ReactNode;
};

export default function AppViewport({
    children,
}: AppViewportProps) {
    const pathname = usePathname();

    const scrollAreaRef =
        useRef<HTMLDivElement | null>(null);

    const touchStartRef =
        useRef<number | null>(null);

    const pullDistanceRef =
        useRef(0);

    const [pullDistance, setPullDistance] =
        useState(0);

    const [refreshing, setRefreshing] =
        useState(false);

    const isConversation =
        /^\/chats\/[^/]+$/.test(pathname);

    const isAuthRoute = 
        pathname === "/login" || 
        pathname === "/sign-up" ||
        pathname.startsWith("/reset-password");

    const isCamera = pathname === "/camera";
    const isLocked = isConversation || isCamera || isAuthRoute;

    

    function resetPull() {
        touchStartRef.current = null;
        pullDistanceRef.current = 0;
        setPullDistance(0);
    }

    function handleTouchStart(
        event: TouchEvent<HTMLDivElement>,
    ) {
        const scrollArea =
            scrollAreaRef.current;

        if (
            isLocked ||
            !scrollArea ||
            scrollArea.scrollTop > 0
        ) {
            resetPull();
            return;
        }

        pullDistanceRef.current = 0;
        setPullDistance(0);

        touchStartRef.current =
            event.touches[0].clientY;
    }

    function handleTouchMove(
        event: TouchEvent<HTMLDivElement>,
    ) {
        if (touchStartRef.current === null) {
            return;
        }

        const distance = Math.min(
            100,
            Math.max(
                0,
                event.touches[0].clientY -
                    touchStartRef.current,
            ),
        );

        pullDistanceRef.current = distance;
        setPullDistance(distance);
    }

    function handleTouchEnd() {
        touchStartRef.current = null;

        if (pullDistanceRef.current >= 70) {
            setRefreshing(true);
            window.location.reload();
            return;
        }

        resetPull();
    }

    return (
        <div
            ref={scrollAreaRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={resetPull}
            className={`app-page-content relative flex min-h-0 flex-1 flex-col ${
                isLocked
                    ? "app-page-content--locked"
                    : ""
            }`}
        >
            {!isLocked && pullDistance > 0 && (
                <div
                    className="app-only pointer-events-none fixed left-1/2 z-[55] size-11 items-center justify-center rounded-full border border-border bg-background/90 text-indigo-500 shadow-lg backdrop-blur"
                    style={{
                        top:
                            "calc(env(safe-area-inset-top) + 4.25rem)",
                        transform: `translate(-50%, ${
                            pullDistance * 0.45
                        }px)`,
                        opacity: Math.min(
                            1,
                            pullDistance / 45,
                        ),
                    }}
                >
                    <RefreshCw
                        size={20}
                        className={
                            refreshing
                                ? "animate-spin"
                                : ""
                        }
                    />
                </div>
            )}

            {children}
        </div>
    );
}
