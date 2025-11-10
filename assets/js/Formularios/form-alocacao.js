// /assets/js/Formularios/form-alocacao.js

import { garantirAutenticacao } from '/assets/js/auth-guard.js';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcjPa9jXsCCu6lNc1fjVg4Bzz1toKWAGY",
  authDomain: "agro-divel.firebaseapp.com",
  projectId: "agro-divel",
  storageBucket: "agro-divel.firebasestorage.app",
  messagingSenderId: "583977436505",
  appId: "1:583977436505:web:3754ec029aebb3d9d67848"
};

let app, db, storage, userData;
let todasFerramentas = [], todosTecnicos = [], todasAlocacoes = [];
let tomSelectFerramentas;

// ==================================================================
// VERSÃO FINALÍSSIMA DA FUNÇÃO DE CARREGAR IMAGEM
// Lê o array 'fotosURLs' e exibe todas as imagens encontradas.
// ==================================================================
function carregarImagensFerramenta(ferramenta ) {
    const imagensContainer = document.getElementById('ferramenta-imagens');
    const containerPrincipal = document.getElementById('ferramenta-imagens-container');
    
    imagensContainer.innerHTML = '';
    containerPrincipal.style.display = 'block';

    // LÓGICA CORRETA: Verifica se o campo 'fotosURLs' (plural) existe e é um array com itens
    if (ferramenta && Array.isArray(ferramenta.fotosURLs) && ferramenta.fotosURLs.length > 0) {
        // Itera sobre cada URL no array e cria uma imagem para cada uma
        ferramenta.fotosURLs.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Imagem da ferramenta";
            img.style.width = '100px'; // Adiciona um estilo para as imagens não ficarem gigantes
            img.style.height = '100px';
            img.style.objectFit = 'cover';
            img.style.margin = '5px';
            img.style.cursor = 'pointer';
            img.onclick = () => Swal.fire({ imageUrl: url, imageAlt: 'Imagem ampliada' });
            imagensContainer.appendChild(img);
        });
    } else {
        // Se não houver URLs, exibe a mensagem
        imagensContainer.innerHTML = '<div class="no-image">Nenhuma imagem encontrada.</div>';
    }
}

// ==================================================================
// FUNÇÃO DE INICIALIZAÇÃO - A lógica aqui está correta
// ==================================================================
async function iniciarPagina() {
    try {
        userData = await garantirAutenticacao();

        if (!getApps().length) { app = initializeApp(firebaseConfig); } 
        else { app = getApp(); }
        db = getFirestore(app);
        storage = getStorage(app);

        tomSelectFerramentas = new TomSelect('#ferramenta-select', {
            create: false,
            sortField: { field: "text", direction: "asc" },
            dropdownParent: 'body',
            onChange: function(value) {
                if (value) {
                    const ferramentaSelecionada = todasFerramentas.find(f => f.id === value);
                    if (ferramentaSelecionada) {
                        carregarImagensFerramenta(ferramentaSelecionada);
                    }
                } else {
                    document.getElementById('ferramenta-imagens-container').style.display = 'none';
                }
            }
        });

        if (userData && userData.nome) {
            document.getElementById('responsavel-lancamento').value = userData.nome.toUpperCase();
        }
        document.getElementById('data-alocacao').valueAsDate = new Date();

        const [ferramentasSnap, tecnicosSnap, alocacoesSnap] = await Promise.all([
            getDocs(collection(db, "ferramentas")),
            getDocs(collection(db, "tecnicos")),
            getDocs(collection(db, "alocacoes"))
        ]);

        todasFerramentas = ferramentasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        todosTecnicos = tecnicosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        todasAlocacoes = alocacoesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        atualizarOpcoesFerramentas();
        atualizarSelectTecnicos();

        document.getElementById('form-alocacao').addEventListener('submit', salvarAlocacao);
        document.getElementById('filtro-filial').addEventListener('change', () => {
            atualizarOpcoesFerramentas();
            atualizarSelectTecnicos();
        });

    } catch (error) {
        console.error("Falha na inicialização da página:", error);
        Swal.fire('Erro Crítico', 'Não foi possível carregar os dados da página. Verifique o console para mais detalhes.', 'error');
    }
}

// As funções abaixo não precisam de alteração
function atualizarOpcoesFerramentas() {
    const filialFiltro = document.getElementById('filtro-filial').value.toUpperCase();
    let ferramentasFiltradas = todasFerramentas;
    if (filialFiltro) {
        ferramentasFiltradas = ferramentasFiltradas.filter(f => f.filial.toUpperCase() === filialFiltro);
    }
    const ferramentasDisponiveis = ferramentasFiltradas.filter(f => {
        const alocadas = todasAlocacoes.filter(a => a.ferramentaId === f.id).length;
        return f.quantidade > alocadas && !f.reparo;
    });
    const opcoes = ferramentasDisponiveis.map(f => {
        const alocadas = todasAlocacoes.filter(a => a.ferramentaId === f.id).length;
        const disponiveis = f.quantidade - alocadas;
        return {
            value: f.id,
            text: `${f.codigo} - ${f.descricao} (${disponiveis} disp.)`
        };
    });
    tomSelectFerramentas.clear();
    tomSelectFerramentas.clearOptions();
    tomSelectFerramentas.addOptions(opcoes);
    tomSelectFerramentas.refreshOptions(false);
}

function atualizarSelectTecnicos() {
    const select = document.getElementById('tecnico-select');
    const filialFiltro = document.getElementById('filtro-filial').value.toUpperCase();
    select.innerHTML = '<option value="">Selecione um técnico...</option>';
    let tecnicosFiltrados = todosTecnicos;
    if (filialFiltro) {
        tecnicosFiltrados = todosTecnicos.filter(t => t.filial.toUpperCase() === filialFiltro);
    }
    tecnicosFiltrados.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(t => {
        select.innerHTML += `<option value="${t.nome}">${t.nome}</option>`;
    });
}

async function salvarAlocacao(event) {
    event.preventDefault();
    const ferramentaId = tomSelectFerramentas.getValue();
    if (!ferramentaId) {
        return Swal.fire("Atenção", "Nenhuma ferramenta foi selecionada.", "warning");
    }
    const dadosAlocacao = {
        ferramentaId: ferramentaId,
        funcionario: document.getElementById("tecnico-select").value,
        dataAlocacao: new Date(document.getElementById("data-alocacao").value + "T12:00:00"),
        responsavelLancamento: document.getElementById("responsavel-lancamento").value,
    };
    if (!dadosAlocacao.funcionario || !document.getElementById("data-alocacao").value) {
        return Swal.fire("Atenção", "O técnico e a data são obrigatórios.", "warning");
    }
    Swal.fire({ title: 'Salvando...', text: 'Aguarde um momento.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await addDoc(collection(db, "alocacoes"), dadosAlocacao);
        const ferramenta = todasFerramentas.find(f => f.id === ferramentaId);
        if (ferramenta) {
            const historico = {
                tipo: 'alocacao',
                ferramentaId: ferramentaId,
                ferramentaCodigo: ferramenta.codigo,
                ferramentaDescricao: ferramenta.descricao,
                filial: ferramenta.filial,
                timestamp: new Date(),
                detalhes: { funcionario: dadosAlocacao.funcionario }
            };
            await addDoc(collection(db, "historico"), historico);
        }
        await Swal.fire('Sucesso!', 'Ferramenta alocada com sucesso!', 'success');
        window.location.href = '/Pages/Controles/ControleFerramentas.html';
    } catch (error) {
        Swal.fire('Erro!', `Falha ao salvar a alocação: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', iniciarPagina);
