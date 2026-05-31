alert("NEW WIDGET LOADED");
console.log(”[PUSH] widget.js loaded”);

(async () => {
let debugBox;

try {

debugBox = document.createElement("div");
debugBox.style.position = "fixed";
debugBox.style.bottom = "20px";
debugBox.style.left = "20px";
debugBox.style.zIndex = "999999";
debugBox.style.background = "#000";
debugBox.style.color = "#00ff00";
debugBox.style.padding = "12px";
debugBox.style.border = "1px solid #00ff00";
debugBox.style.borderRadius = "8px";
debugBox.style.fontSize = "12px";
debugBox.style.fontFamily = "monospace";
debugBox.style.maxWidth = "350px";
debugBox.style.maxHeight = "250px";
debugBox.style.overflowY = "auto";
debugBox.style.wordBreak = "break-word";
document.body.appendChild(debugBox);
function logDebug(message) {
  debugBox.innerHTML += message + "<br>";
}
logDebug("PUSH INIT STARTED");
const scriptTag = document.currentScript;
const vapidKey = scriptTag?.dataset?.vapidKey;
const apiEndpoint = scriptTag?.dataset?.apiEndpoint;
const userId = scriptTag?.dataset?.userId;
logDebug("VAPID: " + (vapidKey ? "FOUND" : "MISSING"));
logDebug("API: " + (apiEndpoint || "MISSING"));
logDebug("USER: " + (userId || "MISSING"));
if (!("serviceWorker" in navigator)) {
  logDebug("ERROR: SERVICE WORKER UNSUPPORTED");
  return;
}
logDebug("SERVICE WORKER SUPPORTED");
if (!("PushManager" in window)) {
  logDebug("ERROR: PUSH MANAGER UNSUPPORTED");
  return;
}
logDebug("PUSH MANAGER SUPPORTED");
if (!("Notification" in window)) {
  logDebug("ERROR: NOTIFICATIONS UNSUPPORTED");
  return;
}
logDebug("NOTIFICATIONS SUPPORTED");
const permission = await Notification.requestPermission();
logDebug("PERMISSION: " + permission);
if (permission !== "granted") {
  logDebug("ERROR: PERMISSION DENIED");
  return;
}
logDebug("REGISTERING SW");
const registration =
  await navigator.serviceWorker.register("/sw.js");
logDebug("SW REGISTERED");
const convertedVapidKey =
  urlBase64ToUint8Array(vapidKey);
logDebug("CREATING SUBSCRIPTION");
const subscription =
  await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  });
logDebug("SUB CREATED");
if (!apiEndpoint) {
  logDebug("ERROR: API ENDPOINT MISSING");
  return;
}
logDebug("POSTING TO BACKEND");
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
logDebug("HTTP STATUS: " + response.status);
const data = await response.json();
logDebug("BACKEND RESPONSE:");
logDebug(JSON.stringify(data));

} catch (err) {

console.error(err);
if (debugBox) {
  debugBox.innerHTML +=
    "<br><span style='color:red'>FATAL ERROR:</span><br>" +
    err.message;
}

}

})();

function urlBase64ToUint8Array(base64String) {

const padding =
“=”.repeat((4 - (base64String.length % 4)) % 4);

const base64 =
(base64String + padding)
.replace(/-/g, “+”)
.replace(/_/g, “/”);

const rawData = atob(base64);

return Uint8Array.from(
[…rawData].map(char =>
char.charCodeAt(0)
)
);

}
