// /assets/js/firebase-config.js

// Importa as funções de inicialização
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel",
  storageBucket: "agro-divel.appspot.com",
  messagingSenderId: "583977436505",
  appId: "1:583977436505:web:3754ec029aebb3d9d67848"
};

// Inicializa o Firebase UMA ÚNICA VEZ
const app = initializeApp(firebaseConfig );

// Cria e exporta as instâncias dos serviços que você vai usar
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app);

// Exporta as instâncias prontas para serem usadas em qualquer outro arquivo
export { app, db, auth, messaging };
