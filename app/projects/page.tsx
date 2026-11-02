import type { Metadata } from "next";
import Image from "next/image";
import {
    Bell,
    Bot,
    Box,
    Cloud,
    Cpu,
    Database,
    LockKeyhole,
    Printer,
    Users,
} from "lucide-react";

export const metadata: Metadata = {
    title: "Projects | Jorik Bllaca",
    description: 
        "Software, self-hosting and hardware projects by Jorik Bllaca.",
};

const websiteFeatures = [
    {
        title: "Full-stack architecture",
        description: 
            "Next.js, React, TypeScript and PostgreSQL running as a complete self-hosted application.",
        icon: Database,
    },
    {
        title: "Authentication and roles",
        description: 
            "Account management and server-side authorization using Better Auth.",
        icon: LockKeyhole,
    },
    {
        title: "Social features",
        description: 
            "Friend management, temporary photo sharing, likes, comments, and visibility controls.",
        icon: Users,
    },
    {
        title: "Encrypted chat",
        description: 
            "Device-based cryptographic keys encrypt messages before they leave the browser.",
        icon: LockKeyhole,
    },
    {
        title: "Push notifications",
        description: 
            "Web Push notifications for friend activity and photo updates.",
        icon: Bell,
    },
    {
        title: "AI assistant",
        description: 
            "Authenticated AI chat intergration using Groq's server-side API.",
        icon: Bot,
    },
    {
        title: "Raspberry Pi controls",
        description: 
            "System statistics and protected GPIO controls for authorized users.",
        icon: Cpu,
    },
    {
        title: "Self-hosted deployment",
        description: 
            "Deployed with PostgreSQL, PM2 and Cloudflare Tunnel on a Raspberry Pi 3: Model B+",
        icon: Cloud,
    },
];

const roboticArmPhotos = [
    {
        src: "/IMG_8226.jpg",
        alt: "3D-printed miniature robotic arm controlled by an ESP32",
    },
    {
        src: "/IMG_8227.jpg",
        alt: "Mini servo motors and wiring inside the robotic arm",
    },
    {
        src: "/IMG_8228.jpg",
        alt: "ESP32 electronics and power connections for the robotic arm",
    }
];

export default function ProjectsPage() {
    return (
        <main className="min-h-full flex-1 bg-muted/40 px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <header className="max-w-3xl">
                    <p className="font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
                        Selected work
                    </p>

                    <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
                        Projects
                    </h1>

                    <p className="mt-5 text-lg leading-8 text-muted-foreground">
                        A collection of software, self-hosting and physical
                        prototyping projects.
                    </p>
                </header>

                <section className="mt-10 rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-10">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-indigo-600 p-3 text-white">
                            <Box size={26} />
                        </div>

                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                Full-stack software
                            </p>

                            <h2 className="mt-1 text-3xl font-black">
                                Personal web platform
                            </h2>
                        </div>
                    </div>

                    <p className="mt-6 max-w-4xl leading-8 text-muted-foreground">
                        A continuously developed personal platform that combines
                        social features, security, hardware administration and 
                        self-hosted infrastructure in one application.
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                        {websiteFeatures.map((feature) => {
                            const Icon = feature.icon;

                            return (
                                <article
                                    key={feature.title}
                                    className="rounded-2xl border border-border bg-background p-5"
                                >
                                    <Icon
                                        size={22}
                                        className="text-indigo-600 dark:text-indigo-400"
                                    />

                                    <h3 className="mt-3 font-black">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-2 leading-7 text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-7 flex flex-wrap gap-2">
                        {[
                            "Next.js",
                            "React",
                            "TypeScript",
                            "PostgreSQL",
                            "Better Auth",
                            "Linux",
                            "Raspberry Pi",
                            "PM2",
                            "Cloudflare",
                        ].map((technology) => (
                            <span
                                key={technology}
                                className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold"
                            >
                                {technology}
                            </span>
                        ))}
                    </div>
                </section>

                <section className="mt-10 rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm sm:p-10">
                    <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-amber-500 p-3 text-white">
                            <Printer size={26} />
                        </div>

                        <div>
                            <p className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                Hardware and prototyping
                            </p>

                            <h2 className="mt-1 text-3xl font-black">
                                Bluetooth controlled miniature robotic arm
                            </h2>
                        </div>
                    </div>

                    <p className="mt-6 max-w-4xl leading-8 text-muted-foreground">
                        A miniature robotic-arm build combining 3D-printed mechanical
                        parts, servo-driven movement and embedded control. The arm
                        is operated wirelessly using a DualSense controller connected to
                        an ESP32 over Bluetooth.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        {roboticArmPhotos.map((photo) => (
                            <figure
                                key={photo.src}
                                className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted"
                            >
                                <Image
                                    src={photo.src}
                                    alt={photo.alt}
                                    fill
                                    sizes="(max-width: 640px) 100vw, 33vw"
                                    className="object-cover"
                                />
                            </figure>
                        ))}
                    </div>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                        <article className="rounded-2xl border border-border bg-background p-5">
                            <h3 className="font-black">
                                Mechanical construction
                            </h3>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                The structural components were produced using
                                a Bambu Lab A1 mini. Repeated printing and assembly
                                allowed the fit, range of motion and mechanical stability
                                of the arm to be tested and improved.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-border bg-background p-5">
                            <h3 className="font-black">
                                Servo actuation
                            </h3>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                Mini servo motors actuate the individual joints,
                                allowing the arm to perform controlled rotational
                                movements.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-border bg-background p-5">
                            <h3 className="font-black">
                                ESP32 control system
                            </h3>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                An ESP32 recieves joystick and button input from a 
                                PlayStation 5 controller over Bluetooth and
                                translates those commands into target positions for
                                the servo motors.
                            </p>
                        </article>

                        <article className="rounded-2xl border border-border bg-background p-5">
                            <h3 className="font-black">
                                External power distribution
                            </h3>

                            <p className="mt-2 leading-7 text-muted-foreground">
                                A dedicated 5 V power supply powers the servo motors
                                through parallel connections, preventing the ESP32
                                from having to supply the motors&apos; current directly.
                            </p>
                        </article>
                    </div>

                    <div className="mt-7 flex flex-wwrap gap-2">
                        {[
                            "Bambu Lab A1 mini",
                            "3D Printing",
                            "ESP32",
                            "Bluetooth",
                            "DualSense controller",
                            "Mini servos",
                            "5 V power supply",
                            "Embedded programming",
                        ].map((technology) => (
                            <span 
                                key={technology}
                                className="rounded-full bg-muted px-3 py-1.5 text-sm font-semibold text-foreground"
                            >
                                {technology}
                            </span>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    )
}