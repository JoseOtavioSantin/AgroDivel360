// /assets/js/firebase-config.js

// Importe as funções de inicialização do SDK do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel",
  storageBucket: "agro-divel.appspot.com", // Corrigido para o padrão .appspot.com
  messagingSenderId: "583977436505",
  appId: "1:583977436505:web:3754ec029aebb3d9d67848"
};

// Variáveis para armazenar as instâncias, evitando reinicialização
let firebaseInstances = null;

// A função que o resto do seu app vai chamar
export function inicializarFirebase( ) {
    // Se já foi inicializado, apenas retorna as instâncias existentes
    if (firebaseInstances) {
        return firebaseInstances;
    }

    // Se não, inicializa tudo
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app);

    // Armazena as instâncias para futuras chamadas
    firebaseInstances = { app, db, auth, storage, onAuthStateChanged, signOut, doc, getDoc };
    
    // Retorna o objeto com tudo que os outros arquivos precisam
    return firebaseInstances;
}
