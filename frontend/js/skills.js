document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('habilidade-form');
    const tabela = document.getElementById('tabela-habilidades').getElementsByTagName('tbody')[0];

    let paginaAtual = 1;
    let totalPaginas = 1;
    let habilidadeEditando = null;

    // Função para atualizar tabela de habilidades
    async function atualizarTabela(page = 1) {
        const resp = await fetch(`/api/habilidades?page=${page}&per_page=10`);
        const data = await resp.json();
        const habilidades = data.habilidades || [];
        paginaAtual = data.page;
        totalPaginas = data.pages;
        tabela.innerHTML = '';
        habilidades.forEach(h => {
            tabela.innerHTML += `
                <tr data-id="${h.id}">
                    <td>${h.codigo}</td>
                    <td>${h.componente}</td>
                    <td>${h.ano}</td>
                    <td>${h.descricao}</td>
                    <td>
                        <button class="btn-edit" title="Editar Habilidade"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" title="Excluir Habilidade"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        renderPaginacao();
    }

    function renderPaginacao() {
        let paginacao = document.getElementById('paginacao-habilidades');
        if (!paginacao) {
            paginacao = document.createElement('div');
            paginacao.id = 'paginacao-habilidades';
            paginacao.style.textAlign = 'center';
            paginacao.style.margin = '1rem 0';
            tabela.parentElement.appendChild(paginacao);
        }
        paginacao.innerHTML = `
            <button id="btn-anterior" ${paginaAtual <= 1 ? 'disabled' : ''}>Anterior</button>
            Página ${paginaAtual} de ${totalPaginas}
            <button id="btn-proxima" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>Próxima</button>
        `;
        document.getElementById('btn-anterior').onclick = () => atualizarTabela(paginaAtual - 1);
        document.getElementById('btn-proxima').onclick = () => atualizarTabela(paginaAtual + 1);
    }

    atualizarTabela();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            codigo: document.getElementById('codigo').value,
            componente: document.getElementById('componente').value,
            ano: document.getElementById('ano').value,
            descricao: document.getElementById('descricao').value
        };
        try {
            let resp, result;
            if (habilidadeEditando) {
                resp = await fetch(`/api/habilidades/${habilidadeEditando}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                resp = await fetch('/api/habilidades', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            if (resp.status === 401) {
                mostrarModal('Você precisa estar logado para cadastrar ou editar habilidades. Faça login novamente.');
                return;
            }
            result = await resp.json();
            if (result.success) {
                form.reset();
                habilidadeEditando = null;
                form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Habilidade';
                await atualizarTabela(paginaAtual);
                mostrarModal(habilidadeEditando ? 'Habilidade atualizada com sucesso!' : 'Habilidade cadastrada com sucesso!');
            } else {
                mostrarModal(result.error || 'Erro ao cadastrar/editar habilidade.');
            }
        } catch {
            mostrarModal('Erro ao conectar com o servidor.');
        }
    });

    tabela.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const id = tr.getAttribute('data-id');
        if (e.target.closest('.btn-edit')) {
            // Preencher formulário para edição
            const tds = tr.querySelectorAll('td');
            document.getElementById('codigo').value = tds[0].innerText;
            document.getElementById('componente').value = tds[1].innerText;
            document.getElementById('ano').value = tds[2].innerText;
            document.getElementById('descricao').value = tds[3].innerText;
            habilidadeEditando = id;
            form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-edit"></i> Atualizar Habilidade';
        }
        if (e.target.closest('.btn-delete')) {
            if (confirm('Tem certeza que deseja excluir esta habilidade?')) {
                try {
                    const resp = await fetch(`/api/habilidades/${id}`, { method: 'DELETE' });
                    const result = await resp.json();
                    if (result.success) {
                        await atualizarTabela(paginaAtual);
                        mostrarModal('Habilidade excluída com sucesso!');
                    } else {
                        mostrarModal(result.error || 'Erro ao excluir habilidade.');
                    }
                } catch {
                    mostrarModal('Erro ao conectar com o servidor.');
                }
            }
        }
    });
});

function mostrarModal(msg) {
    let modal = document.getElementById('modal-feedback');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-feedback';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.background = '#fff';
        modal.style.padding = '2rem 3rem';
        modal.style.borderRadius = '12px';
        modal.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
        modal.style.zIndex = '9999';
        modal.style.fontSize = '1.2rem';
        modal.style.textAlign = 'center';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<span>${msg}</span>`;
    modal.style.display = 'block';
    setTimeout(() => { modal.style.display = 'none'; }, 2000);
}

function formatarPlano(texto) {
    // ... (código existente permanece o mesmo) ...
}

// Função para baixar o plano como PDF
function downloadPlano() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Obter conteúdo do plano
    const content = document.querySelector('.plano-content').innerText;
    
    // Configurar documento
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    // Adicionar título
    doc.setFontSize(16);
    doc.text("Plano de Aula - EduPlataforma", 105, 15, null, null, 'center');
    doc.setFontSize(12);
    
    // Adicionar data
    const hoje = new Date();
    doc.text(`Gerado em: ${hoje.toLocaleDateString()}`, 15, 25);
    
    // Adicionar conteúdo
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 15, 35);
    
    // Salvar PDF
    doc.save(`plano-aula-${hoje.getTime()}.pdf`);
}

// Função para salvar o plano no banco de dados
async function salvarPlano() {
    const content = document.querySelector('.plano-content').innerText;
    
    try {
        const response = await fetch('/salvar-plano', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conteudo: content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Plano salvo com sucesso! Você pode acessá-lo na seção "Meus Planos".');
        } else {
            alert('Erro ao salvar plano: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}