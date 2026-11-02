import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    Code2,
    Cpu,
    FileText,
    ExternalLink,
    Printer,
    Server,
} from "lucide-react";
 
export const metadata: Metadata = {
    title: "Jorik Bllaca",
    description:
        "B.Sc. Informatics student at TUM, Raspberry Pi enthusiast."
};

export default function AboutPage() {
    return (
        <main className="min-h-full flex-1 bg-muted/40 px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-6xl space-y-8">
                <section className="overflow-hidden rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-sm sm:p-12">
                    

                    <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">
                        Hi, I&apos;m Jorik Bllaca.
                    </h1>

                    <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
                        I build full-stack web applications, self-hosted
                        systems and physical prototypes. My work combines
                        software development, Raspberry Pi infrastructure,
                        security and hands-on hardware experimentation.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/projects"
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700"
                        >
                            View Projects
                            <ArrowRight size={18} />
                        </Link>

                        <Link
                            href="/cv"
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-bold  text-foreground transition hover:bg-accent"
                        >
                            <FileText size={18} />
                            View CV
                        </Link>

                        <a
                            href="https://github.com/Jorik04"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-bold text-foreground transition hover:bg-accent"
                        >
                            <ExternalLink size={18} />
                            Github
                        </a>
                    </div>
                </section>

                <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                        <Code2 className="text-indigo-600 dark:text-indigo-400" />

                        <h2 className="mt-4 text-xl font-black">
                            Web development
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Next.js, React, TypeScript and PostgreSQL
                            applications.
                        </p>
                    </article>

                    <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                        <Server className="text-indigo-600 dark:text-indigo-400" />

                        <h2 className="mt-4 text-xl font-black">
                            Self-hosting
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Linux services deployed on Raspberry Pi with PM2
                            and Cloudflare.
                        </p>
                    </article>

                    <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                        <Cpu className="text-indigo-600 dark:text-indigo-400" />

                        <h2 className="mt-4 text-xl font-black">
                            Hardware
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Raspberry Pi, GPIO control and practical hardware
                            experimentation.
                        </p>
                    </article>

                    <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                        <Printer className="text-indigo-600 dark:text-indigo-400" />

                        <h2 className="mt-4 text-xl font-black">
                            3D printing
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Physical prototyping and projects including a
                            miniature robotic arm.
                        </p>
                    </article>
                </section>

                <section className="rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-sm sm:p-10">
                    <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <p className="font-bold text-indigo-600 dark:text-indigo-400">
                                Current main project
                            </p>

                            <h2 className="mt-2 text-3xl font-black">
                                A self-hosted social platform
                            </h2>

                            <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
                                This website is also one of my projects. It started
                                as a fun experiment of making a public website
                                for my friends and family. It
                                includes everything i have learned up until 
                                now on my bachelor&apos;s degree: authentication, 
                                role-based access, temporary photo sharing, 
                                friends, encrypted messaging, push notifications, 
                                an AI assistant, system monitoring and Raspberry Pi 
                                GPIO controls.
                            </p>
                        </div>

                        <Link
                            href="/projects"
                            className="inline-flex items-center gap-2 font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            Project details
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-8 text-card-foreground shadow-sm sm:p-10">
                    <p className="font-bold uppercase tracking-[0.22rem] text-indigo-600 dark:text-indigo-400">
                        What&apos; next
                    </p>

                    <h2 className="mt-3 text-3xl font-black">
                        A website that keeps growing
                    </h2>

                    <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
                        I want this website to continue to grow over time. My goal is
                        to keep experimenting, learning and adding features that are useful
                        not only to me, but also to the people who use it.
                    </p>

                
                </section>

                <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl sm:p-10">
                    <h2 className="text-3xl font-black">
                        Want to see the private platform?
                    </h2>

                    <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                        Registered users can access the photo wall, friends,
                        chat and other private features.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href="/login"
                            className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950 hover:bg-slate-200"
                        >
                            Sign in
                        </Link>

                        <Link
                            href="/sign-up"
                            className="rounded-xl border border-white/20 px-5 py-3 font-bold text-white hover:bg-white/10"
                        >
                            Create account
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}