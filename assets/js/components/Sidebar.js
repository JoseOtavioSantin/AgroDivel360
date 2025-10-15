// assets/js/components.js

document.addEventListener("DOMContentLoaded", function() {
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    
    if (sidebarPlaceholder) {
        fetch('/assets/components/Sidebar.html')
            .then(response => response.text())
            .then(htmlDaSidebar => {
                // Cria um elemento temporário para parsear o HTML recebido
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlDaSidebar;
                
                // Pega a <nav> de dentro do HTML que recebemos
                const novaSidebar = tempDiv.querySelector('nav.sidebar');
                
                if (novaSidebar) {
                    // Substitui o placeholder <nav id="sidebar-placeholder"> pela <nav class="sidebar"> completa
                    sidebarPlaceholder.replaceWith(novaSidebar);

                    // Agora que a sidebar REAL está no lugar certo, inicializamos a interface
                    if (typeof inicializarInterface === 'function') {
                        inicializarInterface();
                    } else {
                        console.error('A função inicializarInterface() não foi encontrada.');
                    }
                }
            })
            .catch(error => {
                console.error('Erro ao carregar o componente da sidebar:', error);
            });
    }
});
