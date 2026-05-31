/*!
 * Passively Panel Widget
 * Production Build
 */
(function () {
  var backendUrl = 'https://passively-push-engine-2.onrender.com';
  console.log('Passively panel.js loaded');
  var scripts = document.getElementsByTagName('script');
  var currentScript = null;
  var panelId = null;
  var apiEndpoint = null;
  for (var i = 0; i < scripts.length; i++) {
    if (
      scripts[i].src &&
      scripts[i].src.indexOf('panel.js') !== -1
    ) {
      currentScript = scripts[i];
      panelId = currentScript.getAttribute('data-panel-id');
      apiEndpoint =
        currentScript.getAttribute('data-api-endpoint');
      if (panelId) break;
    }
  }
  if (!panelId) {
    console.error('ERROR: Missing data-panel-id');
    return;
  }
  if (apiEndpoint) {
    backendUrl = apiEndpoint
      .replace(/\/api\/panels\/?$/, '')
      .replace(/\/$/, '');
  }
  fetch(backendUrl + '/api/panels/' + panelId)
    .then(function (res) {
      if (!res.ok) {
        throw new Error('Failed to load panel');
      }
      return res.json();
    })
    .then(function (data) {
      /*
       * PUSH SUBSCRIPTION INIT
       */
      (async () => {
        try {
          console.log("[PANEL PUSH] init started");
          const vapidKey =
            currentScript.getAttribute('data-vapid-key');
          const subscribeEndpoint =
            backendUrl + '/api/subscribe';
          const userId =
            currentScript.getAttribute('data-user-id') ||
            'anonymous';
          console.log("[PANEL PUSH] CONFIG");
          console.log({
            vapidKey,
            subscribeEndpoint,
            userId
          });
          if (!("serviceWorker" in navigator)) {
            console.error(
              "[PANEL PUSH ERROR] Service workers unsupported"
            );
            return;
          }
          if (!("PushManager" in window)) {
            console.error(
              "[PANEL PUSH ERROR] PushManager unsupported"
            );
            return;
          }
          if (!("Notification" in window)) {
            console.error(
              "[PANEL PUSH ERROR] Notifications unsupported"
            );
            return;
          }
          let permission = Notification.permission;
          console.log(
            "[PANEL PUSH] existing permission:",
            permission
          );
          if (permission !== "granted") {
            permission =
              await Notification.requestPermission();
          }
          console.log(
            "[PANEL PUSH] permission result:",
            permission
          );
          if (permission !== "granted") {
            console.error(
              "[PANEL PUSH ERROR] Permission denied"
            );
            return;
          }
          console.log(
            "[PANEL PUSH] registering service worker"
          );
          const registration =
            await navigator.serviceWorker.register(
              "/sw.js"
            );
          console.log(
            "[PANEL PUSH] service worker registered"
          );
          let subscription =
            await registration.pushManager.getSubscription();
          if (!subscription) {
            console.log(
              "[PANEL PUSH] creating new subscription"
            );
            const convertedVapidKey =
              urlBase64ToUint8Array(vapidKey);
            subscription =
              await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey:
                  convertedVapidKey
              });
          } else {
            console.log(
              "[PANEL PUSH] existing subscription found"
            );
          }
          console.log(
            "[PANEL PUSH] subscription ready"
          );
          console.log(subscription);
          console.log(
            "[PANEL PUSH] sending subscription to backend"
          );
          const response = await fetch(
            subscribeEndpoint,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
  subscription,
  panelId: panelId
})
            }
          );
          const responseData =
            await response.json();
          console.log(
            "[PANEL PUSH] backend response"
          );
          console.log(responseData);
        } catch (err) {
          console.error(
            "[PANEL PUSH FATAL ERROR]"
          );
          console.error(err);
        }
      })();
      var launcher = document.createElement('button');
      launcher.innerText = data.title || 'Open';
      launcher.style.position = 'fixed';
      launcher.style.right = '20px';
      launcher.style.bottom = '20px';
      launcher.style.zIndex = '999999';
      launcher.style.padding = '14px 22px';
      launcher.style.borderRadius = '999px';
      launcher.style.border = 'none';
      launcher.style.background = '#ff007f';
      launcher.style.color = '#fff';
      launcher.style.fontSize = '14px';
      launcher.style.fontWeight = '700';
      launcher.style.cursor = 'pointer';
      launcher.style.boxShadow =
        '0 10px 30px rgba(0,0,0,0.3)';
      var panel = document.createElement('div');
      panel.style.position = 'fixed';
      panel.style.top = '0';
      panel.style.right = '0';
      panel.style.width = '400px';
      panel.style.maxWidth = '100vw';
      panel.style.height = '100vh';
      panel.style.background = '#0b0b0b';
      panel.style.color = '#ffffff';
      panel.style.zIndex = '999998';
      panel.style.transform = 'translateX(100%)';
      panel.style.transition = 'transform 0.4s ease';
      panel.style.boxShadow =
        '-10px 0 40px rgba(0,0,0,0.4)';
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';
      panel.style.fontFamily =
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
      var header = document.createElement('div');
      header.style.padding = '24px';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.borderBottom =
        '1px solid rgba(255,255,255,0.08)';
      var title = document.createElement('h2');
      title.innerText = data.title || 'Panel';
      title.style.margin = '0';
      title.style.fontSize = '20px';
      var close = document.createElement('button');
      close.innerText = '✕';
      close.style.background = 'transparent';
      close.style.border = 'none';
      close.style.color = '#ffffff';
      close.style.fontSize = '18px';
      close.style.cursor = 'pointer';
      header.appendChild(title);
      header.appendChild(close);
      var content = document.createElement('div');
      content.style.padding = '24px';
      content.style.overflowY = 'auto';
      content.style.flex = '1';
      var text = document.createElement('p');
      text.innerText =
        data.text ||
        'Your Passively panel is connected successfully.';
      text.style.lineHeight = '1.7';
      content.appendChild(text);
      if (data.buttonText && data.buttonUrl) {
        var cta = document.createElement('a');
        cta.href = data.buttonUrl;
        cta.target = '_blank';
        cta.innerText = data.buttonText;
        cta.style.display = 'inline-block';
        cta.style.marginTop = '24px';
        cta.style.padding = '14px 20px';
        cta.style.borderRadius = '12px';
        cta.style.background = '#ff007f';
        cta.style.color = '#ffffff';
        cta.style.fontWeight = '700';
        cta.style.textDecoration = 'none';
        content.appendChild(cta);
      }
      panel.appendChild(header);
      panel.appendChild(content);
      function openPanel() {
        panel.style.transform = 'translateX(0)';
      }
      function closePanel() {
        panel.style.transform = 'translateX(100%)';
      }
      launcher.addEventListener('click', openPanel);
      close.addEventListener('click', closePanel);
      document.body.appendChild(panel);
      document.body.appendChild(launcher);
    })
    .catch(function (err) {
      console.error('Passively Widget Error:', err);
    });
  function urlBase64ToUint8Array(base64String) {
    const padding =
      "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 =
      (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from(
      [...rawData].map(function (char) {
        return char.charCodeAt(0);
      })
    );
  }
})();
