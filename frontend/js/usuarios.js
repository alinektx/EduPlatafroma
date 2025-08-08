// Variáveis globais
let usuarios = [];
let usuarioEditando = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarUsuarios();
    carregarEstatisticas();
    
    // Adicionar máscara ao campo WhatsApp
    const whatsappInput = document.getElementById('usuario-whatsapp');
    if (whatsappInput) {
        whatsappInput.addEventListener('input', aplicarMascaraWhatsApp);
    }
});

// Carregar lista de usuários
async function carregarUsuarios() {
    try {
        const response = await fetch('/api/usuarios');
        const data = await response.json();
        
        if (data.success) {
            usuarios = data.usuarios;
            renderizarUsuarios(usuarios);
        } else {
            mostrarNotificacao(data.error || 'Erro ao carregar usuários', 'error');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão ao carregar usuários', 'error');
        console.error('Erro:', error);
    }
}

// Carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch('/api/usuarios/estatisticas');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.estatisticas;
            document.getElementById('total-usuarios').textContent = stats.total;
            document.getElementById('usuarios-ativos').textContent = stats.ativos;
            document.getElementById('usuarios-admins').textContent = stats.admins;
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// Renderizar tabela de usuários
function renderizarUsuarios(usuariosParaRenderizar) {
    const tbody = document.getElementById('usuarios-tbody');
    
    if (usuariosParaRenderizar.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Nenhum usuário encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = usuariosParaRenderizar.map(usuario => `
        <tr>
            <td>
                <div class="user-info">
                    <strong>${usuario.name}</strong>
                    ${usuario.is_current_user ? '<span class="badge current-user">Você</span>' : ''}
                </div>
            </td>
            <td>${usuario.email}</td>
            <td>
                ${usuario.whatsapp ? 
                    `<i class="fab fa-whatsapp" style="color: #25D366; margin-right: 5px;"></i>${usuario.whatsapp}` : 
                    '-'
                }
            </td>
            <td>
                <span class="tipo-badge ${usuario.tipo_usuario}">
                    ${usuario.tipo_usuario === 'admin' ? 'Administrador' : 'Usuário Normal'}
                </span>
            </td>
            <td>
                <span class="status-badge ${usuario.ativo ? 'ativo' : 'inativo'}">
                    ${usuario.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action edit" onclick="editarUsuario(${usuario.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!usuario.is_current_user ? `
                        <button class="btn-action toggle" onclick="toggleStatusUsuario(${usuario.id})" title="${usuario.ativo ? 'Desativar' : 'Ativar'}">
                            <i class="fas fa-${usuario.ativo ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn-action delete" onclick="excluirUsuario(${usuario.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Abrir modal para novo usuário
function abrirModalNovoUsuario() {
    usuarioEditando = null;
    document.getElementById('modal-titulo').textContent = 'Novo Usuário';
    document.getElementById('form-usuario').reset();
    document.getElementById('usuario-id').value = '';
    document.getElementById('senha-obrigatoria').style.display = 'inline';
    document.getElementById('senha-info').style.display = 'none';
    document.getElementById('usuario-senha').required = true;
    document.getElementById('modal-usuario').style.display = 'block';
}

// Editar usuário
function editarUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;
    
    usuarioEditando = usuario;
    document.getElementById('modal-titulo').textContent = 'Editar Usuário';
    document.getElementById('usuario-id').value = usuario.id;
    document.getElementById('usuario-nome').value = usuario.name;
    document.getElementById('usuario-email').value = usuario.email;
    document.getElementById('usuario-escola').value = usuario.school || '';
    document.getElementById('usuario-whatsapp').value = usuario.whatsapp || '';
    document.getElementById('usuario-tipo').value = usuario.tipo_usuario;
    document.getElementById('usuario-ativo').checked = usuario.ativo;
    document.getElementById('usuario-senha').value = '';
    document.getElementById('senha-obrigatoria').style.display = 'none';
    document.getElementById('senha-info').style.display = 'block';
    document.getElementById('usuario-senha').required = false;
    document.getElementById('modal-usuario').style.display = 'block';
}

// Salvar usuário
async function salvarUsuario(event) {
    event.preventDefault();
    
    // Validar formato do WhatsApp se fornecido
    const whatsapp = document.getElementById('usuario-whatsapp').value;
    if (whatsapp && !validarWhatsApp(whatsapp)) {
        mostrarNotificacao('Formato de WhatsApp inválido. Use: (DDD) 99999-9999', 'error');
        return;
    }
    
    const formData = {
        name: document.getElementById('usuario-nome').value,
        email: document.getElementById('usuario-email').value,
        school: document.getElementById('usuario-escola').value,
        whatsapp: whatsapp,
        tipo_usuario: document.getElementById('usuario-tipo').value,
        ativo: document.getElementById('usuario-ativo').checked
    };
    
    const senha = document.getElementById('usuario-senha').value;
    if (senha) {
        formData.password = senha;
    }
    
    try {
        const usuarioId = document.getElementById('usuario-id').value;
        const url = usuarioId ? `/api/usuarios/${usuarioId}` : '/api/usuarios';
        const method = usuarioId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            fecharModal();
            carregarUsuarios();
            carregarEstatisticas();
        } else {
            mostrarNotificacao(data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão ao salvar usuário', 'error');
        console.error('Erro:', error);
    }
}

// Toggle status do usuário
async function toggleStatusUsuario(id) {
    try {
        const response = await fetch(`/api/usuarios/${id}/toggle-status`, {
            method: 'PATCH'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarUsuarios();
            carregarEstatisticas();
        } else {
            mostrarNotificacao(data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão', 'error');
        console.error('Erro:', error);
    }
}

// Excluir usuário
function excluirUsuario(id) {
    const usuario = usuarios.find(u => u.id === id);
    if (!usuario) return;
    
    if (confirm(`Tem certeza que deseja excluir o usuário "${usuario.name}"?\n\nEsta ação não pode ser desfeita.`)) {
        executarExclusaoUsuario(id);
    }
}

// Executar exclusão
async function executarExclusaoUsuario(id) {
    try {
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            mostrarNotificacao(data.message, 'success');
            carregarUsuarios();
            carregarEstatisticas();
        } else {
            mostrarNotificacao(data.error, 'error');
        }
    } catch (error) {
        mostrarNotificacao('Erro de conexão ao excluir usuário', 'error');
        console.error('Erro:', error);
    }
}

// Fechar modal
function fecharModal() {
    document.getElementById('modal-usuario').style.display = 'none';
    usuarioEditando = null;
}

// Filtrar usuários
function filtrarUsuarios() {
    const tipoFiltro = document.getElementById('filtro-tipo')?.value || '';
    const statusFiltro = document.getElementById('filtro-status')?.value || '';
    const buscaFiltro = document.getElementById('filtro-busca')?.value.toLowerCase() || '';
    
    let usuariosFiltrados = usuarios.filter(usuario => {
        const matchTipo = !tipoFiltro || usuario.tipo_usuario === tipoFiltro;
        const matchStatus = !statusFiltro || usuario.ativo.toString() === statusFiltro;
        const matchBusca = !buscaFiltro || 
            usuario.name.toLowerCase().includes(buscaFiltro) ||
            usuario.email.toLowerCase().includes(buscaFiltro);
        
        return matchTipo && matchStatus && matchBusca;
    });
    
    renderizarUsuarios(usuariosFiltrados);
}

// Função para aplicar máscara no campo WhatsApp
function aplicarMascaraWhatsApp(event) {
    let value = event.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
    
    if (value.length <= 2) {
        value = `(${value}`;
    } else if (value.length <= 7) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length <= 11) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
    }
    
    event.target.value = value;
}

// Função para validar formato do WhatsApp
function validarWhatsApp(whatsapp) {
    // Validar formato (DDD) 99999-9999
    const regex = /^\(\d{2}\) \d{5}-\d{4}$/;
    return regex.test(whatsapp);
}

// Função para mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = `notification ${tipo}`;
    notificacao.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${mensagem}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Adicionar estilos se não existirem
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem;
                border-radius: 8px;
                color: white;
                z-index: 1001;
                min-width: 300px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                animation: slideIn 0.3s ease;
            }
            .notification.success { background: #2ecc71; }
            .notification.error { background: #e74c3c; }
            .notification.info { background: #3498db; }
            .notification-content { display: flex; align-items: center; }
            .notification-content i { margin-right: 0.5rem; }
            .notification-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: 1rem;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Adicionar ao DOM
    document.body.appendChild(notificacao);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
        if (notificacao.parentElement) {
            notificacao.remove();
        }
    }, 5000);
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modal-usuario');
    if (event.target === modal) {
        fecharModal();
    }
} 