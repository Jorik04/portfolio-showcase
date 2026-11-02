import GPIOControl from "@/components/gpio-control";
import { requireGPIOAcess } from "@/lib/require-gpio-access";

export default async function AdminGpioPage() {
    await requireGPIOAcess();

    return (
        <main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 px-5 py-12">
            <GPIOControl />
        </main>
    );
}
