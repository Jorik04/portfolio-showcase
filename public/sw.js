self.addEventListener("push", (event) => {
    let data = {};

    if (event.data) {
        try {
            data = event.data.json();
        } catch {
            data = {
                body: event.data.text(),
            };
        }
    }

    event.waitUntil(
        (async () => {
            const targetUrl = new URL(
                data.url || "/",
                self.location.origin,
            );

            const windowClients =
                await self.clients.matchAll({
                    type: "window",
                    includeUncontrolled: true,
                });

            const conversationIsOpen = 
                windowClients.some((client) => {
                    const clientUrl =
                        new URL(client.url);

                    const pageIsVisible =
                        client.focused ||
                        client.visibilityState ===
                            "visible";

                    return (
                        pageIsVisible && 
                        clientUrl.pathname ===
                            targetUrl.pathname
                    );
                });

            if (conversationIsOpen) {
                return;
            }

            await self.registration.showNotification(
                data.title || "Jorik's Website",
                {
                    body: 
                        data.body ||
                        "You have a new notification.",
                    icon: "/icon-192.png",
                    badge: "/icon-192.png",
                    tag: data.tag || "jorik-notification",
                    data: {
                        url: targetUrl.href,
                    },
                },
            );
        })(),
    );
});

self.addEventListener(
    "notificationclick",
    (event) => {
        event.notification.close();

        const targetUrl = new URL(
            event.notification.data?.url || "/",
            self.location.origin,
        ).href;

        event.waitUntil(
            clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true,
                })
                .then(async (windowClients) => {
                    for (const client of windowClients) {
                        if (
                            client.url === targetUrl &&
                            "focus" in client
                        ) {
                            return client.focus();
                        }
                    }

                    if (clients.openWindow) {
                        return clients.openWindow(
                            targetUrl,
                        );
                    }
                }),
        );
    },
);