document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-escola');
    const editForm = document.getElementById('edit-form');
    const escolasContainer = document.getElementById('escolas-container');
    const emptyState = document.getElementById('empty-state');

    let paginaAtual = 1;
    let totalPaginas = 1;
    let escolasData = [];

    async function atualizarEscolas(page = 1) {
        let url = `/api/escolas?page=${page}&per_page=20`;
        
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            escolasData = data.escolas || [];
            paginaAtual = data.page;
            totalPaginas = data.pages;
            
            renderizarEscolas();
            atualizarEstatisticas();
            renderizarEstatisticasComponentes();
        } catch (error) {
            console.error('Erro ao carregar escolas:', error);
            mostrarNotificacao('Erro ao carregar escolas', 'error');
        }
    }

    function renderizarEscolas() {
        if (!escolasData.length) {
            escolasContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        escolasContainer.style.display = 'grid';
        emptyState.style.display = 'none';
        escolasContainer.innerHTML = '';
        
        escolasData.forEach(escola => {
            const iniciais = escola.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            const escolaCard = document.createElement('div');
            escolaCard.className = 'escola-card';
            escolaCard.setAttribute('data-id', escola.id);
            
            escolaCard.innerHTML = `
                <div class="escola-header">
                    <div class="escola-avatar">${iniciais}</div>
                    <div class="escola-info">
                        <h3>${escola.nome}</h3>
                        <p>Rede ${escola.rede}</p>
                    </div>
                </div>
                <div class="escola-details">
                    <div class="detail-item">
                        <i class="fas fa-network-wired"></i>
                        <div>
                            <span class="escola-badge badge-${escola.rede.toLowerCase()}">${escola.rede}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <div>
                            <span class="escola-badge badge-${escola.zona.toLowerCase()}">${escola.zona}</span>
                        </div>
                    </div>
                </div>
                <div class="escola-actions">
                    <button class="action-btn-small edit-btn" onclick="editarEscola(${escola.id}, '${escola.nome}', '${escola.rede}', '${escola.zona}')">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="action-btn-small delete-btn" onclick="excluirEscola(${escola.id})">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            `;
            
            escolasContainer.appendChild(escolaCard);
        });
    }

    function atualizarEstatisticas() {
        const totalEscolas = escolasData.length;
        const redes = new Set(escolasData.map(e => e.rede)).size;
        const zonas = new Set(escolasData.map(e => e.zona)).size;
        
        document.getElementById('total-escolas').textContent = totalEscolas;
        document.getElementById('total-redes').textContent = redes;
        document.getElementById('total-zonas').textContent = zonas;
    }

    function renderizarEstatisticasComponentes() {
        const redesStats = {};
        escolasData.forEach(escola => {
            const rede = escola.rede;
            redesStats[rede] = (redesStats[rede] || 0) + 1;
        });

        const redesContainer = document.getElementById('redes-stats');
        if (redesContainer) {
            redesContainer.innerHTML = '';
            Object.entries(redesStats).forEach(([rede, count]) => {
                const statCard = document.createElement('div');
                statCard.className = 'stat-card';
                statCard.innerHTML = `
                    <div class="stat-info">
                        <span class="label">${rede}</span>
                        <span class="count">${count} escola${count > 1 ? 's' : ''}</span>
                    </div>
                `;
                redesContainer.appendChild(statCard);
            });
        }

        const zonasStats = {};
        escolasData.forEach(escola => {
            const zona = escola.zona;
            zonasStats[zona] = (zonasStats[zona] || 0) + 1;
        });

        const zonasContainer = document.getElementById('zonas-stats');
        if (zonasContainer) {
            zonasContainer.innerHTML = '';
            Object.entries(zonasStats).forEach(([zona, count]) => {
                const statCard = document.createElement('div');
                statCard.className = 'stat-card';
                statCard.innerHTML = `
                    <div class="stat-info">
                        <span class="label">${zona}</span>
                        <span class="count">${count} escola${count > 1 ? 's' : ''}</span>
                    </div>
                `;
                zonasContainer.appendChild(statCard);
            });
        }
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const data = {
            nome: document.getElementById('nome').value,
            rede: document.getElementById('rede').value,
            zona: document.getElementById('zona').value
        };
        
        try {
            const resp = await fetch('/api/escolas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (resp.status === 401) {
                mostrarNotificacao('Você precisa estar logado para cadastrar escolas', 'error');
                return;
            }
            
            if (resp.ok) {
                mostrarNotificacao('Escola cadastrada com sucesso!', 'success');
                form.reset();
                atualizarEscolas(1);
            } else {
                const error = await resp.json();
                mostrarNotificacao(error.message || 'Erro ao cadastrar escola', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            mostrarNotificacao('Erro ao cadastrar escola', 'error');
        }
    });

    editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const data = {
            nome: document.getElementById('edit-nome').value,
            rede: document.getElementById('edit-rede').value,
            zona: document.getElementById('edit-zona').value
        };
        
        try {
            const resp = await fetch(`/api/escolas/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (resp.ok) {
                mostrarNotificacao('Escola atualizada com sucesso!', 'success');
                closeEditModal();
                atualizarEscolas(paginaAtual);
            } else {
                const error = await resp.json();
                mostrarNotificacao(error.message || 'Erro ao atualizar escola', 'error');
            }
        } catch (error) {
            console.error('Erro:', error);
            mostrarNotificacao('Erro ao atualizar escola', 'error');
        }
    });

    atualizarEscolas(1);
});

function editarEscola(id, nome, rede, zona) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-nome').value = nome;
    document.getElementById('edit-rede').value = rede;
    document.getElementById('edit-zona').value = zona;
    document.getElementById('edit-modal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('active');
}

async function excluirEscola(id) {
    if (!confirm('Tem certeza que deseja excluir esta escola?')) {
        return;
    }
    
    try {
        const resp = await fetch(`/api/escolas/${id}`, {
            method: 'DELETE'
        });
        
        if (resp.ok) {
            mostrarNotificacao('Escola excluída com sucesso!', 'success');
            const container = document.getElementById('escolas-container');
            const escolaCard = container.querySelector(`[data-id="${id}"]`);
            if (escolaCard) {
                escolaCard.remove();
            }
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            const error = await resp.json();
            mostrarNotificacao(error.message || 'Erro ao excluir escola', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao excluir escola', 'error');
    }
}

function mostrarNotificacao(mensagem, tipo = 'info') {
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

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        const autoRemove = setTimeout(() => {
        removeNotification(notification);
    }, 4000);

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

function getTotalEscolas() {
    return document.getElementById('total-escolas').textContent || '0';
}

function getTotalRedes() {
    return document.getElementById('total-redes').textContent || '0';
}

function getTotalZonas() {
    return document.getElementById('total-zonas').textContent || '0';
}
