// /assets/js/auth.js

// Importa tudo que precisamos do nosso arquivo de configuração
import { db, auth, onAuthStateChanged, signOut, doc, getDoc } from './firebase-config.js';

// --- MAPA DE PERMISSÕES ---
// Defina aqui quais grupos podem ver quais itens do menu.
// A chave é o ID que colocamos no HTML (ex: 'dash-comercial').
// O valor é um array com os nomes dos grupos (ex: ['admin', 'comercial']).
const menuPermissions = {
    'admin-geral':            ['admin'],
    'dash-geral':             ['admin', 'diretoria'],
    'dash-comercial':         ['admin', 'diretoria', 'comercial'],
    'dash-pecas':             ['admin', 'diretoria', 'pecas'],
    'dash-servicos':          ['admin', 'diretoria', 'servicos'],
    'dash-planos-manutencao': ['admin', 'diretoria', 'comercial'],
    'dash-planos-vigentes':   ['admin', 'diretoria', 'comercial'],
    'ctrl-PlanosVigentes':    ['admin', 'diretoria', 'servicos'],
    'ctrl-MaquinaParada':     ['admin', 'diretoria', 'servicos'],
    'ctrl-Kit50':             ['admin', 'diretoria', 'pecas'],
    'ctrl-ContagemDiaria':    ['admin', 'diretoria', 'pecas'],
};

// Função principal que roda quando o estado de autenticação muda
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. USUÁRIO ESTÁ LOGADO
        console.log("Usuário logado:", user.uid);
        // AINDA NÃO DEFINIMOS O NOME AQUI

        // 2. BUSCAR OS DADOS DO USUÁRIO NO FIRESTORE
        const userDocRef = doc(db, "gestores", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const userGroup = userData.grupo; 
            const userName = userData.nome; // <-- PEGAMOS O NOME DO FIRESTORE

            // AGORA ATUALIZAMOS O NOME NA PÁGINA
            document.getElementById('user-name').textContent = userName || 'Usuário'; // <-- NOVA LINHA

            if (!userGroup) {
                console.error("Campo 'grupo' não encontrado para o usuário no Firestore!");
                alert("Erro de permissão. Contate o administrador.");
                return;
            }
            
            console.log("Grupo do usuário:", userGroup);
            console.log("Nome do usuário:", userName);

            // 3. APLICAR AS PERMISSÕES NO MENU
            applyMenuPermissions(userGroup);

        } else {
            console.error("Documento do usuário não encontrado no Firestore!");
            alert("Seu usuário não foi encontrado na base de dados. Redirecionando para o login.");
            window.location.href = '/Pages/Login.html';
        }

    } else {
        // 4. USUÁRIO NÃO ESTÁ LOGADO
        console.log("Nenhum usuário logado. Redirecionando para a página de login.");
        window.location.href = '/Pages/Login.html';
    }
});

// Função que percorre o mapa de permissões e esconde os itens
function applyMenuPermissions(userGroup) {
    for (const menuItemId in menuPermissions) {
        const allowedGroups = menuPermissions[menuItemId];
        const element = document.getElementById(menuItemId);

        if (element && !allowedGroups.includes(userGroup)) {
            element.style.display = 'none'; // Esconde o item se o grupo não for permitido
        }
    }
    // Bônus: Esconde os menus principais (Dashboards, Controles) se todos os filhos forem escondidos
    document.querySelectorAll('.submenu-parent').forEach(menu => {
        const visibleItems = menu.querySelectorAll('li[style*="display: none"]');
        const totalItems = menu.querySelectorAll('ul.submenu li');
        if (visibleItems.length === totalItems.length) {
            menu.style.display = 'none';
        }
    });
}

// Lógica do botão de Logout
const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log('Logout bem-sucedido.');
            window.location.href = '/Pages/Login.html';
        }).catch((error) => {
            console.error('Erro ao fazer logout:', error);
        });
    });
}





