// /assets/js/ControlePedidosPrim.js

// Importações essenciais do Firebase e do nosso sistema de autenticação.
import { garantirAutenticacao } from '/assets/js/auth-guard.js';
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// Adicionando writeBatch e getDoc, que estavam no código antigo
import { getFirestore, collection, getDocs, doc, deleteDoc, query, addDoc, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==================================================================
// LÓGICA DE IMPORTAÇÃO DE EXCEL (RESTAURADA DO CÓDIGO ANTIGO)
// ==================================================================

/**
 * Função para exibir mensagens de feedback (Toast ou Alert simples se SweetAlert não estiver disponível).
 * Esta função simula a showToast do código antigo.
 */
function showFeedback(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
        // Mapeia os tipos para os ícones do SweetAlert
        const iconMap = {
            'sucesso': 'success',
            'erro': 'error',
            'info': 'info',
            'aviso': 'warning'
        };
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: iconMap[type] || 'info',
            title: message,
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true
        });
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

/**
 * Função principal de importação que será chamada no evento 'change' do input file.
 * Restaurada a lógica completa do código antigo, incluindo a verificação de duplicidade e o uso de batch.
 * @param {Event} event - O evento de 'change' do input file.
 * @param {Firestore} db - A instância do Firestore.
 * @param {string} pedidosCollectionName - O nome da coleção de pedidos ('pedidosPrim').
 * @param {string} importacoesCollectionName - O nome da coleção de registros de importação ('importacoesPrim').
 * @param {Function} carregarDadosDoFirebase - Função para recarregar a tabela após a importação.
 */
async function importarPedidos(event, db, pedidosCollectionName, importacoesCollectionName, carregarDadosDoFirebase) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof XLSX === 'undefined') {
        showFeedback('A biblioteca XLSX (SheetJS) não está carregada. Verifique o HTML.', 'erro');
        return;
    }

    const loaderOverlay = document.getElementById('loader-overlay');
    if (loaderOverlay) loaderOverlay.style.display = 'flex';

    try {
        const reader = new FileReader();
        
        // Promessa para encapsular a leitura do arquivo
        await new Promise((resolve, reject) => {
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    // Usando cellDates: true como no código antigo
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    // Usando raw: false para obter valores formatados, como no código antigo
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
                    
                    // 1. ENCONTRAR E FORMATAR A DATA DO RELATÓRIO
                    let dataRelatorio = null;
                    for (let i = 0; i < 20; i++) {
                        if (!jsonData[i]) continue;
                        const row = jsonData[i];
                        // Procura a célula que contém "Data do Relatório"
                        const cellIndex = row.findIndex(cell => typeof cell === 'string' && cell.includes('Data do Relatório'));
                        
                        if (cellIndex !== -1) {
                            const valorData = row[cellIndex + 1];
                            if (valorData instanceof Date) {
                                // Formato YYYY-MM-DD
                                const ano = valorData.getFullYear();
                                const mes = String(valorData.getMonth() + 1).padStart(2, '0');
                                const dia = String(valorData.getDate()).padStart(2, '0');
                                dataRelatorio = `${ano}-${mes}-${dia}`;
                            } else if (typeof valorData === 'string') {
                                // Tenta parsear string DD/MM/YYYY
                                const partes = valorData.split('/');
                                if (partes.length === 3) {
                                    dataRelatorio = `${partes[2]}-${partes[1]}-${partes[0]}`;
                                }
                            }
                            break; 
                        }
                    }

                    if (!dataRelatorio) {
                        showFeedback('Não foi possível encontrar ou formatar a "Data do Relatório" no arquivo.', 'erro');
                        reject(new Error('Data do Relatório não encontrada.'));
                        return;
                    }

                    // 2. VERIFICAR DUPLICIDADE DE IMPORTAÇÃO
                    const docIdData = dataRelatorio;
                    const importacoesCollectionRef = collection(db, importacoesCollectionName);
                    const docRefVerificacao = doc(importacoesCollectionRef, docIdData);
                    const docSnap = await getDoc(docRefVerificacao);

                    if (docSnap.exists()) {
                        showFeedback(`O relatório do dia ${dataRelatorio.split('-').reverse().join('/')} já foi importado.`, 'erro');
                        reject(new Error('Relatório duplicado.'));
                        return;
                    }

                    // 3. ENCONTRAR O CABEÇALHO E OS ÍNDICES DAS COLUNAS
                    let headerRowIndex = -1;
                    for (let i = 0; i < jsonData.length; i++) {
                        if (jsonData[i] && jsonData[i].includes('Código da Peça')) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        showFeedback('Cabeçalho "Código da Peça" não encontrado.', 'erro');
                        reject(new Error('Cabeçalho não encontrado.'));
                        return;
                    }

                    const headers = jsonData[headerRowIndex];
                    const codigoIndex = headers.indexOf('Código da Peça');
                    const quantidadeIndex = headers.indexOf('Quantidade Modificada');
                    const cidadeIndex = headers.indexOf('Cidade');

                    if (codigoIndex === -1 || quantidadeIndex === -1 || cidadeIndex === -1) {
                        showFeedback('Colunas necessárias ("Código da Peça", "Quantidade Modificada", "Cidade") não encontradas no Excel.', 'erro');
                        reject(new Error('Colunas necessárias não encontradas.'));
                        return;
                    }

                    // 4. PROCESSAR E SALVAR OS DADOS USANDO BATCH
                    const batch = writeBatch(db);
                    const pedidosCollectionRef = collection(db, pedidosCollectionName);
                    let pedidosImportados = 0;

                    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0) continue;

                        const codigo = row[codigoIndex];
                        const quantidade = row[quantidadeIndex];
                        const cidade = row[cidadeIndex];

                        // Condição de importação: código e cidade existem, e quantidade > 0
                        if (codigo && cidade && Number(quantidade) > 0) {
                            const novoPedido = {
                                codigo: String(codigo).trim().toUpperCase(),
                                quantidade: parseInt(quantidade, 10),
                                pedidoPara: String(cidade).trim().toUpperCase(),
                                status: 'AGUARDANDO PEÇA',
                                fornecedor: 'PRIM',
                                data: dataRelatorio,
                                chegouEstoque: false
                            };
                            
                            const docRef = doc(pedidosCollectionRef); // Cria um novo doc ID
                            batch.set(docRef, novoPedido);
                            pedidosImportados++;
                        }
                    }

                    if (pedidosImportados > 0) {
                        // Registra a importação na coleção de controle
                        const docRefRegistro = doc(importacoesCollectionRef, docIdData);
                        batch.set(docRefRegistro, { importadoEm: new Date().toISOString(), nomeArquivo: file.name, totalPedidos: pedidosImportados });

                        await batch.commit();
                        showFeedback(`${pedidosImportados} pedidos do relatório de ${dataRelatorio.split('-').reverse().join('/')} importados!`, 'sucesso');
                        await carregarDadosDoFirebase();
                    } else {
                        showFeedback('Nenhum pedido válido encontrado no arquivo Excel.', 'info');
                    }
                    resolve();

                } catch (error) {
                    console.error("Erro ao processar Excel:", error);
                    showFeedback("Erro crítico ao processar o arquivo Excel. Verifique o console.", 'erro');
                    reject(error);
                }
            };
            
            reader.onerror = (error) => {
                showFeedback("Erro ao ler o arquivo Excel.", 'erro');
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });

    } catch (error) {
        // Erro já tratado dentro da Promise
    } finally {
        if (loaderOverlay) loaderOverlay.style.display = 'none';
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
        // O código antigo não tinha auth-guard, mas o seu código mais recente sim. 
        // Mantemos o auth-guard para segurança.
        const userData = await garantirAutenticacao();

        const app = getApp();
        const db = getFirestore(app);
        const pedidosCollectionName = "pedidosPrim";
        const importacoesCollectionName = "importacoesPrim"; // Nova coleção de controle
        const pedidosCollection = collection(db, pedidosCollectionName);

        // --- Captura dos elementos do HTML ---
        const tabelaBody = document.getElementById('tabela-pedidos');
        const loaderOverlay = document.getElementById('loader-overlay');
        const filtroCodigo = document.getElementById('filtro-codigo');
        // O HTML usa 'filtro-cidade', mas o JS original usava 'filtro-pedido-para'. 
        // Vamos usar o ID do HTML que você forneceu: 'filtro-cidade'
        const filtroPedidoPara = document.getElementById('filtro-cidade'); 
        const dynamicTitle = document.getElementById('dynamic-title');
        const btnImportarExcel = document.getElementById('btn-importar-excel');
        const excelUploader = document.getElementById('excel-uploader');

        let dadosCompletos = [];
        let dadosFiltrados = [];

        // --- Funções do Sistema ---

        // ==================================================================
        // FUNÇÃO DE CARREGAMENTO DE DADOS
        // ==================================================================
        async function carregarDadosDoFirebase() {
            if (loaderOverlay) loaderOverlay.style.display = 'flex';
            
            // Lógica padrão para o título (mantida do seu código anterior)
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

            // Se o usuário NÃO for admin, aplica o filtro de filial (mantida do seu código anterior)
            if (userData && userData.grupo && !userData.grupo.includes('admin')) {
                const filiaisDoUsuario = userData.filial || [];
                dadosCompletos = todosOsPedidos.filter(pedido => {
                    const filialDoPedido = (pedido.pedidoPara || "").toLowerCase().trim();
                    if (!filialDoPedido) return false; 
                    return filiaisDoUsuario.some(f => f.toLowerCase().trim() === filialDoPedido);
                });
            } else {
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

            // Lógica de ordenação (mantida do seu código anterior)
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
            if (!dataString) return 'Inválida';
        
            let date = new Date(dataString);
        
            // Tenta reverter a ordem se o formato for MM/DD/YY e o construtor falhar
            if (isNaN(date.getTime()) && dataString.includes('/') && dataString.split('/').length === 3) {
                const partes = dataString.split('/');
                // Tenta MM/DD/YY -> DD/MM/YY
                date = new Date(`${partes[1]}/${partes[0]}/${partes[2]}`);
            }
        
            if (isNaN(date.getTime())) {
                return 'Inválida';
            }
        
            // Formata para DD/MM/YY
            const dia = String(date.getDate()).padStart(2, '0');
            const mes = String(date.getMonth() + 1).padStart(2, '0');
            const ano = String(date.getFullYear()).substring(2);
        
            return `${dia}/${mes}/${ano}`;
        }



        async function apagarPedido(id) {
            const pedido = dadosCompletos.find(p => p.id === id);
            if (!pedido) return;

            if (typeof Swal === 'undefined') {
                if (confirm(`Tem certeza que deseja apagar o pedido da peça "${pedido.codigo}"?`)) {
                    await deleteDoc(doc(db, pedidosCollectionName, id));
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
                    await deleteDoc(doc(db, pedidosCollectionName, id));
                    showFeedback('O pedido foi removido com sucesso.', 'sucesso');
                    await carregarDadosDoFirebase();
                } catch (error) {
                    console.error("Erro ao apagar pedido:", error);
                    showFeedback('Não foi possível apagar o pedido.', 'erro');
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
        
        // INTEGRAÇÃO DA LÓGICA DE IMPORTAÇÃO
        if (excelUploader) {
            excelUploader.addEventListener('change', (event) => {
                // Passa as coleções corretas e a função de recarregar
                importarPedidos(event, db, pedidosCollectionName, importacoesCollectionName, carregarDadosDoFirebase);
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
