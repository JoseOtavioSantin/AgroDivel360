// Espera o conteúdo da página carregar antes de executar o script
document.addEventListener("DOMContentLoaded", function() {
    // Encontra o elemento que vai receber o componente da sidebar
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    
    if (sidebarPlaceholder) {
        // Busca o conteúdo do arquivo sidebar.html
        fetch('/assets/components/Sidebar.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Não foi possível carregar a sidebar.');
                }
                return response.text();
            })
            .then(data => {
                // Insere o HTML da sidebar no placeholder
                sidebarPlaceholder.innerHTML = data;

                // **IMPORTANTE**: Após carregar a sidebar, precisamos reinicializar
                // o script que cuida da funcionalidade dela (abrir/fechar, submenus, etc.).
                // Se o seu script principal está em main.js, você pode chamá-lo aqui
                // ou mover a lógica relevante para uma função que possa ser chamada.
                
                // Exemplo: Se a lógica do menu está em main.js, adicione um novo script
                // para garantir que ele rode *depois* que a sidebar for inserida.
                const script = document.createElement('script');
                script.src = '/assets/js/main.js';
                document.body.appendChild(script);
            })
            .catch(error => {
                console.error('Erro ao carregar o componente da sidebar:', error);
                sidebarPlaceholder.innerHTML = '<p style="color:red;">Erro ao carregar o menu.</p>';
            });
    }
});
