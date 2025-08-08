document.addEventListener('DOMContentLoaded', function() {
    const formFiltros = document.getElementById('form-filtros');
    const statsSection = document.getElementById('stats-section');
    const alunosSection = document.getElementById('alunos-section');
    const alunosGrid = document.getElementById('alunos-grid');
    const emptyStateAlunos = document.getElementById('empty-state-alunos');
    
    let filtrosAtivos = {};
    let alunosData = [];
    let escolasData = [];
    let turmasData = [];
    let cadernosData = [];
    let alunoAtual = null;

    // Carrega dados iniciais
    async function carregarDadosIniciais() {
        try {
            await Promise.all([
                carregarEscolas(),
                carregarSeries(),
                carregarCadernos()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            showError('Erro', 'Erro ao carregar dados iniciais');
        }
    }

    // Carrega escolas
    async function carregarEscolas() {
        try {
            const resp = await fetch('/api/escolas');
            const data = await resp.json();
            escolasData = data.escolas || data;
            
            const escolaSelect = document.getElementById('escola-filtro');
            escolaSelect.innerHTML = '<option value="">Selecione a escola</option>';
            escolasData.forEach(escola => {
                escolaSelect.innerHTML += `<option value="${escola.id}">${escola.nome}</option>`;
            });
        } catch (error) {
            console.error('Erro ao carregar escolas:', error);
        }
    }

    // Carrega séries/anos
    async function carregarSeries() {
        const serieSelect = document.getElementById('serie-filtro');
        serieSelect.innerHTML = '<option value="">Selecione a série</option>';
        
        // Adicionar séries do 1º ao 9º ano
        for (let i = 1; i <= 9; i++) {
            serieSelect.innerHTML += `<option value="${i}">${i}º ano</option>`;
        }
    }

    // Carrega cadernos
    async function carregarCadernos() {
        try {
            const resp = await fetch('/api/cadernos');
            if (resp.ok) {
                const data = await resp.json();
                cadernosData = data.cadernos || data;
                
                const cadernoSelect = document.getElementById('caderno-filtro');
                cadernoSelect.innerHTML = '<option value="">Selecione o caderno</option>';
                cadernosData.forEach(caderno => {
                    cadernoSelect.innerHTML += `<option value="${caderno.id}">${caderno.titulo}</option>`;
                });
            }
        } catch (error) {
            console.error('Erro ao carregar cadernos:', error);
            // Fallback com cadernos fictícios se a API não estiver implementada
            const cadernoSelect = document.getElementById('caderno-filtro');
            cadernoSelect.innerHTML = `
                <option value="">Selecione o caderno</option>
                <option value="1">Caderno 1 - 2024</option>
                <option value="2">Caderno 2 - 2024</option>
                <option value="3">Caderno 3 - 2024</option>
            `;
        }
    }

    // Carrega turmas por escola
    async function carregarTurmasPorEscola(escolaId) {
        if (!escolaId) {
            document.getElementById('turma-filtro').innerHTML = '<option value="">Selecione a turma</option>';
            return;
        }

        try {
            const resp = await fetch(`/api/turmas?escola_id=${escolaId}`);
            const data = await resp.json();
            turmasData = data.turmas || [];
            
            const turmaSelect = document.getElementById('turma-filtro');
            turmaSelect.innerHTML = '<option value="">Selecione a turma</option>';
            turmasData.forEach(turma => {
                turmaSelect.innerHTML += `<option value="${turma.id}">${turma.nome}</option>`;
            });
        } catch (error) {
            console.error('Erro ao carregar turmas:', error);
        }
    }

    // Event listener para mudança de escola
    document.getElementById('escola-filtro').addEventListener('change', function() {
        carregarTurmasPorEscola(this.value);
    });

    // Submissão do formulário de filtros
    formFiltros.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        filtrosAtivos = {
            ano: document.getElementById('ano-filtro').value,
            periodo: document.getElementById('periodo-filtro').value,
            serie: document.getElementById('serie-filtro').value,
            escola: document.getElementById('escola-filtro').value,
            turma: document.getElementById('turma-filtro').value,
            caderno: document.getElementById('caderno-filtro').value,
            componente: document.getElementById('componente-filtro').value
        };

        // Validar se todos os campos obrigatórios estão preenchidos
        if (!filtrosAtivos.ano || !filtrosAtivos.periodo || !filtrosAtivos.serie || 
            !filtrosAtivos.escola || !filtrosAtivos.turma || 
            !filtrosAtivos.caderno || !filtrosAtivos.componente) {
            showWarning('Campos obrigatórios', 'Por favor, preencha todos os campos obrigatórios');
            return;
        }

        mostrarLoading();
        await carregarAlunos();
        esconderLoading();
    });

    // Carrega alunos baseado nos filtros
    async function carregarAlunos() {
        try {
            const params = new URLSearchParams({
                ano: filtrosAtivos.ano,
                periodo: filtrosAtivos.periodo,
                serie: filtrosAtivos.serie,
                escola: filtrosAtivos.escola,
                turma: filtrosAtivos.turma,
                caderno: filtrosAtivos.caderno,
                componente: filtrosAtivos.componente
            });

            const resp = await fetch(`/api/resultados?${params}`);
            const data = await resp.json();
            
            if (resp.ok) {
                alunosData = data.alunos || [];
                
                // Se não há resultados, mostrar mensagem apropriada
                if (alunosData.length === 0) {
                    mostrarNotificacao(data.message || 'Nenhum resultado encontrado para os filtros selecionados', 'info');
                }
                
                renderizarAlunos();
                renderizarEstatisticas();
                atualizarContadoresHeader();
                mostrarSecoes();
            } else {
                throw new Error(data.message || 'Erro ao carregar alunos');
            }
        } catch (error) {
            console.error('Erro ao carregar alunos:', error);
            // Não usar dados simulados - mostrar erro real
            alunosData = [];
            renderizarAlunos();
            renderizarEstatisticas();
            atualizarContadoresHeader();
            mostrarSecoes();
            mostrarNotificacao('Erro ao carregar dados dos alunos', 'error');
        }
    }



    // Mostra as seções de estatísticas e alunos
    function mostrarSecoes() {
        statsSection.style.display = 'block';
        alunosSection.style.display = 'block';
        
        // Animação de entrada
        setTimeout(() => {
            statsSection.style.animation = 'slideUp 0.8s ease-out';
            alunosSection.style.animation = 'slideUp 0.8s ease-out 0.2s both';
        }, 100);
    }

    // Renderiza estatísticas
    function renderizarEstatisticas() {
        const concluidos = alunosData.filter(a => a.status === 'concluido');
        const pendentesCount = alunosData.length - concluidos.length;
        const total = alunosData.length;
        const percentualConclusao = total > 0 ? Math.round((concluidos.length / total) * 100) : 0;

        // Calcular média geral
        let mediaGeral = 0;
        if (concluidos.length > 0) {
            const somaPercentuais = concluidos.reduce((acc, aluno) => acc + (aluno.percentual || 0), 0);
            mediaGeral = Math.round(somaPercentuais / concluidos.length);
        }
        
        atualizarDashboardModerno(total, concluidos.length, pendentesCount, percentualConclusao, mediaGeral);
    }

    // Função para atualizar o novo dashboard
    function atualizarDashboardModerno(total, concluidos, pendentes, percentual, media) {
        // Card de Progresso Geral
        document.getElementById('main-percentage').textContent = `${percentual}%`;
        const progressRing = document.getElementById('main-progress-ring');
        const circumference = 2 * Math.PI * 54; // Raio do círculo
        const offset = circumference - (percentual / 100) * circumference;
        if(progressRing) progressRing.style.strokeDashoffset = offset;

        document.getElementById('total-alunos-overview').textContent = total;
        document.getElementById('avaliacoes-lancadas').textContent = concluidos;
        const statusBadge = document.getElementById('status-badge');
        if (percentual === 100) {
            statusBadge.textContent = 'Concluído';
            statusBadge.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
            statusBadge.style.color = '#28a745';
        } else {
            statusBadge.textContent = 'Em andamento';
            statusBadge.style.backgroundColor = 'rgba(108, 99, 255, 0.1)';
            statusBadge.style.color = '#6C63FF';
        }


        // Card Provas Realizadas
        document.getElementById('total-concluidos').textContent = concluidos;
        renderConcluidosChart(concluidos, pendentes);


        // Card Aguardando
        document.getElementById('total-pendentes').textContent = pendentes;
        const pendentesRing = document.getElementById('pendentes-ring');
        const pendentesPercent = total > 0 ? Math.round((pendentes / total) * 100) : 0;
        document.getElementById('pendentes-percentage').textContent = `${pendentesPercent}%`;
        const circumferenceMini = 2 * Math.PI * 18;
        const offsetMini = circumferenceMini - (pendentesPercent / 100) * circumferenceMini;
        if (pendentesRing) pendentesRing.style.strokeDashoffset = offsetMini;


        // Card Média da Turma
        document.getElementById('media-geral').textContent = `${media}%`;
        renderMediaGauge(media);
        const performanceLevel = document.getElementById('performance-level');
        if (media >= 70) {
            performanceLevel.textContent = 'Bom desempenho';
        } else if (media >= 50) {
            performanceLevel.textContent = 'Desempenho básico';
        } else {
            performanceLevel.textContent = 'Precisa de atenção';
        }
    }
    
    // Gráfico de Concluídos
    let concluidosChart;
    function renderConcluidosChart(concluidos, pendentes) {
        const options = {
            series: [{
                name: 'Alunos',
                data: [concluidos, pendentes]
            }],
            chart: {
                type: 'bar',
                height: 40,
                sparkline: { enabled: true }
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '80%',
                    distributed: true
                }
            },
            colors: ['#28a745', '#ffc107'],
            dataLabels: { enabled: false },
            legend: { show: false },
            xaxis: {
                categories: ['Concluídos', 'Pendentes'],
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " alunos"
                    }
                }
            }
        };

        const chartEl = document.getElementById('concluidos-chart');
        if (concluidosChart) {
            concluidosChart.updateSeries(options.series);
        } else if (chartEl) {
            concluidosChart = new ApexCharts(chartEl, options);
            concluidosChart.render();
        }
    }
    
    // Gráfico de Média
    let mediaGauge;
    function renderMediaGauge(media) {
        const options = {
            series: [media],
            chart: {
                type: 'radialBar',
                offsetY: -10,
                sparkline: { enabled: true }
            },
            plotOptions: {
                radialBar: {
                    startAngle: -90,
                    endAngle: 90,
                    track: {
                        background: "#e7e7e7",
                        strokeWidth: '97%',
                        margin: 5,
                    },
                    dataLabels: {
                        name: { show: false },
                        value: { show: false }
                    }
                }
            },
            grid: {
                padding: { top: -10 }
            },
            colors: ['#17a2b8'],
            labels: ['Média'],
        };
        
        const chartEl = document.getElementById('media-gauge');
        if (mediaGauge) {
            mediaGauge.updateSeries(options.series);
        } else if (chartEl) {
            mediaGauge = new ApexCharts(chartEl, options);
            mediaGauge.render();
        }
    }

    // Função para animar contadores
    function animarContador(elementId, valorFinal, sufixo = '') {
        const elemento = document.getElementById(elementId);
        if (!elemento) {
            console.warn(`Elemento ${elementId} não encontrado para animar contador`);
            return;
        }
        
        const valorInicial = 0;
        const duracao = 1000; // 1 segundo
        const incremento = valorFinal / (duracao / 16); // 60fps
        let valorAtual = valorInicial;

        const animacao = setInterval(() => {
            valorAtual += incremento;
            if (valorAtual >= valorFinal) {
                valorAtual = valorFinal;
                clearInterval(animacao);
            }
            elemento.textContent = Math.floor(valorAtual) + sufixo;
        }, 16);
    }

    // Renderiza cards dos alunos
    function renderizarAlunos() {
        if (!alunosData.length) {
            alunosGrid.style.display = 'none';
            emptyStateAlunos.style.display = 'block';
            return;
        }

        alunosGrid.style.display = 'grid';
        emptyStateAlunos.style.display = 'none';
        
        alunosGrid.innerHTML = '';

        alunosData.forEach((aluno, index) => {
            const alunoCard = document.createElement('div');
            alunoCard.className = `aluno-card ${aluno.status}`;
            alunoCard.setAttribute('data-id', aluno.id);
            
            let performanceClass = 'performance-insuficiente';
            if (aluno.percentual >= 70) performanceClass = 'performance-avancado';
            else if (aluno.percentual >= 50) performanceClass = 'performance-basico';

            const statusIcon = aluno.status === 'concluido' ? 'fas fa-check-circle' : 'fas fa-clock';
            const statusText = aluno.status === 'concluido' ? 'Concluído' : 'Pendente';

            alunoCard.innerHTML = `
                <div class="aluno-header">
                    <div class="aluno-info">
                        <div class="aluno-nome">
                            <i class="fas fa-user-graduate" style="margin-right: 0.5rem; color: var(--primary);"></i>
                            ${aluno.nome}
                        </div>
                        <div class="aluno-detalhes">
                            <i class="fas fa-graduation-cap" style="margin-right: 0.3rem; color: var(--text-secondary);"></i>
                            ${filtrosAtivos.componente} • ${aluno.turma_nome || aluno.turma || 'Turma não informada'}
                        </div>
                    </div>
                    <div class="aluno-status status-${aluno.status}">
                        <i class="${statusIcon}" style="margin-right: 0.3rem;"></i>
                        ${statusText}
                    </div>
                </div>
                
                ${aluno.status === 'concluido' ? `
                    <div class="aluno-progress">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <span style="font-size: 0.9rem; color: var(--text-secondary);">
                                <i class="fas fa-chart-bar" style="margin-right: 0.3rem;"></i>
                                Performance
                            </span>
                            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">
                                ${aluno.acertos}/${aluno.total_questoes || aluno.total} (${aluno.percentual}%)
                            </span>
                        </div>
                        <div class="performance-bar">
                            <div class="performance-fill ${performanceClass}" style="width: ${aluno.percentual}%;"></div>
                        </div>
                        <div style="text-align: center; margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
                            ${aluno.percentual >= 70 ? '🏆 Excelente' : aluno.percentual >= 50 ? '👍 Bom' : '⚠️ Precisa melhorar'}
                        </div>
                    </div>
                ` : `
                    <div class="aluno-progress">
                        <div style="text-align: center; color: var(--text-secondary); font-size: 0.9rem; padding: 1rem 0;">
                            <i class="fas fa-plus-circle" style="font-size: 1.5rem; color: var(--primary); display: block; margin-bottom: 0.5rem;"></i>
                            <span>Clique para lançar resultado</span>
                        </div>
                    </div>
                `}
            `;

            // Adicionar event listener para clique no card
            alunoCard.addEventListener('click', () => abrirModalGabarito(aluno));
            
            alunosGrid.appendChild(alunoCard);

            // Animação de entrada escalonada
            setTimeout(() => {
                alunoCard.style.animation = `slideUp 0.5s ease-out ${index * 0.1}s both`;
            }, 100);
        });
    }

    // Abrir modal do gabarito
    function abrirModalGabarito(aluno) {
        alunoAtual = aluno;
        document.getElementById('modal-aluno-nome').textContent = `Gabarito - ${aluno.nome}`;
        
        const checkboxFezProva = document.getElementById('aluno-fez-prova');
        checkboxFezProva.checked = aluno.status === 'concluido';
        
        // Toggle do gabarito baseado no status
        toggleGabarito(checkboxFezProva.checked);
        
        if (checkboxFezProva.checked) {
            carregarGabarito(aluno);
        }

        document.getElementById('modal-gabarito').classList.add('active');
    }

    // Event listener para checkbox "aluno fez prova"
    document.getElementById('aluno-fez-prova').addEventListener('change', function() {
        toggleGabarito(this.checked);
    });

    // Toggle do container do gabarito
    function toggleGabarito(mostrar) {
        const gabaritoContainer = document.getElementById('gabarito-container');
        if (mostrar) {
            gabaritoContainer.style.display = 'block';
            if (alunoAtual && alunoAtual.status === 'pendente') {
                gerarGabaritoVazio();
            }
        } else {
            gabaritoContainer.style.display = 'none';
        }
    }

    // Carrega gabarito do aluno
    async function carregarGabarito(aluno) {
        try {
            console.log('[DEBUG] Carregando gabarito para aluno:', aluno.id, 'caderno:', filtrosAtivos.caderno);
            const resp = await fetch(`/api/resultados/${aluno.id}/${filtrosAtivos.caderno}`);
            if (resp.ok) {
                const data = await resp.json();
                console.log('[DEBUG] Dados do gabarito carregados:', data);
                
                if (data.fez_prova && data.respostas && Object.keys(data.respostas).length > 0) {
                    console.log('[DEBUG] Aluno fez prova, convertendo respostas...');
                    // Converter respostas do formato backend para frontend
                    const respostasConvertidas = converterRespostasParaFrontend(data.respostas);
                    renderizarGabaritoComRespostas(respostasConvertidas);
                } else {
                    console.log('[DEBUG] Aluno não fez prova ou sem respostas, gerando gabarito vazio');
                    // Gerar gabarito vazio para preenchimento
                    gerarGabaritoVazio();
                }
            } else {
                console.log('[DEBUG] Erro na resposta da API, gerando gabarito vazio');
                gerarGabaritoVazio();
            }
        } catch (error) {
            console.error('[DEBUG] Erro ao carregar gabarito:', error);
            gerarGabaritoVazio();
        }
    }

    // Converte respostas do formato backend (0-1, 0-2) para frontend (Matemática, Português)
    function converterRespostasParaFrontend(respostasBackend) {
        const componentes = filtrosAtivos.componente === 'Ambos' ? ['Matemática', 'Português'] : [filtrosAtivos.componente];
        const respostasFrontend = {};
        
        console.log('[DEBUG] Convertendo respostas - Componentes:', componentes);
        console.log('[DEBUG] Respostas backend:', respostasBackend);
        
        Object.entries(respostasBackend).forEach(([chave, resposta]) => {
            const [blocoIndex, questaoNum] = chave.split('-');
            const componente = componentes[parseInt(blocoIndex)];
            
            console.log(`[DEBUG] Chave: ${chave}, BlocoIndex: ${blocoIndex}, Componente: ${componente}`);
            
            if (componente) {
                if (!respostasFrontend[componente]) {
                    respostasFrontend[componente] = {};
                }
                respostasFrontend[componente][questaoNum] = resposta;
            }
        });
        
        console.log('[DEBUG] Respostas convertidas:', respostasFrontend);
        return respostasFrontend;
    }

    // Renderiza gabarito com respostas salvas
    function renderizarGabaritoComRespostas(respostasData) {
        const gabaritoContainer = document.getElementById('gabarito-container');
        const componentesEsperados = filtrosAtivos.componente === 'Ambos' ? ['Matemática', 'Português'] : [filtrosAtivos.componente];
        
        console.log('[DEBUG] Renderizando gabarito - Componentes esperados:', componentesEsperados);
        console.log('[DEBUG] Dados recebidos:', respostasData);
        console.log('[DEBUG] Filtros ativos:', filtrosAtivos);
        
        gabaritoContainer.innerHTML = '';

        // Para cada componente esperado, verificar se há dados ou criar vazio
        componentesEsperados.forEach(compEsperado => {
            const questoes = respostasData[compEsperado] || {};
            
            // CORREÇÃO DEFINITIVA: Calcular questões baseado no contexto atual, não no alunoAtual
            let numQuestoes = 10; // Padrão fallback
            
            if (Object.keys(questoes).length > 0) {
                // Se há questões salvas, usar a maior numeração
                numQuestoes = Math.max(...Object.keys(questoes).map(Number));
            } else {
                // CORREÇÃO: Calcular dinamicamente baseado no componente filtrado
                numQuestoes = calcularQuestoesPorComponente(compEsperado);
            }

            console.log(`[DEBUG] Componente: ${compEsperado}, Questões calculadas dinamicamente: ${numQuestoes}`);

            const bloco = document.createElement('div');
            bloco.className = 'gabarito-bloco';
            bloco.innerHTML = `
                <h4><i class="fas fa-${compEsperado === 'Matemática' ? 'calculator' : 'book'}"></i> ${compEsperado}</h4>
                <div class="questoes-grid" data-componente="${compEsperado}">
                    ${gerarQuestoes(compEsperado, numQuestoes, questoes)}
                </div>
            `;
            gabaritoContainer.appendChild(bloco);
        });
    }

    // Gera gabarito vazio para preenchimento
    function gerarGabaritoVazio() {
        const gabaritoContainer = document.getElementById('gabarito-container');
        const componentes = filtrosAtivos.componente === 'Ambos' ? ['Matemática', 'Português'] : [filtrosAtivos.componente];
        
        console.log('[DEBUG] Gerando gabarito vazio - Componentes:', componentes);
        console.log('[DEBUG] Filtros ativos:', filtrosAtivos);
        
        gabaritoContainer.innerHTML = '';

        componentes.forEach(comp => {
            // CORREÇÃO DEFINITIVA: Usar função de cálculo dinâmico
            const numQuestoes = calcularQuestoesPorComponente(comp);

            console.log(`[DEBUG] Componente: ${comp}, Questões calculadas dinamicamente: ${numQuestoes}`);

            const bloco = document.createElement('div');
            bloco.className = 'gabarito-bloco';
            bloco.innerHTML = `
                <h4><i class="fas fa-${comp === 'Matemática' ? 'calculator' : 'book'}"></i> ${comp}</h4>
                <div class="questoes-grid" data-componente="${comp}">
                    ${gerarQuestoes(comp, numQuestoes, {})}
                </div>
            `;
            gabaritoContainer.appendChild(bloco);
        });
    }

    // NOVA FUNÇÃO: Calcula dinamicamente questões por componente
    function calcularQuestoesPorComponente(componente) {
        console.log(`[DEBUG] calcularQuestoesPorComponente - Componente: ${componente}, Filtro ativo: ${filtrosAtivos.componente}`);
        
        // Se o filtro ativo é um componente específico e o componente solicitado é o mesmo
        if (filtrosAtivos.componente !== 'Ambos' && filtrosAtivos.componente === componente) {
            // Usar o total_questoes do aluno (que já vem filtrado do backend)
            const questoes = alunoAtual?.total_questoes || 12;
            console.log(`[DEBUG] Componente específico filtrado: ${questoes} questões`);
            return questoes;
        }
        
        // Se o filtro ativo é "Ambos" 
        if (filtrosAtivos.componente === 'Ambos') {
            // Para "Ambos", cada componente deve ter metade do total
            const totalGeral = alunoAtual?.total_questoes || 24;
            const questoesPorComponente = Math.ceil(totalGeral / 2);
            console.log(`[DEBUG] Modo 'Ambos': ${totalGeral} total, ${questoesPorComponente} por componente`);
            return questoesPorComponente;
        }
        
        // Fallback - não deveria chegar aqui
        console.log(`[DEBUG] Fallback: retornando 12 questões`);
        return 12;
    }

    // Gera gabarito simulado
    function gerarGabaritoSimulado(aluno) {
        const gabaritoContainer = document.getElementById('gabarito-container');
        const componentes = filtrosAtivos.componente === 'Ambos' ? ['Matemática', 'Português'] : [filtrosAtivos.componente];
        
        gabaritoContainer.innerHTML = '';

        componentes.forEach(comp => {
            // Determinar número de questões baseado no total do aluno ou usar padrão
            let numQuestoes = 10; // Padrão
            if (aluno && aluno.total > 0) {
                // Se "Ambos", dividir por 2, caso contrário usar total
                numQuestoes = filtrosAtivos.componente === 'Ambos' ? Math.ceil(aluno.total / 2) : aluno.total;
            }

            // Gerar respostas aleatórias para simulação
            const respostasSimuladas = {};
            for (let i = 1; i <= numQuestoes; i++) {
                if (Math.random() > 0.2) { // 80% de chance de ter resposta
                    respostasSimuladas[i] = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
                }
            }

            const bloco = document.createElement('div');
            bloco.className = 'gabarito-bloco';
            bloco.innerHTML = `
                <h4><i class="fas fa-${comp === 'Matemática' ? 'calculator' : 'book'}"></i> ${comp}</h4>
                <div class="questoes-grid" data-componente="${comp}">
                    ${gerarQuestoes(comp, numQuestoes, respostasSimuladas)}
                </div>
            `;
            gabaritoContainer.appendChild(bloco);
        });
    }

    // Renderiza gabarito real
    function renderizarGabarito(gabaritoData) {
        const gabaritoContainer = document.getElementById('gabarito-container');
        gabaritoContainer.innerHTML = '';

        Object.entries(gabaritoData).forEach(([componente, questoes]) => {
            const bloco = document.createElement('div');
            bloco.className = 'gabarito-bloco';
            bloco.innerHTML = `
                <h4><i class="fas fa-${componente === 'Matemática' ? 'calculator' : 'book'}"></i> ${componente}</h4>
                <div class="questoes-grid" data-componente="${componente}">
                    ${gerarQuestoes(componente, Object.keys(questoes).length, questoes)}
                </div>
            `;
            gabaritoContainer.appendChild(bloco);
        });
    }

    // Gera HTML das questões
    function gerarQuestoes(componente, totalQuestoes, respostas) {
        let html = '';
        for (let i = 1; i <= totalQuestoes; i++) {
            const respostaSelecionada = respostas[i] || '';
            html += `
                <div class="questao-item">
                    <div class="questao-numero">Questão ${i}</div>
                    <div class="alternativas">
                        ${['A', 'B', 'C', 'D'].map(alt => `
                            <div class="alternativa ${respostaSelecionada === alt ? 'selecionada' : ''}" 
                                 data-questao="${i}" 
                                 data-componente="${componente}" 
                                 data-alternativa="${alt}">
                                ${alt}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        return html;
    }

    // Event delegation para alternativas
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('alternativa')) {
            const questao = e.target.dataset.questao;
            const componente = e.target.dataset.componente;
            
            // Remover seleção anterior da mesma questão
            const questaoAlternativas = document.querySelectorAll(`[data-questao="${questao}"][data-componente="${componente}"]`);
            questaoAlternativas.forEach(alt => alt.classList.remove('selecionada'));
            
            // Adicionar nova seleção
            e.target.classList.add('selecionada');
        }
    });

    // Função para salvar gabarito
    window.salvarGabarito = async function() {
        if (!alunoAtual) return;

        const fezProva = document.getElementById('aluno-fez-prova').checked;
        
        if (!fezProva) {
            // Salvar como não fez a prova
            await salvarStatusAluno('pendente', {});
            return;
        }

        // Coletar respostas no formato correto para o backend
        const respostas = {};
        const alternativasSelecionadas = document.querySelectorAll('.alternativa.selecionada');
        
        // Buscar blocos do caderno para mapear corretamente
        const componentes = filtrosAtivos.componente === 'Ambos' ? ['Matemática', 'Português'] : [filtrosAtivos.componente];
        
        alternativasSelecionadas.forEach(alt => {
            const componente = alt.dataset.componente;
            const questao = parseInt(alt.dataset.questao);
            const alternativa = alt.dataset.alternativa;
            
            // Encontrar o índice do bloco baseado no componente
            const blocoIndex = componentes.indexOf(componente);
            if (blocoIndex !== -1) {
                const questaoKey = `${blocoIndex}-${questao}`;
                respostas[questaoKey] = alternativa;
            }
        });

        console.log('Respostas coletadas:', respostas);
        await salvarStatusAluno('concluido', respostas);
    };

    // Salva status do aluno
    async function salvarStatusAluno(status, respostas) {
        try {
            mostrarLoading();
            
            const data = {
                aluno_id: alunoAtual.id,
                caderno_id: filtrosAtivos.caderno,
                componente: filtrosAtivos.componente,
                ano_avaliacao: filtrosAtivos.ano,
                periodo_avaliacao: filtrosAtivos.periodo,
                status: status,
                respostas: respostas
            };

            const resp = await fetch('/api/resultados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (resp.ok) {
                const responseData = await resp.json();
                mostrarNotificacao('Resultado salvo com sucesso!', 'success');
                
                // Atualizar status do aluno na lista com dados reais do backend
                const alunoIndex = alunosData.findIndex(a => a.id === alunoAtual.id);
                if (alunoIndex !== -1) {
                    alunosData[alunoIndex].status = status;
                    if (status === 'concluido' && responseData.resultado) {
                        // Usar dados reais do backend
                        alunosData[alunoIndex].acertos = responseData.resultado.total_acertos;
                        alunosData[alunoIndex].total = responseData.resultado.total_questoes;
                        alunosData[alunoIndex].percentual = Math.round(responseData.resultado.percentual_acertos);
                    } else {
                        // Zerar dados se pendente
                        alunosData[alunoIndex].acertos = 0;
                        alunosData[alunoIndex].total = 0;
                        alunosData[alunoIndex].percentual = 0;
                    }
                    
                    // Atualizar o objeto alunoAtual também
                    alunoAtual.status = status;
                    if (status === 'concluido' && responseData.resultado) {
                        alunoAtual.acertos = responseData.resultado.total_acertos;
                        alunoAtual.total = responseData.resultado.total_questoes;
                        alunoAtual.percentual = Math.round(responseData.resultado.percentual_acertos);
                    } else {
                        alunoAtual.acertos = 0;
                        alunoAtual.total = 0;
                        alunoAtual.percentual = 0;
                    }
                }
                
                renderizarAlunos();
                renderizarEstatisticas();
                fecharModalGabarito();
            } else {
                const error = await resp.json();
                throw new Error(error.message || 'Erro ao salvar resultado');
            }
        } catch (error) {
            console.error('Erro ao salvar resultado:', error);
            mostrarNotificacao('Erro ao salvar resultado', 'error');
        } finally {
            esconderLoading();
        }
    }

    // Funções auxiliares
    function getEscolaNome(escolaId) {
        const escola = escolasData.find(e => e.id == escolaId);
        return escola ? escola.nome : 'Escola não encontrada';
    }

    function getTurmaNome(turmaId) {
        const turma = turmasData.find(t => t.id == turmaId);
        return turma ? turma.nome : 'Turma não encontrada';
    }

    // Funções globais
    window.fecharModalGabarito = function() {
        document.getElementById('modal-gabarito').classList.remove('active');
        alunoAtual = null;
    };

    window.mostrarLoading = function() {
        document.getElementById('modal-loading').classList.add('active');
    };

    window.esconderLoading = function() {
        document.getElementById('modal-loading').classList.remove('active');
    };

    // Inicialização
    carregarDadosIniciais();
});

// Sistema de notificações
// Função para atualizar contadores do header
function atualizarContadoresHeader() {
    if (alunosData && alunosData.length > 0) {
        const total = alunosData.length;
        const concluidos = alunosData.filter(aluno => aluno.status === 'concluido').length;
        const pendentes = total - concluidos;
        const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
        
        // Calcular média geral
        const alunosComNota = alunosData.filter(a => a.status === 'concluido' && a.percentual !== undefined);
        const mediaGeral = alunosComNota.length > 0 
            ? Math.round(alunosComNota.reduce((acc, a) => acc + (a.percentual || 0), 0) / alunosComNota.length)
            : 0;
        
        animarContador('total-alunos', total);
        animarContador('concluidos-count', concluidos);
        animarContador('pendentes-count', pendentes);
        
            // Atualizar novos contadores (apenas se existirem)
    if (document.getElementById('total-concluidos')) {
        animarContador('total-concluidos', concluidos);
    }
    if (document.getElementById('total-pendentes')) {
        animarContador('total-pendentes', pendentes);
    }
    if (document.getElementById('media-geral')) {
        animarContador('media-geral', mediaGeral, '%');
    }
        
        // Atualizar dashboard moderno
        atualizarDashboardModerno(total, concluidos, pendentes, percentual, mediaGeral);
    }
}

// Função de insights removida - não mais necessária

// Funções para os botões de ação
function exportarRelatorio() {
    mostrarNotificacao('Gerando relatório... Esta funcionalidade estará disponível em breve!', 'info');
}

// Funções de timeline e insights removidas - não mais necessárias

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
            max-width: 400px;
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
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 0.8rem;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.4s ease;
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
        notification.style.opacity = '1';
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
        success: { bg: '#28a745' },
        error: { bg: '#dc3545' },
        warning: { bg: '#ffc107' },
        info: { bg: '#6C63FF' }
    };
    return cores[tipo] || cores.info;
} 