import { garantirAutenticacao } from '/assets/js/auth-guard.js';
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, query, writeBatch, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function iniciarPagina( ) {
  try {
      const userData = await garantirAutenticacao();
      
      const app = getApp();
      const db = getFirestore(app);
      const pedidosCollection = collection(db, "pedidosPecas");
      const pedidosPrimCollection = collection(db, "pedidosPrim");
      const xmlProcessadosCollection = collection(db, "xmlProcessados");

      const tabelaBody = document.getElementById('tabela-pedidos');
      const loaderOverlay = document.getElementById('loader-overlay');
      const btnVerificarXml = document.getElementById('btn-verificar-xml');
      const xmlUploader = document.getElementById('xml-uploader');
      const filtroCodigo = document.getElementById('filtro-codigo');
      const filtroPedidoPara = document.getElementById('filtro-pedido-para');
      const filtroFornecedor = document.getElementById('filtro-fornecedor');

      let dadosCompletos = [];
      let dadosFiltrados = [];

      async function carregarDadosDoFirebase() {
          loaderOverlay.style.display = 'flex';
          const filiaisLogadas = userData.filial || [];
          document.getElementById('dynamic-title').textContent = `Filial: ${filiaisLogadas.join(", ")}`;

          const q = query(pedidosCollection);
          const querySnapshot = await getDocs(q);
          const todosOsPedidos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          dadosCompletos = todosOsPedidos.filter(pedido => {
              const filialDoPedido = (pedido.filial || "").toLowerCase().trim();
              if (!filialDoPedido) return true; 
              return filiaisLogadas.some(f => f.toLowerCase().trim() === filialDoPedido);
          });

          aplicarFiltros();
          loaderOverlay.style.display = 'none';
      }

      function aplicarFiltros() {
          const codigoFiltro = filtroCodigo.value.toUpperCase();
          const pedidoParaFiltro = filtroPedidoPara.value.toUpperCase();
          const fornecedorFiltro = filtroFornecedor.value.toUpperCase();

          dadosFiltrados = dadosCompletos.filter(pedido => 
              (pedido.codigo || '').toUpperCase().includes(codigoFiltro) &&
              (pedido.pedidoPara || '').toUpperCase().includes(pedidoParaFiltro) &&
              (pedido.fornecedor || '').toUpperCase().includes(fornecedorFiltro)
          );

          dadosFiltrados.sort((a, b) => {
              if (a.chegouEstoque && !b.chegouEstoque) return -1;
              if (!a.chegouEstoque && b.chegouEstoque) return 1;
              return new Date(b.data) - new Date(a.data);
          });

          renderizarTabela();
          atualizarCards();
      }

      function renderizarTabela() {
            tabelaBody.innerHTML = '';
            if (dadosFiltrados.length === 0) {
                tabelaBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Nenhum pedido encontrado.</td></tr>';
                return;
            }
            dadosFiltrados.forEach(pedido => {
                const tr = document.createElement('tr');
                tr.dataset.id = pedido.id;
                tr.className = ''; // Limpa classes antigas

                // --- LÓGICA DE CLASSES REFINADA ---
                if (pedido.status === 'AGUARDANDO PEÇA' && pedido.chegouEstoque === true) {
                    // A peça chegou! Adiciona a classe na LINHA (TR) para o CSS funcionar.
                    tr.classList.add('chegou-no-estoque'); 
                } else if (pedido.status === 'AGUARDANDO PEÇA') {
                    // Peça ainda não chegou. Pinta a linha de laranja.
                    tr.classList.add('status-aguardando');
                } else if (pedido.status === 'PEDIDO CONCLUÍDO') {
                    // Pedido foi finalizado. Pinta a linha de azul.
                    tr.classList.add('status-concluido');
                }
                
                // O resto do código permanece o mesmo...
                tr.innerHTML = `
                    <td>${pedido.codigo || ''}</td>
                    <td>${pedido.quantidade || ''}</td>
                    <td>${pedido.pedidoPara || ''}</td>
                    <td>${pedido.status || ''}</td>
                    <td>${pedido.ordemServico || ''}</td>
                    <td>${pedido.fornecedor || ''}</td>
                    <td>${formatarData(pedido.data)}</td>
                    <td>${pedido.responsavelPedido || ''}</td>
                    <td class="acoes-cell">
                        <a href="/Pages/Formularios/form-pecaspedidos.html?id=${pedido.id}" class="btn-acao" title="Editar Pedido">
                            <i data-lucide="pencil"></i>
                        </a>
                        <button class="btn-acao btn-delete" data-id="${pedido.id}" title="Apagar Pedido">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
                tabelaBody.appendChild(tr);
            });
            lucide.createIcons();
        }

      function atualizarCards() {
          const total = dadosFiltrados.length;
          const aguardando = dadosFiltrados.filter(k => k.status === 'AGUARDANDO PEÇA').length;
          const concluidos = total - aguardando;
          document.getElementById('total-pedidos').textContent = total;
          document.getElementById('pedidos-aguardando').textContent = aguardando;
          document.getElementById('pedidos-concluidos').textContent = concluidos;
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
                  await deleteDoc(doc(db, "pedidosPecas", id));
                  Swal.fire('Apagado!', 'O pedido foi removido com sucesso.', 'success');
                  await carregarDadosDoFirebase();
              } catch (error) {
                  Swal.fire('Erro!', 'Não foi possível apagar o pedido.', 'error');
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
                      Swal.fire('Erro no XML', "Chave de Acesso da NF-e não encontrada no arquivo.", 'error');
                      return;
                  }

                  const docRef = doc(db, "xmlProcessados", chaveNFe);
                  const docSnap = await getDoc(docRef);

                  if (docSnap.exists()) {
                      Swal.fire('Aviso', `XML já processado em ${docSnap.data().processadoEm.toDate().toLocaleDateString()}.`, 'info');
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
                      return;
                  }

                  const sucessoPedidosGerais = await alocarEstoque(produtosNoXml);
                  const sucessoPedidosPrim = await alocarEstoquePrim(produtosNoXml);

                  if (sucessoPedidosGerais || sucessoPedidosPrim) {
                      await setDoc(doc(db, "xmlProcessados", chaveNFe), {
                          processadoEm: new Date()
                      });
                  } else {
                      Swal.fire('Informação', 'Nenhum pedido pendente foi encontrado para os itens deste XML.', 'info');
                  }

              } catch (error) {
                  console.error("Erro ao processar XML:", error);
                  Swal.fire('Erro Crítico', "Ocorreu um erro ao processar o arquivo XML.", 'error');
              } finally {
                  loaderOverlay.style.display = 'none';
              }
          };
          
          reader.onerror = () => {
              Swal.fire('Erro de Leitura', "Ocorreu um erro ao ler o arquivo XML.", 'error');
              loaderOverlay.style.display = 'none';
          };
          
          reader.readAsText(file);
      }

      async function alocarEstoque(estoqueMap) {
          const pedidosPendentes = dadosCompletos
              .filter(p => p.status === 'AGUARDANDO PEÇA' && !p.chegouEstoque)
              .sort((a, b) => new Date(a.data) - new Date(b.data));

          const batch = writeBatch(db);
          let pedidosAtualizados = 0;
          const dataDoRecebimento = new Date().toISOString().split('T')[0];

          for (let [codigo, qtdDisponivel] of estoqueMap.entries()) {
              const pedidosParaEsteCodigo = pedidosPendentes.filter(p => p.codigo === codigo);
              for (const pedido of pedidosParaEsteCodigo) {
                  if (qtdDisponivel <= 0) break;
                  if (pedido.quantidade <= qtdDisponivel) {
                      qtdDisponivel -= pedido.quantidade;
                      const docRef = doc(db, "pedidosPecas", pedido.id);
                      batch.update(docRef, { 
                          chegouEstoque: true,
                          dataRecebimento: dataDoRecebimento 
                      });
                      pedidosAtualizados++;
                  }
              }
          }

          if (pedidosAtualizados > 0) {
              await batch.commit();
              Swal.fire('Estoque Alocado!', `${pedidosAtualizados} pedido(s) gerais foram atualizados com base no estoque!`, 'success');
              await carregarDadosDoFirebase();
              return true;
          }
          return false;
      }

      async function alocarEstoquePrim(estoqueMap) {
          const queryPrim = query(pedidosPrimCollection);
          const snapshotPrim = await getDocs(queryPrim);
          const pedidosPrimCompletos = snapshotPrim.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          const pedidosPrimPendentes = pedidosPrimCompletos
              .filter(p => p.status === 'AGUARDANDO PEÇA' && !p.chegouEstoque)
              .sort((a, b) => new Date(a.data) - new Date(b.data));

          const batch = writeBatch(db);
          let pedidosAtualizados = 0;
          const dataDoRecebimento = new Date().toISOString().split('T')[0];

          for (let [codigo, qtdDisponivel] of estoqueMap.entries()) {
              const pedidosParaEsteCodigo = pedidosPrimPendentes.filter(p => p.codigo === codigo);
              for (const pedido of pedidosParaEsteCodigo) {
                  if (qtdDisponivel <= 0) break;
                  if (pedido.quantidade <= qtdDisponivel) {
                      qtdDisponivel -= pedido.quantidade;
                      const docRef = doc(db, "pedidosPrim", pedido.id);
                      batch.update(docRef, { 
                          chegouEstoque: true,
                          dataRecebimento: dataDoRecebimento 
                      });
                      pedidosAtualizados++;
                  }
              }
          }

          if (pedidosAtualizados > 0) {
              await batch.commit();
              Swal.fire('Estoque Alocado!', `${pedidosAtualizados} pedido(s) PRIM foram atualizados!`, 'success');
              return true;
          }
          return false;
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
          const deleteButton = event.target.closest('.btn-delete');
          if (deleteButton) {
              const id = deleteButton.dataset.id;
              apagarPedido(id);
          }
      });

      await carregarDadosDoFirebase();

  } catch (error) {
      console.error("Falha na autenticação ou inicialização:", error);
      document.body.innerHTML = `<div style="color: white; text-align: center; padding: 50px;">Ocorreu um erro crítico. Verifique se você está logado e tente recarregar. <a href="/login.html">Voltar ao login</a></div>`;
  }
}

iniciarPagina();
