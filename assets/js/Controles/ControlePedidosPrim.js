// /assets/js/ControlePedidosPrim.js

// Importações essenciais do Firebase e do nosso sistema de autenticação.
import { garantirAutenticacao } from '/assets/js/auth-guard.js';
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Função principal que encapsula toda a lógica da página.
 */
async function iniciarPagina( ) {
    try {
        // 1. GARANTIR AUTENTICAÇÃO
        const userData = await garantirAutenticacao();

        const app = getApp();
        const db = getFirestore(app);
        const pedidosCollection = collection(db, "pedidosPrim");

        // --- Captura dos elementos do HTML ---
        const tabelaBody = document.getElementById('tabela-pedidos');
        const loaderOverlay = document.getElementById('loader-overlay');
        const filtroCodigo = document.getElementById('filtro-codigo');
        const filtroPedidoPara = document.getElementById('filtro-pedido-para');
        const dynamicTitle = document.getElementById('dynamic-title');
        const btnImportarExcel = document.getElementById('btn-importar-excel');
        const excelUploader = document.getElementById('excel-uploader');

        let dadosCompletos = [];
        let dadosFiltrados = [];

        // --- Funções do Sistema ---

        // ==================================================================
        // AQUI ESTÁ A FUNÇÃO COM A LÓGICA DE FILTRAGEM PADRONIZADA
        // ==================================================================
        async function carregarDadosDoFirebase() {
            if (loaderOverlay) loaderOverlay.style.display = 'flex';
            
            // Lógica padrão para o título
            if (dynamicTitle) {
                const filiaisLogadas = userData.filial || [];
                if (userData.grupo && userData.grupo.includes('admin')) {
                    dynamicTitle.textContent = `Filial: ${filiaisLogadas.join(", ")}`;
                } else {
                    dynamicTitle.textContent = `Filial: ${filiaisLogadas.join(", ")}`;
                }
            }

            // Busca todos os documentos da coleção 'pedidosPrim'
            const q = query(pedidosCollection);
            const querySnapshot = await getDocs(q);
            const todosOsPedidos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Se o usuário NÃO for admin, aplica o filtro de filial
            if (userData && userData.grupo && !userData.grupo.includes('admin')) {
                const filiaisDoUsuario = userData.filial || [];
                dadosCompletos = todosOsPedidos.filter(pedido => {
                    // Usa o campo 'pedidoPara' para verificar a filial
                    const filialDoPedido = (pedido.pedidoPara || "").toLowerCase().trim();
                    
                    // Se o pedido não tiver uma filial definida, ele não será mostrado para usuários comuns
                    if (!filialDoPedido) return false; 
                    
                    // Verifica se a filial do pedido está na lista de filiais permitidas para o usuário
                    return filiaisDoUsuario.some(f => f.toLowerCase().trim() === filialDoPedido);
                });
            } else {
                // Se for admin, carrega todos os pedidos sem filtro
                dadosCompletos = todosOsPedidos;
            }

            aplicarFiltros();
            if (loaderOverlay) loaderOverlay.style.display = 'none';
        }
        // ==================================================================

        function aplicarFiltros() {
            const codigoFiltro = filtroCodigo ? filtroCodigo.value.toUpperCase() : '';
            const pedidoParaFiltro = filtroPedidoPara ? filtroPedidoPara.value.toUpperCase() : '';

            dadosFiltrados = dadosCompletos.filter(pedido =>
                (pedido.codigo || '').toUpperCase().includes(codigoFiltro) &&
                (pedido.pedidoPara || '').toUpperCase().includes(pedidoParaFiltro)
            );

            dadosFiltrados.sort((a, b) => {
                const aChegou = a.status === 'AGUARDANDO PEÇA' && a.chegouEstoque;
                const bChegou = b.status === 'AGUARDANDO PEÇA' && b.chegouEstoque;
                if (aChegou && !bChegou) return -1;
                if (!aChegou && bChegou) return 1;
                return new Date(b.data) - new Date(a.data);
            });

            renderizarTabela();
            atualizarCards();
        }

        function renderizarTabela() {
            if (!tabelaBody) return;
            tabelaBody.innerHTML = '';
            if (dadosFiltrados.length === 0) {
                tabelaBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Nenhum pedido encontrado.</td></tr>';
                return;
            }

            dadosFiltrados.forEach(pedido => {
                const tr = document.createElement('tr');
                tr.dataset.id = pedido.id;

                if (pedido.status === 'AGUARDANDO PEÇA' && pedido.chegouEstoque) {
                    tr.classList.add('chegou-no-estoque');
                } else if (pedido.status === 'AGUARDANDO PEÇA') {
                    tr.classList.add('status-aguardando');
                } else if (pedido.status === 'PEDIDO CONCLUÍDO') {
                    tr.classList.add('status-concluido');
                }

                tr.innerHTML = `
                    <td>${pedido.codigo || ''}</td>
                    <td>${pedido.quantidade || ''}</td>
                    <td>${pedido.pedidoPara || ''}</td>
                    <td>${pedido.status || ''}</td>
                    <td>${pedido.fornecedor || 'PRIM'}</td>
                    <td>${formatarData(pedido.data)}</td>
                    <td class="acoes-cell">
                        <a href="/Pages/Formularios/form-prim.html?id=${pedido.id}" class="btn-acao" title="Editar Pedido">
                            <i data-lucide="pencil"></i>
                        </a>
                        <button class="btn-acao btn-delete" data-id="${pedido.id}" title="Apagar Pedido">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
                tabelaBody.appendChild(tr);
            });

            if (window.lucide) {
                lucide.createIcons();
            }
        }

        function atualizarCards() {
            const totalEl = document.getElementById('total-pedidos');
            const aguardandoEl = document.getElementById('pedidos-aguardando');
            const concluidosEl = document.getElementById('pedidos-concluidos');

            if (!totalEl || !aguardandoEl || !concluidosEl) return;

            const total = dadosFiltrados.length;
            const aguardando = dadosFiltrados.filter(k => k.status === 'AGUARDANDO PEÇA').length;
            const concluidos = dadosFiltrados.filter(k => k.status === 'PEDIDO CONCLUÍDO').length;
            totalEl.textContent = total;
            aguardandoEl.textContent = aguardando;
            concluidosEl.textContent = concluidos;
        }

        function formatarData(dataString) {
            if (!dataString || !dataString.includes('-')) return 'Inválida';
            const [ano, mes, dia] = dataString.split('-');
            return `${dia}/${mes}/${ano}`;
        }

        async function apagarPedido(id) {
            const pedido = dadosCompletos.find(p => p.id === id);
            if (!pedido) return;

            if (typeof Swal === 'undefined') {
                if (confirm(`Tem certeza que deseja apagar o pedido da peça "${pedido.codigo}"?`)) {
                    await deleteDoc(doc(db, "pedidosPrim", id));
                    await carregarDadosDoFirebase();
                }
                return;
            }

            const result = await Swal.fire({
                title: 'Tem certeza?',
                text: `Deseja apagar o pedido da peça "${pedido.codigo}"? Esta ação não pode ser desfeita.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, apagar!',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(db, "pedidosPrim", id));
                    Swal.fire('Apagado!', 'O pedido foi removido com sucesso.', 'success');
                    await carregarDadosDoFirebase();
                } catch (error) {
                    console.error("Erro ao apagar pedido:", error);
                    Swal.fire('Erro!', 'Não foi possível apagar o pedido.', 'error');
                }
            }
        }

        // --- EVENTOS ---
        if (filtroCodigo) filtroCodigo.addEventListener('input', aplicarFiltros);
        if (filtroPedidoPara) filtroPedidoPara.addEventListener('input', aplicarFiltros);

        if (btnImportarExcel) {
            btnImportarExcel.addEventListener('click', () => {
                if (excelUploader) excelUploader.click();
            });
        }
        if (excelUploader) {
            excelUploader.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) { /* Lógica de importação */ }
                event.target.value = null;
            });
        }

        if (tabelaBody) {
            tabelaBody.addEventListener('click', (event) => {
                const deleteButton = event.target.closest('.btn-delete');
                if (deleteButton) {
                    const id = deleteButton.dataset.id;
                    apagarPedido(id);
                }
            });
        }

        // --- INICIALIZAÇÃO ---
        await carregarDadosDoFirebase();

    } catch (error) {
        console.error("Falha na autenticação ou inicialização:", error);
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px; font-family: sans-serif;">
            <h2>Acesso Negado</h2>
            <p>Ocorreu um erro crítico. Verifique se você está logado e tente recarregar a página.</p>
            <a href="/login.html" style="color: #a0c4ff; text-decoration: none; background: #007bff; padding: 10px 15px; border-radius: 5px;">Voltar para o Login</a>
        </div>`;
    }
}

// Inicia todo o processo da página.
iniciarPagina();
