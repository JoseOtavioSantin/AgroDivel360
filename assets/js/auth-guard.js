// Importa as funções essenciais do seu arquivo de configuração do Firebase.
import { db, auth, onAuthStateChanged, doc, getDoc } from './firebase-config.js';

/**
 * Função universal para proteger páginas.
 * Verifica se há um usuário autenticado pelo Firebase Auth e se seu UID
 * corresponde a um documento na coleção 'gestores' do Firestore.
 * Redireciona para a página de login se a verificação falhar.
 */
async function protegerPagina() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 1. Usuário está autenticado no Firebase. Agora, vamos validar no Firestore.
            console.log("Verificando autorização para o UID:", user.uid);
            const userDocRef = doc(db, "gestores", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                // 2. Usuário encontrado no Firestore. Acesso permitido!
                const userData = userDoc.data();
                console.log(`Acesso concedido para: ${userData.nome} (Grupo: ${userData.grupo})`);
                
                // Salva informações úteis no localStorage para a página usar.
                localStorage.setItem("gestorEmail", userData.email);
                localStorage.setItem("gestorNome", userData.nome);
                localStorage.setItem("gestorGrupo", userData.grupo);
                localStorage.setItem("gestorFilial", JSON.stringify(userData.filial || []));

                // Dispara um evento personalizado para notificar a página que a autenticação foi concluída.
                // A página principal pode "ouvir" esse evento para começar a carregar seus dados.
                window.dispatchEvent(new Event('auth-ready'));

            } else {
                // 3. Usuário autenticado, mas não encontrado em 'gestores'. Acesso negado.
                console.error("Usuário autenticado, mas não encontrado na coleção 'gestores'.");
                alert("Você não tem permissão para acessar esta área. Contate o administrador.");
                window.location.href = '/Pages/Login.html'; // Ajuste o caminho se necessário
            }
        } else {
            // 4. Nenhum usuário autenticado no Firebase. Redireciona para o login.
            console.log("Nenhum usuário logado. Redirecionando para o login.");
            window.location.href = '/Pages/Login.html'; // Ajuste o caminho se necessário
        }
    });
}

// Executa a função de proteção imediatamente.
protegerPagina();
