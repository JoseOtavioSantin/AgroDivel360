// /assets/js/auth-guard.js

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel"
};

// Função de inicialização segura: só inicializa se ainda não existir
function inicializarFirebase( ) {
    if (!getApps().length) {
        console.log("Firebase não inicializado. Inicializando agora...");
        return initializeApp(firebaseConfig);
    } else {
        console.log("Firebase já inicializado. Obtendo instância existente.");
        return getApp();
    }
}

const app = inicializarFirebase();
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Função exportada que protege a página.
 * Retorna uma Promise que resolve quando a autenticação é bem-sucedida,
 * ou redireciona se falhar.
 */
export function garantirAutenticacao() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "gestores", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    console.log(`Acesso concedido para: ${userData.nome} (Grupo: ${userData.grupo})`);
                    
                    localStorage.setItem("gestorEmail", userData.email);
                    localStorage.setItem("gestorNome", userData.nome);
                    localStorage.setItem("gestorGrupo", userData.grupo);
                    localStorage.setItem("gestorFilial", JSON.stringify(userData.filial || []));
                    
                    resolve(userData); // Resolve a Promise, permitindo que a página continue
                } else {
                    alert("Você não tem permissão para acessar esta área. Contate o administrador.");
                    window.location.href = '/Pages/Login.html';
                    reject("Usuário não encontrado em 'gestores'.");
                }
            } else {
                alert("Acesso restrito. Por favor, faça o login.");
                window.location.href = '/Pages/Login.html';
                reject("Nenhum usuário logado.");
            }
        });
    });
}
