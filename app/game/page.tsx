"use client";

import { useState } from "react";

export default function GamePage() {
    const [score, setScore] = useState(0);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background text-foreground">
            <h1 className="text-4xl font-bold">Click Game</h1>
            <p className="text-xl">Score: {score}</p>

            <button onClick={() => setScore(score + 1)}
                    className="rounded-xl bg-primary px-8 py-4 text-xl text-primary-foreground"
                >
                Click Me
            </button>

                <button
                    onClick={() => setScore(0)}
                    className="rounded-xl border border-border bg-card px-6 py-2 text-card-foreground hover:bg-accent"
                >
                Reset
                </button>
        </main>
        
    );
}
