// /assets/js/ControlePedidosPrim.js

// Importações essenciais do Firebase e do nosso sistema de autenticação.
import { garantirAutenticacao } from '/assets/js/auth-guard.js';
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, query, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==================================================================
// LÓGICA DE IMPORTAÇÃO DE EXCEL (SheetJS)
// ==================================================================

/**
 * Processa o arquivo Excel e extrai os pedidos válidos.
 * @param {File} file - O arquivo Excel.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve com um array de objetos de pedidos.
 */
function processarExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // XLSX é carregado via CDN no HTML (linha 13)
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Assumindo que a primeira aba é a que contém os dados
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Converte a planilha para um array de objetos JSON, pulando as primeiras 9 linhas de cabeçalho
                // O cabeçalho real está na linha 9 (índice 8 no array)
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 9 });

                const headers = json[0];
                const dataRows = json.slice(1);

                // Mapeamento das colunas baseado na análise da planilha
                const colMap = {
                    'Código da Peça': headers.indexOf('Código da Peça'),
                    'Quantidade Modificada': headers.indexOf('Quantidade Modificada'),
                    'Cidade': headers.indexOf('Cidade')
                };

                const pedidosParaSalvar = [];
                // Data de importação no formato YYYY-MM-DD
                const dataAtual = new Date().toISOString().split('T')[0]; 

                dataRows.forEach(row => {
                    const codigoIndex = colMap['Código da Peça'];
                    const quantidadeIndex = colMap['Quantidade Modificada'];
                    const cidadeIndex = colMap['Cidade'];

                    // Verifica se a linha tem dados suficientes e se o código da peça existe
                    if (row.length > codigoIndex && row[codigoIndex]) {
                        const codigo = String(row[codigoIndex]).trim();
                        // Garante que a quantidade é um número e trata valores nulos/inválidos como 0
                        const quantidade = parseInt(row[quantidadeIndex], 10) || 0;
                        const cidade = String(row[cidadeIndex] || '').trim().toUpperCase();

                        // Apenas importa se a quantidade modificada for maior que zero
                        if (quantidade > 0 && codigo && cidade) {
                            pedidosParaSalvar.push({
                                codigo: codigo,
                                quantidade: quantidade,
                                pedidoPara: cidade, // Mapeado para Cidade
                                fornecedor: 'PRIM', // Fixo
                                status: 'AGUARDANDO PEÇA', // Status inicial
                                data: dataAtual, // Data de importação
                            });
                        }
                    }
                });

                resolve(pedidosParaSalvar);

            } catch (error) {
                reject(new Error("Erro ao processar o arquivo Excel: " + error.message));
            }
        };

        reader.onerror = (error) => {
            reject(new Error("Erro ao ler o arquivo: " + error));
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Função principal de importação que será chamada no evento 'change' do input file.
 * @param {Event} event - O evento de 'change' do input file.
 * @param {Firestore} db - A instância do Firestore.
 * @param {string} collectionName - O nome da coleção ('pedidosPrim').
 * @param {Function} carregarDadosDoFirebase - Função para recarregar a tabela após a importação.
 */
async function importarPedidos(event, db, collectionName, carregarDadosDoFirebase) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof Swal === 'undefined') {
        alert("A biblioteca SweetAlert2 não está carregada. A importação continuará, mas as mensagens de feedback serão simples.");
    }

    if (typeof XLSX === 'undefined') {
        Swal.fire('Erro', 'A biblioteca XLSX (SheetJS) não está carregada. Verifique o HTML.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Processando...',
            text: 'Lendo e validando os dados do arquivo Excel.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const pedidosParaSalvar = await processarExcel(file);

        if (pedidosParaSalvar.length === 0) {
            Swal.fire('Atenção', 'Nenhum pedido válido encontrado no arquivo para importação (Quantidade Modificada > 0).', 'warning');
            return;
        }

        Swal.update({
            title: 'Salvando no Banco de Dados...',
            text: `Encontrados ${pedidosParaSalvar.length} pedidos válidos. Salvando no Firebase...`,
        });

        const collectionRef = collection(db, collectionName);
        let count = 0;
        
        // Salva cada pedido no Firestore
        for (const pedido of pedidosParaSalvar) {
            await addDoc(collectionRef, pedido);
            count++;
        }

        Swal.fire('Sucesso!', `${count} pedidos foram importados e salvos com sucesso!`, 'success');
        
        // Recarrega os dados na tabela
        await carregarDadosDoFirebase();

    } catch (error) {
        console.error("Erro durante a importação:", error);
        Swal.fire('Erro', 'Ocorreu um erro durante a importação: ' + error.message, 'error');
    } finally {
        // Limpa o input de arquivo para permitir a importação do mesmo arquivo novamente
        event.target.value = null;
    }
}

// ==================================================================
// LÓGICA PRINCIPAL DA PÁGINA
// ==================================================================

/**
 * Função principal que encapsula toda a lógica da página.
 */
async function iniciarPagina( ) {
    try {
        // 1. GARANTIR AUTENTICAÇÃO
        const userData = await garantirAutenticacao();

        const app = getApp();
        const db = getFirestore(app);
        const collectionName = "pedidosPrim";
        const pedidosCollection = collection(db, collectionName);

        // --- Captura dos elementos do HTML ---
        const tabelaBody = document.getElementById('tabela-pedidos');
        const loaderOverlay = document.getElementById('loader-overlay');
        const filtroCodigo = document.getElementById('filtro-codigo');
        // O HTML usa 'filtro-cidade', mas o JS original usava 'filtro-pedido-para'. 
        // Vou manter o nome do JS original para compatibilidade, mas o input correto é 'filtro-cidade'
        const filtroPedidoPara = document.getElementById('filtro-cidade'); 
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
                    await deleteDoc(doc(db, collectionName, id));
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
                    await deleteDoc(doc(db, collectionName, id));
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
        
        // AQUI ESTÁ A NOVA LÓGICA DE IMPORTAÇÃO
        if (excelUploader) {
            excelUploader.addEventListener('change', (event) => {
                // Chama a função de importação, passando as dependências necessárias
                importarPedidos(event, db, collectionName, carregarDadosDoFirebase);
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
