self.addEventListener("install", event => {
  console.log("[SW] Installed");
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  console.log("[SW] Activated");
  event.waitUntil(clients.claim());
});

self.addEventListener("push", event => {
  console.log("[SW] Push Received");

  let data = {};

  try {
    data = event.data.json();
  } catch (err) {
    console.log("[SW] Push data parse failed");
  }

  const title = data.title || "New Notification";

  const options = {
    body: data.body || "You have a new notification",

    // FULL URLS REQUIRED
    icon:
      data.icon ||
      "https://public-panel-rendere.vibepreview.com/icon.png",

    badge:
      data.badge ||
      "https://public-panel-rendere.vibepreview.com/badge.png",

    image:
      data.image ||
      "https://public-panel-rendere.vibepreview.com/banner.png",

    vibrate: [200, 100, 200],

    requireInteraction: true,

    data: data.url || "/",

    actions: [
      {
        action: "open",
        title: "Open"
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {
  console.log("[SW] Notification Clicked");

  event.notification.close();

  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windowClients => {

      for (const client of windowClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
