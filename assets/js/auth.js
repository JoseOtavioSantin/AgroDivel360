// Importa tudo que precisamos do nosso arquivo de configuração
import { db, auth, onAuthStateChanged, signOut, doc, getDoc } from './firebase-config.js';

// --- MAPA DE PERMISSÕES ---
const menuPermissions = {
    'admin-CadastroGestores': ['admin'],
    'admin-CadastroTecnicos': ['admin'],
    'dash-geral':             ['admin', 'diretoria'],
    'dash-comercial':         ['admin', 'diretoria', 'comercial'],
    'dash-pecas':             ['admin', 'diretoria', 'pecas'],
    'dash-servicos':          ['admin', 'diretoria', 'servicos'],
    'dash-PLM':               ['admin', 'diretoria', 'servicos'],
    'dash-planos-manutencao': ['admin', 'diretoria', 'comercial'],
    'ctrl-PlanosVigentes':    ['admin', 'diretoria', 'servicos'],
    'ctrl-MaquinaParada':     ['admin', 'diretoria', 'servicos'],
    'ctrl-Kit50':             ['admin', 'diretoria', 'pecas'],
    'ctrl-ContagemDiaria':    ['admin', 'diretoria', 'pecas'],
};

// Função principal que roda quando o estado de autenticação muda
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Usuário logado:", user.uid);

        const userDocRef = doc(db, "gestores", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const userGroup = userData.grupo; 
            const userName = userData.nome;

            const userNameElement = document.getElementById('user-name');

            if (userNameElement) {
                userNameElement.textContent = userName || 'Usuário';
            }

            if (!userGroup) {
                console.error("Campo 'grupo' não encontrado para o usuário no Firestore!");
                alert("Erro de permissão. Contate o administrador.");
                return;
            }
            
            console.log("Grupo do usuário:", userGroup);
            console.log("Nome do usuário:", userName);

            applyMenuPermissions(userGroup);

        } else {
            console.error("Documento do usuário não encontrado no Firestore!");
            alert("Seu usuário não foi encontrado na base de dados. Redirecionando para o login.");
            window.location.href = '/Pages/Login.html';
        }

    } else {

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
            element.style.display = 'none';
        }
    }

    document.querySelectorAll('.submenu-parent').forEach(menu => {
        const totalItems = menu.querySelectorAll('ul.submenu > li');

        const visibleItems = Array.from(totalItems).filter(item => item.style.display !== 'none');

        if (visibleItems.length === 0 && totalItems.length > 0) {
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

