import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins"
import { Pool } from "pg";
import { 
    sendVerificationEmail,
    sendPasswordResetEmail,
 } from "./email";
import { passkey } from "@better-auth/passkey";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
}

const globalForDatabase = globalThis as unknown as {
    authDatabase?: Pool;
};

export const database = 
    globalForDatabase.authDatabase ??
    new Pool ({
        connectionString: process.env.DATABASE_URL,
        max: 10,
    });

if (process.env.NODE_ENV !== "production") {
    globalForDatabase.authDatabase = database;
}

export const auth = betterAuth({
    database,

    emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,

        sendVerificationEmail: async ({ user, url}) => {
            await sendVerificationEmail({
                email: user.email,
                name: user.name,
                url,
            });
        },
    },

    emailAndPassword: {
        enabled: true,
        autoSignIn: false,
        requireEmailVerification: true,
        minPasswordLength: 8,
        maxPasswordLength:128,

        resetPasswordTokenExpiresIn: 1800,

        sendResetPassword: async ({ user, url }) => {
            await sendPasswordResetEmail({
                email: user.email,
                name: user.name,
                url,
            });
        },
    },

    plugins: [
        admin(),

        passkey({
            rpName: "Jorik's Website",

            rpID: 
                process.env.NODE_ENV === "production"
                    ? "rasp.jorikpi.com"
                    : "localhost",

            origin: 
                process.env.NODE_ENV == "production"
                    ? "https://rasp.jorikpi.com"
                    : "http://localhost:3000",
        }),
    ],
});