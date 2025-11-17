// Importa tudo que precisamos do nosso arquivo de configuração
import { db, auth, onAuthStateChanged, signOut, doc, getDoc } from './firebase-config.js';

// --- MAPA DE PERMISSÕES ---
const menuPermissions = {
    // --- ADMIN ---
    'admin-CadastroGestores': ['admin'],
    'admin-CadastroTecnicos': ['admin'],

    // --- DIRETORIA ---
    'dash-geral': ['admin', 'diretoria'],

    // --- COMERCIAL ---
    'dash-comercial': ['admin', 'diretoria', 'comercial'],
    'dash-Seguro': ['admin', 'diretoria', 'comercial', 'pecas'], // Adicione 'pecas' aqui
    'dash-Consorcio': ['admin', 'diretoria', 'comercial'],

    // --- PECAS ---
    'dash-pecas': ['admin', 'diretoria', 'pecas'],
    'ctrl-Kit50': ['admin', 'diretoria', 'pecas'],
    'ctrl-ContagemDiaria': ['admin', 'diretoria', 'pecas'],
    'ctrl-PedidosPecas': ['admin', 'diretoria', 'pecas'],
    'ctrl-ControleFerramentas': ['admin', 'diretoria', 'pecas'],

    // --- SERVICOS ---
    'dash-servicos': ['admin', 'diretoria', 'servicos'],
    'dash-PLM': ['admin', 'diretoria', 'servicos'],
    'dash-planos-manutencao': ['admin', 'diretoria', 'servicos'],
    'ctrl-PlanosVigentes': ['admin', 'diretoria', 'servicos'],
    'ctrl-MaquinaParada': ['admin', 'diretoria', 'servicos'],
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
            // Novo campo para permissões individuais (usa array vazio se não existir)
            const permissoesIndividuais = userData.permissoes || [];

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
            console.log("Permissões individuais:", permissoesIndividuais);

            applyMenuPermissions(userGroup, permissoesIndividuais);

        } else {
            console.error("Documento do usuário não encontrado no Firestore!");
            alert("Seu usuário não foi encontrado na base de dados. Redirecionando para o login.");
            window.location.href = '/Pages/Login.html';
        }

    } else {
        console.log("Nenhum usuário logado. Redirecionando para a página de login.");
        window.location.href = '/Pages/Login/Login.html';
    }
});

// Função que verifica se o usuário tem acesso a um item de menu
function hasPermission(menuItemId, userGroup, permissoesIndividuais) {
    const allowedGroups = menuPermissions[menuItemId];
    
    // Verifica se o grupo principal tem acesso
    if (allowedGroups.includes(userGroup)) {
        return true;
    }
    
    // Verifica se tem permissão individual específica
    if (permissoesIndividuais.includes(menuItemId)) {
        return true;
    }
    
    return false;
}

// Função que percorre o mapa de permissões e esconde os itens
function applyMenuPermissions(userGroup, permissoesIndividuais = []) {
    for (const menuItemId in menuPermissions) {
        const element = document.getElementById(menuItemId);

        if (element) {
            const temAcesso = hasPermission(menuItemId, userGroup, permissoesIndividuais);
            
            if (!temAcesso) {
                element.style.display = 'none';
            } else {
                element.style.display = ''; // Garante que está visível
            }
        }
    }

    // Esconde menus pais sem itens visíveis
    document.querySelectorAll('.submenu-parent').forEach(menu => {
        const totalItems = menu.querySelectorAll('ul.submenu > li');
        const visibleItems = Array.from(totalItems).filter(item => item.style.display !== 'none');

        if (visibleItems.length === 0 && totalItems.length > 0) {
            menu.style.display = 'none';
        }
    });
}

// Lógica do botão de Logout (mantido igual)
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
