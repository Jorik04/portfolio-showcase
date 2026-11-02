import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ChatDeviceSetup from "@/components/chat-device-setup";
import ChatConversations from "@/components/chat-conversations";

export const dynamic = "force-dynamic";

export default async function ChatsPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    return (
        <main className="flex flex-1 justify-center bg-gradient-to-br from-indigo-50 via-background to-violet-50 px-4 py-8 dark:from-indigo-950/20 dark:via-background dark:to-violet-950/20">
            <div className="w-full max-w-xl">
                

                <ChatDeviceSetup />

                <ChatConversations />
            </div>
        </main>
    );
}
