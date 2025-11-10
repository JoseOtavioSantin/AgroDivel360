// /assets/js/firebase-config.js

// Importe as funções que você vai precisar do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Sua configuração do Firebase que você forneceu
const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel",
  storageBucket: "agro-divel.appspot.com", // Corrigi o domínio aqui para o padrão
  messagingSenderId: "583977436505",
  appId: "1:583977436505:web:3754ec029aebb3d9d67848"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig );
const db = getFirestore(app);
const auth = getAuth(app);

// Exporta as instâncias e funções para usar em outros arquivos
export { db, auth, onAuthStateChanged, signOut, doc, getDoc };
