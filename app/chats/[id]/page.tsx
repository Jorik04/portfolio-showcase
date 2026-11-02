import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import ChatConversation from "@/components/chat-conversation";
//import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ChatPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function ChatPage({
    params,
} : ChatPageProps) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    const { id } = await params;

    return (
        <ChatConversation
            conversationId={id}
        />
    );
}