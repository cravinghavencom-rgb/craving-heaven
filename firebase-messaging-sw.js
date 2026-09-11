 importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js"
);


firebase.initializeApp({
  apiKey: "AIzaSyDVYYv3TMRKWktXA33jOGjniz43hDfRVe4",
  authDomain: "craving-heaven-e2e94.firebaseapp.com",
  projectId: "craving-heaven-e2e94",
  storageBucket: "craving-heaven-e2e94.firebasestorage.app",
  messagingSenderId: "20081214048",
  appId: "1:20081214048:web:cae67b0874111ab653905",
  measurementId: "G-GD2EPFLYPZ"
});


const messaging = firebase.messaging();


messaging.onBackgroundMessage((payload) => {

  console.log(
    "[firebase-messaging-sw.js] Background message:",
    payload
  );

  const notificationTitle =
    payload.notification?.title ||
    "CRAVING HEAVEN";

  const notificationOptions = {

    body:
      payload.notification?.body ||
      "🔥 New offer available!",

    icon:
      "/images/logo.png",

    badge:
      "/images/logo.png",

    data: {
      url:
        payload.data?.url ||
        "https://cravingheaven.com/"
    }

  };


  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );

});


self.addEventListener("notificationclick", event => {

  event.notification.close();

  const targetUrl =
    event.notification?.data?.url ||
    "https://cravingheaven.com/";


  event.waitUntil(

    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(clientList => {

      for (const client of clientList) {

        if (
          client.url.includes(
            "cravingheaven.com"
          ) &&
          "focus" in client
        ) {

          client.navigate(targetUrl);

          return client.focus();
        }

      }


      if (clients.openWindow) {

        return clients.openWindow(
          targetUrl
        );

      }

    })

  );

});