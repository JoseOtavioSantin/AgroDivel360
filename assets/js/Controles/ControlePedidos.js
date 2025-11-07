import { garantirAutenticacao } from '/assets/js/auth-guard.js';
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
// IMPORTANTE: Adicionar o 'onSnapshot' às importações do Firestore
import { getFirestore, collection, doc, getDoc, setDoc, query, writeBatch, deleteDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- LISTA DE PERMISSÕES ---
const EMAILS_AUTORIZADOS = [
    'admin@gmail.com',
    'sandro.silva@agrodivel.com.br'
];
// --- FIM DA LISTA DE PERMISSÕES ---

async function iniciarPagina( ) {
    try {
        const userData = await garantirAutenticacao();
        
        const app = getApp();
        const db = getFirestore(app);
        const pedidosCollection = collection(db, "pedidosPecas");
        const xmlProcessadosCollection = collection(db, "xmlProcessados");

        const tabelaBody = document.getElementById('tabela-pedidos');
        const loaderOverlay = document.getElementById('loader-overlay');
        const btnVerificarXml = document.getElementById('btn-verificar-xml');
        const xmlUploader = document.getElementById('xml-uploader');
        const filtroCodigo = document.getElementById('filtro-codigo');
        const filtroPedidoPara = document.getElementById('filtro-pedido-para');
        const filtroFornecedor = document.getElementById('filtro-fornecedor');

        let dadosCompletos = [];
        let unsubscribe = null; // Variável para controlar a "inscrição" em tempo real

        async function mudarStatus(pedidoId, novoStatus) {
            loaderOverlay.style.display = 'flex';
            try {
                const pedidoRef = doc(db, "pedidosPecas", pedidoId);
                await updateDoc(pedidoRef, { status: novoStatus });
                // Não precisa mais recarregar os dados manualmente, o onSnapshot fará isso.
            } catch (error) {
                console.error("Erro ao mudar status:", error);
                Swal.fire('Erro!', 'Não foi possível atualizar o status do pedido.', 'error');
            } finally {
                loaderOverlay.style.display = 'none';
            }
        }

        // --- FUNÇÃO ATUALIZADA PARA TEMPO REAL ---
        async function carregarDadosDoFirebase() {
            loaderOverlay.style.display = 'flex';
            const filiaisLogadas = userData.filial || [];
            document.getElementById('dynamic-title').textContent = `Filial: ${filiaisLogadas.join(", ")}`;

            if (unsubscribe) {
                unsubscribe(); // Cancela a escuta anterior para evitar duplicidade
            }

            const q = query(pedidosCollection);

            unsubscribe = onSnapshot(q, (querySnapshot) => {
                console.log("Atualização recebida do Firestore em tempo real!");

                const todosOsPedidos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                dadosCompletos = todosOsPedidos.filter(pedido => {
                    if (!pedido.status) {
                        pedido.status = 'PEDIR PEÇA';
                    }
                    const filialDoPedido = (pedido.filial || "").toLowerCase().trim();
                    if (!filialDoPedido) return true;
                    return filiaisLogadas.some(f => f.toLowerCase().trim() === filialDoPedido);
                });

                aplicarFiltros();
                loaderOverlay.style.display = 'none';

            }, (error) => {
                console.error("Erro ao escutar atualizações em tempo real:", error);
                Swal.fire('Erro de Conexão', 'Não foi possível receber atualizações em tempo real.', 'error');
                loaderOverlay.style.display = 'none';
            });
        }

        function aplicarFiltros() {
            const codigoFiltro = filtroCodigo.value.toUpperCase();
            const pedidoParaFiltro = filtroPedidoPara.value.toUpperCase();
            const fornecedorFiltro = filtroFornecedor.value.toUpperCase();

            let dadosFiltrados = dadosCompletos.filter(pedido => 
                (pedido.codigo || '').toUpperCase().includes(codigoFiltro) &&
                (pedido.pedidoPara || '').toUpperCase().includes(pedidoParaFiltro) &&
                (pedido.fornecedor || '').toUpperCase().includes(fornecedorFiltro)
            );

            const ordemStatus = { 'PEDIR PEÇA': 1, 'PEÇA PEDIDA': 2, 'CHEGOU': 3, 'SEPARADO': 4, 'ENTREGUE': 5 };
            dadosFiltrados.sort((a, b) => {
                const statusA = ordemStatus[a.status] || 6;
                const statusB = ordemStatus[b.status] || 6;
                if (statusA !== statusB) return statusA - statusB;
                return new Date(b.data) - new Date(a.data);
            });

            renderizarTabela(dadosFiltrados);
            atualizarCards(dadosCompletos);
        }

        function renderizarTabela(dados) {
            tabelaBody.innerHTML = '';
            if (dados.length === 0) {
                tabelaBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhum pedido encontrado.</td></tr>';
                return;
            }

            const emailUsuarioLogado = userData.email.toLowerCase();
            const isAutorizado = EMAILS_AUTORIZADOS.includes(emailUsuarioLogado);

            dados.forEach(pedido => {
                const tr = document.createElement('tr');
                tr.dataset.id = pedido.id;
                tr.className = '';

                const statusClassMap = {
                    'PEDIR PEÇA': 'status-pedir-peca',
                    'PEÇA PEDIDA': 'status-peca-pedida',
                    'CHEGOU': 'status-chegou',
                    'SEPARADO': 'status-separado',
                    'ENTREGUE': 'status-entregue'
                };
                const statusClass = statusClassMap[pedido.status];
                if (statusClass) {
                    tr.classList.add(statusClass);
                }

                let acoesHTML = `<a href="/Pages/Formularios/form-pecaspedidos.html?id=${pedido.id}" class="btn-acao" title="Editar Pedido"><i data-lucide="pencil"></i></a>`;

                if (pedido.status === 'PEDIR PEÇA' && isAutorizado) {
                    acoesHTML += `<button class="btn-acao btn-status" data-id="${pedido.id}" data-status="PEÇA PEDIDA" title="Aprovar e Marcar como Peça Pedida"><i data-lucide="Check"></i></button>`;
                }
                if (pedido.status === 'CHEGOU') {
                    acoesHTML += `<button class="btn-acao btn-status" data-id="${pedido.id}" data-status="SEPARADO" title="Marcar como Separado"><i data-lucide="box-select"></i></button>`;
                }
                if (pedido.status === 'SEPARADO') {
                    acoesHTML += `<button class="btn-acao btn-status" data-id="${pedido.id}" data-status="ENTREGUE" title="Marcar como Entregue"><i data-lucide="check-check"></i></button>`;
                }
                if (isAutorizado) {
                    acoesHTML += `<button class="btn-acao btn-delete" data-id="${pedido.id}" title="Apagar Pedido"><i data-lucide="trash-2"></i></button>`;
                }

                tr.innerHTML = `
                    <td>${pedido.codigo || ''}</td>
                    <td>${pedido.quantidade || ''}</td>
                    <td>${pedido.pedidoPara || ''}</td>
                    <td>${pedido.status || ''}</td>
                    <td>${pedido.ordemServico || ''}</td>
                    <td>${pedido.fornecedor || ''}</td>
                    <td>${formatarData(pedido.data)}</td>
                    <td>${pedido.responsavelPedido || ''}</td>
                    <td class="acoes-cell">${acoesHTML}</td>
                `;
                tabelaBody.appendChild(tr);
            });
            lucide.createIcons();
        }

        function atualizarCards(dados) {
            document.getElementById('total-pedidos').textContent = dados.length;
            document.getElementById('pedidos-pedir').textContent = dados.filter(p => p.status === 'PEDIR PEÇA').length;
            document.getElementById('pedidos-pedida').textContent = dados.filter(p => p.status === 'PEÇA PEDIDA').length;
            document.getElementById('pedidos-chegou').textContent = dados.filter(p => p.status === 'CHEGOU').length;
            document.getElementById('pedidos-separado').textContent = dados.filter(p => p.status === 'SEPARADO').length;
            document.getElementById('pedidos-entregue').textContent = dados.filter(p => p.status === 'ENTREGUE').length;
        }

        function formatarData(dataString) {
            if (!dataString) return '-';
            const data = new Date(dataString + 'T00:00:00');
            return data.toLocaleDateString('pt-BR');
        }

        async function apagarPedido(id) {
            const pedido = dadosCompletos.find(p => p.id === id);
            if (!pedido) return;
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
                    loaderOverlay.style.display = 'flex';
                    await deleteDoc(doc(db, "pedidosPecas", id));
                    await Swal.fire('Apagado!', 'O pedido foi removido com sucesso.', 'success');
                    // Não precisa recarregar, o onSnapshot faz isso.
                } catch (error) {
                    Swal.fire('Erro!', 'Não foi possível apagar o pedido.', 'error');
                } finally {
                    loaderOverlay.style.display = 'none';
                }
            }
        }

                async function processarXML(file) {
                    loaderOverlay.style.display = 'flex';
                    const reader = new FileReader();
                    
                    reader.onload = async (e) => {
                        try {
                            const xmlString = e.target.result;
                            const parser = new DOMParser();
                            const xmlDoc = parser.parseFromString(xmlString, "application/xml");
                
                            const infNFe = xmlDoc.querySelector('infNFe');
                            const chaveNFe = infNFe?.getAttribute('Id')?.replace('NFe', '');
                
                            if (!chaveNFe) {
                                Swal.fire('Erro no XML', "Chave de Acesso da NF-e não encontrada.", 'error');
                                loaderOverlay.style.display = 'none';
                                return;
                            }
                
                            const docRef = doc(db, "xmlProcessados", chaveNFe);
                            const docSnap = await getDoc(docRef);
                
                            if (docSnap.exists()) {
                                Swal.fire('Aviso', `XML já processado em ${docSnap.data().processadoEm.toDate().toLocaleDateString()}.`, 'info');
                                loaderOverlay.style.display = 'none';
                                return;
                            }
                
                            const produtosNoXml = new Map();
                            const produtosTags = xmlDoc.getElementsByTagName('prod');
                            for (let i = 0; i < produtosTags.length; i++) {
                                const codigo = produtosTags[i].querySelector('cProd')?.textContent.trim().toUpperCase();
                                const quantidade = parseFloat(produtosTags[i].querySelector('qCom')?.textContent);
                                if (codigo && quantidade) {
                                    produtosNoXml.set(codigo, (produtosNoXml.get(codigo) || 0) + quantidade);
                                }
                            }
                            
                            if (produtosNoXml.size === 0) {
                                Swal.fire('Aviso', "Nenhum produto encontrado no XML.", 'info');
                                loaderOverlay.style.display = 'none';
                                return;
                            }
                
                            // Filtra os pedidos que estão aguardando a peça chegar
                            const pedidosPendentes = dadosCompletos.filter(p => p.status === 'PEÇA PEDIDA');
                            const batch = writeBatch(db);
                            let pedidosAtualizados = 0;
                            const dataDoRecebimento = new Date().toISOString().split('T')[0];
                
                            for (let [codigo, qtdDisponivel] of produtosNoXml.entries()) {
                                const pedidosParaEsteCodigo = pedidosPendentes.filter(p => p.codigo === codigo);
                                for (const pedido of pedidosParaEsteCodigo) {
                                    if (qtdDisponivel <= 0) break;
                                    if (pedido.quantidade <= qtdDisponivel) {
                                        qtdDisponivel -= pedido.quantidade;
                                        const pedidoRef = doc(db, "pedidosPecas", pedido.id);
                                        
                                        // ATUALIZA O STATUS PARA 'CHEGOU'
                                        batch.update(pedidoRef, { 
                                            status: 'CHEGOU',
                                            dataRecebimento: dataDoRecebimento 
                                        });
                                        pedidosAtualizados++;
                                    }
                                }
                            }
                
                            if (pedidosAtualizados > 0) {
                                await batch.commit();
                                // Marca o XML como processado para não ser usado novamente
                                await setDoc(doc(db, "xmlProcessados", chaveNFe), { processadoEm: new Date() });
                                Swal.fire('Peças Recebidas!', `${pedidosAtualizados} pedido(s) foram atualizados para o status 'CHEGOU'!`, 'success');
                                // Não precisa recarregar os dados, o onSnapshot fará isso automaticamente
                            } else {
                                Swal.fire('Informação', 'Nenhum pedido com status "Peça Pedida" corresponde aos itens deste XML.', 'info');
                            }
                
                        } catch (error) {
                            console.error("Erro ao processar XML:", error);
                            Swal.fire('Erro Crítico', "Ocorreu um erro ao processar o arquivo XML.", 'error');
                        } finally {
                            loaderOverlay.style.display = 'none';
                        }
                    };
                    
                    reader.onerror = () => {
                        Swal.fire('Erro de Leitura', "Ocorreu um erro ao ler o arquivo.", 'error');
                        loaderOverlay.style.display = 'none';
                    };
                    
                    reader.readAsText(file);
                }


        // --- INICIALIZAÇÃO E EVENTOS ---
        filtroCodigo.addEventListener('input', aplicarFiltros);
        filtroPedidoPara.addEventListener('input', aplicarFiltros);
        filtroFornecedor.addEventListener('input', aplicarFiltros);

        btnVerificarXml.addEventListener('click', () => { xmlUploader.click(); });
        xmlUploader.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                processarXML(file);
            }
            event.target.value = null; 
        });

        tabelaBody.addEventListener('click', (event) => {
            const target = event.target.closest('button');
            if (!target) return;
            const id = target.dataset.id;
            if (target.classList.contains('btn-delete')) {
                apagarPedido(id);
            } else if (target.classList.contains('btn-status')) {
                const novoStatus = target.dataset.status;
                mudarStatus(id, novoStatus);
            }
        });

        const containerCards = document.querySelector('.dashboard-cards');
        containerCards.addEventListener('click', (event) => {
            const cardClicado = event.target.closest('.card-filter');
            if (!cardClicado) return;

            const statusParaFiltrar = cardClicado.dataset.status;

            filtroCodigo.value = '';
            filtroPedidoPara.value = '';
            filtroFornecedor.value = '';

            let dadosParaRenderizar;
            if (statusParaFiltrar === 'TODOS') {
                dadosParaRenderizar = dadosCompletos;
            } else {
                dadosParaRenderizar = dadosCompletos.filter(pedido => pedido.status === statusParaFiltrar);
            }
            
            renderizarTabela(dadosParaRenderizar);
        });

        await carregarDadosDoFirebase();

    } catch (error) {
        console.error("Falha na autenticação ou inicialização:", error);
        document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px;">Ocorreu um erro crítico.</div>`;
    }
}

iniciarPagina();

