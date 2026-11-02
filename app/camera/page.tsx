import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import CameraCapture from "@/components/camera-capture";

export const dynamic = "force-dynamic";

export default async function CameraPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    return <CameraCapture/>
}