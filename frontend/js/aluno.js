document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-aluno');
    const editForm = document.getElementById('edit-form');
    const escolaSelect = document.getElementById('escola');
    const turmaSelect = document.getElementById('turma');
    const editEscolaSelect = document.getElementById('edit-escola');
    const editTurmaSelect = document.getElementById('edit-turma');
    const alunosContainer = document.getElementById('alunos-container');
    const emptyState = document.getElementById('empty-state');

    let paginaAtual = 1;
    let totalPaginas = 1;
    let alunosData = [];

    // Carrega escolas
    async function carregarEscolas() {
        try {
        const resp = await fetch('/api/escolas');
        const data = await resp.json();
            escolasData = data.escolas || data; // Armazenar dados
            
            // Atualizar select principal
        escolaSelect.innerHTML = '<option value="">Selecione a escola</option>';
            escolasData.forEach(e => {
            escolaSelect.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
        });

            // Atualizar select do modal de edição
            editEscolaSelect.innerHTML = '<option value="">Selecione a escola</option>';
            escolasData.forEach(e => {
                editEscolaSelect.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
            });
        } catch (error) {
            console.error('Erro ao carregar escolas:', error);
        }
    }

    // Carrega turmas ao selecionar escola
    async function carregarTurmas(escolaId, selectElement) {
        selectElement.innerHTML = '<option value="">Selecione a turma</option>';
        if (!escolaId) return;
        
        try {
            const resp = await fetch(`/api/turmas?escola_id=${escolaId}`);
        const data = await resp.json();
        const lista = data.turmas || data;
            
            // Armazenar turmas (adicionar sem duplicar)
            lista.forEach(turma => {
                if (!turmasData.find(t => t.id === turma.id)) {
                    turmasData.push(turma);
                }
            });
            
        lista.forEach(t => {
                selectElement.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
            });
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
        }
    }

    // Event listeners para carregamento de turmas
    escolaSelect.addEventListener('change', function() {
        carregarTurmas(this.value, turmaSelect);
        atualizarAlunos(1);
    });

    editEscolaSelect.addEventListener('change', function() {
        carregarTurmas(this.value, editTurmaSelect);
    });

    // Atualiza grid de alunos
    async function atualizarAlunos(page = 1) {
        const turmaId = turmaSelect.value;
        let url = `/api/alunos?page=${page}&per_page=20`;
        if (turmaId) url += `&turma_id=${turmaId}`;
        
        try {
        const resp = await fetch(url);
        const data = await resp.json();
            alunosData = data.alunos || [];
        paginaAtual = data.page;
        totalPaginas = data.pages;
            
            renderizarAlunos();
            atualizarEstatisticas();
        } catch (error) {
            console.error('Erro ao carregar alunos:', error);
            mostrarNotificacao('Erro ao carregar alunos', 'error');
        }
    }

    // Renderiza os cards de alunos
    function renderizarAlunos() {
        if (!alunosData.length) {
            alunosContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        alunosContainer.style.display = 'grid';
        emptyState.style.display = 'none';
        
        alunosContainer.innerHTML = '';
        
        alunosData.forEach(aluno => {
            const escolaNome = getEscolaNome(aluno.escola_id);
            const turmaNome = getTurmaNome(aluno.turma_id);
            const iniciais = aluno.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            const alunoCard = document.createElement('div');
            alunoCard.className = 'aluno-card';
            alunoCard.setAttribute('data-id', aluno.id);
            
            alunoCard.innerHTML = `
                <div class="aluno-header">
                    <div class="aluno-avatar">${iniciais}</div>
                    <div class="aluno-info">
                        <h3>${aluno.nome}</h3>
                        <p>${aluno.sexo}</p>
                    </div>
                </div>
                <div class="aluno-details">
                    <div class="detail-item">
                        <i class="fas fa-school"></i>
                        <span>${escolaNome || 'Não informado'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-users"></i>
                        <span>${turmaNome || 'Não informado'}</span>
                    </div>
                </div>
                <div class="aluno-actions">
                    <button class="action-btn-small edit-btn" onclick="editarAluno(${aluno.id}, '${aluno.nome}', '${aluno.sexo}', '${aluno.escola_id}', '${aluno.turma_id}')">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="action-btn-small delete-btn" onclick="excluirAluno(${aluno.id})">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            `;
            
            alunosContainer.appendChild(alunoCard);
        });
    }

    // Armazenar dados para referência
    let escolasData = [];
    let turmasData = [];

    // Funções auxiliares para obter nomes
    function getEscolaNome(escolaId) {
        if (!escolaId) return '';
        const escola = escolasData.find(e => e.id == escolaId);
        return escola ? escola.nome : '';
    }

    function getTurmaNome(turmaId) {
        if (!turmaId) return '';
        const turma = turmasData.find(t => t.id == turmaId);
        return turma ? turma.nome : '';
    }

    // Atualiza estatísticas
    function atualizarEstatisticas() {
        const totalAlunos = alunosData.length;
        const escolas = new Set(alunosData.map(a => a.escola_id)).size;
        const turmas = new Set(alunosData.map(a => a.turma_id)).size;
        
        document.getElementById('total-alunos').textContent = totalAlunos;
        document.getElementById('total-escolas').textContent = escolas;
        document.getElementById('total-turmas').textContent = turmas;
    }

    // Cadastro de aluno
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const data = {
            nome: document.getElementById('nome').value,
            sexo: document.getElementById('sexo').value,
            escola_id: escolaSelect.value || null,
            turma_id: turmaSelect.value || null
        };
        
        try {
            const resp = await fetch('/api/alunos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            
            if (resp.status === 401) {
                mostrarNotificacao('Você precisa estar logado para cadastrar alunos', 'error');
                return;
            }
            
            const result = await resp.json();
            
            if (result.success) {
                form.reset();
                await atualizarAlunos(paginaAtual);
                mostrarNotificacao('Aluno cadastrado com sucesso!', 'success');
                
                // Animação de sucesso no botão
                const submitBtn = form.querySelector('.submit-btn');
                submitBtn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    submitBtn.style.transform = 'scale(1)';
                }, 150);
            } else {
                mostrarNotificacao(result.error || 'Erro ao cadastrar aluno', 'error');
            }
        } catch (error) {
            console.error('Erro ao cadastrar aluno:', error);
            mostrarNotificacao('Erro ao conectar com o servidor', 'error');
        }
    });

    // Edição de aluno
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const data = {
            nome: document.getElementById('edit-nome').value,
            sexo: document.getElementById('edit-sexo').value,
            escola_id: editEscolaSelect.value || null,
            turma_id: editTurmaSelect.value || null
        };
        
        try {
            const resp = await fetch(`/api/alunos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await resp.json();
            
            if (result.success) {
                closeEditModal();
                await atualizarAlunos(paginaAtual);
                mostrarNotificacao('Aluno atualizado com sucesso!', 'success');
            } else {
                mostrarNotificacao(result.error || 'Erro ao atualizar aluno', 'error');
            }
        } catch (error) {
            console.error('Erro ao atualizar aluno:', error);
            mostrarNotificacao('Erro ao conectar com o servidor', 'error');
        }
    });

    // Carrega todas as turmas para referência
    async function carregarTodasTurmas() {
        try {
            const resp = await fetch('/api/turmas');
            const data = await resp.json();
            turmasData = data.turmas || data;
        } catch (error) {
            console.error('Erro ao carregar todas as turmas:', error);
        }
    }

    // Inicialização
    Promise.all([carregarEscolas(), carregarTodasTurmas()]).then(() => atualizarAlunos(1));
    turmaSelect.addEventListener('change', () => atualizarAlunos(1));
});

// Funções globais para os botões dos cards
function editarAluno(id, nome, sexo, escolaId, turmaId) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nome').value = nome;
    document.getElementById('edit-sexo').value = sexo;
    document.getElementById('edit-escola').value = escolaId;
    document.getElementById('edit-turma').value = turmaId;
    
    // Carregar turmas da escola selecionada
    if (escolaId) {
        carregarTurmasEdit(escolaId, turmaId);
    }
    
    document.getElementById('edit-modal').classList.add('active');
}

async function carregarTurmasEdit(escolaId, turmaIdSelecionada) {
    const editTurmaSelect = document.getElementById('edit-turma');
    editTurmaSelect.innerHTML = '<option value="">Selecione a turma</option>';
    
    if (!escolaId) return;
    
    try {
        const resp = await fetch(`/api/turmas?escola_id=${escolaId}`);
        const data = await resp.json();
        const lista = data.turmas || data;
        
        // Atualizar dados armazenados
        lista.forEach(turma => {
            if (!turmasData.find(t => t.id === turma.id)) {
                turmasData.push(turma);
            }
        });
        
        lista.forEach(t => {
            const selected = t.id == turmaIdSelecionada ? 'selected' : '';
            editTurmaSelect.innerHTML += `<option value="${t.id}" ${selected}>${t.nome}</option>`;
        });
    } catch (error) {
        console.error('Erro ao carregar turmas:', error);
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

async function excluirAluno(id) {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) {
        return;
    }
    
                try {
                    const resp = await fetch(`/api/alunos/${id}`, { method: 'DELETE' });
                    const result = await resp.json();
        
                    if (result.success) {
            // Animação de remoção
            const card = document.querySelector(`[data-id="${id}"]`);
            if (card) {
                card.style.transform = 'scale(0)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                }, 300);
            }
            
            // Atualizar dados
            setTimeout(async () => {
                await atualizarAlunos(1);
                mostrarNotificacao('Aluno excluído com sucesso!', 'success');
            }, 300);
                    } else {
            mostrarNotificacao(result.error || 'Erro ao excluir aluno', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        mostrarNotificacao('Erro ao conectar com o servidor', 'error');
    }
}

// Sistema de notificações moderno
function mostrarNotificacao(mensagem, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${tipo}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getIconeNotificacao(tipo)}"></i>
            <span>${mensagem}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Estilos da notificação
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getCorNotificacao(tipo)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 300px;
        animation: slideInRight 0.3s ease-out;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover após 4 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

function getIconeNotificacao(tipo) {
    const icones = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    return icones[tipo] || icones.info;
}

function getCorNotificacao(tipo) {
    const cores = {
        success: 'linear-gradient(135deg, #457D97, #6b9bb3)',
        error: 'linear-gradient(135deg, #d32f2f, #e57373)',
        warning: 'linear-gradient(135deg, #457D97, #FFFFFD)',
        info: 'linear-gradient(135deg, #457D97, #6b9bb3)'
    };
    return cores[tipo] || cores.info;
}

// Funções auxiliares para estatísticas (chamadas pelo HTML)
function getTotalAlunos() {
    return document.querySelectorAll('.aluno-card').length || 0;
}

function getTotalEscolas() {
    const escolas = new Set();
    document.querySelectorAll('.aluno-card').forEach(card => {
        const escolaText = card.querySelector('.detail-item:first-child span').textContent;
        if (escolaText && escolaText !== 'Não informado') {
            escolas.add(escolaText);
        }
    });
    return escolas.size;
}

function getTotalTurmas() {
    const turmas = new Set();
    document.querySelectorAll('.aluno-card').forEach(card => {
        const turmaText = card.querySelector('.detail-item:last-child span').textContent;
        if (turmaText && turmaText !== 'Não informado') {
            turmas.add(turmaText);
        }
    });
    return turmas.size;
}

// Adicionar estilos de animação ao head
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        transition: background 0.2s ease;
    }
    
    .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;
document.head.appendChild(style);