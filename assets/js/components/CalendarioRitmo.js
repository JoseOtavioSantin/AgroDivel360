// assets/js/components/CalendarioRitmo.js

// 1. Importa as dependências do Firebase, incluindo as novas para autenticação e exclusão.
import { db } from '../firebase-config.js';
import { collection, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// --- VARIÁVEIS DE ESTADO ---
let dataBase = getInicioDaSemana( );
let tarefasDaSemanaCache = []; // Guarda as tarefas buscadas para evitar novas buscas ao filtrar.
let gestorSelecionado = 'todos'; // Guarda o valor do filtro selecionado.

// --- FUNÇÕES AUXILIARES ---
function getInicioDaSemana() {
    const hoje = new Date();
    const diaDaSemana = hoje.getDay();
    const diferenca = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
    const segundaFeira = new Date(hoje);
    segundaFeira.setDate(hoje.getDate() - diferenca);
    return segundaFeira;
}

function toISODateString(date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// --- LÓGICA DO MODAL (ATUALIZADA COM BOTÃO DE EXCLUIR) ---
function mostrarModalDetalhes(tarefa) {
    const modalAntigo = document.getElementById('tarefa-modal-overlay');
    if (modalAntigo) modalAntigo.remove();

    let corpoModal = `
        <p><strong>Gestor:</strong> ${tarefa.gestor}</p>
        <p><strong>Descrição:</strong> ${tarefa.descricao}</p>
    `;

    if (tarefa.tipo === 'deslocamento') {
        corpoModal += `<p><strong>Filial:</strong> ${tarefa.filial || 'N/A'}</p>`;
        if (tarefa.dataFim) {
            corpoModal += `<p><strong>Data de Volta:</strong> ${new Date(tarefa.dataFim.replace(/-/g, '/')).toLocaleDateString()}</p>`;
        }
    } else if (tarefa.tipo === 'reuniao') {
        if (tarefa.horarioInicio) {
            corpoModal += `<p><strong>Horário:</strong> ${tarefa.horarioInicio} às ${tarefa.horarioFim || 'N/A'}</p>`;
        }
    }

    // Lógica de permissão para o botão de excluir
    const auth = getAuth();
    const currentUser = auth.currentUser;
    let footerModal = '';

    if (currentUser && currentUser.uid === tarefa.criadorUid) {
        footerModal = `
            <div class="modal-footer">
                <button id="btn-excluir-tarefa" class="btn-danger">Excluir Tarefa</button>
            </div>
        `;
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'tarefa-modal-overlay';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Detalhes da Tarefa</h2>
                <button class="modal-close-btn">&times;</button>
            </div>
            <div class="modal-body">
                ${corpoModal}
            </div>
            ${footerModal}
        </div>
    `;

    document.body.appendChild(modalOverlay);
    setTimeout(() => modalOverlay.classList.add('visible'), 10);

    const fecharModal = () => {
        modalOverlay.classList.remove('visible');
        setTimeout(() => modalOverlay.remove(), 300);
    };

    modalOverlay.querySelector('.modal-close-btn').addEventListener('click', fecharModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) fecharModal();
    });

    const btnExcluir = document.getElementById('btn-excluir-tarefa');
    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            if (confirm('Tem certeza de que deseja excluir esta tarefa? Esta ação não pode ser desfeita.')) {
                btnExcluir.disabled = true;
                btnExcluir.textContent = 'Excluindo...';
                try {
                    const tarefaDocRef = doc(db, 'tarefasRitmo', tarefa.id);
                    await deleteDoc(tarefaDocRef);
                    alert('Tarefa excluída com sucesso!');
                    fecharModal();
                    buscarERenderizarSemana(dataBase); // Re-renderiza a visualização
                } catch (error) {
                    console.error("Erro ao excluir tarefa: ", error);
                    alert("Ocorreu um erro ao excluir a tarefa.");
                    btnExcluir.disabled = false;
                    btnExcluir.textContent = 'Excluir Tarefa';
                }
            }
        });
    }
}

// --- LÓGICA DE RENDERIZAÇÃO E FILTRO ---

function popularFiltroGestores() {
    const filtroSelect = document.getElementById('filtro-gestor');
    if (!filtroSelect) return;
    const nomesGestores = [...new Set(tarefasDaSemanaCache.map(t => t.gestor))].sort();
    filtroSelect.innerHTML = '<option value="todos">Todos os Gestores</option>';
    nomesGestores.forEach(nome => {
        const option = document.createElement('option');
        option.value = nome;
        option.textContent = nome;
        filtroSelect.appendChild(option);
    });
    filtroSelect.value = gestorSelecionado;
}

function exibirTarefasNaTela(dataInicioSemana) {
    const diasSemanaContainer = document.querySelector('#calendario-ritmo .dias-semana');
    if (!diasSemanaContainer) return;
    diasSemanaContainer.innerHTML = '';
    const hojeISOString = toISODateString(new Date());
    const diasDaSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const tarefasFiltradas = gestorSelecionado === 'todos'
        ? tarefasDaSemanaCache
        : tarefasDaSemanaCache.filter(t => t.gestor === gestorSelecionado);

    for (let i = 0; i < 7; i++) {
        const diaIteracao = new Date(dataInicioSemana);
        diaIteracao.setDate(dataInicioSemana.getDate() + i);
        const dataISO = toISODateString(diaIteracao);
        const diaEl = document.createElement('div');
        diaEl.classList.add('dia');
        if (dataISO === hojeISOString) diaEl.classList.add('hoje');
        diaEl.innerHTML = `<h3>${diasDaSemanaNomes[diaIteracao.getDay()]}</h3><p class="data">${diaIteracao.getDate()}/${diaIteracao.getMonth() + 1}</p><div class="tarefas-container"></div>`;
        const tarefasDoDia = tarefasFiltradas.filter(tarefa => tarefa.data === dataISO);
        const tarefasContainer = diaEl.querySelector('.tarefas-container');
        if (tarefasDoDia.length > 0) {
            tarefasDoDia.forEach(tarefa => {
                const tarefaEl = document.createElement('div');
                tarefaEl.className = `tarefa tipo-${tarefa.tipo || 'outro'}`;
                let tituloTarefa = 'Atividade';
                if (tarefa.tipo === 'reuniao') tituloTarefa = 'Reunião';
                if (tarefa.tipo === 'deslocamento') tituloTarefa = 'Desloc. Filial';
                if (tarefa.tipo === 'atendimento') tituloTarefa = 'Atendimento';
                tarefaEl.innerHTML = `<span class="gestor">${tarefa.gestor}</span><span>${tituloTarefa}</span>`;
                tarefaEl.addEventListener('click', () => mostrarModalDetalhes(tarefa));
                tarefasContainer.appendChild(tarefaEl);
            });
        } else {
            tarefasContainer.innerHTML = `<p style="font-size: 0.8rem; color: #999; text-align: center;">Nenhuma tarefa.</p>`;
        }
        diasSemanaContainer.appendChild(diaEl);
    }
}

async function buscarERenderizarSemana(dataInicioSemana) {
    const diasSemanaContainer = document.querySelector('#calendario-ritmo .dias-semana');
    if (!diasSemanaContainer) return;
    diasSemanaContainer.innerHTML = '<p style="text-align: center; width: 100%;">Carregando tarefas...</p>';
    try {
        const dataFimSemana = new Date(dataInicioSemana);
        dataFimSemana.setDate(dataInicioSemana.getDate() + 6);
        const legendaEl = document.getElementById('legenda-semana');
        if (legendaEl) {
            legendaEl.textContent = `Semana de ${dataInicioSemana.toLocaleDateString()} a ${dataFimSemana.toLocaleDateString()}`;
        }
        const inicioISO = toISODateString(dataInicioSemana);
        const fimISO = toISODateString(dataFimSemana);
        const tarefasRef = collection(db, "tarefasRitmo");
        const q = query(tarefasRef, where("data", ">=", inicioISO), where("data", "<=", fimISO));
        const querySnapshot = await getDocs(q);
        tarefasDaSemanaCache = [];
        querySnapshot.forEach((doc) => tarefasDaSemanaCache.push({ id: doc.id, ...doc.data() }));
        popularFiltroGestores();
        exibirTarefasNaTela(dataInicioSemana);
    } catch (error) {
        console.error("Erro ao buscar e renderizar semana: ", error);
        diasSemanaContainer.innerHTML = '<p style="color: red; text-align: center; width: 100%;">Erro ao carregar semana.</p>';
    }
}

// --- FUNÇÃO DE INICIALIZAÇÃO ---
function iniciarCalendarioRitmo() {
    document.getElementById('btn-semana-anterior').addEventListener('click', () => {
        dataBase.setDate(dataBase.getDate() - 7);
        buscarERenderizarSemana(dataBase);
    });
    document.getElementById('btn-semana-proxima').addEventListener('click', () => {
        dataBase.setDate(dataBase.getDate() + 7);
        buscarERenderizarSemana(dataBase);
    });
    const filtroSelect = document.getElementById('filtro-gestor');
    if (filtroSelect) {
        filtroSelect.addEventListener('change', (e) => {
            gestorSelecionado = e.target.value;
            exibirTarefasNaTela(dataBase);
        });
    }
    buscarERenderizarSemana(dataBase);
}

export { iniciarCalendarioRitmo };
