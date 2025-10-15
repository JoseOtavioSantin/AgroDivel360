// /assets/js/main.js (VERSÃO COM SUBMENU CORRIGIDO)

function inicializarInterface() {

    console.log("SUCESSO: A função inicializarInterface() foi chamada e está executando!");

    const body = document.querySelector('body');
    const sidebar = body.querySelector('nav.sidebar');
    const toggle = body.querySelector(".toggle");
    const submenuParents = document.querySelectorAll(".submenu-parent");

    if (toggle && sidebar) {
        toggle.addEventListener("click", () => {
            sidebar.classList.toggle("close");
            localStorage.setItem("sidebarState", sidebar.classList.contains("close") ? "closed" : "open");

            // Ao fechar o menu principal, também fecha todos os submenus
            if (sidebar.classList.contains("close")) {
                submenuParents.forEach(parent => {
                    parent.classList.remove("open");
                });
            }
        });
    } else {
        console.error("Elemento '.toggle' ou 'nav.sidebar' não encontrado!");
        return;
    }

    // --- AJUSTE NOS SUBMENUS COMEÇA AQUI ---
    submenuParents.forEach(parent => {
        const linkPai = parent.querySelector('a');
        if (linkPai) {
            linkPai.addEventListener("click", (e) => {
                e.preventDefault(); // Impede a navegação, permitindo que o clique abra o submenu

                // Se a sidebar estiver fechada, a primeira ação é sempre abri-la.
                if (sidebar.classList.contains("close")) {
                    sidebar.classList.remove("close");
                    localStorage.setItem("sidebarState", "open");
                    return; // Não faz mais nada neste clique, o próximo clique abrirá o submenu.
                }

                const clickedParent = e.currentTarget.parentElement;
                const isOpen = clickedParent.classList.contains("open");

                // Fecha todos os OUTROS submenus para manter a interface limpa
                submenuParents.forEach(p => {
                    if (p !== clickedParent) {
                        p.classList.remove("open");
                    }
                });

                // Abre ou fecha o submenu que foi clicado.
                // A classe 'open' é adicionada/removida APENAS no elemento pai (o <li>).
                // O CSS fará o resto.
                if (isOpen) {
                    clickedParent.classList.remove("open");
                } else {
                    clickedParent.classList.add("open");
                }
            });
        }
    });
    // --- FIM DO AJUSTE NOS SUBMENUS ---

    // Lógica que verifica o estado salvo do menu (continua igual)
    if (localStorage.getItem("sidebarState") === "closed") {
        sidebar.classList.add("close");
    }

} // Fim da função
