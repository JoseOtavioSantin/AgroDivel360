// /assets/js/main.js (VERSÃO CORRIGIDA)

function inicializarInterface() {

    // Adicionei este log para termos 100% de certeza que a função foi chamada
    console.log("SUCESSO: A função inicializarInterface() foi chamada e está executando!");

    // 1. A busca pelos elementos foi movida para DENTRO da função.
    // Isso garante que eles serão procurados no momento certo.
    const body = document.querySelector('body');
    const sidebar = body.querySelector('nav.sidebar');
    const toggle = body.querySelector(".toggle");
    const submenuParents = document.querySelectorAll(".submenu-parent");

    // 2. Verificação de segurança: só adiciona eventos se os elementos existirem.
    if (toggle && sidebar) {
        toggle.addEventListener("click", () => {
            sidebar.classList.toggle("close");
            localStorage.setItem("sidebarState", sidebar.classList.contains("close") ? "closed" : "open");

            if (sidebar.classList.contains("close")) {
                submenuParents.forEach(parent => {
                    parent.classList.remove("open");
                });
            }
        });
    } else {
        console.error("Elemento '.toggle' ou 'nav.sidebar' não encontrado!");
        return; // Para a execução se a sidebar não foi carregada corretamente.
    }

    // 3. Lógica dos submenus, também dentro da função.
    submenuParents.forEach(parent => {
        const linkPai = parent.querySelector('a');
        if (linkPai) {
            linkPai.addEventListener("click", (e) => {
                e.preventDefault();

                if (sidebar.classList.contains("close")) {
                    sidebar.classList.remove("close");
                    localStorage.setItem("sidebarState", "open");
                    return;
                }

                const clickedParent = e.currentTarget.parentElement;
                const isOpen = clickedParent.classList.contains("open");

                // Fecha outros submenus
                submenuParents.forEach(p => {
                    if (p !== clickedParent) {
                        p.classList.remove("open");
                    }
                });

                // Abre/fecha o submenu atual
                clickedParent.classList.toggle("open", !isOpen);
            });
        }
    });

    // 4. Lógica que verifica o estado salvo do menu.
    // Não precisa mais do "DOMContentLoaded" aqui, pois a função já roda depois do carregamento.
    if (localStorage.getItem("sidebarState") === "closed") {
        sidebar.classList.add("close");
    }

} // <-- FIM DA FUNÇÃO inicializarInterface

// GARANTA QUE NÃO HÁ NENHUM CÓDIGO FORA DA FUNÇÃO AQUI EMBAIXO.
