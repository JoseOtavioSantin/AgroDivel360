// assets/js/components.js

document.addEventListener("DOMContentLoaded", function() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    
    if (sidebarPlaceholder) {
        // Busca o conteúdo do arquivo sidebar.html
        fetch('/assets/components/Sidebar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Não foi possível carregar a sidebar. Verifique o caminho do arquivo.');
                }
                return response.text();
            })
            .then(htmlDaSidebar => {
                // 1. Insere o HTML da sidebar no placeholder
                sidebarPlaceholder.innerHTML = htmlDaSidebar;

                // 2. CRIA um novo elemento de script
                const mainScript = document.createElement('script');
                
                // 3. DEFINE o caminho para o seu main.js
                mainScript.src = '/assets/js/main.js';
                
                // 4. ADICIONA o script ao final do body.
                // Isso fará com que o navegador carregue e execute o main.js AGORA,
                // que a sidebar já existe na página.
                document.body.appendChild(mainScript);
            })
            .catch(error => {
                console.error('Erro ao carregar o componente da sidebar:', error);
                sidebarPlaceholder.innerHTML = '<p style="color:red; padding: 20px;">Erro ao carregar o menu.</p>';
            });
    }
});
