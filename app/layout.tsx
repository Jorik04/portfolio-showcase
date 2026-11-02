import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/theme-provider";
import AppBottomNav from "@/components/app-bottom-nav";
import AppTopBar from "@/components/app-top-bar";
import AppViewport from "@/components/app-viewport";
import AiAssistant from "@/components/ai-assistant-widget";

export const metadata: Metadata = {
  title: "Jorik's website",
  description: "Jorik's personal website",
  applicationName: "Jorik",
  manifest: "/manifest.webmanifest",

  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title: "Jorik",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#ffffff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#09090b",
    },
  ],
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const roles = 
    session?.user.role
      ?.split(",")
      .map((role) => role.trim()) ?? [];

  const isAdmin = roles.includes("admin");

  const canControlGPIO = isAdmin || roles.includes("gpio");

  
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-muted/40 font-sans">
        <ThemeProvider>
          <SiteHeader
            canControlGPIO={canControlGPIO}
            isAdmin={isAdmin}
          />

          <AppTopBar />

          <AppViewport>
            {children}
          </AppViewport>

          <AppBottomNav />

          <AiAssistant />
        </ThemeProvider>
      </body>
    </html>
  );
}
