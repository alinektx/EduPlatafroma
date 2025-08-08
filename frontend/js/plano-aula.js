document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('plano-form');
    const resultadoDiv = document.getElementById('resultado-plano');
    const listaPlanosDiv = document.getElementById('planos-grid');
    const habilidadeSelect = document.getElementById('habilidade');
    const habilidadeInfo = document.getElementById('habilidade-info');
    const componenteSelect = document.getElementById('componente');
    const anoInput = document.getElementById('ano');
    const temaInput = document.getElementById('tema');
    const habilidadesTextarea = document.getElementById('habilidades');
    const objetivosTextarea = document.getElementById('objetivos');
    const submitButton = form.querySelector('button[type="submit"]');
    
    let planoGerado = null;  // Armazenar o plano gerado
    let habilidadesDisponiveis = []; // Armazenar todas as habilidades

    // Carregar habilidades e histórico ao abrir a página
    carregarHabilidades();
    
    // Carregar histórico apenas se os elementos existirem
    setTimeout(() => {
        carregarHistoricoPlanos();
    }, 100);

    // Event listener para mudança na seleção de habilidade
    habilidadeSelect.addEventListener('change', function() {
        const habilidadeId = this.value;
        if (habilidadeId) {
            preencherCamposAutomaticamente(habilidadeId);
        } else {
            limparCampos();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validar formulário
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        // Mostrar loader
        const resultadoSection = document.getElementById('resultado-section');
        resultadoSection.style.display = 'block';
        resultadoDiv.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="loader" style="display: inline-block; margin-bottom: 1rem;"></div>
                <p><strong>Gerando plano de aula...</strong></p>
                <small>Isso pode levar alguns segundos. Por favor, aguarde.</small>
            </div>
        `;
        
        try {
            const formData = {
                componente: componenteSelect.value,
                ano: anoInput.value,
                tema: temaInput.value,
                habilidades: habilidadesTextarea.value,
                objetivos: objetivosTextarea.value
            };
            
            const response = await fetch('/gerar-plano', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                planoGerado = data.plano;  // Salvar o plano gerado
                
                // Verificar se há aviso (modo fallback)
                let avisoHtml = '';
                if (data.aviso) {
                    avisoHtml = `
                        <div class="alert alert-info" style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 0.8rem; margin-bottom: 1rem; color: #0056b3;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Informação:</strong> ${data.aviso}
                        </div>
                    `;
                }
                
                // Debug para verificar o conteúdo do plano
                console.log('Plano recebido (tamanho):', data.plano ? data.plano.length : 0, 'caracteres');
                console.log('Plano recebido (início):', data.plano ? data.plano.substring(0, 200) + '...' : 'Vazio');
                console.log('Plano recebido (final):', data.plano ? '...' + data.plano.substring(data.plano.length - 200) : 'Vazio');
                console.log('Plano formatado (tamanho):', formatarPlano(data.plano).length, 'caracteres');
                
                resultadoDiv.innerHTML = `
                    <div class="plano-gerado">
                        <h2 style="color: #2c3e50; margin-bottom: 1rem;"><i class="fas fa-file-alt"></i> Plano de Aula Gerado${data.tipo === 'modelo' ? ' (Modelo Educacional)' : ' (IA)'}</h2>
                        ${avisoHtml}
                        <div class="plano-content" style="background: white; color: #2c3e50; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            ${formatarPlano(data.plano)}
                        </div>
                        <div class="acoes-plano" style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
                            <button id="btn-download-plano" class="action-btn primary-btn" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-download"></i> Baixar PDF
                            </button>
                            <button id="btn-salvar-plano" class="action-btn secondary-btn" style="background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;">
                                <i class="fas fa-save"></i> Salvar Plano
                            </button>
                        </div>
                    </div>
                `;
                
                // Adicionar event listeners aos botões
                document.getElementById('btn-download-plano').addEventListener('click', downloadPDF);
                document.getElementById('btn-salvar-plano').addEventListener('click', salvarPlano);
                
                // Scroll suave para o resultado
                resultadoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
            } else {
                resultadoDiv.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i> 
                        <strong>Erro:</strong> ${data.error || 'Falha ao gerar plano de aula'}
                        <br><br>
                        <strong>Dicas para resolver:</strong>
                        <ul style="text-align: left; margin-top: 0.5rem;">
                            <li>Verifique se selecionou uma habilidade BNCC</li>
                            <li>Certifique-se de que todos os campos estão preenchidos</li>
                            <li>Recarregue a página e tente novamente</li>
                            <li>Verifique sua conexão com a internet</li>
                        </ul>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro:', error);
            resultadoDiv.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i> 
                    <strong>Erro de conexão:</strong> Não foi possível conectar com o servidor. 
                    Verifique sua conexão e tente novamente.
                </div>
            `;
        }
    });

    async function carregarHabilidades() {
        try {
            habilidadeSelect.innerHTML = '<option value="">Carregando habilidades...</option>';
            
            const response = await fetch('/api/habilidades');
            if (!response.ok) {
                if (response.status === 401) {
                    habilidadeSelect.innerHTML = '<option value="">Sessão expirada. Faça login novamente.</option>';
                    return;
                }
                throw new Error('Erro ao carregar habilidades');
            }
            
            const data = await response.json();
            habilidadesDisponiveis = data.habilidades || [];
            
            if (habilidadesDisponiveis.length === 0) {
                habilidadeSelect.innerHTML = '<option value="">Nenhuma habilidade cadastrada</option>';
                return;
            }
            
            // Preencher o select com as habilidades
            habilidadeSelect.innerHTML = '<option value="">Selecione uma habilidade BNCC</option>';
            
            // Agrupar por componente e ano para melhor organização
            const habilidadesPorComponente = {};
            habilidadesDisponiveis.forEach(hab => {
                const key = `${hab.componente} - ${hab.ano}º ano`;
                if (!habilidadesPorComponente[key]) {
                    habilidadesPorComponente[key] = [];
                }
                habilidadesPorComponente[key].push(hab);
            });
            
            // Criar optgroups organizados
            Object.keys(habilidadesPorComponente).sort().forEach(grupo => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = grupo;
                
                habilidadesPorComponente[grupo].forEach(hab => {
                    const option = document.createElement('option');
                    option.value = hab.id;
                    option.textContent = `${hab.codigo} - ${hab.descricao.substring(0, 80)}${hab.descricao.length > 80 ? '...' : ''}`;
                    optgroup.appendChild(option);
                });
                
                habilidadeSelect.appendChild(optgroup);
            });
            
        } catch (error) {
            console.error('Erro ao carregar habilidades:', error);
            habilidadeSelect.innerHTML = '<option value="">Erro ao carregar habilidades</option>';
        }
    }

    function preencherCamposAutomaticamente(habilidadeId) {
        const habilidade = habilidadesDisponiveis.find(h => h.id == habilidadeId);
        if (!habilidade) return;
        
        // Preencher informações da habilidade
        habilidadeInfo.style.display = 'block';
        habilidadeInfo.innerHTML = `
            <strong>Código:</strong> ${habilidade.codigo}<br>
            <strong>Componente:</strong> ${habilidade.componente}<br>
            <strong>Ano:</strong> ${habilidade.ano}º ano<br>
            <strong>Etapa:</strong> ${habilidade.etapa}
        `;
        
        // Preencher campos automaticamente
        componenteSelect.innerHTML = `<option value="${habilidade.componente}" selected>${habilidade.componente}</option>`;
        componenteSelect.value = habilidade.componente;
        
        anoInput.value = habilidade.ano;
        
        // Gerar tema baseado na descrição da habilidade
        const tema = gerarTemaAula(habilidade.descricao);
        temaInput.value = tema;
        
        // Preencher habilidade completa
        habilidadesTextarea.value = `${habilidade.codigo} - ${habilidade.descricao}`;
        
        // Usar a descrição da habilidade como base para os objetivos
        objetivosTextarea.value = `Ao final da aula, o aluno deverá ser capaz de: ${habilidade.descricao.toLowerCase()}`;
        
        // Habilitar campos e botão
        componenteSelect.disabled = false;
        anoInput.disabled = false;
        temaInput.disabled = false;
        habilidadesTextarea.disabled = false;
        objetivosTextarea.disabled = false;
        submitButton.disabled = false;
        
        // Permitir edição do tema e objetivos
        temaInput.disabled = false;
        objetivosTextarea.disabled = false;
    }

    function limparCampos() {
        habilidadeInfo.style.display = 'none';
        
        componenteSelect.innerHTML = '<option value="">Será preenchido automaticamente</option>';
        componenteSelect.disabled = true;
        
        anoInput.value = '';
        anoInput.disabled = true;
        
        temaInput.value = '';
        temaInput.disabled = true;
        
        habilidadesTextarea.value = '';
        habilidadesTextarea.disabled = true;
        
        objetivosTextarea.value = '';
        objetivosTextarea.disabled = true;
        
        submitButton.disabled = true;
    }

    function gerarTemaAula(descricaoHabilidade) {
        // Extrair palavras-chave da descrição para gerar um tema
        const palavrasChave = descricaoHabilidade
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(' ')
            .filter(palavra => palavra.length > 3)
            .slice(0, 3);
        
        // Criar um tema baseado nas palavras-chave
        if (palavrasChave.length > 0) {
            return palavrasChave
                .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
                .join(' e ');
        }
        
        return 'Tema baseado na habilidade selecionada';
    }

    async function carregarHistoricoPlanos() {
        try {
            // Corrigir para o elemento correto
            const planosGrid = document.getElementById('planos-grid');
            const emptyState = document.getElementById('empty-planos');
            
            if (!planosGrid) {
                console.log('Elemento planos-grid não encontrado - página pode não estar totalmente carregada');
                return;
            }
            
            const resp = await fetch('/api/planos-aula');
            if (!resp.ok) {
                if (resp.status === 401) {
                    planosGrid.innerHTML = `
                        <div class="auth-required" style="text-align: center; padding: 2rem; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; color: #856404;">
                            <i class="fas fa-lock" style="font-size: 2rem; margin-bottom: 1rem; color: #f39c12;"></i>
                            <h3>Acesso Restrito</h3>
                            <p>Para ver seus planos salvos, é necessário fazer login.</p>
                            <a href="/login" class="btn btn-primary" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                                <i class="fas fa-sign-in-alt"></i> Fazer Login
                            </a>
                        </div>
                    `;
                    return;
                }
                throw new Error('Erro ao buscar planos');
            }
            
            const data = await resp.json();
            console.log('Dados recebidos da API:', data);
            
            // Corrigir: A API retorna { success: true, planos: [...] }
            const planos = data.planos || [];
            
            if (planos.length === 0) {
                planosGrid.innerHTML = '';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }
            
            if (emptyState) emptyState.style.display = 'none';
            planosGrid.innerHTML = '';
            
            planos.forEach(p => {
                const card = document.createElement('div');
                card.className = 'plano-card';
                
                // Extrair data formatada
                const dataFormatada = new Date(p.criado_em).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                });
                
                // Extrair preview do conteúdo (texto limpo, sem HTML/Markdown)
                const conteudoLimpo = p.conteudo
                    .replace(/#{1,6}\s/g, '') // Remove cabeçalhos markdown
                    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove negrito
                    .replace(/\*(.*?)\*/g, '$1') // Remove itálico
                    .replace(/\n/g, ' ') // Remove quebras de linha
                    .replace(/\s+/g, ' ') // Remove espaços duplos
                    .trim();
                
                const preview = conteudoLimpo.length > 150 ? 
                    conteudoLimpo.substring(0, 150) + '...' : conteudoLimpo;
                
                card.innerHTML = `
                    <div class="plano-header">
                        <div class="plano-codigo">
                            <span class="codigo-badge">ID ${p.id}</span>
                        </div>
                        <div class="plano-actions">
                            <button class="action-btn view-btn" title="Visualizar plano" data-id="${p.id}" data-titulo="${p.titulo.replace(/"/g, '&quot;')}" data-conteudo="${encodeURIComponent(p.conteudo)}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit-btn" title="Editar plano" data-id="${p.id}" data-titulo="${p.titulo.replace(/"/g, '&quot;')}" data-conteudo="${encodeURIComponent(p.conteudo)}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn download-btn" title="Baixar PDF" data-titulo="${p.titulo.replace(/"/g, '&quot;')}" data-conteudo="${encodeURIComponent(p.conteudo)}">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="action-btn delete-btn" title="Excluir plano" data-id="${p.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="plano-info">
                        <div class="plano-titulo">
                            ${p.titulo}
                        </div>
                        
                        <div class="plano-meta">
                            <div class="meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>${dataFormatada}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-book"></i>
                                <span>${p.componente || 'Plano de Aula'}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-graduation-cap"></i>
                                <span>${p.ano || 'Geral'}</span>
                            </div>
                        </div>
                        
                        <div class="plano-description">
                            ${preview}
                        </div>
                    </div>
                `;
                
                // Adicionar event listeners para os novos botões
                const btnVisualizar = card.querySelector('.view-btn');
                const btnEditar = card.querySelector('.edit-btn');
                const btnDownload = card.querySelector('.download-btn');
                const btnExcluir = card.querySelector('.delete-btn');
                
                if (btnVisualizar) {
                    btnVisualizar.addEventListener('click', () => {
                        const id = btnVisualizar.getAttribute('data-id');
                        const titulo = btnVisualizar.getAttribute('data-titulo');
                        const conteudo = decodeURIComponent(btnVisualizar.getAttribute('data-conteudo'));
                        abrirEditorPlano(id, titulo, conteudo);
                    });
                }
                
                if (btnEditar) {
                    btnEditar.addEventListener('click', () => {
                        const id = btnEditar.getAttribute('data-id');
                        const titulo = btnEditar.getAttribute('data-titulo');
                        const conteudo = decodeURIComponent(btnEditar.getAttribute('data-conteudo'));
                        abrirEditorPlano(id, titulo, conteudo);
                    });
                }
                
                if (btnDownload) {
                    btnDownload.addEventListener('click', () => {
                        const titulo = btnDownload.getAttribute('data-titulo');
                        const conteudo = decodeURIComponent(btnDownload.getAttribute('data-conteudo'));
                        baixarPlanoComoPDF(titulo, conteudo);
                    });
                }
                
                if (btnExcluir) {
                    btnExcluir.addEventListener('click', async () => {
                        if (confirm('Tem certeza que deseja excluir este plano de aula?\n\nEsta ação não pode ser desfeita.')) {
                            try {
                                const id = btnExcluir.getAttribute('data-id');
                                const response = await fetch(`/api/planos-aula/${id}`, {
                                    method: 'DELETE'
                                });
                                
                                if (response.ok) {
                                    mostrarToast('Plano excluído com sucesso!', 'success');
                                    carregarHistoricoPlanos(); // Recarregar lista
                                } else {
                                    mostrarToast('Erro ao excluir plano', 'error');
                                }
                            } catch (error) {
                                console.error('Erro ao excluir plano:', error);
                                mostrarToast('Erro ao excluir plano', 'error');
                            }
                        }
                    });
                }
                
                planosGrid.appendChild(card);
            });
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
            const planosGrid = document.getElementById('planos-grid');
            if (planosGrid) {
                planosGrid.innerHTML = '<p class="error">Erro ao carregar histórico de planos. Tente recarregar a página.</p>';
            }
        }
    }


});

// Variável global para controlar o plano sendo editado
let planoEditandoAtual = null;

// Função para abrir o editor do plano (Word-like)
function abrirEditorPlano(id, titulo, conteudo) {
    // Salvar informações do plano atual
    planoEditandoAtual = {
        id: id,
        titulo: titulo,
        conteudoOriginal: conteudo
    };
    
    // Obter elementos do modal
    const modal = document.getElementById('modal-editor-plano');
    const modalTitulo = modal.querySelector('.modal-header h2');
    const editorConteudo = document.getElementById('editor-conteudo');
    
    // Configurar título do modal
    modalTitulo.innerHTML = `<i class="fas fa-edit"></i> Editando: ${titulo}`;
    
    // Obter nome do usuário
    const nomeUsuario = window.userName || 'Professor';
    
    // Adicionar cabeçalho se ainda não existir
    const conteudoComCabecalho = adicionarCabecalhoPlano(conteudo, nomeUsuario);
    
    // Converter markdown para HTML e carregar no editor
    const conteudoHTML = converterMarkdownParaHTML(conteudoComCabecalho);
    editorConteudo.innerHTML = conteudoHTML;
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Focar no editor
    editorConteudo.focus();
    
    console.log('Editor aberto para plano ID:', id);
}

// Função para converter Markdown básico para HTML editável
function converterMarkdownParaHTML(markdown) {
    let html = markdown
        // Tratar separador especial (---)
        .replace(/^---$/gm, '<hr>')
        
        // Títulos
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        
        // Negrito e itálico
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // Listas
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        
        // Quebras de linha duplas para parágrafos
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Envolver em parágrafos se não começar com título, lista ou HR
    if (!html.startsWith('<h') && !html.startsWith('<li') && !html.startsWith('<hr')) {
        html = `<p>${html}</p>`;
    }
    
    // Processar listas
    html = html.replace(/(<li>.*?<\/li>)(\s*<br>\s*<li>.*?<\/li>)*/g, function(match) {
        const items = match.replace(/<br>\s*/g, '').replace(/\s*$/, '');
        return `<ul>${items}</ul>`;
    });
    
    return html;
}

// Função para fechar o modal do editor
function fecharModalEditor() {
    const modal = document.getElementById('modal-editor-plano');
    modal.style.display = 'none';
    planoEditandoAtual = null;
}

// Função para formatar texto no editor
function formatarTexto(comando) {
    document.execCommand(comando, false, null);
    document.getElementById('editor-conteudo').focus();
}

// Função para salvar as alterações do plano
async function salvarPlanoEditado() {
    if (!planoEditandoAtual) {
        mostrarToast('Erro: Nenhum plano está sendo editado', 'error');
        return;
    }
    
    try {
        const editorConteudo = document.getElementById('editor-conteudo');
        const conteudoHTML = editorConteudo.innerHTML;
        
        // Converter HTML de volta para Markdown
        const conteudoMarkdown = converterHTMLParaMarkdown(conteudoHTML);
        
        // Fazer requisição para salvar
        const response = await fetch(`/api/planos-aula/${planoEditandoAtual.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                titulo: planoEditandoAtual.titulo,
                conteudo: conteudoMarkdown
            })
        });
        
        if (response.ok) {
            mostrarToast('Plano atualizado com sucesso!', 'success');
            fecharModalEditor();
            // Recarregar a lista de planos
            setTimeout(() => {
                carregarHistoricoPlanos();
            }, 1000);
        } else {
            const errorData = await response.json();
            mostrarToast(`Erro ao salvar: ${errorData.error || 'Erro desconhecido'}`, 'error');
        }
        
    } catch (error) {
        console.error('Erro ao salvar plano:', error);
        mostrarToast('Erro ao salvar plano. Tente novamente.', 'error');
    }
}

// Função para baixar o plano editado como PDF
function baixarPlanoEditado() {
    if (!planoEditandoAtual) {
        mostrarToast('Erro: Nenhum plano está sendo editado', 'error');
        return;
    }
    
    try {
        const editorConteudo = document.getElementById('editor-conteudo');
        const conteudoHTML = editorConteudo.innerHTML;
        
        // Obter nome do usuário
        const nomeUsuario = window.userName || 'Professor';
        
        // Abrir nova janela para impressão/PDF
        const janelaImpressao = window.open('', '_blank');
        janelaImpressao.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${planoEditandoAtual.titulo}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 40px;
                        color: #333;
                    }
                    .cabecalho-plano {
                        text-align: center;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 3px solid #457D97;
                    }
                    .nome-professor {
                        font-size: 1.2rem;
                        font-weight: bold;
                        color: #457D97;
                        margin-bottom: 10px;
                    }
                    .marca-plataforma {
                        font-size: 1rem;
                        color: #666;
                        font-style: italic;
                    }
                    h1 {
                        color: #457D97;
                        border-bottom: 3px solid #457D97;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    h2, h3, h4 {
                        color: #457D97;
                        margin-top: 25px;
                        margin-bottom: 10px;
                    }
                    p {
                        margin-bottom: 15px;
                        text-align: justify;
                    }
                    ul, ol {
                        margin-bottom: 15px;
                        padding-left: 30px;
                    }
                    li {
                        margin-bottom: 5px;
                    }
                    strong {
                        color: #2c3e50;
                    }
                    @media print {
                        body { margin: 20px; }
                        h1 { page-break-after: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="cabecalho-plano">
                    <div class="nome-professor">${nomeUsuario}</div>
                    <div class="marca-plataforma">Plano de aula gerado por EduPlataforma</div>
                </div>
                <h1>${planoEditandoAtual.titulo}</h1>
                ${conteudoHTML}
            </body>
            </html>
        `);
        
        janelaImpressao.document.close();
        
        // Aguardar carregamento e abrir diálogo de impressão
        setTimeout(() => {
            janelaImpressao.print();
        }, 250);
        
        mostrarToast('PDF gerado! Use Ctrl+P ou Cmd+P para salvar como PDF', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        mostrarToast('Erro ao gerar PDF. Tente novamente.', 'error');
    }
}

// Função para converter HTML de volta para Markdown
function converterHTMLParaMarkdown(html) {
    let markdown = html
        // Separador
        .replace(/<hr\s*\/?>/g, '---\n\n')
        
        // Títulos
        .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
        .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
        
        // Negrito e itálico
        .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
        .replace(/<em>(.*?)<\/em>/g, '*$1*')
        
        // Listas
        .replace(/<ul>(.*?)<\/ul>/gs, function(match, content) {
            return content.replace(/<li>(.*?)<\/li>/g, '- $1\n') + '\n';
        })
        .replace(/<ol>(.*?)<\/ol>/gs, function(match, content) {
            let counter = 1;
            return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1\n`) + '\n';
        })
        
        // Parágrafos e quebras
        .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
        .replace(/<br\s*\/?>/g, '\n')
        
        // Limpar tags HTML restantes
        .replace(/<[^>]*>/g, '')
        
        // Limpar espaços extras
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    
    return markdown;
}

// Função para baixar plano como PDF (botão amarelo dos cards)
function baixarPlanoComoPDF(titulo, conteudo) {
    try {
        // Obter nome do usuário
        const nomeUsuario = window.userName || 'Professor';
        
        // Adicionar cabeçalho personalizado ao conteúdo
        const conteudoComCabecalho = adicionarCabecalhoPlano(conteudo, nomeUsuario);
        
        // Converter markdown para HTML
        const conteudoHTML = converterMarkdownParaHTML(conteudoComCabecalho);
        
        // Abrir nova janela para impressão/PDF
        const janelaImpressao = window.open('', '_blank');
        janelaImpressao.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${titulo}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 40px;
                        color: #333;
                    }
                    .cabecalho-plano {
                        text-align: center;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 3px solid #457D97;
                    }
                    .nome-professor {
                        font-size: 1.2rem;
                        font-weight: bold;
                        color: #457D97;
                        margin-bottom: 10px;
                    }
                    .marca-plataforma {
                        font-size: 1rem;
                        color: #666;
                        font-style: italic;
                    }
                    h1 {
                        color: #457D97;
                        border-bottom: 3px solid #457D97;
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    h2, h3, h4 {
                        color: #457D97;
                        margin-top: 25px;
                        margin-bottom: 10px;
                    }
                    p {
                        margin-bottom: 15px;
                        text-align: justify;
                    }
                    ul, ol {
                        margin-bottom: 15px;
                        padding-left: 30px;
                    }
                    li {
                        margin-bottom: 5px;
                    }
                    strong {
                        color: #2c3e50;
                    }
                    @media print {
                        body { margin: 20px; }
                        h1 { page-break-after: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="cabecalho-plano">
                    <div class="nome-professor">${nomeUsuario}</div>
                    <div class="marca-plataforma">Plano de aula gerado por EduPlataforma</div>
                </div>
                <h1>${titulo}</h1>
                ${conteudoHTML}
            </body>
            </html>
        `);
        
        janelaImpressao.document.close();
        
        // Aguardar carregamento e abrir diálogo de impressão
        setTimeout(() => {
            janelaImpressao.print();
        }, 250);
        
        mostrarToast('PDF gerado! Use Ctrl+P ou Cmd+P para salvar como PDF', 'success');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        mostrarToast('Erro ao gerar PDF. Tente novamente.', 'error');
    }
}

// Função para adicionar cabeçalho personalizado ao plano
function adicionarCabecalhoPlano(conteudo, nomeUsuario) {
    // Verificar se o cabeçalho já existe para evitar duplicação
    if (conteudo.includes('Plano de aula gerado por EduPlataforma')) {
        return conteudo;
    }
    
    // Adicionar cabeçalho no início do conteúdo
    const cabecalho = `**${nomeUsuario}**\n*Plano de aula gerado por EduPlataforma*\n\n---\n\n`;
    return cabecalho + conteudo;
}

function formatarPlano(texto) {
    if (!texto) return '<p style="color: #dc3545; font-weight: 600;">❌ Erro: Nenhum conteúdo de plano foi recebido.</p>';
    
    console.log('Formatando plano - Tamanho original:', texto.length, 'caracteres');
    console.log('Formatando plano - Início:', texto.substring(0, 200) + '...');
    console.log('Formatando plano - Final:', '...' + texto.substring(texto.length - 200));
    
    // Preservar quebras de linha e formatar o texto markdown para HTML
    let formatted = texto
        // Títulos com # (preservar formatação)
        .replace(/^# (.*$)/gm, '<h1 style="color: #2c3e50; font-size: 1.8rem; margin: 1.5rem 0 1rem 0; font-weight: 700; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.5rem;">$1</h1>')
        .replace(/^## (.*$)/gm, '<h2 style="color: #34495e; font-size: 1.5rem; margin: 1.3rem 0 0.8rem 0; font-weight: 600;">$1</h2>')
        .replace(/^### (.*$)/gm, '<h3 style="color: #457D97; font-size: 1.3rem; margin: 1rem 0 0.6rem 0; font-weight: 600;">$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4 style="color: #5a6c7d; font-size: 1.1rem; margin: 0.8rem 0 0.4rem 0; font-weight: 600;">$1</h4>')
        
        // Negrito e itálico
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #2c3e50; font-weight: 600;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="color: #457D97; font-style: italic;">$1</em>')
        
        // Listas com marcadores
        .replace(/^- (.*$)/gm, '<li style="margin: 0.3rem 0; color: #2c3e50; list-style-type: disc;">$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li style="margin: 0.3rem 0; color: #2c3e50; list-style-type: decimal;">$2</li>')
        
        // Parágrafos duplos (manter estrutura)
        .replace(/\n\n/g, '</p><p style="color: #2c3e50; line-height: 1.6; margin: 0.8rem 0;">')
        
        // Quebras de linha simples (preservar para estrutura)
        .replace(/\n/g, '<br>');
    
    // Processar listas de forma mais robusta
    const listRegex = /(<li[^>]*>.*?<\/li>)(\s*<br>\s*<li[^>]*>.*?<\/li>)*/gs;
    formatted = formatted.replace(listRegex, (match) => {
        // Remover <br> entre itens de lista
        const cleanList = match.replace(/<br>\s*/g, '');
        return `<ul style="margin: 0.5rem 0 1rem 1.5rem; color: #2c3e50; padding-left: 1rem;">${cleanList}</ul>`;
    });
    
    // Garantir que o conteúdo esteja em parágrafos se não começar com título
    if (!formatted.startsWith('<h1') && !formatted.startsWith('<h2') && !formatted.startsWith('<h3') && !formatted.startsWith('<ul')) {
        formatted = `<p style="color: #2c3e50; line-height: 1.6; margin: 0.8rem 0;">${formatted}</p>`;
    }
    
    // Limpeza final
    formatted = formatted
        .replace(/<br>\s*<\/p>/g, '</p>') // Remover <br> antes de fechar parágrafos
        .replace(/<p[^>]*>\s*<br>/g, '<p style="color: #2c3e50; line-height: 1.6; margin: 0.8rem 0;">') // Remover <br> no início de parágrafos
        .replace(/(<\/h[1-6]>)\s*<br>/g, '$1') // Remover <br> após títulos
        .replace(/(<\/ul>)\s*<br>/g, '$1'); // Remover <br> após listas
    
    console.log('Formatação concluída - Tamanho final:', formatted.length, 'caracteres');
    
    return formatted;
}

async function downloadPDF() {
    if (!planoGerado) {
        mostrarToast('Gere um plano antes de baixar o PDF', 'error');
        return;
    }
    
    try {
        mostrarToast('Gerando PDF...', 'info');
        // Gerar PDF organizado usando a mesma estrutura do PDF.HTML
        gerarPDFOrganizado(planoGerado);
        mostrarToast('PDF gerado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        mostrarToast('Erro ao gerar PDF. Tente novamente.', 'error');
    }
}

async function salvarPlano() {
    if (!planoGerado) {
        mostrarToast('Gere um plano antes de salvar', 'error');
        return;
    }
    
    try {
        const tema = document.getElementById('tema').value || 'Plano de Aula';
        const componente = document.getElementById('componente').value || 'Não especificado';
        const ano = document.getElementById('ano').value || 'Não especificado';
        
        // Criar título mais detalhado
        const titulo = `${tema} - ${componente} ${ano}º ano`;
        
        // Obter nome do usuário
        const nomeUsuario = window.userName || 'Professor';
        
        // Adicionar cabeçalho personalizado ao plano gerado
        const conteudoComCabecalho = adicionarCabecalhoPlano(planoGerado, nomeUsuario);
        
        const dadosPlano = {
            titulo: titulo,
            conteudo: conteudoComCabecalho
        };
        
        const response = await fetch('/api/planos-aula', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosPlano)
        });
        
        if (response.ok) {
            const result = await response.json();
            mostrarToast('Plano salvo com sucesso!', 'success');
            carregarHistoricoPlanos(); // Recarregar histórico
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao salvar plano');
        }
        
    } catch (error) {
        console.error('Erro ao salvar plano:', error);
        mostrarToast(`Erro ao salvar plano: ${error.message}`, 'error');
    }
}

// Função para mostrar toast
function mostrarToast(mensagem, tipo = 'info') {
    // Remover toast existente
    const toastExistente = document.querySelector('.toast');
    if (toastExistente) {
        toastExistente.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `
        <div class="toast-content" style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${mensagem}</span>
        </div>
    `;

    // Adicionar estilos inline para o toast
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'success' ? '#28a745' : tipo === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 500;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function gerarPDFOrganizado(conteudoPlano) {
    // Criar uma janela temporária com o conteúdo do PDF organizado
    const pdfWindow = window.open('', '_blank');
    
    // Obter dados do formulário
    const componente = document.getElementById('componente').value || 'Matemática';
    const ano = document.getElementById('ano').value || '9';
    const tema = document.getElementById('tema').value || 'Plano de Aula';
    const habilidades = document.getElementById('habilidades').value || '';
    const objetivos = document.getElementById('objetivos').value || '';
    
    // Obter nome do usuário de diferentes fontes possíveis
    let userName = 'Professor(a)';
    if (window.userName) {
        userName = window.userName;
    } else if (localStorage.getItem('userName')) {
        userName = localStorage.getItem('userName');
    } else if (sessionStorage.getItem('userName')) {
        userName = sessionStorage.getItem('userName');
    } else {
        // Tentar obter do elemento na página
        const userElement = document.querySelector('.user-name, .username, [data-user]');
        if (userElement) {
            userName = userElement.textContent || userElement.innerText || userName;
        }
    }
    
    // Processar o plano gerado para extrair seções
    const secoesParsadas = parsePlanoParaSecoes(conteudoPlano || '');
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Plano de Aula - ${tema}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* Aplicar os mesmos estilos do PDF.HTML */
        :root {
            --primary-color: #1e3a8a;
            --secondary-color: #1e40af;
            --accent-color: #3b82f6;
            --light-background: #f8fafc;
            --white: #ffffff;
            --text-color: #1f2937;
            --light-text-color: #6b7280;
            --border-color: #e5e7eb;
            --success-color: #10b981;
            --warning-color: #f59e0b;
        }

        body {
            background: white;
            font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: var(--text-color);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }

        .pdf-container {
            width: 210mm;
            background: var(--white);
            margin: 0 auto;
            padding: 20mm;
            font-size: 10.5pt;
            box-sizing: border-box;
        }

        .pdf-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 20mm;
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: white;
            position: relative;
            margin: -20mm -20mm 0 -20mm;
        }

        //.logo-left, .logo-right {
            flex: 0 0 70px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo-placeholder {
            width: 55px;
            height: 55px; 
            background: white;
            border-radius: 6px;
            padding: 6px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8pt;
            font-weight: 600;
            color: var(--primary-color);
            text-align: center;
            line-height: 1.2;
        }

        .header-center {
            flex: 1;
            text-align: center;
            padding: 0 10px;
        }

        .pdf-title {
            font-size: 16pt; // tamanho da fonte PLANO DE AULA 
            font-weight: 700;
            margin: 0 0 4px 0;
            letter-spacing: 0.8px;
            text-transform: uppercase;
        }

        .pdf-subtitle {
            font-size: 11pt;
            font-weight: 400;
            margin: 0 0 6px 0;
            opacity: 0.9;
        }

        .pdf-prof {
            font-size: 10pt;
            font-weight: 500;
            margin: 0;
            opacity: 0.8;
        }

        .pdf-separator {
            border: none;
            border-top: 10px solid var(--border-color);
            margin: 0 -20mm;
        }

        .pdf-info-section {
            background: var(--light-background);
            padding: 12px 20mm;
            border-bottom: 1px solid var(--border-color);
            margin: 0 -20mm 6px -20mm;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }

        .info-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .info-label {
            font-weight: 600;
            color: var(--primary-color);
            font-size: 9.5pt;
        }

        .info-value {
            font-weight: 500;
            color: var(--text-color);
            font-size: 9.5pt;
        }

        .pdf-card {
            margin: 8px 0;
            padding: 16px 20px;
            background: var(--white);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            box-shadow: 0 1px 5px rgba(0, 0, 0, 0.04);
            line-height: 1.5;
            width: calc(100% - 40px);
        }

        .titulo-card {
            background: linear-gradient(135deg, var(--accent-color) 0%, var(--primary-color) 100%);
            color: white;
            text-align: center;
            border: none;
            padding: 16px 25px;
            margin: 6px 0;
        }

        .plano-titulo-principal {
            margin: 0;
            font-size: 16pt;
            font-weight: 700;
            line-height: 1.4;
        }

        .section-title {
            margin: 0 0 12px 0;
            font-size: 13pt;
            font-weight: 700;
            color: var(--primary-color);
            border-bottom: 2px solid var(--accent-color);
            padding-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .bncc-card {
            background: linear-gradient(135deg, #fefce8 0%, #fffbeb 100%);
            border-left: 4px solid var(--warning-color);
        }

        .bncc-content {
            margin-top: 8px;
        }

        .competencia-item {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid var(--warning-color);
        }

        .bncc-codigo {
            display: inline-block;
            background: var(--warning-color);
            color: white;
            padding: 3px 7px;
            border-radius: 3px;
            font-weight: 700;
            font-size: 8.5pt;
            margin-bottom: 6px;
        }

        .bncc-descricao {
            margin: 0;
            font-style: italic;
            line-height: 1.5;
        }

        .objetivos-card {
            background: linear-gradient(135deg, #f0fdf4 0%, #f0fdf4 100%);
            border-left: 4px solid var(--success-color);
        }

        .objetivos-list {
            list-style: none;
            padding: 0;
            margin: 8px 0 0 0;
        }

        .objetivos-list li {
            padding: 6px 0 6px 22px;
            position: relative;
            line-height: 1.5;
        }

        .objetivos-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: var(--success-color);
            font-weight: bold;
            font-size: 11pt;
        }

        .materiais-card {
            background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
            border-left: 4px solid var(--accent-color);
        }

        .materiais-list {
            list-style: none;
            padding: 0;
            margin: 8px 0 0 0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 6px;
        }

        .materiais-list li {
            padding: 5px 0;
            line-height: 1.4;
            font-size: 9.5pt;
        }

        .desenvolvimento-card {
            background: linear-gradient(135deg, #f6faff 0%, #f0f5ff 100%);
            border-left: 4px solid var(--primary-color);
        }

        .momento-aula {
            margin: 15px 0;
            padding: 12px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid var(--primary-color);
        }

        .momento-titulo {
            margin: 0 0 8px 0;
            font-size: 11.5pt;
            font-weight: 700;
            color: var(--primary-color);
        }

        .momento-content {
            line-height: 21.5;
        }

        .momento-content p {
            margin: 6px 0;
            line-height: 1.5;
        }

        .atividade {
            margin: 12px 0;
            padding: 8px;
            background: var(--light-background);
            border-radius: 3px;
        }

        .atividade-titulo {
            margin: 0 0 6px 0;
            font-size: 10.5pt;
            font-weight: 600;
            color: var(--secondary-color);
        }

        .introducao-card {
            background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
            border-left: 4px solid #8b5cf6;
        }

        .objetivos-especificos-card {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-left: 4px solid var(--success-color);
        }

        .atividades-card {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            border-left: 4px solid #f59e0b;
        }

        .avaliacao-card {
            background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%);
            border-left: 4px solid #a855f7;
        }

        .conclusao-card {
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border-left: 4px solid #10b981;
        }

        .referencias-card {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-left: 4px solid #64748b;
            margin-top: 15px;
        }

        .referencias-content p {
            margin: 8px 0;
            font-size: 9.5pt;
            line-height: 1.4;
        }

        .referencias-content strong {
            color: var(--primary-color);
            font-weight: 600;
        }

        .avaliacao-content {
            margin-top: 8px;
        }

        .avaliacao-item {
            margin: 12px 0;
            padding: 10px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid #a855f7;
        }

        .avaliacao-item h4 {
            margin: 0 0 6px 0;
            font-size: 10.5pt;
            font-weight: 600;
            color: #a855f7;
        }

        .avaliacao-item p {
            margin: 0;
            line-height: 1.5;
        }

        .avaliacao-item ul {
            list-style: none;
            padding: 0;
            margin: 6px 0 0 0;
        }

        .avaliacao-item li {
            padding: 3px 0 3px 18px;
            position: relative;
            line-height: 1.5;
        }

        .avaliacao-item li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #a855f7;
            font-weight: bold;
        }

        .pdf-footer {
            text-align: center;
            padding: 15px 20mm;
            background: var(--light-background);
            color: var(--light-text-color);
            font-size: 8.5pt;
            font-style: italic;
            border-top: 1px solid var(--border-color);
            margin: 20px -20mm 0 -20mm;
        }

        ul, ol {
            line-height: 1.5;
            margin-bottom: 8px;
        }

        li {
            line-height: 1.5;
            margin-bottom: 2px;
        }

        p {
            line-height: 1.5;
            margin: 6px 0;
        }

        strong {
            font-weight: 600;
            color: var(--primary-color);
        }

        @page {
            size: A4;
            margin: 20mm;
        }
        
        /* Evitar quebras de página desnecessárias */
        .pdf-header {
            page-break-after: avoid;
        }
        
        .pdf-separator {
            page-break-before: avoid;
            page-break-after: avoid;
        }
        
        .pdf-info-section {
            page-break-before: avoid;
            page-break-after: avoid;
        }
        
        .pdf-card:first-of-type {
            page-break-before: avoid;
        }

        @media print {
            body {
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                height: auto !important;
                min-height: auto !important;
            }
            
            .pdf-container {
                width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                border: none !important;
                padding: 15mm !important;
                margin: 0 !important;
                overflow: visible !important;
                page-break-after: avoid !important;
            }

            .pdf-card {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                margin: 6px 0 !important;
                padding: 14px 18px !important;
                width: calc(100% - 36px) !important;
            }

            .pdf-header {
                margin: 0 !important;
                padding: 15px 15mm !important;
                page-break-after: avoid !important;
            }
            
            .pdf-info-section {
                margin: 0 !important;
                padding: 10px 15mm !important;
                page-break-after: avoid !important;
            }
            
            .pdf-separator {
                margin: 0 !important;
                page-break-after: avoid !important;
            }
            
            .pdf-footer {
                margin: 20px 0 0 0 !important;
                padding: 15px 15mm !important;
                page-break-before: avoid !important;
            }

            .pdf-card {
                page-break-inside: avoid;
                margin: 10mm 0;
                box-shadow: none !important;
                border: 1px solid var(--border-color) !important;
            }
            
            .momento-aula {
                page-break-inside: avoid;
                margin: 8mm 0;
            }

            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                page-break-before: avoid;
            }
            
            ul, ol {
                page-break-inside: avoid;
            }

            p {
                orphans: 3;
                widows: 3;
            }
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <div class="pdf-header">
            <div class="logo-left">
                <div class="logo-placeholder">ADM</div>
            </div>
            <div class="header-center">
                <div class="pdf-title">PLANO DE AULA</div>
                <div class="pdf-subtitle">Educação Básica - BNCC</div>
                <div class="pdf-prof">Professor - ${userName}</div>
            </div>
            <div class="logo-right">
                <div class="logo-placeholder">UEMASUL</div>
            </div>
        </div>
        <hr class="pdf-separator">
        
        <div class="pdf-info-section">
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">📚 Componente:</span>
                    <span class="info-value">${componente}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">🎯 Ano/Série:</span>
                    <span class="info-value">${ano}º ano do Ensino Fundamental</span>
                </div>
                <div class="info-item">
                    <span class="info-label">⏱️ Duração:</span>
                    <span class="info-value">50 minutos</span>
                </div>
                <div class="info-item">
                    <span class="info-label">👥 Modalidade:</span>
                    <span class="info-value">Presencial</span>
                </div>
            </div>
        </div>

        <div class="pdf-card titulo-card">
            <h1 class="plano-titulo-principal">📊 ${tema}</h1>
        </div>

        <div class="pdf-card bncc-card">
            <h2 class="section-title">📋 COMPETÊNCIAS E HABILIDADES DA BNCC</h2>
            <div class="bncc-content">
                <div class="competencia-item">
                    <div class="bncc-descricao">${habilidades || 'Competências e habilidades específicas da BNCC para ' + componente + ' - ' + ano + 'º ano do Ensino Fundamental, conforme selecionado no formulário de geração do plano.'}</div>
                </div>
            </div>
        </div>

        <div class="pdf-card objetivos-card">
            <h2 class="section-title">🎯 OBJETIVOS DE APRENDIZAGEM</h2>
            <div class="objetivos-content">
                <div class="bncc-descricao">${objetivos || 'Objetivos de aprendizagem específicos para a aula de ' + componente + ', alinhados com as competências da BNCC e adequados ao ' + ano + 'º ano do Ensino Fundamental.'}</div>
            </div>
        </div>

        ${secoesParsadas.introducao ? `
        <div class="pdf-card introducao-card">
            <h2 class="section-title">📖 INTRODUÇÃO</h2>
            <div class="bncc-descricao">${secoesParsadas.introducao}</div>
        </div>
        ` : ''}

        ${secoesParsadas.objetivos ? `
        <div class="pdf-card objetivos-especificos-card">
            <h2 class="section-title">🎯 OBJETIVOS ESPECÍFICOS</h2>
            <div class="bncc-descricao">${secoesParsadas.objetivos}</div>
        </div>
        ` : ''}

        ${secoesParsadas.materiais ? `
        <div class="pdf-card materiais-card">
            <h2 class="section-title">🛠️ RECURSOS E MATERIAIS</h2>
            <div class="materiais-content">
                <div class="bncc-descricao">${secoesParsadas.materiais}</div>
            </div>
        </div>
        ` : ''}

        ${secoesParsadas.desenvolvimento ? `
        <div class="pdf-card desenvolvimento-card">
            <h2 class="section-title">📚 DESENVOLVIMENTO DA AULA</h2>
            <div class="bncc-descricao">${secoesParsadas.desenvolvimento}</div>
        </div>
        ` : ''}

        ${secoesParsadas.atividades ? `
        <div class="pdf-card atividades-card">
            <h2 class="section-title">🎲 ATIVIDADES PRÁTICAS</h2>
            <div class="bncc-descricao">${secoesParsadas.atividades}</div>
        </div>
        ` : ''}

        ${secoesParsadas.avaliacao ? `
        <div class="pdf-card avaliacao-card">
            <h2 class="section-title">📊 AVALIAÇÃO</h2>
            <div class="avaliacao-content">
                <div class="bncc-descricao">${secoesParsadas.avaliacao}</div>
            </div>
        </div>
        ` : ''}

        ${secoesParsadas.conclusao ? `
        <div class="pdf-card conclusao-card">
            <h2 class="section-title">✅ CONCLUSÃO</h2>
            <div class="bncc-descricao">${secoesParsadas.conclusao}</div>
        </div>
        ` : ''}

        ${secoesParsadas.conteudoCompleto ? `
        <div class="pdf-card desenvolvimento-card">
            <h2 class="section-title">📚 CONTEÚDO DO PLANO</h2>
            <div class="bncc-descricao">${secoesParsadas.conteudoCompleto}</div>
        </div>
        ` : ''}

        <div class="pdf-card referencias-card">
            <h2 class="section-title">📖 REFERÊNCIAS</h2>
            <div class="referencias-content">
                <p><strong>Base Nacional Comum Curricular (BNCC)</strong> - Ministério da Educação, 2018.</p>
                <p><strong>Componente Curricular:</strong> ${componente} - ${ano}º ano do Ensino Fundamental</p>
                <p><strong>Elaborado por:</strong> ${userName}</p>
                <p><strong>Data de Elaboração:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Sistema:</strong> EDU-PLATAFORMA - Plataforma de Gestão Educacional</p>
            </div>
        </div>

        <div class="pdf-footer">
            Plano de Aula gerado pela EDU-PLATAFORMA - Sistema de Gestão Educacional | ${userName} | ${new Date().toLocaleDateString('pt-BR')}
        </div>
    </div>

    <script>
        // Aguardar carregamento e imprimir automaticamente
        window.onload = function() {
            setTimeout(function() {
                try {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                } catch (error) {
                    console.error('Erro ao imprimir:', error);
                    alert('PDF gerado! Use Ctrl+P para imprimir ou salvar como PDF.');
                }
            }, 500);
        };
    </script>
</body>
</html>
    `;

    pdfWindow.document.write(htmlContent);
    pdfWindow.document.close();
}

function parsePlanoParaSecoes(conteudo) {
    const secoes = {
        introducao: '',
        objetivos: '',
        materiais: '',
        desenvolvimento: '',
        atividades: '',
        avaliacao: '',
        conclusao: '',
        conteudoCompleto: ''
    };
    
    if (!conteudo) {
        secoes.conteudoCompleto = 'Conteúdo do plano não disponível.';
    return secoes;
}

    // Limpar e normalizar o texto
    let textoLimpo = conteudo
        .replace(/\*\*/g, '') // Remove **
        .replace(/\*/g, '') // Remove *
        .replace(/#{1,6}\s*/g, '') // Remove # ## ### etc
        .replace(/^\s*[-•]\s*/gm, '• ') // Normaliza bullets
        .trim();
    
    // Dividir em linhas para análise
    const linhas = textoLimpo.split('\n').map(linha => linha.trim()).filter(linha => linha.length > 0);
    
    // Palavras-chave para identificar seções (mais abrangente)
    const palavrasChave = {
        introducao: ['introdução', 'introducao', 'apresentação', 'apresentacao', 'contextualização', 'contextualizacao', 'tema', 'assunto'],
        objetivos: ['objetivos', 'objetivo', 'metas', 'finalidades', 'propósitos', 'propositos', 'competências', 'competencias', 'habilidades'],
        materiais: ['materiais', 'recursos', 'equipamentos', 'ferramentas', 'instrumentos', 'suprimentos', 'itens necessários', 'itens necessarios'],
        desenvolvimento: ['desenvolvimento', 'metodologia', 'procedimentos', 'estratégias', 'estrategias', 'execução', 'execucao', 'implementação', 'implementacao'],
        atividades: ['atividades', 'exercícios', 'exercicios', 'tarefas', 'práticas', 'praticas', 'dinâmicas', 'dinamicas', 'jogos', 'brincadeiras'],
        avaliacao: ['avaliação', 'avaliacao', 'verificação', 'verificacao', 'acompanhamento', 'feedback', 'correção', 'correcao', 'análise', 'analise'],
        conclusao: ['conclusão', 'conclusao', 'encerramento', 'finalização', 'finalizacao', 'síntese', 'sintese', 'resumo', 'considerações', 'consideracoes']
    };
    
    // Função para identificar o tipo de seção
    function identificarSecao(linha) {
        const linhaLower = linha.toLowerCase();
        
        for (const [secao, palavras] of Object.entries(palavrasChave)) {
            for (const palavra of palavras) {
                if (linhaLower.includes(palavra)) {
                    return secao;
                }
            }
        }
        return null;
    }
    
    // Processar linha por linha
    let secaoAtual = null;
    let conteudoSecao = [];
    
    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        const tipoSecao = identificarSecao(linha);
        
        if (tipoSecao) {
            // Salvar seção anterior se existir
            if (secaoAtual && conteudoSecao.length > 0) {
                secoes[secaoAtual] = conteudoSecao.join('\n').trim();
            }
            
            // Iniciar nova seção
            secaoAtual = tipoSecao;
            conteudoSecao = [linha];
        } else if (secaoAtual) {
            // Adicionar conteúdo à seção atual
            conteudoSecao.push(linha);
        } else {
            // Se não há seção definida, adicionar à introdução
            if (!secoes.introducao) {
                secoes.introducao = linha;
            } else {
                secoes.introducao += '\n' + linha;
            }
        }
    }
    
    // Salvar última seção
    if (secaoAtual && conteudoSecao.length > 0) {
        secoes[secaoAtual] = conteudoSecao.join('\n').trim();
    }
    
    // Se não conseguiu dividir em seções, usar estratégia de backup
    if (!secoes.introducao && !secoes.objetivos && !secoes.materiais && 
        !secoes.desenvolvimento && !secoes.atividades && !secoes.avaliacao && !secoes.conclusao) {
        
        // Dividir por parágrafos e tentar identificar padrões
        const paragrafos = textoLimpo.split('\n\n').filter(p => p.trim().length > 0);
        
        if (paragrafos.length >= 3) {
            secoes.introducao = paragrafos[0];
            secoes.desenvolvimento = paragrafos.slice(1, -1).join('\n\n');
            secoes.avaliacao = paragrafos[paragrafos.length - 1];
        } else {
            secoes.conteudoCompleto = textoLimpo;
        }
    }
    
    // Limpar seções vazias e formatar
    Object.keys(secoes).forEach(key => {
        if (secoes[key]) {
            secoes[key] = formatarTextoSecao(secoes[key]);
        }
    });
    
    return secoes;
}

function formatarTextoSecao(texto) {
    if (!texto) return '';
    
    return texto
        .replace(/\n{3,}/g, '\n\n') // Máximo 2 quebras de linha seguidas
        .replace(/^\s*[-•]\s*/gm, '• ') // Normalizar bullets
        .replace(/(\d+)\.\s*/g, '$1. ') // Normalizar numeração
        .replace(/([.!?])\s*\n\s*([A-ZÁÊÇÕ])/g, '$1\n\n$2') // Quebras entre frases
        .trim();
}

// Função para visualizar plano completo (disponível globalmente)
window.visualizarPlano = function(id, titulo, conteudo) {
    // Criar modal para exibir o plano
    const modal = document.createElement('div');
    modal.className = 'plano-modal';
    modal.innerHTML = `
        <div class="plano-modal-content">
            <div class="plano-modal-header">
                <h2><i class="fas fa-file-alt"></i> ${titulo}</h2>
                <button class="plano-modal-close" onclick="this.closest('.plano-modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="plano-modal-body">
                ${formatarPlano(conteudo)}
            </div>
            <div class="plano-modal-footer">
                <button class="btn-download" onclick="baixarPlanoComoPDF('${titulo}', \`${conteudo.replace(/`/g, '\\`')}\`)">
                    <i class="fas fa-download"></i> Baixar PDF
                </button>
                <button class="btn-close" onclick="this.closest('.plano-modal').remove()">
                    <i class="fas fa-times"></i> Fechar
                </button>
            </div>
        </div>
    `;
    
    // Adicionar estilos do modal
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    `;
    
    const modalContent = modal.querySelector('.plano-modal-content');
    modalContent.style.cssText = `
        background: white;
        border-radius: 15px;
        width: 100%;
        max-width: 800px;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    
    const modalHeader = modal.querySelector('.plano-modal-header');
    modalHeader.style.cssText = `
        background: linear-gradient(135deg, #457D97, #6b9bb3);
        color: white;
        padding: 1.5rem 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    `;
    
    const modalBody = modal.querySelector('.plano-modal-body');
    modalBody.style.cssText = `
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
        color: #2c3e50;
        line-height: 1.6;
    `;
    
    const modalFooter = modal.querySelector('.plano-modal-footer');
    modalFooter.style.cssText = `
        padding: 1.5rem 2rem;
        border-top: 1px solid #eee;
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
    `;
    
    // Estilizar botões
    modal.querySelectorAll('button').forEach(btn => {
        btn.style.cssText = `
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.3s ease;
        `;
    });
    
    const closeBtn = modal.querySelector('.plano-modal-close');
    closeBtn.style.cssText += `
        background: rgba(255, 255, 255, 0.2);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        padding: 0;
        justify-content: center;
    `;
    
    const downloadBtn = modal.querySelector('.btn-download');
    downloadBtn.style.cssText += `
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
    `;
    
    const modalCloseBtn = modal.querySelector('.btn-close');
    modalCloseBtn.style.cssText += `
        background: #6c757d;
        color: white;
    `;
    
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

window.baixarPlanoComoPDF = function(titulo, conteudo) {
    // Usar a nova função organizada
    gerarPDFOrganizado(conteudo);
}



// Função removida - causava problemas de carregamento