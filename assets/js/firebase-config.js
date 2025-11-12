// /assets/js/firebase-config.js (Versão completa e recomendada)

// Importe as funções que você vai precisar do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js"; // Adicionado

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel",
  storageBucket: "agro-divel.appspot.com",
  messagingSenderId: "583977436505",
  appId: "1:583977436505:web:3754ec029aebb3d9d67848"
};

// Inicializa o Firebase e cria as instâncias
const app = initializeApp(firebaseConfig );
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Adicionado

// Exporta as instâncias e funções para usar em outros arquivos
export { db, auth, storage, onAuthStateChanged, signOut, doc, getDoc }; // Adicionado 'storage'
