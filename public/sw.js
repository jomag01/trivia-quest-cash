// Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  let notificationData = {
    title: "New Message",
    body: "You have a new message",
    icon: "/placeholder.svg",
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error("Error parsing push notification data:", e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: "/placeholder.svg",
      data: notificationData.data,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Try to focus an existing window
      for (let client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // Open a new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow("/community");
      }
    })
  );
});
