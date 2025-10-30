// Importa os scripts necessários do Firebase
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js" );
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js" );

// Sua configuração do Firebase (a mesma do firebase-config.js)
const firebaseConfig = {
    apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
    authDomain: "agro-divel.firebaseapp.com",
    projectId: "agro-divel",
    storageBucket: "agro-divel.appspot.com",
    messagingSenderId: "583977436505",
    appId: "1:583977436505:web:3754ec029aebb3d9d67848"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Pega a instância do Messaging
const messaging = firebase.messaging();

// Handler para quando a notificação é recebida com o app em SEGUNDO PLANO
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  // Extrai os dados da notificação
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/assets/images/logo_notification.png", // Ícone para a notificação
  };

  // Exibe a notificação
  self.registration.showNotification(notificationTitle, notificationOptions);
});
