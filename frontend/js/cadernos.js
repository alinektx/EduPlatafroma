// Script para gerenciamento de Cadernos

document.addEventListener('DOMContentLoaded', function() {
    // Preencher o select de série
    const serieSelect = document.getElementById('serie-caderno');
    for (let i = 1; i <= 9; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i}º ano`;
        serieSelect.appendChild(option);
    }

    // Carregar cadernos existentes
    carregarCadernos();

    // Configurar evento do formulário de cadastro
    const formCadastro = document.getElementById('form-cadastro-caderno');
    formCadastro.addEventListener('submit', function(e) {
        e.preventDefault();
        cadastrarCaderno();
    });

    // Configurar evento para fechar detalhes
    document.getElementById('btn-fechar-detalhes').addEventListener('click', function() {
        document.getElementById('card-detalhes-caderno').style.display = 'none';
    });

    // Configurar evento para gerar cartões gabarito
    document.getElementById('btn-gerar-gabarito').addEventListener('click', function() {
        const cadernoId = this.dataset.cadernoId;
        if (cadernoId) {
            gerarCartoesGabarito(cadernoId);
        }
    });

    // Configurar busca
    const searchInput = document.getElementById('search-cadernos');
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const cadernoCards = document.querySelectorAll('.caderno-card');
        
        cadernoCards.forEach(card => {
            const titulo = card.querySelector('h3').textContent.toLowerCase();
            if (titulo.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Atualizar estatísticas iniciais
    atualizarEstatisticas();
});

// Função para carregar cadernos do servidor
function carregarCadernos() {
    fetch('/api/cadernos')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('cadernos-container');
            const emptyState = document.getElementById('empty-state');
            
            container.innerHTML = '';
            
            if (data.cadernos && data.cadernos.length > 0) {
                emptyState.style.display = 'none';
                
                data.cadernos.forEach(caderno => {
                    const card = criarCardCaderno(caderno);
                    container.appendChild(card);
                });
            } else {
                emptyState.style.display = 'block';
            }
            
            atualizarEstatisticas();
        })
        .catch(error => {
            console.error('Erro ao carregar cadernos:', error);
            const container = document.getElementById('cadernos-container');
            container.innerHTML = '<div class="error-message">Erro ao carregar cadernos. Tente novamente.</div>';
        });
}

// Função para criar um card de caderno
function criarCardCaderno(caderno) {
    const card = document.createElement('div');
    card.className = 'caderno-card';
    card.style.animationDelay = '0.1s';
    
    // Calcular total de questões
    const totalQuestoes = caderno.qtd_blocos * caderno.qtd_questoes_por_bloco;
    
    // Determinar status baseado nos blocos preenchidos
    const blocosPreenchidos = caderno.blocos ? caderno.blocos.filter(b => b.questoes_salvas > 0).length : 0;
    const progresso = caderno.qtd_blocos > 0 ? (blocosPreenchidos / caderno.qtd_blocos) * 100 : 0;
    
    let statusClass = 'status-pendente';
    let statusText = 'Pendente';
    if (progresso === 100) {
        statusClass = 'status-completo';
        statusText = 'Completo';
    } else if (progresso > 0) {
        statusClass = 'status-progresso';
        statusText = 'Em Progresso';
    }
    
    card.innerHTML = `
        <div class="caderno-header">
            <div class="caderno-icon">
                <i class="fas fa-book"></i>
            </div>
            <div class="caderno-info">
                <h3>${caderno.titulo}</h3>
                <p class="caderno-serie">${caderno.serie}º ano</p>
            </div>
            <div class="status-badge ${statusClass}">
                ${statusText}
            </div>
        </div>
        
        <div class="caderno-details">
            <div class="detail-item">
                <i class="fas fa-layer-group"></i>
                <span>${caderno.qtd_blocos} blocos</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-question-circle"></i>
                <span>${caderno.qtd_questoes_por_bloco} questões/bloco</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-calculator"></i>
                <span>${totalQuestoes} questões totais</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-chart-line"></i>
                <span>Progresso: ${Math.round(progresso)}%</span>
            </div>
        </div>
        
        <div class="progress-mini">
            <div class="progress-bar-mini" style="width: ${progresso}%"></div>
        </div>
        
        <div class="caderno-actions">
            <button onclick="verDetalhesCaderno(${caderno.id})" class="action-btn info-btn" title="Ver detalhes">
                <i class="fas fa-info-circle"></i>
                Detalhes
            </button>
            <button onclick="excluirCaderno(${caderno.id})" class="action-btn danger-btn" title="Excluir">
                <i class="fas fa-trash"></i>
                Excluir
            </button>
        </div>
    `;
    
    return card;
}

// Função para cadastrar um novo caderno
function cadastrarCaderno() {
    const titulo = document.getElementById('titulo-caderno').value;
    const serie = document.getElementById('serie-caderno').value;
    const qtdBlocos = document.getElementById('qtd-blocos').value;
    const qtdQuestoes = document.getElementById('qtd-questoes').value;
    
    const dados = {
        titulo: titulo,
        serie: serie,
        qtd_blocos: qtdBlocos,
        qtd_questoes_por_bloco: qtdQuestoes
    };
    
    // Adicionar feedback visual
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    
    fetch('/api/cadernos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Feedback de sucesso
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
            submitBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
            
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 2000);
            
            document.getElementById('form-cadastro-caderno').reset();
            carregarCadernos();
            
            // Mostrar notificação de sucesso
            mostrarNotificacao('Caderno criado com sucesso!', 'success');
        } else {
            throw new Error(data.error || 'Erro ao cadastrar caderno');
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        mostrarNotificacao(error.message, 'error');
    });
}

// Função para excluir um caderno
function excluirCaderno(id) {
    if (confirm('⚠️ Confirma a exclusão deste caderno?\n\nEsta ação não pode ser desfeita e excluirá todos os blocos e questões associados.')) {
        fetch(`/api/cadernos/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarNotificacao('Caderno excluído com sucesso!', 'success');
                carregarCadernos();
            } else {
                throw new Error(data.error || 'Erro ao excluir caderno');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            mostrarNotificacao(error.message, 'error');
        });
    }
}

// Função para ver detalhes de um caderno
function verDetalhesCaderno(id) {
    fetch(`/api/cadernos/${id}`)
        .then(response => response.json())
        .then(caderno => {
            const infoDiv = document.getElementById('detalhes-caderno-info');
            infoDiv.innerHTML = `
                <h3>${caderno.titulo}</h3>
                <div class="info-detalhes">
                    <p><i class="fas fa-graduation-cap"></i> <strong>Série:</strong> ${caderno.serie}º ano</p>
                    <p><i class="fas fa-layer-group"></i> <strong>Blocos:</strong> ${caderno.qtd_blocos}</p>
                    <p><i class="fas fa-question-circle"></i> <strong>Questões por Bloco:</strong> ${caderno.qtd_questoes_por_bloco}</p>
                    <p><i class="fas fa-calculator"></i> <strong>Total de Questões:</strong> ${caderno.qtd_blocos * caderno.qtd_questoes_por_bloco}</p>
                </div>
            `;
            
            const tabela = document.getElementById('tabela-blocos-caderno').querySelector('tbody');
            tabela.innerHTML = '';
            
            if (caderno.blocos && caderno.blocos.length > 0) {
            caderno.blocos.forEach(bloco => {
                const tr = document.createElement('tr');
                    const questoesSalvas = bloco.questoes_salvas || 0;
                    const statusBloco = questoesSalvas === bloco.total_questoes ? 
                        '<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Completo</span>' :
                        questoesSalvas > 0 ? 
                        `<span style="color: #ffc107;"><i class="fas fa-clock"></i> ${questoesSalvas}/${bloco.total_questoes}</span>` :
                        '<span style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Pendente</span>';
                    
                tr.innerHTML = `
                    <td>${bloco.ordem}</td>
                    <td>${bloco.componente}</td>
                    <td>${bloco.total_questoes}</td>
                    <td>
                            <button onclick="editarBlocoQuestoes(${bloco.id})" class="action-btn primary-btn" title="Editar questões">
                                <i class="fas fa-edit"></i>
                                Editar
                        </button>
                    </td>
                `;
                tabela.appendChild(tr);
            });
            } else {
                const tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="4" style="text-align: center; color: #888;">Nenhum bloco encontrado</td>';
                tabela.appendChild(tr);
            }
            
            // Mostrar o botão de gerar gabarito e associar o ID do caderno
            const btnGabarito = document.getElementById('btn-gerar-gabarito');
            btnGabarito.style.display = 'flex';
            btnGabarito.dataset.cadernoId = id;
            
            document.getElementById('card-detalhes-caderno').style.display = 'block';
            
            // Scroll suave para os detalhes
            document.getElementById('card-detalhes-caderno').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        })
        .catch(error => {
            console.error('Erro ao carregar detalhes:', error);
            mostrarNotificacao('Erro ao carregar detalhes do caderno', 'error');
        });
}

// Função para editar as questões de um bloco
function editarBlocoQuestoes(blocoId) {
    window.location.href = `/cadernos/bloco/${blocoId}`;
}

// Função para gerar cartões gabarito
function gerarCartoesGabarito(cadernoId) {
    // Mostrar modal de loading
    document.getElementById('modal-loading').style.display = 'flex';
    
    // Fazer requisição para gerar o PDF
    fetch(`/api/cadernos/${cadernoId}/cartoes-gabarito`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        }
        throw new Error('Erro ao gerar cartões gabarito');
    })
    .then(blob => {
        // Criar URL para download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cartoes-gabarito-caderno-${cadernoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        mostrarNotificacao('Cartões gabarito gerados com sucesso!', 'success');
    })
    .catch(error => {
        console.error('Erro ao gerar cartões gabarito:', error);
        mostrarNotificacao('Erro ao gerar cartões gabarito', 'error');
    })
    .finally(() => {
        // Esconder modal de loading
        document.getElementById('modal-loading').style.display = 'none';
    });
}

// Função para atualizar estatísticas
function atualizarEstatisticas() {
    fetch('/api/cadernos/estatisticas')
        .then(response => response.json())
        .then(data => {
            // Animar contadores
            animarContador('total-cadernos', data.total_cadernos || 0);
            animarContador('total-blocos', data.total_blocos || 0);
            animarContador('total-questoes', data.total_questoes || 0);
        })
        .catch(error => {
            console.error('Erro ao carregar estatísticas:', error);
            // Definir valores padrão em caso de erro
            document.getElementById('total-cadernos').textContent = '0';
            document.getElementById('total-blocos').textContent = '0';
            document.getElementById('total-questoes').textContent = '0';
        });
}

// Função para animar contadores
function animarContador(elementId, valorFinal) {
    const elemento = document.getElementById(elementId);
    const valorInicial = 0;
    const duracao = 1000; // 1 segundo
    const incremento = valorFinal / (duracao / 16); // 60 FPS
    
    let valorAtual = valorInicial;
    
    const timer = setInterval(() => {
        valorAtual += incremento;
        if (valorAtual >= valorFinal) {
            elemento.textContent = valorFinal;
            clearInterval(timer);
        } else {
            elemento.textContent = Math.floor(valorAtual);
        }
    }, 16);
}

// Função para mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remover notificação existente se houver
    const notificacaoExistente = document.querySelector('.notificacao');
    if (notificacaoExistente) {
        notificacaoExistente.remove();
    }
    
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    
    const icone = tipo === 'success' ? 'check-circle' : 
                  tipo === 'error' ? 'exclamation-triangle' : 'info-circle';
    
    notificacao.innerHTML = `
        <div class="notificacao-content">
            <i class="fas fa-${icone}"></i>
            <span>${mensagem}</span>
        </div>
        <button class="notificacao-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Adicionar estilos inline para a notificação
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#d4edda' : tipo === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${tipo === 'success' ? '#155724' : tipo === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${tipo === 'success' ? '#c3e6cb' : tipo === 'error' ? '#f5c6cb' : '#bee5eb'};
        border-radius: 8px;
        padding: 1rem;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notificacao);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (notificacao.parentElement) {
            notificacao.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notificacao.remove(), 300);
        }
    }, 5000);
}

// Adicionar CSS para animações das notificações
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
    
    .notificacao-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex: 1;
    }
    
    .notificacao-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        opacity: 0.7;
        transition: opacity 0.2s;
    }
    
    .notificacao-close:hover {
        opacity: 1;
    }
    
    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status-completo {
        background: #d4edda;
        color: #155724;
    }
    
    .status-progresso {
        background: #fff3cd;
        color: #856404;
    }
    
    .status-pendente {
        background: #f8d7da;
        color: #721c24;
    }
    
    .progress-mini {
        background: #e9ecef;
        border-radius: 10px;
        height: 6px;
        overflow: hidden;
        margin: 1rem 0;
    }
    
    .progress-bar-mini {
        background: linear-gradient(135deg, var(--primary), var(--text-secondary));
        height: 100%;
        border-radius: 10px;
        transition: width 0.3s ease;
    }
    
    .info-detalhes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.5rem;
        margin-top: 1rem;
    }
    
    .info-detalhes p {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
    }
    
    .info-detalhes i {
        color: var(--primary);
        width: 20px;
    }
`;
document.head.appendChild(style); 