import Link from "next/link";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-admin";


export default async function AdminPage() {
    const { requestHeaders } = await requireAdmin();

    const { users, total } = await auth.api.listUsers({
        headers: requestHeaders,
        query: {
            limit: 100,
            sortBy: "createdAt",
            sortDirection: "desc",
        },
    });

    return (
        <main className="min-h-full flex-1 bg-muted/40 px-5 py-10">
            <section className="mx-auto max-w-5xl rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-sm">
                <h1 className="text-3xl font-black">
                    Admin dashboard
                </h1>

                <p className="mt-2 text-muted-foreground">
                    {total} registered users
                </p>

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                    <Link
                        href="/admin/gpio"
                        className="rounded-2xl border border-border bg-background/40 p-5 transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
                    >
                        <div className="text-3xl">💡</div>

                        <h2 className="mt-3 text-lg font-bold text-foreground">
                            GPIO Control
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            View private website statistics.
                        </p>
                    </Link>
                </div>

                <div className="mt-7 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border text-sm text-muted-foreground">
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-border last:border-0">
                                    <td className="p-3 font-semibold">{user.name}</td>
                                    <td className="p-3">{user.email}</td>
                                    <td className="p-3">{user.role || "user"}</td>
                                    <td className="p-3">{user.banned ? "Banned" : "Active"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
