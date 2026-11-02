import type { Metadata } from "next";
import Link from "next/link";
import {
    ArrowRight,
    Code2,
    ExternalLink,
    Languages,
    Printer,
    Server,
} from "lucide-react";

export const metadata: Metadata = {
    title: "CV | Jorik Bllaca",
    description: 
        "Curriculum vitae of Jorik Bllaca."
};

const technicalSkills = [
    "TypeScript",
    "JavaScript",
    "Python",
    "C/C++",
    "OCaml",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Git and GitHub",
    "Linux",
    "RaspberryPi",
    "Cloudflare Tunnel",
    "PM2",
    "Better Auth",
    "Web Push",
    "3D printing and prototyping",
];

const languages = [
    {
        language: "Albanian",
        level: "Native language"
    },
    {
        language: "English",
        level: "C1 / IB bilingual diploma",
    },
    {
        language: "German",
        level: "TestDaF TDN 4",
    },
];

export default function CvPage() {
    return (
        <main className="min-h-full flex-1 bg-muted/40 px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-5xl space-y-8">
                <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-10">
                    <p className="font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
                        Curriculum vitae
                    </p>

                    <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
                        Jorik Bllaca
                    </h1>

                    <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                        Independent software developer and maker interested in
                        full-stack web development, self-hosted systems,
                        hardware experimentation and practical problem solving.
                    </p>

                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            href="/projects"
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700"
                        >
                            View Projects
                            <ArrowRight size={18}/>
                        </Link>

                        <a
                            href="https://github.com/Jorik04"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-bold text-foreground hover:bg-accent"
                        >
                            GitHub
                            <ExternalLink size={18} />
                        </a>
                    </div>
                </section>

                <section className="grid gap-5 md:grid-cols-3">
                    <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                        <Code2 className="text-indigo-600 dark:text-indigo-400" />

                        <h2 className="mt-4 text-xl font-black">
                            Full-stack development
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Building responsive applications with React,
                            Next.js, TypeScript and PostgreSQL.
                        </p>
                    </article>

                    <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                        <Server className="text-indigo-600 dark:text-indigo-400" />

                        <h2 className="mt-4 text-xl font-black">
                            Self-hosting
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Deploying and maintaining applications on Linux and
                            Raspberry Pi infrastructure.
                        </p>
                    </article>

                    <article className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
                        <Printer className="text-indigo-600 dark:text-indigo-400" />

                        <h2 className="mt-4 text-xl font-black">
                            Making and prototyping
                        </h2>

                        <p className="mt-2 leading-7 text-muted-foreground">
                            Using 3D printing and hands-on experimentation to
                            create physical projects such as miniature
                            robotic arm.
                        </p>
                    </article>
                </section>

                <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-9">
                    <h2 className="text-2xl font-black">
                        Selected projects
                    </h2>

                    <div className="mt-6 space-y-6">
                        <article>
                            <h3 className="text-lg font-black">
                                Personal full-stack platform
                            </h3>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                Designed, developed and deployed a personal
                                Next.js platform with authentication,
                                role-based authorization, a temporary photo
                                wall, friends, push notifications, encrypted
                                chat, an AI assistant, system monitoring and
                                GPIO controls.
                            </p>

                            <p className="mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                Next.js · React · TypeScript · PostgreSQL ·
                                Better Auth · Raspberry Pi
                            </p>
                        </article>

                        <article className="border-t border-border pt-6">
                            <h3 className="text-lg font-black">
                                Miniature robotic arm
                            </h3>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                Built a miniature robotic arm as a practical
                                hardware project, using 3D printing and
                                iterative prototyping to explore mechanical
                                construstion and assembly.
                            </p>
                        </article>
                    </div>

                    <Link
                        href="/projects"
                        className="mt-7 inline-flex items-center gap-2 font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                        Read more about my projects
                        <ArrowRight size={17} />
                    </Link>
                </section>

                <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-9">
                    <h2 className="text-2xl font-black">
                        Technical skills
                    </h2>

                    <div className="mt-5 flex flex-wrap gap-2">
                        {technicalSkills.map((skill) =>(
                            <span
                                key={skill}
                                className="rounded-full border border-border bg-muted px-4 py-2 text-sm font-semibold text-foreground"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </section>

                <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-9">
                    <h2 className="text-2xl font-black">
                        Experience
                    </h2>

                    <article className="mt-6">
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            February 2026 - Present
                        </p>

                        <h3 className="mt-1 text-lg font-black">
                            Practice Assistant (Minijob)
                        </h3>

                        <p className="mt-1 font-semibold text-muted-foreground">
                            Hausarztpraxis Frau Dr. med. Sylvia Galia-Groß · München
                        </p>

                        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-muted-foreground">
                            <li>
                                Support reception operations and patient registration.
                            </li>

                            <li>
                                Provide IT support for practice systems and devices when needed.
                            </li>

                            <li>
                                Organize patient documents, invoices and receipts to
                                support accurate administrative processes.
                            </li>
                        </ul>


                    </article>
                </section>

                <section className="grid gap-6 md:grid-cols-2">
                    <article className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
                        <h2 className="text-2xl font-black">
                            Education
                        </h2>

                        <div className="mt-5">
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                October 2023 - Present
                            </p>

                            <h3 className="mt-1 text-lg font-black">
                                Bachelor of Science in Computer Science
                            </h3>

                            <p className="mt-1 font-semibold text-foreground">
                                Technical University of Munich (TUM)
                            </p>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                Currently in the 7th semester, with interests in
                                software engineering, web development, cybersecurity
                                and embedded systems.
                            </p>
                        </div>

                        <div className="mt-5">
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                2020-2022
                            </p>

                            <h3 className="mt-1 text-lg font-black">
                                IB Diploma Programme
                            </h3>

                            <p className="mt-1 font-semibold text-foreground">
                                Albanian College Tirana
                            </p>

                            <p className="mt-1 text-muted-foreground">
                                Higher Level subjects included Chemistry,
                                Mathematics: Analysis and Approaches, and
                                English Language and Literature.
                            </p>
                        </div>

                        <div className="mt-6">
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                2021
                            </p>

                            <h3 className="mt-1 text-lg font-black">
                                Programming coursework
                            </h3>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                CS50&apos;s Web Programming with Python and
                                JavaScript, together with independent study of
                                Python and C++ fundamentals.
                            </p>
                        </div>
                    </article>

                    <article className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
                        <div className="flex items-center gap-3">
                            <Languages className="text-indigo-600 dark:text-indigo-400" />
                            <h2 className="text-2xl font-black">
                                Languages
                            </h2>
                        </div>

                        <div className="mt-5 divide-y divide-border">
                            {languages.map((item) => (
                                <div 
                                    key={item.language}
                                    className="flex items-center justify-between gap-5 py-4 first:pt-0"
                                >
                                    <span className="font-bold">
                                        {item.language}
                                    </span>

                                    <span className="text-right text-muted-foreground">
                                        {item.level}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </article>
                </section>

                <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-9">
                    <h2 className="text-2xl font-black">
                        Community involvement
                    </h2>

                    <ul className="mt-5 space-y-3 leading-7 text-muted-foreground">
                        <li>
                            Supported English-language learning activities for
                            children in an orphanage in Albania.
                        </li>

                        <li>
                            Participated in fundraising activities supporting
                            a school with limited resources.
                        </li>

                        <li>
                            Helped plan and organize community events and
                            activities within and outside my highschool premises.
                        </li>
                    </ul>
                </section>
            </div>
        </main>
    )
}