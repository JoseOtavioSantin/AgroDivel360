// assets/js/components/FormRitmo.js

import { db, auth } from '../firebase-config.js'; 
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// --- REFERÊNCIAS AOS ELEMENTOS DO FORMULÁRIO ---
const form = document.getElementById('form-ritmo' );
const gestorInput = document.getElementById('gestor');
const tipoTarefaSelect = document.getElementById('tipo-tarefa');
const submitButton = form.querySelector('button[type="submit"]');

const camposDinamicos = {
    deslocamento: document.getElementById('campos-deslocamento'),
    reuniao: document.getElementById('campos-reuniao'),
    atendimento: document.getElementById('campos-atendimento'),
    outro: document.getElementById('campos-outro')
};

// --- LÓGICA DE AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        gestorInput.value = "Carregando nome...";
        const userDocRef = doc(db, "gestores", user.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                gestorInput.value = userDocSnap.data().nome || 'Usuário sem nome';
            } else {
                gestorInput.value = user.displayName || 'Nome não encontrado';
            }
        } catch (error) {
            console.error("Erro ao buscar nome do gestor:", error);
            gestorInput.value = "Erro ao carregar nome";
        }
    } else {
        window.location.href = '/pages/Login/index.html';
    }
});

// --- LÓGICA PARA MOSTRAR/ESCONDER CAMPOS DINÂMICOS ---
tipoTarefaSelect.addEventListener('change', (e) => {
    const tipoSelecionado = e.target.value;
    Object.values(camposDinamicos).forEach(campo => {
        if (campo) campo.classList.add('hidden');
    });
    if (camposDinamicos[tipoSelecionado]) {
        camposDinamicos[tipoSelecionado].classList.remove('hidden');
    }
});

// --- LÓGICA DE ENVIO DO FORMULÁRIO (ATUALIZADA) ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Salvando...';

    try {
        const user = auth.currentUser; // Pega o usuário logado atualmente
        if (!user) {
            throw new Error("Usuário não autenticado. Faça login novamente para salvar a tarefa.");
        }

        const tipoTarefa = tipoTarefaSelect.value;
        if (!tipoTarefa) {
            throw new Error('Por favor, selecione um tipo de tarefa.');
        }
        
        // Objeto base com os dados comuns
        const tarefaData = {
            gestor: gestorInput.value,
            tipo: tipoTarefa,
            descricao: document.getElementById('descricao').value,
            criadoEm: new Date(),
            // --- ADIÇÃO CRUCIAL AQUI ---
            // Salva o ID único do usuário que está criando a tarefa.
            // Isso é usado para a permissão de exclusão.
            criadorUid: user.uid 
        };

        // Adiciona os dados específicos de cada tipo
        if (tipoTarefa === 'deslocamento') {
            tarefaData.filial = document.getElementById('deslocamento-filial').value;
            tarefaData.dataInicio = document.getElementById('deslocamento-ida').value;
            tarefaData.dataFim = document.getElementById('deslocamento-volta').value;
            tarefaData.data = tarefaData.dataInicio;
            if (!tarefaData.data) throw new Error("A Data de Ida é obrigatória para deslocamentos.");
        } else if (tipoTarefa === 'reuniao') {
            tarefaData.data = document.getElementById('reuniao-data').value;
            tarefaData.horarioInicio = document.getElementById('reuniao-inicio').value;
            tarefaData.horarioFim = document.getElementById('reuniao-termino').value;
            if (!tarefaData.data) throw new Error("A Data da Reunião é obrigatória.");
        } else if (tipoTarefa === 'atendimento') {
            tarefaData.data = document.getElementById('atendimento-data').value;
            if (!tarefaData.data) throw new Error("A Data do Atendimento é obrigatória.");
        } else if (tipoTarefa === 'outro') {
            tarefaData.data = document.getElementById('outro-data').value;
             if (!tarefaData.data) throw new Error("A Data da Atividade é obrigatória.");
        }

        // Salva o objeto completo no Firestore
        await addDoc(collection(db, "tarefasRitmo"), tarefaData);

        alert('Tarefa adicionada com sucesso!');
        window.location.href = '/pages/Menu.html';

    } catch (error) {
        console.error("Erro ao adicionar tarefa: ", error);
        alert(`Ocorreu um erro: ${error.message}`);
        submitButton.disabled = false;
        submitButton.textContent = 'Salvar Tarefa';
    }
});
