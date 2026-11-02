import { Resend } from "resend";

function getResend() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        throw new Error("RESEND_API_KEY is not configured.");
    }

    return new Resend(apiKey);
}

type VerificationEmail = {
    email: string;
    name: string;
    url: string;
};

type PasswordResetEmail = {
    email: string;
    name: string;
    url: string;
};

export async function sendVerificationEmail({
    email,
    name,
    url,
}: VerificationEmail) {
    const from = process.env.AUTH_EMAIL_FROM;

    if (!from) {
        throw new Error("AUTH_EMAIL_FROM is not configured.");
    }

    const resend = getResend();

    const { error } = await resend.emails.send({
        from,
        to: email,
        subject: "Verify your email address",
        text: [
            `Hi ${name || "there"},`,
            "",
            "Confirm your email address by opening this link:",
            url,
            "",
            "If you did not create this account, ignore this email.",
        ].join("\n"),
    });

    if (error) {
        throw new Error("Could not send verification email.");
    }
}

export async function sendPasswordResetEmail({
    email,
    name,
    url,
}: PasswordResetEmail) {
    const from = process.env.AUTH_EMAIL_FROM;

    if (!from) {
        throw new Error("AUTH_EMAIL_FROM is not configured.");
    }

    const resend = getResend();

    const { error } = await resend.emails.send({
        from,
        to: email,
        subject: "Reset your password",
        text: [
            `Hi ${name || "there"},`,
            "",
            "Open this link to choose a new password:",
            url,
            "",
            "This link expires in 30 minutes.",
            "",
            "If you did not request this reset, ignore this email.",
        ].join("\n"),
    });

    if (error) {
        throw new Error("Could not send password reset email.");
    }
}