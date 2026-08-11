importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyDVXCLxbAG_u4iM3h5PtOqnelFXg_6oFAI',
  authDomain:        'haylacaphe-158ea.firebaseapp.com',
  projectId:         'haylacaphe-158ea',
  storageBucket:     'haylacaphe-158ea.appspot.com',
  messagingSenderId: '510491719603',
  appId:             '1:510491719603:web:placeholder',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title = 'Công việc mới', body = '' } = payload.notification ?? {};
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data,
  });
});
