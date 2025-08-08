document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-turma');
    const tabela = document.getElementById('tabela-turmas').getElementsByTagName('tbody')[0];
    const escolaSelect = document.getElementById('escola');

    let paginaAtual = 1;
    let totalPaginas = 1;
    let turmaEditando = null;

    // Preenche options de Escolas automaticamente via AJAX
    async function carregarEscolas() {
        const resp = await fetch('/api/escolas');
        const data = await resp.json();
        const lista = data.escolas || data; // compatibilidade
        escolaSelect.innerHTML = '<option value="">Selecione a escola</option>';
        lista.forEach(e => {
            escolaSelect.innerHTML += `<option value="${e.id}">${e.nome}</option>`;
        });
    }

    // Atualiza tabela de turmas
    async function atualizarTabela(page = 1) {
        const escolaId = escolaSelect.value;
        let url = `/api/turmas?page=${page}&per_page=10`;
        if (escolaId) url += `&escola_id=${escolaId}`;
        const resp = await fetch(url);
        const data = await resp.json();
        const turmas = data.turmas || [];
        paginaAtual = data.page;
        totalPaginas = data.pages;
        tabela.innerHTML = '';
        turmas.forEach(t => {
            const escolaNome = escolaSelect.querySelector(`option[value="${t.escola_id}"]`)?.text || '';
            tabela.innerHTML += `
                <tr data-id="${t.id}">
                    <td>${t.nome}</td>
                    <td>${t.ano}</td>
                    <td>${escolaNome}</td>
                    <td>${t.turno}</td>
                    <td>
                        <button class="btn-edit" title="Editar Turma"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" title="Excluir Turma"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        renderPaginacao();
    }

    function renderPaginacao() {
        let paginacao = document.getElementById('paginacao-turmas');
        if (!paginacao) {
            paginacao = document.createElement('div');
            paginacao.id = 'paginacao-turmas';
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

    escolaSelect.addEventListener('change', () => atualizarTabela(1));

    carregarEscolas().then(() => atualizarTabela(1));

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = {
            nome: document.getElementById('nome').value,
            ano: document.getElementById('ano').value,
            escola_id: escolaSelect.value,
            turno: document.getElementById('turno').value
        };
        try {
            let resp, result;
            if (turmaEditando) {
                resp = await fetch(`/api/turmas/${turmaEditando}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                resp = await fetch('/api/turmas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            if (resp.status === 401) {
                mostrarModal('Você precisa estar logado para cadastrar ou editar turmas. Faça login novamente.');
                return;
            }
            result = await resp.json();
            if (result.success) {
                form.reset();
                turmaEditando = null;
                form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-save"></i> Salvar Turma';
                await atualizarTabela(paginaAtual);
                mostrarModal(turmaEditando ? 'Turma atualizada com sucesso!' : 'Turma cadastrada com sucesso!');
            } else {
                mostrarModal(result.error || 'Erro ao cadastrar/editar turma.');
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
            document.getElementById('nome').value = tds[0].innerText;
            document.getElementById('ano').value = tds[1].innerText;
            escolaSelect.value = Array.from(escolaSelect.options).find(opt => opt.text === tds[2].innerText)?.value || '';
            document.getElementById('turno').value = tds[3].innerText;
            turmaEditando = id;
            form.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-edit"></i> Atualizar Turma';
        }
        if (e.target.closest('.btn-delete')) {
            if (confirm('Tem certeza que deseja excluir esta turma?')) {
                try {
                    const resp = await fetch(`/api/turmas/${id}`, { method: 'DELETE' });
                    const result = await resp.json();
                    if (result.success) {
                        await atualizarTabela(paginaAtual);
                        mostrarModal('Turma excluída com sucesso!');
                    } else {
                        mostrarModal(result.error || 'Erro ao excluir turma.');
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

// Excluir turma
function excluirTurma(id){
    if(!confirm('Tem certeza?')) return;
    fetch(`/turmas/turma/${id}`, {method:'DELETE'})
    .then(r=>r.json())
    .then(data=>{
        if(data.success) window.location.reload();
        else alert(data.error);
    });
}