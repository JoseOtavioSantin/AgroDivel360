// /assets/js/auth-guard.js

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel"
};

// Função de inicialização segura
function inicializarFirebase( ) {
    if (!getApps().length) {
        console.log("Firebase não inicializado. Inicializando agora...");
        return initializeApp(firebaseConfig);
    } else {
        return getApp();
    }
}

const app = inicializarFirebase();
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Tenta buscar um documento de usuário em uma lista de coleções.
 * @param {string} uid - O ID do usuário.
 * @returns {Promise<object|null>} Os dados do usuário ou null se não encontrado.
 */
async function findUserInCollections(uid) {
    const collectionsToSearch = ["gestores", "usuarios"]; // Adicione outras coleções se necessário

    for (const collectionName of collectionsToSearch) {
        const userDocRef = doc(db, collectionName, uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            console.log(`Usuário encontrado na coleção '${collectionName}'.`);
            return userDoc.data();
        }
    }
    console.log("Usuário não encontrado em nenhuma coleção de perfis.");
    return null;
}

/**
 * Função exportada que protege a página.
 * Retorna uma Promise que resolve com os dados do usuário se a autenticação for bem-sucedida.
 */
export function garantirAutenticacao() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Evita múltiplas execuções

            if (user) {
                try {
                    // Procura o usuário em ambas as coleções
                    const userData = await findUserInCollections(user.uid);

                    if (userData) {
                        console.log(`Acesso concedido para: ${userData.nome} (Grupo: ${userData.grupo})`);
                        
                        // Salva os dados no localStorage para uso geral
                        localStorage.setItem("userName", userData.nome);
                        localStorage.setItem("userEmail", userData.email);
                        localStorage.setItem("userGroups", JSON.stringify(userData.grupo || [])); // Garante que seja um array
                        localStorage.setItem("gestorFilial", JSON.stringify(userData.filial || []));
                        
                        // Resolve a Promise com os dados do usuário, permitindo que a página continue
                        resolve(userData); 
                    } else {
                        alert("Seu perfil não foi encontrado. Contate o administrador.");
                        auth.signOut();
                        window.location.href = '/Pages/Login.html';
                        reject("Perfil do usuário não encontrado no Firestore.");
                    }
                } catch (error) {
                    console.error("Erro ao verificar perfil do usuário:", error);
                    auth.signOut();
                    reject(error);
                }
            } else {
                // Se não houver usuário, redireciona para o login
                alert("Acesso restrito. Por favor, faça o login.");
                window.location.href = '/Pages/Login.html';
                reject("Nenhum usuário logado.");
            }
        });
    });
}
