// /assets/js/main.js

const body = document.querySelector('body'),
      sidebar = body.querySelector('nav.sidebar'),
      toggle = body.querySelector(".toggle"),
      submenuParents = document.querySelectorAll(".submenu-parent");

toggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");
    // Salva o estado do menu (aberto/fechado) no navegador
    localStorage.setItem("sidebarState", sidebar.classList.contains("close") ? "closed" : "open");

    // Fecha todos os submenus ao fechar a sidebar
    if (sidebar.classList.contains("close")) {
        submenuParents.forEach(parent => {
            parent.classList.remove("open");
            parent.querySelector(".submenu").classList.remove("open");
        });
    }
});

submenuParents.forEach(parent => {
    // Adiciona o evento de clique no link pai (<a>)
    parent.querySelector('a').addEventListener("click", (e) => {
        e.preventDefault(); // Impede a navegação

        const clickedParent = e.currentTarget.parentElement;

        // Se a sidebar estiver fechada, abre ela e não faz mais nada
        if (sidebar.classList.contains("close")) {
            sidebar.classList.remove("close");
            localStorage.setItem("sidebarState", "open");
            return;
        }

        const submenu = clickedParent.querySelector(".submenu");
        const isOpen = clickedParent.classList.contains("open");

        // Fecha todos os outros submenus abertos
        submenuParents.forEach(p => {
            if (p !== clickedParent) {
                p.classList.remove("open");
                p.querySelector(".submenu").classList.remove("open");
            }
        });

        // Abre ou fecha o submenu clicado
        if (isOpen) {
            clickedParent.classList.remove("open");
            submenu.classList.remove("open");
        } else {
            clickedParent.classList.add("open");
            submenu.classList.add("open");
        }
    });
});

// Verifica o estado salvo do menu quando a página carrega
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("sidebarState") === "closed") {
        sidebar.classList.add("close");
    }
});
