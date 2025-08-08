document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-turma');
    const editForm = document.getElementById('edit-form');
    const escolaSelect = document.getElementById('escola');
    const editEscolaSelect = document.getElementById('edit-escola');
    const turmasContainer = document.getElementById('turmas-container');
    const emptyState = document.getElementById('empty-state');

    let paginaAtual = 1;
    let totalPaginas = 1;
    let turmasData = [];
    let escolasData = [];

    // Carrega escolas
    async function carregarEscolas() {
        try {
            const resp = await fetch('/api/escolas');
            const data = await resp.json();
            escolasData = data.escolas || data;
            
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

    // Atualiza grid de turmas
    async function atualizarTurmas(page = 1) {
        const escolaId = escolaSelect.value;
        let url = `/api/turmas?page=${page}&per_page=20`;
        if (escolaId) url += `&escola_id=${escolaId}`;
        
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            turmasData = data.turmas || [];
            paginaAtual = data.page;
            totalPaginas = data.pages;
            
            renderizarTurmas();
            atualizarEstatisticas();
            renderizarEstatisticasComponentes();
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
            mostrarNotificacao('Erro ao carregar turmas', 'error');
        }
    }

    // Event listener para carregamento de turmas por escola
    escolaSelect.addEventListener('change', function() {
        atualizarTurmas(1);
    });

    // Renderiza os cards de turmas
    function renderizarTurmas() {
        if (!turmasData.length) {
            turmasContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        turmasContainer.style.display = 'grid';
        emptyState.style.display = 'none';
        
        turmasContainer.innerHTML = '';
        
        turmasData.forEach(turma => {
            const escolaNome = getEscolaNome(turma.escola_id);
            const iniciais = turma.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            const turmaCard = document.createElement('div');
            turmaCard.className = 'turma-card';
            turmaCard.setAttribute('data-id', turma.id);
            
            turmaCard.innerHTML = `
                <div class="turma-header">
                    <div class="turma-avatar">${iniciais}</div>
                    <div class="turma-info">
                        <h3>${turma.nome}</h3>
                        <p>${turma.ano}º ano - ${turma.turno}</p>
                    </div>
                </div>
                <div class="turma-details">
                    <div class="detail-item">
                        <i class="fas fa-school"></i>
                        <span>${escolaNome || 'Não informado'}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${turma.ano}º ano</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>Turno: ${turma.turno}</span>
                    </div>
                </div>
                <div class="turma-actions">
                    <button class="action-btn-small edit-btn" onclick="editarTurma(${turma.id}, '${turma.nome}', ${turma.ano}, '${turma.escola_id}', '${turma.turno}')">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="action-btn-small delete-btn" onclick="excluirTurma(${turma.id})">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            `;
            
            turmasContainer.appendChild(turmaCard);
        });
    }

    // Função auxiliar para obter nome da escola
    function getEscolaNome(escolaId) {
        if (!escolaId) return '';
        const escola = escolasData.find(e => e.id == escolaId);
        return escola ? escola.nome : '';
    }

    // Atualiza estatísticas
    function atualizarEstatisticas() {
        const totalTurmas = turmasData.length;
        const escolas = new Set(turmasData.map(t => t.escola_id)).size;
        const turnos = new Set(turmasData.map(t => t.turno)).size;
        
        document.getElementById('total-turmas').textContent = totalTurmas;
        document.getElementById('total-escolas').textContent = escolas;
        document.getElementById('total-turnos').textContent = turnos;
    }

    // Renderiza estatísticas dos componentes
    function renderizarEstatisticasComponentes() {
        // Estatísticas por ano
        const anosStats = {};
        turmasData.forEach(turma => {
            const ano = turma.ano;
            anosStats[ano] = (anosStats[ano] || 0) + 1;
        });

        const anosContainer = document.getElementById('anos-stats');
        if (anosContainer) {
            anosContainer.innerHTML = '';
            Object.entries(anosStats).forEach(([ano, count]) => {
                const statCard = document.createElement('div');
                statCard.className = 'stat-card';
                statCard.innerHTML = `
                    <div class="stat-info">
                        <span class="label">${ano}º ano</span>
                        <span class="count">${count} turma${count > 1 ? 's' : ''}</span>
                    </div>
                `;
                anosContainer.appendChild(statCard);
            });
        }

        // Estatísticas por turno
        const turnosStats = {};
        turmasData.forEach(turma => {
            const turno = turma.turno;
            turnosStats[turno] = (turnosStats[turno] || 0) + 1;
        });

        const turnosContainer = document.getElementById('turnos-stats');
        if (turnosContainer) {
            turnosContainer.innerHTML = '';
            Object.entries(turnosStats).forEach(([turno, count]) => {
                const statCard = document.createElement('div');
                statCard.className = 'stat-card';
                statCard.innerHTML = `
                    <div class="stat-info">
                        <span class="label">${turno}</span>
                        <span class="count">${count} turma${count > 1 ? 's' : ''}</span>
                    </div>
                `;
                turnosContainer.appendChild(statCard);
            });
        }
    }

    // Cadastro de turma
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const data = {
            nome: document.getElementById('nome').value,
            ano: parseInt(document.getElementById('ano').value),
            escola_id: escolaSelect.value || null,
            turno: document.getElementById('turno').value
        };
        
        try {
            const resp = await fetch('/api/turmas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (resp.status === 401) {
                mostrarNotificacao('Você precisa estar logado para cadastrar turmas', 'error');
                return;
            }
            
            if (resp.ok) {
                mostrarNotificacao('Turma cadastrada com sucesso!', 'success');
                form.reset();
                atualizarTurmas(1);
            } else {
                const error = await resp.json();
                mostrarNotificacao(error.message || 'Erro ao cadastrar turma', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            mostrarNotificacao('Erro ao cadastrar turma', 'error');
        }
    });

    // Edição de turma
    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const data = {
            nome: document.getElementById('edit-nome').value,
            ano: parseInt(document.getElementById('edit-ano').value),
            escola_id: document.getElementById('edit-escola').value || null,
            turno: document.getElementById('edit-turno').value
        };
        
        try {
            const resp = await fetch(`/api/turmas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (resp.ok) {
                mostrarNotificacao('Turma atualizada com sucesso!', 'success');
                closeEditModal();
                atualizarTurmas(paginaAtual);
            } else {
                const error = await resp.json();
                mostrarNotificacao(error.message || 'Erro ao atualizar turma', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            mostrarNotificacao('Erro ao atualizar turma', 'error');
        }
    });

    // Inicialização
    carregarEscolas();
    atualizarTurmas(1);
});

function editarTurma(id, nome, ano, escolaId, turno) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nome').value = nome;
    document.getElementById('edit-ano').value = ano;
    document.getElementById('edit-escola').value = escolaId;
    document.getElementById('edit-turno').value = turno;
    document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

async function excluirTurma(id) {
    if (!confirm('Tem certeza que deseja excluir esta turma?')) {
        return;
    }
    
    try {
        const resp = await fetch(`/api/turmas/${id}`, {
            method: 'DELETE'
        });
        
        if (resp.ok) {
            mostrarNotificacao('Turma excluída com sucesso!', 'success');
            // Recarregar turmas
            const container = document.getElementById('turmas-container');
            const turmaCard = container.querySelector(`[data-id="${id}"]`);
            if (turmaCard) {
                turmaCard.remove();
            }
            
            // Atualizar estatísticas
            setTimeout(() => {
                const event = new Event('change');
                document.getElementById('escola').dispatchEvent(event);
            }, 100);
        } else {
            const error = await resp.json();
            mostrarNotificacao(error.message || 'Erro ao excluir turma', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao excluir turma', 'error');
    }
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    // Criar container se não existir
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
    }

        const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    
    const cores = getCorNotificacao(tipo);
    const icone = getIconeNotificacao(tipo);

        notification.style.cssText = `
        background: linear-gradient(135deg, ${cores.bg}, ${cores.bg}dd);
            color: #FFFFFD;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(69, 125, 151, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 253, 0.2);
            display: flex;
            align-items: center;
            gap: 0.8rem;
            font-weight: 500;
            min-width: 300px;
            transform: translateX(400px);
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            pointer-events: auto;
            cursor: pointer;
        animation: slideInRight 0.4s ease-out;
        `;

        notification.innerHTML = `
        <i class="${icone}" style="font-size: 1.2rem;"></i>
        <span>${mensagem}</span>
            <i class="fas fa-times" style="margin-left: auto; opacity: 0.7; cursor: pointer;"></i>
        `;

    container.appendChild(notification);

        // Animação de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

    // Auto-remover após 4 segundos
        const autoRemove = setTimeout(() => {
        removeNotification(notification);
    }, 4000);

        // Remover ao clicar
        notification.addEventListener('click', () => {
            clearTimeout(autoRemove);
        removeNotification(notification);
        });
    }

function removeNotification(notification) {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
}

function getIconeNotificacao(tipo) {
    const icones = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    return icones[tipo] || icones.info;
}

function getCorNotificacao(tipo) {
    const cores = {
        success: { bg: '#457D97' },
        error: { bg: '#d32f2f' },
        warning: { bg: '#457D97' },
        info: { bg: '#457D97' }
    };
    return cores[tipo] || cores.info;
}

// Funções de estatísticas globais
function getTotalTurmas() {
    return document.getElementById('total-turmas').textContent || '0';
}

function getTotalEscolas() {
    return document.getElementById('total-escolas').textContent || '0';
}

function getTotalTurnos() {
    return document.getElementById('total-turnos').textContent || '0';
} 