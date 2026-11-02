import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import PhotoWall from "@/components/photo-wall";

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-full flex-1 bg-gradient-to-br from-indigo-50 via-background to-rose-50 px-4 py-10 dark:from-indigo-950/40 dark:to-rose-950/30 sm:px-6">
      <PhotoWall showUploader />
      
    </main>
  );
}
