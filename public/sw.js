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
    icon: data.icon || "/icon.png",
    badge: data.badge || "/badge.png",
    data: data.url || "/"
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", event => {
  console.log("[SW] Notification Clicked");

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data || "/")
  );
});
