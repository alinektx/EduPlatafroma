// Verificar acesso a áreas restritas
document.addEventListener('DOMContentLoaded', function() {
    verificarAcessoUsuarios();
});

async function verificarAcessoUsuarios() {
    try {
        const response = await fetch('/verificar-acesso-usuarios');
        const data = await response.json();
        
        // Ocultar ou mostrar link de usuários baseado no acesso
        const linkUsuarios = document.querySelector('a[href="/usuarios"]');
        const menuUsuarios = document.querySelector('.menu-usuarios');
        
        if (!data.acesso) {
            // Usuário não tem acesso - ocultar completamente
            if (linkUsuarios) {
                linkUsuarios.style.display = 'none';
            }
            if (menuUsuarios) {
                menuUsuarios.style.display = 'none';
            }
            
            // Se estiver na página de usuários, redirecionar
            if (window.location.pathname === '/usuarios') {
                mostrarMensagemAcesso(data.motivo);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 3000);
            }
        } else {
            // Usuário tem acesso - mostrar com indicador especial
            if (linkUsuarios) {
                linkUsuarios.style.display = 'block';
                linkUsuarios.innerHTML = '<i class="fas fa-users-cog"></i> Gerenciar Usuários <span style="background: #ff6b6b; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 5px;">RESTRITO</span>';
            }
        }
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        // Em caso de erro, ocultar por segurança
        const linkUsuarios = document.querySelector('a[href="/usuarios"]');
        if (linkUsuarios) {
            linkUsuarios.style.display = 'none';
        }
    }
}

function mostrarMensagemAcesso(motivo) {
    // Criar modal de acesso negado
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            ">
                <div style="color: #ff6b6b; font-size: 4rem; margin-bottom: 15px;">
                    🚫
                </div>
                <h2 style="color: #333; margin-bottom: 15px;">Acesso Negado</h2>
                <p style="color: #666; margin-bottom: 20px;">${motivo}</p>
                <p style="color: #999; font-size: 0.9rem;">Redirecionando para o dashboard...</p>
                <div style="
                    width: 100%;
                    height: 4px;
                    background: #f0f0f0;
                    border-radius: 2px;
                    margin-top: 15px;
                    overflow: hidden;
                ">
                    <div style="
                        height: 100%;
                        background: #ff6b6b;
                        width: 0%;
                        animation: progress 3s linear forwards;
                    "></div>
                </div>
            </div>
        </div>
        <style>
            @keyframes progress {
                to { width: 100%; }
            }
        </style>
    `;
    
    document.body.appendChild(modal);
    
    // Remover modal após 3 segundos
    setTimeout(() => {
        modal.remove();
    }, 3000);
}

// Interceptar cliques no link de usuários
document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href="/usuarios"]');
    if (link) {
        e.preventDefault();
        verificarERedirecionarUsuarios();
    }
});

async function verificarERedirecionarUsuarios() {
    try {
        const response = await fetch('/verificar-acesso-usuarios');
        const data = await response.json();
        
        if (data.acesso) {
            window.location.href = '/usuarios';
        } else {
            mostrarMensagemAcesso(data.motivo);
        }
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        mostrarMensagemAcesso('Erro de conexão. Tente novamente.');
    }
} 