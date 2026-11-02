import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return NextResponse.json(
            { error: "You must be signed in." },
            { status: 401 },
        );
    }

    const body: unknown = await request.json();

    if (
        typeof body != "object" ||
        body === null ||
        !("message" in body) || 
        typeof body.message !== "string" ||
        body.message.trim().length === 0 ||
        body.message.length > 4000
    ) {
        return NextResponse.json(
            { error: "Invalid message." },
            { status: 400 },
        );
    }

    if (!process.env.GROQ_API_KEY) {
        return NextResponse.json(
            { error: "Groq is not configured. " },
            { status: 503 },
        );
    }

    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
        timeout: 30_000,
        maxRetries: 1,
    });

    try {
        const completion = await groq.chat.completions.create({
            model:
                process.env.GROQ_MODEL ??
                "openai/gpt-oss-20b",

            temperature: 0.2,
            max_completion_tokens: 300,
            messages: [
                {
                    role: "system",
                    content: `
                You are the assistant built into Jorik Bllaca's personal website.
                
                Your job is to answer questions and help users navigate this website.
                
                Verified public pages:
                - /about - introduction to Jorik and the website
                - /projects - Jorik's software and hardware projects
                - /cv - Jorik's public CV
                - /login - account sign-in
                - /sign-up - account registration
                
                Signed-in features:
                - / - the 24-hour photo wall
                - /ai - this AI assistant
                - /camera - take and uplad a photo
                - /chats - private encrypted conversations
                - /profile - profile, friends, notifications and appearance settings
                
                Important rules:
                - Only describe pages and facts listed above.
                - Never invent domains, URLs, contact details, qualifications or website features.
                - Use relative paths such as /about. Do not invent a full domain.
                - If you do not know something, clearly say that you do not know.
                - Do not claim that you opened or inspected a page.
                - Reply in plain text without Markdown symbols.
                - Keep answers concise unless the user asks for detail.
                `,
                },
                {
                    role: "user",
                    content: body.message.trim(),
                },
            ],
        });

        return NextResponse.json({
            answer:
                completion.choices[0]?.message.content ??
                "I could not produce an answer."
        });
    } catch (error) {
        console.error("Groq request failed", error);

        return NextResponse.json(
            { error: "The AI service is currently unavailable." },
            { status: 502 },
        );
    }
}