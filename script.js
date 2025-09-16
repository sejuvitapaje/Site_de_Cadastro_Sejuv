// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD3ZGKwF8j16t5LtbibAqucUmrZykUT_BQ",
    authDomain: "cadastro-sejuv.firebaseapp.com",
    projectId: "cadastro-sejuv",
    storageBucket: "cadastro-sejuv.firebasestorage.app",
    messagingSenderId: "5134638204",
    appId: "1:5134638204:web:a5de746c1370447ad5fdf9",
    measurementId: "G-DHVJXVKENB"
};

// Inicialização do Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Variáveis globais
let locais = [];
let eventos = [];
let usuarios = [];
let usuarioLogado = null;
let ultimoBackup = null;
let localEditando = null;
let localSelecionado = null;
let eventosFiltradosModal = [];
let emEdicao = false; // Controla se estamos em modo de edição

// Função para mostrar/ocultar tela de carregamento
function showLoading(show = true) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        if (show) {
            loadingScreen.classList.remove('loading-hidden');
        } else {
            loadingScreen.classList.add('loading-hidden');
        }
    }
}

// Desabilitar/habilitar botões durante operações
function setButtonsState(disabled = true) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (!button.id || !button.id.includes('cancel')) {
            button.disabled = disabled;
        }
    });
}

// Função para navegar entre as páginas
function navigateTo(pageId) {
    // Se estiver editando, cancela a edição antes de navegar
    if (emEdicao) {
        if (localEditando) {
            cancelarEdicaoLocal();
        } else {
            cancelarEdicaoEvento();
        }
    }
    
    // Esconder todas as páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active-page');
    });
    
    // Mostrar a página solicitada
    document.getElementById(pageId).classList.add('active-page');
    
    // Atualizar dados específicos da página
    if (pageId === 'dadosPage') {
        atualizarSelectLocais();
    } else if (pageId === 'todosDadosPage') {
        carregarDadosUnificados();
    } else if (pageId === 'adminPage') {
        atualizarEstatisticas();
        verificarBackupStatus();
    } else if (pageId === 'dashboardPage') {
        document.getElementById('dadosCount').textContent = `${locais.length + eventos.length} registros`;
        document.getElementById('todosDadosCount').textContent = `${locais.length + eventos.length} registros`;
    }
}

// Inicialização do sistema
document.addEventListener('DOMContentLoaded', function() {
    // Configurar formulários
    document.getElementById('loginForm').addEventListener('submit', fazerLogin);
    document.getElementById('cadastroLocalForm').addEventListener('submit', adicionarLocal);
    document.getElementById('cadastroEventoForm').addEventListener('submit', adicionarEvento);
    
    // Configurar horário atual como padrão
    document.getElementById('horarioInicio').value = "08:00";
    document.getElementById('horarioFim').value = "17:00";
    
    // Configurar modal
    const modal = document.getElementById('detalhesModal');
    const span = document.getElementsByClassName('close')[0];
    
    span.onclick = function() {
        modal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
    
    // Verificar se há usuário logado
    const usuarioSalvo = localStorage.getItem('usuarioLogado');
    if (usuarioSalvo) {
        usuarioLogado = JSON.parse(usuarioSalvo);
        atualizarInterfaceUsuario();
        navigateTo('dashboardPage');
        
        // Carregar dados
        carregarDados();
    } else {
        navigateTo('loginPage');
    }
});

// Carregar dados do Firebase
async function carregarDados() {
    try {
        // Configurar listeners em tempo real para os dados
        db.collection('locais').onSnapshot((snapshot) => {
            locais = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (typeof atualizarSelectLocais === 'function') atualizarSelectLocais();
            if (document.getElementById('todosDadosPage').classList.contains('active-page')) {
                carregarDadosUnificados();
            }
            
            // Atualizar dashboard se estiver visível
            if (document.getElementById('dashboardPage').classList.contains('active-page')) {
                document.getElementById('dadosCount').textContent = `${locais.length + eventos.length} registros`;
                document.getElementById('todosDadosCount').textContent = `${locais.length + eventos.length} registros`;
            }
        });

        db.collection('eventos').onSnapshot((snapshot) => {
            eventos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (document.getElementById('todosDadosPage').classList.contains('active-page')) {
                carregarDadosUnificados();
            }
            
            // Atualizar dashboard se estiver visível
            if (document.getElementById('dashboardPage').classList.contains('active-page')) {
                document.getElementById('dadosCount').textContent = `${locais.length + eventos.length} registros`;
                document.getElementById('todosDadosCount').textContent = `${locais.length + eventos.length} registros`;
            }
        });

        db.collection('usuarios').onSnapshot((snapshot) => {
            usuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        
        // Se não houver usuários, criar o admin padrão
        if (usuarios.length === 0) {
            await criarUsuarioPadrao();
        }
        
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        mostrarMensagem("Erro ao carregar dados. Verifique sua conexão.", "erro");
    }
}

// Criar usuário padrão (admin) se não existir
async function criarUsuarioPadrao() {
    try {
        // Criar usuário no Firebase Auth
        // Substitua pelo seguinte:
        console.log("Sistema pronto - Use o Firebase Console para criar o primeiro usuário");
        
        // Salvar informações no Firestore
    } catch (error) {
        console.error("Erro ao criar usuário padrão:", error);
    }
}

// Atualizar interface com informações do usuário
function atualizarInterfaceUsuario() {
    if (usuarioLogado) {
        document.querySelectorAll('#currentUser, #currentUserDados, #currentUserTodosDados, #currentUserAdmin').forEach(el => {
            if (el) el.textContent = usuarioLogado.email;
        });
    }
}

// Atualizar select de locais no formulário de eventos
function atualizarSelectLocais() {
    const select = document.getElementById('localEvento');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um local</option>';
    
    locais.forEach(local => {
        const option = document.createElement('option');
        option.value = local.id;
        option.textContent = local.nome;
        select.appendChild(option);
    });
}

function logout() {
    auth.signOut();
    usuarioLogado = null;
    localStorage.removeItem('usuarioLogado');
    navigateTo('loginPage');
}

// Funções de autenticação
async function fazerLogin(e) {
    if (e) e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    
    try {
        showLoading(true);
        setButtonsState(true);
        
        // Tentar autenticar com Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, senha);
        usuarioLogado = userCredential.user;
        
        // Salvar informações do usuário
        localStorage.setItem('usuarioLogado', JSON.stringify({
            email: usuarioLogado.email,
            uid: usuarioLogado.uid
        }));
        
        // Carregar dados do sistema
        await carregarDados();
        
        atualizarInterfaceUsuario();
        mostrarMensagem('Login realizado com sucesso!', 'sucesso');
        
        // Redirecionar para dashboard após login
        setTimeout(() => {
            navigateTo('dashboardPage');
        }, 1000);
    } catch (error) {
        console.error("Erro no login:", error);
        mostrarMensagem('Email ou senha incorretos!', 'erro');
    } finally {
        showLoading(false);
        setButtonsState(false);
    }
}

// Funções de CRUD para locais
async function adicionarLocal(e) {
    if (e) e.preventDefault();
    
    showLoading(true);
    setButtonsState(true);
    
    try {
        const novoLocal = {
            nome: document.getElementById('nomeLocal').value,
            endereco: document.getElementById('enderecoLocal').value,
            responsavel: document.getElementById('responsavelLocal').value,
            contato: document.getElementById('contatoLocal').value,
            capacidade: document.getElementById('capacidadeLocal').value || null,
            dataCriacao: new Date().toISOString(),
            criadoPor: usuarioLogado.email,
            ultimaAtualizacao: new Date().toISOString()
        };
        
        // Salvar no Firebase
        await db.collection('locais').add(novoLocal);
        
        document.getElementById('cadastroLocalForm').reset();
        mostrarMensagem('Local adicionado com sucesso!', 'sucesso');
        
        // Atualizar select de locais
        atualizarSelectLocais();
    } catch (error) {
        console.error("Erro ao adicionar local:", error);
        mostrarMensagem('Erro ao adicionar local.', 'erro');
    } finally {
        showLoading(false);
        setButtonsState(false);
    }
}

async function adicionarEvento(e) {
    if (e) e.preventDefault();
    
    showLoading(true);
    setButtonsState(true);
    
    try {
        const localId = document.getElementById('localEvento').value;
        const localSelecionado = locais.find(l => l.id === localId);
        
        if (!localSelecionado) {
            mostrarMensagem('Selecione um local válido.', 'erro');
            return;
        }
        
        const horarioInicio = document.getElementById('horarioInicio').value;
        const horarioFim = document.getElementById('horarioFim').value;
        
        // Verificar se horário de término é após horário de início
        if (horarioFim <= horarioInicio) {
            mostrarMensagem('O horário de término deve ser após o horário de início.', 'erro');
            return;
        }
        
        const novoEvento = {
            localId: localId,
            localNome: localSelecionado.nome,
            escola: document.getElementById('escolaEvento').value,
            diaSemana: document.getElementById('diaSemanaEvento').value,
            horarioInicio: horarioInicio,
            horarioFim: horarioFim,
            responsavel: document.getElementById('responsavelEvento').value,
            contato: document.getElementById('contatoEvento').value,
            observacoes: document.getElementById('observacoesEvento').value || '',
            dataCriacao: new Date().toISOString(),
            criadoPor: usuarioLogado.email,
            ultimaAtualizacao: new Date().toISOString()
        };
        
        // Salvar no Firebase
        await db.collection('eventos').add(novoEvento);
        
        document.getElementById('cadastroEventoForm').reset();
        document.getElementById('horarioInicio').value = "08:00";
        document.getElementById('horarioFim').value = "17:00";
        
        mostrarMensagem('Evento adicionado com sucesso!', 'sucesso');
    } catch (error) {
        console.error("Erro ao adicionar evento:", error);
        mostrarMensagem('Erro ao adicionar evento.', 'erro');
    } finally {
        showLoading(false);
        setButtonsState(false);
    }
}

async function editarLocal(localId) {
    if (emEdicao) {
        mostrarMensagem('Finalize a edição atual antes de editar outro item.', 'alerta');
        return;
    }
    
    showLoading(true);
    
    try {
        const local = locais.find(l => l.id === localId);
        if (!local) return;
        
        // Navegar para a página de dados primeiro
        navigateTo('dadosPage');
        
        // Pequeno delay para garantir que a página foi carregada
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Preencher formulário com dados do local
        document.getElementById('nomeLocal').value = local.nome;
        document.getElementById('enderecoLocal').value = local.endereco;
        document.getElementById('responsavelLocal').value = local.responsavel;
        document.getElementById('contatoLocal').value = local.contato || '';
        document.getElementById('capacidadeLocal').value = local.capacidade || '';
        
        // Alterar o botão para "Atualizar"
        const submitButton = document.querySelector('#cadastroLocalForm button[type="submit"]');
        submitButton.innerHTML = '<i class="fas fa-save"></i> Atualizar Local';
        submitButton.onclick = function(e) {
            e.preventDefault();
            atualizarLocal(localId);
        };
        
        // Adicionar botão de cancelar (apenas se não existir)
        if (!document.querySelector('#cadastroLocalForm .btn-cancel')) {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'btn-cancel';
            cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            cancelButton.onclick = function(e) {
                e.preventDefault();
                cancelarEdicaoLocal();
            };
            
            submitButton.parentNode.appendChild(cancelButton);
        }
        
        // Marcar que estamos em modo de edição
        emEdicao = true;
        localEditando = localId;
        
        // Rolar para o formulário
        document.getElementById('cadastroLocalForm').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Erro ao editar local:", error);
        mostrarMensagem('Erro ao carregar dados para edição.', 'erro');
    } finally {
        showLoading(false);
    }
}

function cancelarEdicaoLocal() {
    // Limpar formulário
    document.getElementById('cadastroLocalForm').reset();
    
    // Restaurar botão original
    const submitButton = document.querySelector('#cadastroLocalForm button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar Local';
    submitButton.onclick = function(e) {
        e.preventDefault();
        adicionarLocal(e);
    };
    
    // Remover botão de cancelar
    const cancelButton = document.querySelector('#cadastroLocalForm .btn-cancel');
    if (cancelButton) cancelButton.remove();
    
    // Sair do modo de edição
    emEdicao = false;
    localEditando = null;
}

async function atualizarLocal(localId) {
    showLoading(true);
    setButtonsState(true);
    
    try {
        const localAtualizado = {
            nome: document.getElementById('nomeLocal').value,
            endereco: document.getElementById('enderecoLocal').value,
            responsavel: document.getElementById('responsavelLocal').value,
            contato: document.getElementById('contatoLocal').value,
            capacidade: document.getElementById('capacidadeLocal').value || null,
            ultimaAtualizacao: new Date().toISOString()
        };
        
        // Atualizar no Firebase
        await db.collection('locais').doc(localId).update(localAtualizado);
        
        mostrarMensagem('Local atualizado com sucesso!', 'sucesso');
        cancelarEdicaoLocal();
        
    } catch (error) {
        console.error("Erro ao atualizar local:", error);
        mostrarMensagem('Erro ao atualizar local.', 'erro');
    } finally {
        showLoading(false);
        setButtonsState(false);
    }
}

async function editarEvento(eventoId) {
    if (emEdicao) {
        mostrarMensagem('Finalize a edição atual antes de editar outro item.', 'alerta');
        return;
    }
    
    showLoading(true);
    
    try {
        const evento = eventos.find(e => e.id === eventoId);
        if (!evento) return;
        
        // Navegar para a página de dados primeiro
        navigateTo('dadosPage');
        
        // Pequeno delay para garantir que a página foi carregada
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Preencher formulário com dados do evento
        document.getElementById('localEvento').value = evento.localId;
        document.getElementById('escolaEvento').value = evento.escola;
        document.getElementById('diaSemanaEvento').value = evento.diaSemana;
        document.getElementById('horarioInicio').value = evento.horarioInicio;
        document.getElementById('horarioFim').value = evento.horarioFim;
        document.getElementById('responsavelEvento').value = evento.responsavel;
        document.getElementById('contatoEvento').value = evento.contato || '';
        document.getElementById('observacoesEvento').value = evento.observacoes || '';
        
        // Alterar o botão para "Atualizar"
        const submitButton = document.querySelector('#cadastroEventoForm button[type="submit"]');
        submitButton.innerHTML = '<i class="fas fa-save"></i> Atualizar Evento';
        submitButton.onclick = function(e) {
            e.preventDefault();
            atualizarEvento(eventoId);
        };
        
        // Adicionar botão de cancelar (apenas se não existir)
        if (!document.querySelector('#cadastroEventoForm .btn-cancel')) {
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.className = 'btn-cancel';
            cancelButton.innerHTML = '<i class="fas fa-times"></i> Cancelar';
            cancelButton.onclick = function(e) {
                e.preventDefault();
                cancelarEdicaoEvento();
            };
            
            submitButton.parentNode.appendChild(cancelButton);
        }
        
        // Marcar que estamos em modo de edição
        emEdicao = true;
        
        // Rolar para o formulário
        document.getElementById('cadastroEventoForm').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error("Erro ao editar evento:", error);
        mostrarMensagem('Erro ao carregar dados para edição.', 'erro');
    } finally {
        showLoading(false);
    }
}

function cancelarEdicaoEvento() {
    // Limpar formulário
    document.getElementById('cadastroEventoForm').reset();
    document.getElementById('horarioInicio').value = "08:00";
    document.getElementById('horarioFim').value = "17:00";
    
    // Restaurar botão original
    const submitButton = document.querySelector('#cadastroEventoForm button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-plus"></i> Adicionar Evento';
    submitButton.onclick = function(e) {
        e.preventDefault();
        adicionarEvento(e);
    };
    
    // Remover botão de cancelar
    const cancelButton = document.querySelector('#cadastroEventoForm .btn-cancel');
    if (cancelButton) cancelButton.remove();
    
    // Sair do modo de edição
    emEdicao = false;
}

async function atualizarEvento(eventoId) {
    showLoading(true);
    setButtonsState(true);
    
    try {
        const localId = document.getElementById('localEvento').value;
        const localSelecionado = locais.find(l => l.id === localId);
        
        if (!localSelecionado) {
            mostrarMensagem('Selecione um local válido.', 'erro');
            return;
        }
        
        const horarioInicio = document.getElementById('horarioInicio').value;
        const horarioFim = document.getElementById('horarioFim').value;
        
        // Verificar se horário de término é após horário de início
        if (horarioFim <= horarioInicio) {
            mostrarMensagem('O horário de término deve ser após o horário de início.', 'erro');
            return;
        }
        
        const eventoAtualizado = {
            localId: localId,
            localNome: localSelecionado.nome,
            escola: document.getElementById('escolaEvento').value,
            diaSemana: document.getElementById('diaSemanaEvento').value,
            horarioInicio: horarioInicio,
            horarioFim: horarioFim,
            responsavel: document.getElementById('responsavelEvento').value,
            contato: document.getElementById('contatoEvento').value,
            observacoes: document.getElementById('observacoesEvento').value || '',
            ultimaAtualizacao: new Date().toISOString()
        };
        
        // Atualizar no Firebase
        await db.collection('eventos').doc(eventoId).update(eventoAtualizado);
        
        mostrarMensagem('Evento atualizado com sucesso!', 'sucesso');
        cancelarEdicaoEvento();
    } catch (error) {
        console.error("Erro ao atualizar evento:", error);
        mostrarMensagem('Erro ao atualizar evento.', 'erro');
    } finally {
        showLoading(false);
        setButtonsState(false);
    }
}

async function excluirLocal(localId) {
    if (confirm('Tem certeza que deseja excluir este local? Todos os eventos associados também serão excluídos.')) {
        showLoading(true);
        setButtonsState(true);
        
        try {
            // Excluir local do Firebase
            await db.collection('locais').doc(localId).delete();
            
            // Excluir eventos associados
            const eventosParaExcluir = eventos.filter(e => e.localId === localId);
            for (const evento of eventosParaExcluir) {
                await db.collection('eventos').doc(evento.id).delete();
            }
            
            mostrarMensagem('Local excluído com sucesso!', 'sucesso');
        } catch (error) {
            console.error("Erro ao excluir local:", error);
            mostrarMensagem('Erro ao excluir local.', 'erro');
        } finally {
            showLoading(false);
            setButtonsState(false);
        }
    }
}

async function excluirEvento(eventoId) {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
        showLoading(true);
        setButtonsState(true);
        
        try {
            // Excluir evento do Firebase
            await db.collection('eventos').doc(eventoId).delete();
            
            mostrarMensagem('Evento excluído com sucesso!', 'sucesso');
        } catch (error) {
            console.error("Erro ao excluir evento:", error);
            mostrarMensagem('Erro ao excluir evento.', 'erro');
        } finally {
            showLoading(false);
            setButtonsState(false);
        }
    }
}

// Funções para a página de dados unificados
function carregarDadosUnificados() {
    const tbody = document.querySelector('#tabelaDados tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (locais.length === 0 && eventos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum dado encontrado.</td></tr>';
        return;
    }
    
    let dadosUnificados = [];
    
    // Adicionar locais
    locais.forEach(local => {
        dadosUnificados.push({
            tipo: 'local',
            id: local.id,
            nome: local.nome,
            detalhes: local.endereco,
            responsavel: local.responsavel,
            data: local.ultimaAtualizacao || local.dataCriacao,
            objeto: local
        });
    });
    
    // Adicionar eventos
    eventos.forEach(evento => {
        dadosUnificados.push({
            tipo: 'evento',
            id: evento.id,
            nome: evento.escola,
            detalhes: `${evento.diaSemana} - ${evento.horarioInicio} às ${evento.horarioFim} (${evento.localNome})`,
            responsavel: evento.responsavel,
            data: evento.ultimaAtualizacao || evento.dataCriacao,
            localId: evento.localId,
            localNome: evento.localNome,
            objeto: evento
        });
    });
    
    // Ordenar por data de criação (mais recentes primeiro)
    dadosUnificados.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Aplicar filtros
    const termoPesquisa = document.getElementById('pesquisaDados').value.toLowerCase();
    const tipoFiltro = document.getElementById('filtroTipoDados').value;
    
    dadosUnificados = dadosUnificados.filter(item => {
        // Filtro por tipo
        if (tipoFiltro !== 'todos' && item.tipo !== tipoFiltro) {
            return false;
        }
        
        // Filtro por pesquisa
        if (termoPesquisa) {
            const textoBusca = `${item.nome} ${item.detalhes} ${item.responsavel}`.toLowerCase();
            if (!textoBusca.includes(termoPesquisa)) {
                return false;
            }
        }
        
        return true;
    });
    
    if (dadosUnificados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum dado encontrado com os filtros aplicados.</td></tr>';
        return;
    }
    
    dadosUnificados.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        const dataFormatada = new Date(item.data).toLocaleString('pt-BR');
        const tipoTexto = item.tipo === 'local' ? 'Local' : 'Evento';
        const iconeTipo = item.tipo === 'local' ? 'fa-map-marker-alt' : 'fa-calendar';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><i class="fas ${iconeTipo}"></i> ${tipoTexto}</td>
            <td>${item.tipo === 'local' ? item.nome : item.nome}</td>
            <td>${item.detalhes}</td>
            <td>${item.responsavel}</td>
            <td>${dataFormatada}</td>
            <td>
                ${item.tipo === 'local' ? 
                    `<button class="btn-info btn-small" onclick="mostrarDetalhesLocal('${item.id}')"><i class="fas fa-eye"></i> Detalhes</button>
                     <button class="btn-edit btn-small" onclick="editarLocal('${item.id}')"><i class="fas fa-edit"></i> Editar</button>
                     <button class="btn-delete btn-small" onclick="excluirLocal('${item.id}')"><i class="fas fa-trash"></i> Excluir</button>` : 
                    `<button class="btn-info btn-small" onclick="mostrarDetalhesEvento('${item.id}')"><i class="fas fa-eye"></i> Detalhes</button>
                     <button class="btn-edit btn-small" onclick="editarEvento('${item.id}')"><i class="fas fa-edit"></i> Editar</button>
                     <button class="btn-delete btn-small" onclick="excluirEvento('${item.id}')"><i class="fas fa-trash"></i> Excluir</button>`
                }
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function mostrarDetalhesLocal(localId) {
    const local = locais.find(l => l.id === localId);
    if (!local) return;
    
    // Buscar eventos associados a este local
    const eventosLocal = eventos.filter(e => e.localId === localId);
    eventosFiltradosModal = [...eventosLocal];
    
    let eventosHTML = '';
    if (eventosLocal.length > 0) {
        eventosHTML = `<h3>Eventos neste local (${eventosLocal.length})</h3>
                      <div id="eventosModalLista" class="eventos-lista">`;
        
        eventosLocal.forEach(evento => {
            eventosHTML += `
                <div class="evento-card">
                    <h4>${evento.escola}</h4>
                    <div class="evento-info">
                        <p><strong>Dia:</strong> ${evento.diaSemana}</p>
                        <p><strong>Horário:</strong> ${evento.horarioInicio} às ${evento.horarioFim}</p>
                        <p><strong>Responsável:</strong> ${evento.responsavel}</p>
                        <p><strong>Contato:</strong> ${evento.contato || 'Não informado'}</p>
                    </div>
                    ${evento.observacoes ? `<p><strong>Observações:</strong> ${evento.observacoes}</p>` : ''}
                </div>
            `;
        });
        
        eventosHTML += '</div>';
    } else {
        eventosHTML = '<p>Nenhum evento cadastrado para este local.</p>';
    }
    
    const modal = document.getElementById('detalhesModal');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalConteudo = document.getElementById('modalConteudo');
    
    modalTitulo.textContent = `Detalhes do Local: ${local.nome}`;
    
    modalConteudo.innerHTML = `
        <div class="local-details">
            <p><strong>Endereço:</strong> ${local.endereco}</p>
            <p><strong>Responsável:</strong> ${local.responsavel}</p>
            <p><strong>Contato:</strong> ${local.contato || 'Não informado'}</p>
            ${local.capacidade ? `<p><strong>Capacidade:</strong> ${local.capacidade} pessoas</p>` : ''}
            <p><strong>Data de criação:</strong> ${new Date(local.dataCriacao).toLocaleString('pt-BR')}</p>
            <p><strong>Última atualização:</strong> ${new Date(local.ultimaAtualizacao || local.dataCriacao).toLocaleString('pt-BR')}</p>
        </div>
        ${eventosHTML}
    `;
    
    modal.style.display = 'block';
}

function filtrarEventosModal() {
    const termoPesquisa = document.getElementById('pesquisaEventosModal').value.toLowerCase();
    const eventosLista = document.getElementById('eventosModalLista');
    
    if (!eventosLista) return;
    
    eventosLista.innerHTML = '';
    
    if (eventosFiltradosModal.length === 0) {
        eventosLista.innerHTML = '<p>Nenhum evento encontrado.</p>';
        return;
    }
    
    const eventosFiltrados = eventosFiltradosModal.filter(evento => {
        const textoBusca = `${evento.escola} ${evento.diaSemana} ${evento.horarioInicio} ${evento.horarioFim} ${evento.responsavel}`.toLowerCase();
        return textoBusca.includes(termoPesquisa);
    });
    
    if (eventosFiltrados.length === 0) {
        eventosLista.innerHTML = '<p>Nenhum evento encontrado com os critérios de pesquisa.</p>';
        return;
    }
    
    eventosFiltrados.forEach(evento => {
        const eventoHTML = `
            <div class="evento-card">
                <h4>${evento.escola}</h4>
                <div class="evento-info">
                    <p><strong>Dia:</strong> ${evento.diaSemana}</p>
                    <p><strong>Horário:</strong> ${evento.horarioInicio} às ${evento.horarioFim}</p>
                    <p><strong>Responsável:</strong> ${evento.responsavel}</p>
                    <p><strong>Contato:</strong> ${evento.contato || 'Não informado'}</p>
                </div>
                ${evento.observacoes ? `<p><strong>Observações:</strong> ${evento.observacoes}</p>` : ''}
            </div>
        `;
        
        eventosLista.innerHTML += eventoHTML;
    });
}

function limparPesquisaEventosModal() {
    document.getElementById('pesquisaEventosModal').value = '';
    filtrarEventosModal();
}

function mostrarDetalhesEvento(eventoId) {
    const evento = eventos.find(e => e.id === eventoId);
    if (!evento) return;
    
    const modal = document.getElementById('detalhesModal');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalConteudo = document.getElementById('modalConteudo');
    
    modalTitulo.textContent = `Detalhes do Evento: ${evento.escola}`;
    
    modalConteudo.innerHTML = `
        <div class="evento-details">
            <p><strong>Local:</strong> ${evento.localNome}</p>
            <p><strong>Dia:</strong> ${evento.diaSemana}</p>
            <p><strong>Horário:</strong> ${evento.horarioInicio} às ${evento.horarioFim}</p>
            <p><strong>Responsável:</strong> ${evento.responsavel}</p>
            <p><strong>Contato:</strong> ${evento.contato || 'Não informado'}</p>
            ${evento.observacoes ? `<p><strong>Observações:</strong> ${evento.observacoes}</p>` : ''}
            <p><strong>Data de criação:</strong> ${new Date(evento.dataCriacao).toLocaleString('pt-BR')}</p>
            <p><strong>Última atualização:</strong> ${new Date(evento.ultimaAtualizacao || evento.dataCriacao).toLocaleString('pt-BR')}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

function filtrarDados() {
    carregarDadosUnificados();
}

function limparPesquisaDados() {
    document.getElementById('pesquisaDados').value = '';
    document.getElementById('filtroTipoDados').value = 'todos';
    carregarDadosUnificados();
}

// Funções de backup e exportação
async function fazerBackupJSON() {
    try {
        showLoading(true);
        setButtonsState(true);
        
        const backupName = document.getElementById('backupName').value || 'backup-dados';
        
        const dataStr = JSON.stringify({
            locais: locais,
            eventos: eventos,
            usuarios: usuarios,
            dataBackup: new Date().toISOString(),
            versao: '1.0'
        }, null, 2);
        
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `${backupName}-${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        // Atualizar data do último backup
        ultimoBackup = new Date().toISOString();
        localStorage.setItem('ultimoBackup', ultimoBackup);
        verificarBackupStatus();
        
        mostrarMensagem('Backup JSON criado com sucesso!', 'sucesso');
    } catch (error) {
        console.error("Erro ao criar backup:", error);
        mostrarMensagem('Erro ao criar backup.', 'erro');
    } finally {
        showLoading(false);
        setButtonsState(false);
    }
}

function exportarParaExcel() {
    // Esta função requer a biblioteca xlsx, certifique-se de incluí-la
    if (typeof XLSX === 'undefined') {
        mostrarMensagem('Biblioteca de exportação não carregada.', 'erro');
        return;
    }
    
    if (locais.length === 0) {
        mostrarMensagem('Não há dados para exportar!', 'erro');
        return;
    }
    
    showLoading(true);
    setButtonsState(true);
    
    try {
        // Preparar dados para exportação
        const dadosExportacao = [];
        
        // Adicionar locais
        locais.forEach(local => {
            dadosExportacao.push({
                'Tipo': 'Local',
                'Nome': local.nome,
                'Endereço': local.endereco,
                'Responsável': local.responsavel,
                'Contato': local.contato || '',
                'Capacidade': local.capacidade || '',
                'Data de Criação': new Date(local.dataCriacao).toLocaleString('pt-BR'),
                'Última Atualização': new Date(local.ultimaAtualizacao || local.dataCriacao).toLocaleString('pt-BR')
            });
        });
        
        // Adicionar eventos
        eventos.forEach(evento => {
            dadosExportacao.push({
                'Tipo': 'Evento',
                'Local': evento.localNome,
                'Escola/Grupo': evento.escola,
                'Dia da Semana': evento.diaSemana,
                'Horário Início': evento.horarioInicio,
                'Horário Término': evento.horarioFim,
                'Responsável': evento.responsavel,
                'Contato': evento.contato || '',
                'Observações': evento.observacoes || '',
                'Data de Criação': new Date(evento.dataCriacao).toLocaleString('pt-BR'),
                'Última Atualização': new Date(evento.ultimaAtualizacao || evento.dataCriacao).toLocaleString('pt-BR')
            });
        });
        
        // Criar planilha
        const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");
        
        // Gerar arquivo
        XLSX.writeFile(workbook, `dados-sistema-${new Date().toISOString().slice(0,10)}.xlsx`);
        
        mostrarMensagem('Planilha Excel exportada com sucesso!', 'sucesso');
    } catch (error) {
        console.error("Erro ao exportar para Excel:", error);
        mostrarMensagem('Erro ao exportar para Excel.', 'erro');
    } finally {
        showLoading(false);
        setButtonsState(false);
    }
}

async function restaurarBackup() {
    const fileInput = document.getElementById('restoreFile');
    const file = fileInput.files[0];
    
    if (!file) {
        mostrarMensagem('Selecione um arquivo JSON para restaurar!', 'erro');
        return;
    }
    
    showLoading(true);
    setButtonsState(true);
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            
            if (!dados.locais || !Array.isArray(dados.locais)) {
                throw new Error('Formato de arquivo inválido');
            }
            
            if (!confirm(`Tem certeza que deseja restaurar ${dados.locais.length} locais e ${dados.eventos?.length || 0} eventos? Todos os dados atuais serão substituídos.`)) {
                return;
            }
            
            // Limpar dados atuais
            await limparDadosFirebase();
            
            // Restaurar locais
            for (const local of dados.locais) {
                await db.collection('locais').add(local);
            }
            
            // Restaurar eventos
            if (dados.eventos && Array.isArray(dados.eventos)) {
                for (const evento of dados.eventos) {
                    await db.collection('eventos').add(evento);
                }
            }
            
            // Restaurar usuários (se houver)
            if (dados.usuarios && Array.isArray(dados.usuarios)) {
                for (const usuario of dados.usuarios) {
                    await db.collection('usuarios').add(usuario);
                }
            }
            
            mostrarMensagem(`Backup restaurado com sucesso! ${dados.locais.length} locais e ${dados.eventos?.length || 0} eventos importados.`, 'sucesso');
            
            // Limpar seleção de arquivo
            fileInput.value = '';
            
        } catch (error) {
            console.error(error);
            mostrarMensagem('Erro ao processar arquivo: ' + error.message, 'erro');
        } finally {
            showLoading(false);
            setButtonsState(false);
        }
    };
    reader.readAsText(file);
}

// Limpar todos os dados do Firebase
async function limparDadosFirebase() {
    try {
        // Limpar eventos
        const eventosSnapshot = await db.collection('eventos').get();
        for (const doc of eventosSnapshot.docs) {
            await db.collection('eventos').doc(doc.id).delete();
        }
        
        // Limpar locais
        const locaisSnapshot = await db.collection('locais').get();
        for (const doc of locaisSnapshot.docs) {
            await db.collection('locais').doc(doc.id).delete();
        }
        
        // Limpar usuários (exceto admin)
        const usuariosSnapshot = await db.collection('usuarios').get();
        for (const doc of usuariosSnapshot.docs) {
            const usuario = doc.data();
            if (usuario.email !== "admin@exemplo.com") {
                await db.collection('usuarios').doc(doc.id).delete();
            }
        }
    } catch (error) {
        console.error("Erro ao limpar dados:", error);
        throw new Error("Não foi possível limpar os dados atuais");
    }
}

function atualizarEstatisticas() {
    const estatisticasDiv = document.getElementById('estatisticas');
    if (!estatisticasDiv) return;
    
    const totalLocais = locais.length;
    const totalEventos = eventos.length;
    
    if (totalLocais === 0) {
        estatisticasDiv.innerHTML = '<p>Nenhum local cadastrado ainda.</p>';
        return;
    }
    
    // Encontrar o local com mais eventos
    let localMaisEventos = null;
    let maxEventos = 0;
    
    for (const local of locais) {
        const eventosLocal = eventos.filter(e => e.localId === local.id).length;
        if (eventosLocal > maxEventos) {
            maxEventos = eventosLocal;
            localMaisEventos = local.nome;
        }
    }
    
    estatisticasDiv.innerHTML = `
        <p><strong>Total de locais:</strong> ${totalLocais}</p>
        <p><strong>Total de eventos:</strong> ${totalEventos}</p>
        <p><strong>Local com mais eventos:</strong> ${localMaisEventos} (${maxEventos} eventos)</p>
    `;
}

function verificarBackupStatus() {
    const backupStatusDiv = document.getElementById('backupStatus');
    if (!backupStatusDiv) return;
    
    if (!ultimoBackup) {
        backupStatusDiv.innerHTML = '<p><strong>Status de backup:</strong> Nenhum backup realizado ainda. É recomendado fazer backup regularmente.</p>';
        backupStatusDiv.className = 'alerta';
        return;
    }
    
    const dataBackup = new Date(ultimoBackup);
    const diasDesdeBackup = Math.floor((new Date() - dataBackup) / (1000 * 60 * 60 * 24));
    
    if (diasDesdeBackup > 7) {
        backupStatusDiv.innerHTML = `<p><strong>Status de backup:</strong> Seu último backup foi há ${diasDesdeBackup} dias. É altamente recomendado fazer um novo backup.</p>`;
        backupStatusDiv.className = 'erro';
    } else if (diasDesdeBackup > 3) {
        backupStatusDiv.innerHTML = `<p><strong>Status de backup:</strong> Seu último backup foi há ${diasDesdeBackup} dias. Considere fazer um novo backup em breve.</p>`;
        backupStatusDiv.className = 'alerta';
    } else {
        backupStatusDiv.innerHTML = `<p><strong>Status de backup:</strong> Seu último backup foi há ${diasDesdeBackup} dias. Está em dia!</p>`;
        backupStatusDiv.className = 'sucesso';
    }
}

function mostrarMensagem(texto, tipo) {
    // Remover mensagens existentes
    const mensagensExistentes = document.querySelectorAll('.mensagem');
    mensagensExistentes.forEach(msg => msg.remove());
    
    const mensagemDiv = document.createElement('div');
    mensagemDiv.className = `mensagem ${tipo}`;
    
    // Adicionar ícone conforme o tipo
    let icone = '';
    if (tipo === 'sucesso') icone = '<i class="fas fa-check-circle"></i> ';
    if (tipo === 'erro') icone = '<i class="fas fa-exclamation-circle"></i> ';
    if (tipo === 'alerta') icone = '<i class="fas fa-exclamation-triangle"></i> ';
    
    mensagemDiv.innerHTML = icone + texto;
    
    // Adicionar a mensagem no container apropriado
    const container = document.querySelector('.content .card') || document.querySelector('.content');
    if (container) {
        container.prepend(mensagemDiv);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (mensagemDiv.parentNode) {
                mensagemDiv.remove();
            }
        }, 5000);
    }
}