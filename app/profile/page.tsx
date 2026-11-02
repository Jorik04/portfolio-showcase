"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import NotificationSettings from "@/components/notification-settings";
import ThemeSettings from "@/components/theme-settings";
import FriendsPanel from "@/components/friends-panel";
import PasskeySettings from "@/components/passkey-settings";

type ProfileFormProps = {
    email: string;
    initialName: string;
};

function ProfileForm({
    email,
    initialName
}: ProfileFormProps) {
    const { refetch } = authClient.useSession();

    const [name, setName] =useState(initialName);
    const [profileMessage, setProfileMessage] = useState("");
    const [passwordMessage, setPasswordMessage] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState("");


    async function updateProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSavingProfile(true);
        setProfileMessage("");

        const result = await authClient.updateUser({
            name: name.trim(),
        });

        if (result.error) {
            setProfileMessage(
                result.error.message || "Could not update your profile.",
            );
        } else {
            setProfileMessage("Profile updated successfully.");
            await refetch();
        }

        setSavingProfile(false);
    }

    async function updatePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSavingPassword(true);
        setPasswordMessage("");

        const formElement = event.currentTarget;
        const form = new FormData(formElement);

        const currentPassword = String(form.get("currentPassword"));
        const newPassword = String(form.get("newPassword"));
        const confirmPassword = String(form.get("confirmPassword"));

        if (newPassword !== confirmPassword) {
            setPasswordMessage("The new passwords do not match.");
            setSavingPassword(false);
            return;
        }


        const result = await authClient.changePassword({
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
        });

        if (result.error) {
            setPasswordMessage(
                result.error.message || "Could not change your password.",
            );
        } else {
            setPasswordMessage("Password changed successfully.");
            formElement.reset();
        }

        setSavingPassword(false);
    }

    async function signOut() {
        if (signingOut) {
            return;
        }

        setSigningOut(true);
        setSignOutError("");

        const result = 
            await authClient.signOut();

        if (result.error) {
            setSignOutError(
                result.error.message ??
                    "Could not sign out.",
            );

            setSigningOut(false);
            return;
        }

        window.location.assign("/login");
    }

    return (
        <main className="flex min-h-full flex-1 justify-center bg-muted/40 px-5 py-10">
            <div className="mx-auto max-w-2xl space-y-6">
                <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
                    <div className="mb-6 flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                            <UserRound size={28} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-black">
                                Profile settings
                            </h1>
                            <p className="text-muted-foreground">{email}</p>
                        </div>
                    </div>

                    <form onSubmit={updateProfile} className="space-y-4">
                        <label className="block">
                            <span className="mb-2 block font-semibold text-foreground">
                                Display name
                            </span>

                            <input
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                required
                                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground outline-none focus:border-indigo-500"
                            />
                        </label>

                        {profileMessage && (
                            <p className="rounded-xl bg-muted p-3 text-sm font-semibold text-foreground">
                                {profileMessage}
                            </p>
                        )}

                        <button
                            disabled={savingProfile}
                            className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {savingProfile ? "Saving..." : "Save profile"}
                        </button>
                    </form>
                </section>

                <section className="rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
                    <h2 className="text-xl font-black">
                        Change password
                    </h2>

                    <form onSubmit={updatePassword} className="mt-5 space-y-4">
                        <input
                            name="currentPassword"
                            type="password"
                            required
                            autoComplete="current-password"
                            placeholder="Current password"
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground"
                        />

                        <input
                            name="newPassword"
                            type="password"
                            required
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            placeholder="New password"
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground"
                        />

                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground"
                        />

                        {passwordMessage && (
                            <p className="rounded-xl bg-muted p-3 text-sm font-semibold text-foreground">
                                {passwordMessage}
                            </p>
                        )}

                        <button
                            disabled={savingPassword}
                            className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                            {savingPassword ? "Changing..." : "Change password"}
                        </button>
                    </form>
                </section>

                <FriendsPanel />

                <ThemeSettings />

                <NotificationSettings />

                <PasskeySettings />

                <section className="rounded-3xl border border-red-500/20 bg-card p-7 text-card-foreground shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex size-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                            <LogOut size={26} />
                        </div>

                        <div>
                            <h2 className="text-xl font-black">
                                Sign out
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Sign out of your account on this device.
                            </p>
                        </div>
                    </div>

                    {signOutError && (
                        <p className="mt-5 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-500">
                            {signOutError}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            void signOut();
                        }}
                        disabled={signingOut}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <LogOut size={19} />

                        {signingOut
                            ? "Signing out..."
                            : "Sign out"}
                    </button>
                </section>
            </div>
        </main>
    );
    
}

export default function ProfilePage() {
    const router = useRouter();
    const { data: session, isPending } = authClient.useSession();

    useEffect(() => {
        if (!isPending && !session) {
            router.replace("/login");
        }
    }, [session, isPending, router]);

    if (isPending) {
        return (
            <main className="flex flex-1 items-center justify-center bg-muted/40">
                <p className="text-muted-foreground">
                    Loading profile...
                </p>
            </main>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <ProfileForm
            key={session.user.id}
            email={session.user.email}
            initialName={session.user.name ?? ""}
        />
    );

}
