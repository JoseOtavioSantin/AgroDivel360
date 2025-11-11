// /assets/js/firebase-config.js

// Importe as funções que você vai precisar do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js"; // Importe o getStorage

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel",
  storageBucket: "agro-divel.appspot.com",
  messagingSenderId: "583977436505",
  appId: "1:583977436505:web:3754ec029aebb3d9d67848"
};

// Inicializa o Firebase UMA VEZ e cria as instâncias
const app = initializeApp(firebaseConfig );
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Crie a instância do storage

// Exporta as instâncias prontas para serem usadas em outros arquivos
export { db, auth, storage };
