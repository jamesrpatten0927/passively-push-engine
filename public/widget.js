console.log("[PUSH] widget.js loaded");

(async () => {
  try {

    console.log("[PUSH] init started");

    const scriptTag = document.currentScript;

    const vapidKey = scriptTag.dataset.vapidKey;
    const apiEndpoint = scriptTag.dataset.apiEndpoint;
    const userId = scriptTag.dataset.userId;

    console.log("[PUSH] CONFIG");
    console.log({
      vapidKey,
      apiEndpoint,
      userId
    });

    if (!("serviceWorker" in navigator)) {
      console.error("[PUSH ERROR] Service workers unsupported");
      return;
    }

    if (!("PushManager" in window)) {
      console.error("[PUSH ERROR] PushManager unsupported");
      return;
    }

    if (!("Notification" in window)) {
      console.error("[PUSH ERROR] Notifications unsupported");
      return;
    }

    console.log("[PUSH] requesting permission");

    const permission = await Notification.requestPermission();

    console.log("[PUSH] permission result:", permission);

    if (permission !== "granted") {
      console.error("[PUSH ERROR] Permission denied");
      return;
    }

    console.log("[PUSH] registering service worker");

    const registration = await navigator.serviceWorker.register("/sw.js");

    console.log("[PUSH] service worker registered");

    const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

    console.log("[PUSH] creating push subscription");

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    console.log("[PUSH] subscription created");
    console.log(subscription);

    console.log("[PUSH] sending subscription to backend");

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        subscription,
        user_id: userId
      })
    });

    const data = await response.json();

    console.log("[PUSH] backend response");
    console.log(data);

  } catch (err) {
    console.error("[PUSH FATAL ERROR]");
    console.error(err);
  }
})();

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);

  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
