from flask import Flask, render_template, send_from_directory, session, redirect, url_for, send_file, jsonify, request, flash
import os
import time
import json
from auth import auth_bp
from ai_integration import ai_bp
from database import db, init_db, User, Escola, Turma, Aluno, PlanoAula, Habilidade, Questao, Alternativa, Caderno, BlocoCaderno, BlocoQuestao, ResultadoAluno, RespostaAluno
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from dotenv import load_dotenv
from escolas import escolas_bp
from turma import turmas_bp
from aluno import alunos_bp
from config import Config, get_database_uri
from plano_aula import plano_aula_bp
from habilidade import habilidades_bp
from usuarios import usuarios_bp
from kanban import kanban_bp
from flask_migrate import Migrate
import jwt
from functools import wraps
from datetime import datetime
from relatorios import relatorios_bp
from newsletter import newsletter_bp
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import io
import json


# Carregar variáveis de ambiente
load_dotenv()

# Configurar senha do MySQL se não estiver definida nas variáveis de ambiente
if not os.getenv('MYSQL_PASSWORD'):
    os.environ['MYSQL_PASSWORD'] = '20220015779Ma@'
    print("[DEBUG] Senha do MySQL configurada programaticamente")

# Configurar caminhos absolutos
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
STATIC_DIR = os.path.join(FRONTEND_DIR, 'static')

# Verificar se os caminhos existem
print(f"[DEBUG] BASE_DIR: {BASE_DIR}")
print(f"[DEBUG] FRONTEND_DIR: {FRONTEND_DIR}")
print(f"[DEBUG] STATIC_DIR: {STATIC_DIR}")
print(f"[DEBUG] Frontend exists: {os.path.exists(FRONTEND_DIR)}")
print(f"[DEBUG] Static exists: {os.path.exists(STATIC_DIR)}")

app = Flask(__name__, template_folder=FRONTEND_DIR, static_folder=STATIC_DIR)
app.secret_key = os.getenv('SECRET_KEY', 'sua_chave_secreta_ultra_segura')
app.config.from_object(Config)

# Configurações de performance otimizadas para R7 7500X + 32GB RAM
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['TEMPLATES_AUTO_RELOAD'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 80,  # Otimizado para hardware de alta performance
    'pool_recycle': 3600,
    'pool_pre_ping': True,
    'max_overflow': 150,  # Suporte a até 60+ usuários simultâneos
    'pool_timeout': 30,
    'echo': False  # Desabilita logs SQL para melhor performance
}

# Configurações de cache otimizadas
app.config['CACHE_TYPE'] = 'simple'
app.config['CACHE_DEFAULT_TIMEOUT'] = 600  # Cache por 10 minutos
app.config['CACHE_THRESHOLD'] = 1000  # Mais itens em cache

# Configurações de sessão otimizadas
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hora
app.config['SESSION_COOKIE_SECURE'] = False  # Para desenvolvimento
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Configurações de sessão mais robustas
app.config['SESSION_COOKIE_SECURE'] = False  # True apenas para HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 horas em segundos
app.config['SESSION_PERMANENT'] = True

# Configurar URI do banco dinamicamente
app.config['SQLALCHEMY_DATABASE_URI'] = get_database_uri()

# Inicializa o banco de dados com o app
db.init_app(app)

# Inicializa o Flask-Migrate para gerenciar migrações do banco de dados
migrate = Migrate(app, db)

# Registrar blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(escolas_bp)
app.register_blueprint(turmas_bp)
app.register_blueprint(alunos_bp)
app.register_blueprint(plano_aula_bp)
app.register_blueprint(habilidades_bp)
app.register_blueprint(usuarios_bp)
app.register_blueprint(kanban_bp)
app.register_blueprint(relatorios_bp)
app.register_blueprint(newsletter_bp)


# Rotas para páginas HTML
@app.route('/health')
def health_check():
    return {'status': 'ok', 'message': 'Application is running'}, 200

@app.route('/api/session/check')
def check_session():
    """Endpoint para verificar status da sessão"""
    return jsonify({
        'authenticated': 'user_id' in session,
        'user_id': session.get('user_id'),
        'user_email': session.get('user_email'),
        'session_permanent': session.permanent,
        'session_keys': list(session.keys()),
        'cookies_received': dict(request.cookies)
    })

@app.route('/')
def home():
    """Rota principal - redireciona baseado no status de autenticação"""
    # Verificar se o usuário está logado
    if 'user_id' in session:
        # Usuário logado - redirecionar para o dashboard
        print(f"🔐 Usuário logado (ID: {session['user_id']}) - redirecionando para dashboard")
        return redirect(url_for('dashboard'))
    else:
        # Usuário não logado - redirecionar para página index
        print("👤 Usuário não logado - redirecionando para página index")
        return redirect(url_for('index_page'))

@app.route('/index')
def index_page():
    """Rota /index - mostra a página index.html"""
    return render_template('index.html')

@app.route('/marketing')
def marketing_page():
    """Página de marketing - sempre mostra a página de marketing"""
    return render_template('index.html')

@app.route('/apresentacao')
def apresentacao_page():
    """Página de apresentação otimizada para SEO"""
    return render_template('apresentacao.html')

@app.route('/sistema')
def sistema_redirect():
    """Rota específica para acessar o sistema - redireciona baseado no status de autenticação"""
    if 'user_id' in session:
        # Usuário logado - redirecionar para o dashboard
        print(f"🔐 Usuário logado (ID: {session['user_id']}) - redirecionando para dashboard")
        return redirect(url_for('dashboard'))
    else:
        # Usuário não logado - redirecionar para login
        print("👤 Usuário não logado - redirecionando para login")
        return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    """API de login para autenticação via AJAX"""
    try:
        data = request.json or request.form
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({
                'success': False,
                'error': 'Username e password são obrigatórios'
            }), 400
        
        # Buscar usuário no banco (pode ser email ou username simulado)
        user = None
        
        # Primeiro tentar buscar por email
        user = User.query.filter_by(email=username).first()
        
        # Se não encontrar, tentar buscar por name (para compatibilidade)
        if not user:
            user = User.query.filter_by(name=username).first()
        
        # Se ainda não encontrar, tentar o usuário admin padrão
        if not user and username == 'mateus@admin':
            user = User.query.filter_by(email='admin@escola.com').first()
        
        if user and user.check_password(password):
            # Login bem-sucedido
            session['user_id'] = user.id
            session['username'] = user.name
            session['email'] = user.email
            session['tipo_usuario'] = user.tipo_usuario
            session.permanent = True  # Tornar sessão permanente
            
            print(f"[SUCCESS] Login realizado com sucesso: user_id={user.id}, name={user.name}, email={user.email}")
            
            return jsonify({
                'success': True,
                'message': 'Login realizado com sucesso!',
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'tipo_usuario': user.tipo_usuario
                }
            })
        else:
            print(f"[WARNING] Tentativa de login falhada para username: {username}")
            # Log dos usuários disponíveis para debug
            all_users = User.query.all()
            print(f"[DEBUG] Usuários disponíveis no banco:")
            for u in all_users:
                print(f"  - ID: {u.id}, Name: {u.name}, Email: {u.email}")
                
            return jsonify({
                'success': False,
                'error': 'Credenciais inválidas'
            }), 401
            
    except Exception as e:
        print(f"[ERROR] Erro no login: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor'
        }), 500

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    
    user_id = session['user_id']
    current_user = User.query.get(user_id)
    
    if not current_user:
        return redirect(url_for('login_page'))
    
    # Se for admin, mostrar dados de todos os usuários
    if current_user.is_admin():
        count_escolas = Escola.query.count()
        count_turmas = Turma.query.count()
        count_alunos = Aluno.query.count()
        count_planos = PlanoAula.query.count()
        count_questoes = Questao.query.count()
        count_usuarios = User.query.count()
    else:
        # Se for usuário normal, mostrar apenas seus dados
        count_escolas = Escola.query.filter_by(user_id=user_id).count()
        count_turmas = Turma.query.filter_by(user_id=user_id).count()
        count_alunos = Aluno.query.filter_by(user_id=user_id).count()
        count_planos = PlanoAula.query.filter_by(user_id=user_id).count()
        count_questoes = Questao.query.filter_by(user_id=user_id).count()
        count_usuarios = 0  # Usuários normais não veem este contador
    
    count_habilidades = Habilidade.query.count()
    
    # Adicionar informações do usuário atual à sessão
    session_data = dict(session)
    session_data['is_admin'] = current_user.is_admin()
    session_data['tipo_usuario'] = current_user.tipo_usuario
    
    return render_template('dashboard.html', 
                         user=session_data, 
                         count_escolas=count_escolas, 
                         count_turmas=count_turmas, 
                         count_alunos=count_alunos, 
                         count_planos=count_planos, 
                         count_questoes=count_questoes, 
                         count_habilidades=count_habilidades,
                         count_usuarios=count_usuarios)

@app.route('/canvas-negocio')
def canvas_negocio():
    """Página do Canvas de Modelo de Negócio"""
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    
    return render_template('canvas-negocio.html')

@app.route('/habilidades')
def habilidades():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    
    # Buscar todas as habilidades do banco de dados
    try:
        habilidades_list = Habilidade.query.order_by(Habilidade.componente, Habilidade.ano, Habilidade.codigo).all()
        print(f"[DEBUG] Carregadas {len(habilidades_list)} habilidades do banco")
        
        # Converter para dicionários para passar ao template
        habilidades_data = []
        for h in habilidades_list:
            habilidades_data.append({
                'id': h.id,
                'codigo': h.codigo,
                'componente': h.componente,
                'ano': h.ano,
                'descricao': h.descricao,
                'etapa': h.etapa or 'Ensino Fundamental'
            })
        
        return render_template('habilidades.html', habilidades=habilidades_data, user=session)
    except Exception as e:
        print(f"[ERRO] Erro ao carregar habilidades: {str(e)}")
        return render_template('habilidades.html', habilidades=[], user=session)

@app.route('/plano-aula')
def plano_aula():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('plano-aula.html', user=session)

@app.route('/questoes')
def questoes():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    user_id = session['user_id']
    turmas = Turma.query.filter_by(user_id=user_id).order_by(Turma.ano).all()
    return render_template('questoes.html', user=session, turmas=turmas)

@app.route('/questoes/cadastrar/<int:turma_id>')
def cadastrar_questao(turma_id):
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    turma = Turma.query.get_or_404(turma_id)
    if turma.user_id != session['user_id']:
        return redirect(url_for('questoes'))
    habilidades = Habilidade.query.filter_by(ano=turma.ano).all()
    return render_template('cadastrar-questao.html', user=session, turma=turma, habilidades=habilidades)

@app.route('/api/questoes', methods=['POST'])
def criar_questao():
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        # Verificar se é FormData (com arquivo) ou JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            # FormData - extrair dados do formulário
            data = {
                'enunciado': request.form.get('enunciado'),
                'habilidade_id': int(request.form.get('habilidade_id')),
                'ano': int(request.form.get('ano')),
                'componente': request.form.get('componente'),
                'alternativa_a': request.form.get('alternativa_a'),
                'alternativa_b': request.form.get('alternativa_b'),
                'alternativa_c': request.form.get('alternativa_c'),
                'alternativa_d': request.form.get('alternativa_d'),
                'resposta_correta': request.form.get('resposta_correta'),
                'dificuldade': request.form.get('dificuldade', 'Médio')
            }
            
            # Processar imagem se presente
            imagem_data = None
            if 'imagem' in request.files:
                imagem_file = request.files['imagem']
                if imagem_file.filename:
                    # Converter imagem para base64 para armazenar no banco
                    import base64
                    imagem_bytes = imagem_file.read()
                    imagem_data = base64.b64encode(imagem_bytes).decode('utf-8')
        else:
            # JSON tradicional
            data = request.json
            imagem_data = data.get('imagem')
        
        # Buscar informações da habilidade para obter componente se não fornecido
        habilidade = Habilidade.query.get(data['habilidade_id'])
        if not habilidade:
            return jsonify({'error': 'Habilidade não encontrada'}), 400
            
        # Usar componente fornecido ou da habilidade
        componente = data.get('componente') or habilidade.componente
        ano = data.get('ano') or habilidade.ano
        
        # Para questões compartilhadas nacionalmente, escola_id é opcional (None)
        escola_id = data.get('escola_id', None)
        
        questao = Questao(
            enunciado=data['enunciado'],
            imagem=imagem_data,
            habilidade_id=data['habilidade_id'],
            escola_id=escola_id,
            ano=ano,
            componente=componente,
            dificuldade=data.get('dificuldade', 'Médio'),
            user_id=session['user_id'],
            # Campos diretos das alternativas (modelo migrado)
            alternativa_a=data.get('alternativa_a', ''),
            alternativa_b=data.get('alternativa_b', ''),
            alternativa_c=data.get('alternativa_c', ''),
            alternativa_d=data.get('alternativa_d', ''),
            resposta_correta=data.get('resposta_correta', '')
        )
        
        db.session.add(questao)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Questão criada com sucesso!', 'id': questao.id}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar questão: {str(e)}'}), 500

@app.route('/api/questoes', methods=['GET'])
def listar_questoes():
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        # Questões agora são filtradas por escola_id e ano (opcional)
        escola_id = request.args.get('escola_id')
        ano = request.args.get('ano')
    
        if escola_id and ano:
            # Filtrar por escola e ano específicos
            questoes = Questao.query.filter_by(escola_id=escola_id, ano=ano, user_id=session['user_id']).all()
        elif escola_id:
            # Filtrar apenas por escola
            questoes = Questao.query.filter_by(escola_id=escola_id, user_id=session['user_id']).all()
        else:
            # Buscar todas as questões do usuário
            questoes = Questao.query.filter_by(user_id=session['user_id']).all()
        
        result = []
        for q in questoes:
            # Buscar alternativas da tabela Alternativa OU usar campos internos da questão
            if hasattr(q, 'alternativas') and q.alternativas:
                # Usar tabela Alternativa (modelo novo)
                alternativas = [
                    {'id': alt.id, 'texto': alt.texto, 'correta': alt.correta}
                    for alt in q.alternativas
                ]
                
                # Converter para formato antigo também
                alternativa_a = alternativa_b = alternativa_c = alternativa_d = ''
                resposta_correta = ''
                
                for i, alt in enumerate(alternativas):
                    letra = chr(65 + i)  # A, B, C, D
                    if letra == 'A': alternativa_a = alt['texto']
                    elif letra == 'B': alternativa_b = alt['texto']
                    elif letra == 'C': alternativa_c = alt['texto']
                    elif letra == 'D': alternativa_d = alt['texto']
                    
                    if alt['correta']:
                        resposta_correta = letra
            else:
                # Usar campos diretos da questão (modelo migrado)
                alternativa_a = q.alternativa_a or ''
                alternativa_b = q.alternativa_b or ''
                alternativa_c = q.alternativa_c or ''
                alternativa_d = q.alternativa_d or ''
                resposta_correta = q.resposta_correta or ''
                
                # Criar lista de alternativas para compatibilidade
                alternativas = []
                for i, texto in enumerate([alternativa_a, alternativa_b, alternativa_c, alternativa_d]):
                    if texto:
                        letra = chr(65 + i)  # A, B, C, D
                        alternativas.append({
                            'id': f"{q.id}_{letra}",
                            'texto': texto,
                            'correta': resposta_correta == letra
                        })
            
            result.append({
                'id': q.id,
                'enunciado': q.enunciado,
                'imagem': q.imagem,
                'habilidade_id': q.habilidade_id,
                'escola_id': getattr(q, 'escola_id', None),  # Usar getattr para compatibilidade
                'ano': getattr(q, 'ano', None),
                'componente': q.componente,
                'alternativas': alternativas,
                # Formato antigo para compatibilidade
                'alternativa_a': alternativa_a,
                'alternativa_b': alternativa_b,
                'alternativa_c': alternativa_c,
                'alternativa_d': alternativa_d,
                'resposta_correta': resposta_correta,
                'dificuldade': q.dificuldade
            })
        return jsonify({'questoes': result})
        
    except Exception as e:
        print(f'[LOG] Erro ao listar questões: {str(e)}')
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/questoes/<int:questao_id>', methods=['DELETE'])
def excluir_questao(questao_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        questao = Questao.query.get_or_404(questao_id)
        if questao.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Excluir alternativas relacionadas primeiro
        alternativas = Alternativa.query.filter_by(questao_id=questao_id).all()
        for alternativa in alternativas:
            db.session.delete(alternativa)
        
        # Excluir blocos de questões relacionados
        from database import BlocoQuestao
        blocos_questoes = BlocoQuestao.query.filter_by(questao_id=questao_id).all()
        for bloco_questao in blocos_questoes:
            db.session.delete(bloco_questao)
        
        # Excluir respostas de alunos relacionadas
        from database import RespostaAluno
        respostas = RespostaAluno.query.filter_by(questao_id=questao_id).all()
        for resposta in respostas:
            db.session.delete(resposta)
        
        # Excluir a questão
        db.session.delete(questao)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Questão excluída com sucesso!'})
        
    except Exception as e:
        db.session.rollback()
        print(f'[LOG] Erro ao excluir questão {questao_id}: {str(e)}')
        return jsonify({'error': f'Erro ao excluir questão: {str(e)}'}), 500

@app.route('/api/questoes/<int:questao_id>', methods=['PUT'])
def editar_questao(questao_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        questao = Questao.query.get_or_404(questao_id)
        if questao.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Verificar se é FormData (com arquivo) ou JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            # FormData - extrair dados do formulário
            data = {
                'enunciado': request.form.get('enunciado'),
                'habilidade_id': int(request.form.get('habilidade_id')),
                'ano': int(request.form.get('ano')),
                'componente': request.form.get('componente'),
                'alternativa_a': request.form.get('alternativa_a'),
                'alternativa_b': request.form.get('alternativa_b'),
                'alternativa_c': request.form.get('alternativa_c'),
                'alternativa_d': request.form.get('alternativa_d'),
                'resposta_correta': request.form.get('resposta_correta'),
                'dificuldade': request.form.get('dificuldade', 'Médio')
            }
            
            # Processar imagem se presente
            imagem_data = questao.imagem  # Manter imagem atual como padrão
            if 'imagem' in request.files:
                imagem_file = request.files['imagem']
                if imagem_file.filename:
                    # Converter nova imagem para base64
                    import base64
                    imagem_bytes = imagem_file.read()
                    imagem_data = base64.b64encode(imagem_bytes).decode('utf-8')
        else:
            # JSON tradicional
            data = request.json
            imagem_data = data.get('imagem', questao.imagem)
        
        # Buscar informações da habilidade para obter componente se não fornecido
        habilidade = Habilidade.query.get(data['habilidade_id'])
        if not habilidade:
            return jsonify({'error': 'Habilidade não encontrada'}), 400
            
        # Atualizar campos da questão
        questao.enunciado = data['enunciado']
        questao.imagem = imagem_data
        questao.habilidade_id = data['habilidade_id']
        questao.componente = data.get('componente') or habilidade.componente
        questao.ano = data.get('ano') or habilidade.ano
        questao.dificuldade = data.get('dificuldade', 'Médio')
        
        # Atualizar alternativas diretamente na questão
        questao.alternativa_a = data.get('alternativa_a', '')
        questao.alternativa_b = data.get('alternativa_b', '')
        questao.alternativa_c = data.get('alternativa_c', '')
        questao.alternativa_d = data.get('alternativa_d', '')
        questao.resposta_correta = data.get('resposta_correta', '')
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Questão atualizada com sucesso!'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao atualizar questão: {str(e)}'}), 500

@app.route('/api/questoes/<int:questao_id>', methods=['GET'])
def detalhar_questao(questao_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        questao = Questao.query.get_or_404(questao_id)
        if questao.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Criar lista de alternativas compatível
        alternativas = []
        if hasattr(questao, 'alternativas') and questao.alternativas:
            # Usar tabela Alternativa se existir
            alternativas = [
                {'id': alt.id, 'texto': alt.texto, 'correta': alt.correta}
                for alt in questao.alternativas
            ]
        else:
            # Usar campos diretos da questão
            alts = [
                {'id': f"{questao.id}_A", 'texto': questao.alternativa_a or '', 'correta': questao.resposta_correta == 'A'},
                {'id': f"{questao.id}_B", 'texto': questao.alternativa_b or '', 'correta': questao.resposta_correta == 'B'},
                {'id': f"{questao.id}_C", 'texto': questao.alternativa_c or '', 'correta': questao.resposta_correta == 'C'},
                {'id': f"{questao.id}_D", 'texto': questao.alternativa_d or '', 'correta': questao.resposta_correta == 'D'}
            ]
            alternativas = [alt for alt in alts if alt['texto']]
        
        return jsonify({
            'id': questao.id,
            'enunciado': questao.enunciado,
            'imagem': questao.imagem,
            'habilidade_id': questao.habilidade_id,
            'escola_id': getattr(questao, 'escola_id', None),
            'ano': getattr(questao, 'ano', None),
            'componente': questao.componente,
            'dificuldade': questao.dificuldade,
            'alternativas': alternativas,
            # Campos diretos para compatibilidade
            'alternativa_a': getattr(questao, 'alternativa_a', ''),
            'alternativa_b': getattr(questao, 'alternativa_b', ''),
            'alternativa_c': getattr(questao, 'alternativa_c', ''),
            'alternativa_d': getattr(questao, 'alternativa_d', ''),
            'resposta_correta': getattr(questao, 'resposta_correta', '')
        })
        
    except Exception as e:
        print(f'[LOG] Erro ao detalhar questão {questao_id}: {str(e)}')
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/escolas')
def escolas():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('escola.html')

@app.route('/turmas')
def turmas():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('turma.html')

@app.route('/alunos')
def alunos():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('aluno.html')

@app.route('/cadernos')
def cadernos():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('cadernos.html')

@app.route('/lanca-resultado')
def lanca_resultado():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('lanca-resultado.html')




# Rota para gerar PDF
@app.route('/gerar-pdf', methods=['POST'])
def gerar_pdf():
    try:
        conteudo = request.json.get('conteudo')
        if not conteudo:
            return jsonify({"error": "Conteúdo não fornecido"}), 400
        
        # Criar buffer para o PDF
        buffer = BytesIO()
        
        # Criar documento PDF
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Adicionar título
        titulo = Paragraph("Plano de Aula - EduPlataforma", styles['Title'])
        story.append(titulo)
        story.append(Spacer(1, 12))
        
        # Adicionar conteúdo formatado
        for linha in conteudo.split('\n'):
            if linha.strip():  # Ignorar linhas vazias
                p = Paragraph(linha, styles['BodyText'])
                story.append(p)
                story.append(Spacer(1, 5))
        
        # Construir PDF
        doc.build(story)
        
        # Retornar PDF para download
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name='plano_aula.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Rota para servir arquivos JS da pasta frontend/js como estáticos
@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

# Rota para servir arquivos CSS da pasta frontend/css como estáticos
@app.route('/static/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

# Rotas para arquivos SEO
@app.route('/sitemap.xml')
def sitemap():
    return send_from_directory(FRONTEND_DIR, 'sitemap.xml', mimetype='application/xml')

@app.route('/robots.txt')
def robots():
    return send_from_directory(FRONTEND_DIR, 'robots.txt', mimetype='text/plain')

@app.route('/api/cadernos', methods=['GET'])
def listar_cadernos():
    print(f"[DEBUG] listar_cadernos - user_id na sessão: {session.get('user_id')}")
    print(f"[DEBUG] listar_cadernos - sessão completa: {dict(session)}")
    
    if 'user_id' not in session:
        print("[DEBUG] listar_cadernos - Usuário não autenticado")
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        user_id = session['user_id']
        print(f"[DEBUG] listar_cadernos - Buscando cadernos para user_id: {user_id}")
        
        cadernos = Caderno.query.filter_by(user_id=user_id).all()
        print(f"[DEBUG] listar_cadernos - Encontrados {len(cadernos)} cadernos")
        
        for c in cadernos:
            print(f"[DEBUG] Caderno: ID={c.id}, titulo={c.titulo}, serie={c.serie}, user_id={c.user_id}")
        
        cadernos_json = [
            {
                'id': c.id,
                'codigo_caderno': c.codigo_caderno,
                'titulo': c.titulo,
                'serie': c.serie,
                'qtd_blocos': c.qtd_blocos,
                'qtd_questoes_por_bloco': c.qtd_questoes_por_bloco
            } for c in cadernos
        ]
        
        print(f"[DEBUG] listar_cadernos - Retornando: {cadernos_json}")
        
        return jsonify({
            'success': True,
            'cadernos': cadernos_json
        })
    except Exception as e:
        print(f"[ERROR] listar_cadernos - Erro: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': 'Erro ao carregar cadernos'}), 500

@app.route('/api/cadernos/estatisticas', methods=['GET'])
def estatisticas_cadernos():
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        user_id = session['user_id']
        
        # Contar cadernos do usuário
        total_cadernos = Caderno.query.filter_by(user_id=user_id).count()
        
        # Contar blocos dos cadernos do usuário
        total_blocos = db.session.query(BlocoCaderno).join(Caderno).filter(Caderno.user_id == user_id).count()
        
        # Calcular total de questões estimadas (baseado na configuração dos cadernos)
        cadernos = Caderno.query.filter_by(user_id=user_id).all()
        total_questoes_estimadas = sum(c.qtd_blocos * c.qtd_questoes_por_bloco for c in cadernos)
        
        return jsonify({
            "success": True,
            "total_cadernos": total_cadernos,
            "total_blocos": total_blocos,
            "total_questoes": total_questoes_estimadas
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/cadernos', methods=['POST'])
def criar_caderno():
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    data = request.json
    titulo = data.get('titulo')
    serie = data.get('serie')
    qtd_blocos = int(data.get('qtd_blocos'))
    qtd_questoes_por_bloco = int(data.get('qtd_questoes_por_bloco'))
    if not all([titulo, serie, qtd_blocos, qtd_questoes_por_bloco]):
        return jsonify({'error': 'Todos os campos são obrigatórios!'}), 400
    caderno = Caderno(
        titulo=titulo,
        serie=serie,
        qtd_blocos=qtd_blocos,
        qtd_questoes_por_bloco=qtd_questoes_por_bloco,
        user_id=session['user_id']
    )
    db.session.add(caderno)
    db.session.flush()
    # Criar blocos: alternando entre Português e Matemática
    componentes = ['Português', 'Matemática']
    for i in range(qtd_blocos):
        bloco = BlocoCaderno(
            caderno_id=caderno.id,
            ordem=i+1,
            componente=componentes[i % 2],
            total_questoes=qtd_questoes_por_bloco
        )
        db.session.add(bloco)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Caderno cadastrado com sucesso!'})

@app.route('/api/cadernos/<int:caderno_id>', methods=['DELETE'])
def excluir_caderno(caderno_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    caderno = Caderno.query.get_or_404(caderno_id)
    if caderno.user_id != session['user_id']:
        return jsonify({'error': 'Acesso negado'}), 403
    
    try:
        # Primeiro, excluir manualmente os registros relacionados para evitar problemas de integridade
        
        # 1. Buscar todos os resultados relacionados ao caderno
        resultados = ResultadoAluno.query.filter_by(caderno_id=caderno_id).all()
        
        # 2. Para cada resultado, excluir suas respostas individuais
        for resultado in resultados:
            RespostaAluno.query.filter_by(resultado_id=resultado.id).delete()
        
        # 3. Excluir todos os resultados do caderno
        ResultadoAluno.query.filter_by(caderno_id=caderno_id).delete()
        
        # 4. Excluir questões dos blocos
        for bloco in caderno.blocos:
            BlocoQuestao.query.filter_by(bloco_id=bloco.id).delete()
        
        # 5. Agora podemos excluir o caderno seguramente (os blocos serão excluídos pelo cascade)
        db.session.delete(caderno)
        db.session.commit()
        
        print(f"✅ Caderno {caderno_id} excluído com sucesso")
        return jsonify({'success': True, 'message': 'Caderno excluído com sucesso!'})
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Erro ao excluir caderno {caderno_id}: {str(e)}")
        return jsonify({'error': f'Erro ao excluir caderno: {str(e)}'}), 500

@app.route('/api/cadernos/<int:caderno_id>', methods=['GET'])
def detalhar_caderno(caderno_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    caderno = Caderno.query.get_or_404(caderno_id)
    if caderno.user_id != session['user_id']:
        return jsonify({'error': 'Acesso negado'}), 403
    
    blocos = []
    for bloco in caderno.blocos:
        # Contar quantas questões estão configuradas para este bloco
        questoes_configuradas = BlocoQuestao.query.filter_by(bloco_id=bloco.id).count()
        
        blocos.append({
            'id': bloco.id,
            'ordem': bloco.ordem,
            'componente': bloco.componente,
            'total_questoes': bloco.total_questoes,
            'questoes_configuradas': questoes_configuradas
        })
    
    return jsonify({
        'success': True,
        'caderno': {
            'id': caderno.id,
            'codigo_caderno': caderno.codigo_caderno,
            'titulo': caderno.titulo,
            'serie': caderno.serie,
            'qtd_blocos': caderno.qtd_blocos,
            'qtd_questoes_por_bloco': caderno.qtd_questoes_por_bloco,
            'blocos': blocos
        }
    })

# Novos endpoints para busca por código de caderno
@app.route('/api/cadernos/buscar-por-codigo/<codigo>', methods=['GET'])
def buscar_caderno_por_codigo(codigo):
    """Busca caderno pelo código de 3 dígitos"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        # Validar formato do código
        if not codigo.isdigit() or len(codigo) > 3:
            return jsonify({'error': 'Código deve ter até 3 dígitos'}), 400
        
        # Buscar caderno pelo código
        caderno = Caderno.buscar_por_codigo(codigo)
        
        if not caderno:
            return jsonify({'error': 'Caderno não encontrado'}), 404
        
        # Verificar se pertence ao usuário
        if caderno.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        return jsonify({
            'success': True,
            'caderno': caderno.to_dict()
        })
        
    except Exception as e:
        print(f'[LOG] Erro ao buscar caderno por código: {e}')
        return jsonify({'error': 'Erro interno'}), 500

@app.route('/api/cadernos/codigo/<codigo>/dados-completos', methods=['GET'])
def buscar_caderno_dados_completos(codigo):
    """Busca dados completos do caderno pelo código de 3 dígitos"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        # Validar formato do código
        if not codigo.isdigit() or len(codigo) > 3:
            return jsonify({'error': 'Código deve ter até 3 dígitos'}), 400
        
        # Buscar caderno com dados completos
        caderno = Caderno.buscar_por_codigo_com_dados(codigo)
        
        if not caderno:
            return jsonify({'error': 'Caderno não encontrado'}), 404
        
        # Verificar se pertence ao usuário
        if caderno.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Preparar dados dos blocos
        blocos = []
        for bloco in caderno.blocos:
            questoes_configuradas = BlocoQuestao.query.filter_by(bloco_id=bloco.id).count()
            blocos.append({
                'id': bloco.id,
                'ordem': bloco.ordem,
                'componente': bloco.componente,
                'total_questoes': bloco.total_questoes,
                'questoes_configuradas': questoes_configuradas
            })
        
        return jsonify({
            'success': True,
            'caderno': {
                'id': caderno.id,
                'codigo_caderno': caderno.codigo_caderno,
                'titulo': caderno.titulo,
                'serie': caderno.serie,
                'qtd_blocos': caderno.qtd_blocos,
                'qtd_questoes_por_bloco': caderno.qtd_questoes_por_bloco,
                'blocos': blocos,
                'user_id': caderno.user_id
            }
        })
        
    except Exception as e:
        print(f'[LOG] Erro ao buscar dados completos do caderno: {e}')
        return jsonify({'error': 'Erro interno'}), 500

@app.route('/api/cadernos/verificar-auto-increment', methods=['GET'])
def verificar_configuracao_codigo_caderno():
    """Verifica se a configuração de código de 3 dígitos está ativa"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        # Verificar AUTO_INCREMENT atual
        result = db.session.execute("SHOW TABLE STATUS LIKE 'caderno'").fetchone()
        auto_increment = result[10] if result else None  # Coluna Auto_increment
        
        # Verificar último caderno criado
        ultimo_caderno = Caderno.query.order_by(Caderno.id.desc()).first()
        ultimo_id = ultimo_caderno.id if ultimo_caderno else None
        
        # Verificar se há IDs com menos de 3 dígitos
        cadernos_ids_baixos = Caderno.query.filter(Caderno.id < 100).count()
        
        return jsonify({
            'success': True,
            'configuracao': {
                'auto_increment_atual': auto_increment,
                'ultimo_id_usado': ultimo_id,
                'ultimo_codigo': f"{ultimo_id:03d}" if ultimo_id else None,
                'proximo_codigo': f"{auto_increment:03d}" if auto_increment else None,
                'ids_com_menos_3_digitos': cadernos_ids_baixos,
                'configuracao_ok': auto_increment and auto_increment >= 100 and cadernos_ids_baixos == 0
            }
        })
        
    except Exception as e:
        print(f'[LOG] Erro ao verificar configuração do caderno: {e}')
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/cadernos/garantir-id-3-digitos', methods=['POST'])
def garantir_auto_increment_3_digitos_caderno():
    """Garante que o próximo caderno criado terá ID de 3 dígitos"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        # Verificar se usuário é admin
        user = User.query.get(session['user_id'])
        if not user or user.tipo_usuario != 'admin':
            return jsonify({'error': 'Apenas administradores podem executar esta ação'}), 403
        
        # Verificar último ID
        ultimo_caderno = Caderno.query.order_by(Caderno.id.desc()).first()
        ultimo_id = ultimo_caderno.id if ultimo_caderno else 99
        
        # Configurar próximo ID para ser pelo menos 100
        proximo_id = max(ultimo_id + 1, 100)
        
        # Ajustar AUTO_INCREMENT
        db.session.execute(f"ALTER TABLE caderno AUTO_INCREMENT = {proximo_id}")
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'AUTO_INCREMENT configurado para {proximo_id}',
            'proximo_id': proximo_id,
            'proximo_codigo': f"{proximo_id:03d}"
        })
        
    except Exception as e:
        print(f'[LOG] Erro ao configurar AUTO_INCREMENT do caderno: {e}')
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/cadernos/bloco/<int:bloco_id>')
def cadastrar_questoes_bloco(bloco_id):
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    bloco = BlocoCaderno.query.get_or_404(bloco_id)
    caderno = Caderno.query.get(bloco.caderno_id)
    if caderno.user_id != session['user_id']:
        return redirect(url_for('cadernos'))
    
    # Buscar questões do usuário para o componente curricular do bloco
    user_id = session['user_id']
    componente = bloco.componente
    serie = caderno.serie
    
    # Buscar questões do usuário que correspondam ao componente do bloco E ao ano/série
    # Primeiro buscar habilidades do componente e ano desejado
    
    # Mapear "Português" para "Língua Portuguesa" se necessário
    componente_filtro = componente
    if componente == "Português":
        componente_filtro = "Língua Portuguesa"
    
    habilidades = Habilidade.query.filter(
        Habilidade.componente == componente_filtro,
        Habilidade.ano == serie
    ).all()
    
    habilidades_ids = [h.id for h in habilidades]
    
    # Se não há habilidades, retorna lista vazia
    if not habilidades_ids:
        questoes = []
    else:
        # Buscar questões que usam essas habilidades e são do usuário
        questoes = Questao.query.filter(
            Questao.user_id == user_id,
            Questao.habilidade_id.in_(habilidades_ids)
        ).all()
    
    # Buscar questões já atribuídas ao bloco
    questoes_atribuidas = BlocoQuestao.query.filter_by(bloco_id=bloco_id).order_by(BlocoQuestao.ordem).all()
    questoes_atribuidas_ids = [bq.questao_id for bq in questoes_atribuidas]
    
    # Filtrar questões disponíveis (não atribuídas)
    questoes_disponiveis = [q.id for q in questoes if q.id not in questoes_atribuidas_ids]
    
    return render_template(
        'cadastrar-questoes-bloco.html', 
        bloco=bloco, 
        caderno=caderno, 
        questoes_ids=questoes_disponiveis,
        questoes_atribuidas_ids=questoes_atribuidas_ids,
        componente=componente,
        serie=serie
    )

@app.route('/api/cadernos/bloco/<int:bloco_id>/questoes', methods=['POST'])
def atribuir_questoes_bloco(bloco_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    bloco = BlocoCaderno.query.get_or_404(bloco_id)
    caderno = Caderno.query.get(bloco.caderno_id)
    
    if caderno.user_id != session['user_id']:
        return jsonify({'error': 'Acesso negado'}), 403
    
    data = request.json
    questoes_ids = data.get('questoes_ids', [])
    
    if len(questoes_ids) != bloco.total_questoes:
        return jsonify({'error': f'É necessário selecionar exatamente {bloco.total_questoes} questões'}), 400
    
    # Verificar se as questões pertencem ao usuário E são do ano correto
    # Primeiro buscar habilidades do ano do caderno
    habilidades_ids = [h.id for h in Habilidade.query.filter(Habilidade.ano == caderno.serie).all()]
    
    questoes = Questao.query.filter(
        Questao.id.in_(questoes_ids),
        Questao.user_id == session['user_id'],
        Questao.habilidade_id.in_(habilidades_ids)
    ).all()
    
    if len(questoes) != len(questoes_ids):
        return jsonify({'error': 'Uma ou mais questões inválidas'}), 400
    
    try:
        # Remover questões antigas do bloco
        BlocoQuestao.query.filter_by(bloco_id=bloco_id).delete()
        
        # Adicionar novas questões ao bloco
        for ordem, questao_id in enumerate(questoes_ids, 1):
            bloco_questao = BlocoQuestao(
                bloco_id=bloco_id,
                questao_id=questao_id,
                ordem=ordem
            )
            db.session.add(bloco_questao)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Questões atribuídas com sucesso!'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao salvar questões: {str(e)}'}), 500

@app.route('/api/cadernos/bloco/<int:bloco_id>/questoes', methods=['GET'])
def listar_questoes_bloco(bloco_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    bloco = BlocoCaderno.query.get_or_404(bloco_id)
    caderno = Caderno.query.get(bloco.caderno_id)
    if caderno.user_id != session['user_id']:
        return jsonify({'error': 'Acesso negado'}), 403
    questoes_bloco = BlocoQuestao.query.filter_by(bloco_id=bloco_id).order_by(BlocoQuestao.ordem).all()
    result = []
    for bq in questoes_bloco:
        try:
            questao = bq.questao
            habilidade = Habilidade.query.get(questao.habilidade_id)
            
            # Detectar o modelo da questão e criar alternativas adequadamente
            alternativas = []
            
            # Modelo 1: Tabela Alternativa separada (sistema novo)
            # Primeiro, buscar alternativas na tabela separada
            alternativas_db = Alternativa.query.filter_by(questao_id=questao.id).order_by(Alternativa.id).all()
            
            if alternativas_db:
                print(f"[DEBUG] Questão {questao.id}: usando modelo com tabela Alternativa ({len(alternativas_db)} encontradas)")
                try:
                    for alt in alternativas_db:
                        alternativas.append({
                            'texto': alt.texto,
                            'correta': alt.correta
                        })
                except Exception as e:
                    print(f"Erro ao acessar alternativas da questão {questao.id}: {e}")
                    alternativas = []
            
            # Modelo 2: Campos diretos na questão (sistema migrado)
            elif hasattr(questao, 'alternativa_a') and questao.alternativa_a:
                print(f"[DEBUG] Questão {questao.id}: usando modelo com campos diretos")
                # Criar alternativas a partir dos campos diretos
                alts_textos = [
                    questao.alternativa_a,
                    questao.alternativa_b, 
                    questao.alternativa_c,
                    questao.alternativa_d
                ]
                
                resposta_correta = getattr(questao, 'resposta_correta', '')
                
                for i, texto in enumerate(alts_textos):
                    if texto and texto.strip():  # Só incluir alternativas com texto
                        letra = chr(65 + i)  # A, B, C, D
                        alternativas.append({
                            'texto': texto,
                            'correta': (resposta_correta == letra)
                        })
            
            print(f"[DEBUG] Questão {questao.id}: {len(alternativas)} alternativas processadas")
            
            result.append({
                'id': questao.id,
                'enunciado': questao.enunciado or '',
                'alternativas': alternativas,
                'ano': habilidade.ano if habilidade else None,
                'habilidade_codigo': habilidade.codigo if habilidade else None,
                'habilidade_descricao': habilidade.descricao if habilidade else None,
                'ordem': bq.ordem
            })
        except Exception as e:
            print(f"Erro ao processar questão do bloco {bloco_id}: {e}")
            continue
    
    return jsonify({'questoes': result})

@app.route('/api/cadernos/bloco/<int:bloco_id>/questao/<int:questao_id>', methods=['DELETE'])
def remover_questao_bloco(bloco_id, questao_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    bloco = BlocoCaderno.query.get_or_404(bloco_id)
    caderno = Caderno.query.get(bloco.caderno_id)
    if caderno.user_id != session['user_id']:
        return jsonify({'error': 'Acesso negado'}), 403
    bloco_questao = BlocoQuestao.query.filter_by(bloco_id=bloco_id, questao_id=questao_id).first()
    if not bloco_questao:
        return jsonify({'error': 'Questão não encontrada no bloco'}), 404
    db.session.delete(bloco_questao)
    # Ajustar ordem das demais questões
    questoes_restantes = BlocoQuestao.query.filter_by(bloco_id=bloco_id).order_by(BlocoQuestao.ordem).all()
    for idx, bq in enumerate(questoes_restantes, 1):
        bq.ordem = idx
    db.session.commit()
    return jsonify({'success': True, 'message': 'Questão removida do bloco com sucesso!'})

@app.route('/api/cadernos/bloco/<int:bloco_id>/questoes/ordenar', methods=['PATCH'])
def reordenar_questoes_bloco(bloco_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    bloco = BlocoCaderno.query.get_or_404(bloco_id)
    caderno = Caderno.query.get(bloco.caderno_id)
    if caderno.user_id != session['user_id']:
        return jsonify({'error': 'Acesso negado'}), 403
    data = request.json
    nova_ordem = data.get('nova_ordem', [])  # lista de questao_id na nova ordem
    if not nova_ordem:
        return jsonify({'error': 'Lista de nova ordem não fornecida'}), 400
    questoes_bloco = BlocoQuestao.query.filter_by(bloco_id=bloco_id).all()
    questao_id_para_bq = {bq.questao_id: bq for bq in questoes_bloco}
    for idx, questao_id in enumerate(nova_ordem, 1):
        bq = questao_id_para_bq.get(questao_id)
        if bq:
            bq.ordem = idx
    db.session.commit()
    return jsonify({'success': True, 'message': 'Ordem das questões atualizada com sucesso!'})

@app.route('/api/cadernos/<int:caderno_id>/cartoes-gabarito', methods=['POST'])
def gerar_cartoes_gabarito(caderno_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    # Buscar o caderno e verificar se pertence ao usuário
    caderno = Caderno.query.get_or_404(caderno_id)
    if caderno.user_id != session['user_id']:
        return jsonify({'error': 'Acesso negado'}), 403
    
    # Buscar usuário logado (professor)
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    
    # Buscar turmas do ano/série do caderno para o usuário
    turmas = Turma.query.filter_by(ano=caderno.serie, user_id=session['user_id']).all()
    
    if not turmas:
        return jsonify({'error': f'Nenhuma turma encontrada para o {caderno.serie}º ano'}), 404
    
    # Buscar todos os alunos das turmas encontradas
    alunos = []
    for turma in turmas:
        alunos_turma = Aluno.query.filter_by(turma_id=turma.id, user_id=session['user_id']).all()
        for aluno in alunos_turma:
            # Buscar dados da escola
            escola = Escola.query.get(aluno.escola_id)
            alunos.append({
                'id': aluno.id,  # ID do aluno para QR Code
                'nome': aluno.nome,
                'turma': turma,
                'escola': escola,
                'turma_id': turma.id,  # ID da turma para QR Code
                'escola_id': escola.id if escola else None  # ID da escola para QR Code
            })
    
    if not alunos:
        return jsonify({'error': 'Nenhum aluno encontrado nas turmas correspondentes'}), 404
    
    # Buscar blocos do caderno
    blocos = BlocoCaderno.query.filter_by(caderno_id=caderno_id).order_by(BlocoCaderno.ordem).all()
    
    # Gerar PDF com QR Code usando template existente
    try:
        import os
        # Caminho absoluto baseado na localização deste arquivo
        current_dir = os.path.dirname(os.path.abspath(__file__))
        template_path = os.path.join(current_dir, "modelo padrão.pdf")
        
        print(f"🔍 Procurando template em: {template_path}")
        print(f"📁 Diretório atual: {current_dir}")
        print(f"📋 Arquivos no diretório: {[f for f in os.listdir(current_dir) if f.endswith('.pdf')]}")
        
        # Verificar se existe o template
        if os.path.exists(template_path):
            print("✅ Template PDF padrão encontrado!")
            print(f"📏 Tamanho do arquivo: {os.path.getsize(template_path)} bytes")
            pdf_buffer = gerar_gabarito_com_template_e_qr(template_path, alunos, caderno, user.name, blocos)
        else:
            print("❌ Template não encontrado, usando geração padrão")
            pdf_buffer = gerar_pdf_cartoes_gabarito_com_qr(caderno, blocos, alunos, user.name)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f'cartoes_gabarito_{caderno.titulo.replace(" ", "_")}.pdf',
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"Erro detalhado ao gerar PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro ao gerar PDF: {str(e)}'}), 500

def gerar_gabarito_com_template_e_qr(template_path, alunos, caderno, nome_professor, blocos):
    """Gera gabarito usando template PDF existente + QR Code - Layout Organizado"""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm, mm
        from reportlab.lib import colors
        import qrcode
        import json
        import uuid
        from io import BytesIO
        
        print(f"📄 Iniciando geração com template: {template_path}")
        print(f"👥 Gerando para {len(alunos)} aluno(s)")
        print(f"📚 Caderno: {caderno.titulo} (ID: {caderno.id})")
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        
        # Dimensões da página A4
        width, height = A4
        print(f"📐 Dimensões da página: {width} x {height}")
        
        def gerar_qr_code(dados_qr):
            """Gera QR Code com dados do aluno"""
            try:
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_M,
                    box_size=8,
                    border=2,
                )
                
                qr_data = json.dumps(dados_qr, separators=(',', ':'))
                qr.add_data(qr_data)
                qr.make(fit=True)
                
                qr_img = qr.make_image(fill_color="black", back_color="white")
                
                qr_buffer = BytesIO()
                qr_img.save(qr_buffer, format='PNG')
                qr_buffer.seek(0)
                
                return qr_buffer
            except Exception as qr_error:
                print(f"❌ Erro ao gerar QR Code: {qr_error}")
                raise qr_error
        
        # Gerar uma página para cada aluno
        for i, aluno_data in enumerate(alunos):
            aluno = aluno_data
            turma = aluno['turma']
            escola = aluno['escola']
            
            # ID único para o gabarito
            gabarito_id = str(uuid.uuid4())[:8].upper()
            
            # Dados para o QR Code incluindo matrícula e código do caderno
            qr_dados = {
                "aluno_id": aluno['id'],
                "aluno_matricula": f"{aluno['id']:05d}",  # Matrícula de 5 dígitos
                "aluno_nome": aluno['nome'],
                "caderno_id": caderno.id,
                "caderno_codigo": f"{caderno.id:03d}",  # Código do caderno de 3 dígitos
                "caderno_titulo": caderno.titulo,
                "turma_id": aluno['turma_id'],
                "turma_nome": turma.nome,
                "escola_id": aluno['escola_id'],
                "escola_nome": escola.nome if escola else "N/A",
                "gabarito_id": gabarito_id,
                "serie": caderno.serie,
                "total_questoes": sum(b.total_questoes for b in blocos),
                "tipo": "edu_gabarito_qr",
                "versao": "2.0"
            }
            
            # Carregar template base como imagem de fundo
            try:
                from reportlab.lib.utils import ImageReader
                from PIL import Image as PILImage
                import fitz  # PyMuPDF para converter PDF em imagem
                
                # Converter primeira página do PDF template para imagem
                pdf_doc = fitz.open(template_path)
                page = pdf_doc[0]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # Resolução 2x
                img_data = pix.tobytes("png")
                pdf_doc.close()
                
                # Criar imagem a partir dos bytes
                template_img = PILImage.open(BytesIO(img_data))
                template_reader = ImageReader(BytesIO(img_data))
                
                # Desenhar template como fundo
                c.drawImage(template_reader, 0, 0, width=width, height=height)
                
            except Exception as template_error:
                print(f"⚠️ Erro ao carregar template como imagem: {template_error}")
                
                # Se não conseguir carregar template, criar layout básico
                c.setFont("Helvetica-Bold", 16)
                c.drawString(50, height - 50, "FOLHA DE RESPOSTA - GABARITO EDU PLATAFORMA")
            
            # ============= POSICIONAMENTO ORGANIZADO DOS CAMPOS =============
            
            # 1. QR CODE NO CANTO SUPERIOR ESQUERDO
            qr_buffer = gerar_qr_code(qr_dados)
            qr_reader = ImageReader(qr_buffer)
            
            qr_size = 70  # Tamanho do QR Code em pontos
            qr_x = 30  # Margem esquerda
            qr_y = height - qr_size - 30  # 30 pontos do topo
            
            c.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)
            
            # Texto do QR Code
            c.setFont("Helvetica-Bold", 7)
            c.drawString(qr_x, qr_y - 10, "ESCANEIE NO APP")
            
            # 2. CÓDIGO DO CADERNO NO CANTO SUPERIOR DIREITO
            c.setFont("Helvetica-Bold", 12)
            c.setFillColor(colors.black)
            codigo_caderno_text = f"{caderno.id:03d}"  # Apenas os números
            cod_width = c.stringWidth(codigo_caderno_text, "Helvetica-Bold", 12)
            c.drawString(width - cod_width - 97, height - 46, codigo_caderno_text)  # Mais à direita
            
            # 3. MATRÍCULA ABAIXO DO CÓDIGO DO CADERNO
            c.setFont("Helvetica-Bold",12)
            c.setFillColor(colors.black)
            matricula_text = f"{aluno['id']:05d}"  # Apenas os números
            mat_width = c.stringWidth(matricula_text, "Helvetica-Bold", 12)
            c.drawString(width - mat_width - 87, height - 73, matricula_text)  # Mais à direita
            
            # 4. PREENCHIMENTO DOS CAMPOS DO TEMPLATE (baseado no layout padrão)
            c.setFillColor(colors.black)  # Voltar cor padrão
            
            # Baseado na análise do template, as posições aproximadas dos campos são:
            # As coordenadas são baseadas no template padrão do gabarito
            
            # Campo Professor (retângulo superior esquerdo do cabeçalho)
            c.setFont("Helvetica-Bold", 11)
            c.drawString(25, height - 170, nome_professor[:30])  # Limitar tamanho
            
            # Campo Escola (campo escola no cabeçalho)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(25, height - 210, escola.nome[:35] if escola else "N/A")
            
            # Campo Turno (campo à direita)
            c.setFont("Helvetica-Bold", 10)
            turno_text = turma.turno if (turma and hasattr(turma, 'turno') and turma.turno) else "Tarde"
            c.drawString(384, height - 212, turno_text)
            
            # Campo Nome do Aluno (campo principal - maior)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(25, height - 255, aluno['nome'][:45])  # Nome do aluno
            
            # Campo Série/Turma (campo à direita do nome)
            c.setFont("Helvetica-Bold", 10)
            if turma and hasattr(turma, 'nome') and turma.nome:
                # Limpar formatação redundante da turma
                turma_nome = turma.nome.replace('º ANO - ', '').replace('ANO - ', '')
                serie_turma_text = f"{caderno.serie}º ano - {turma_nome}"
            else:
                serie_turma_text = f"{caderno.serie}º ano - A"
            c.drawString(380, height - 250, serie_turma_text[:25])
       
            # Quebra de página (exceto no último aluno)
            if i < len(alunos) - 1:
                c.showPage()
        
        # Finalizar PDF
        c.save()
        buffer.seek(0)
        
        print(f"✅ PDF gerado com template organizado + QR Code para {len(alunos)} aluno(s)")
        return buffer
        
    except Exception as e:
        print(f"❌ Erro ao gerar PDF com template: {str(e)}")
        # Fallback para função simples sem template
        return gerar_pdf_cartoes_gabarito_simples(caderno, blocos, alunos, nome_professor)

def gerar_pdf_cartoes_gabarito_com_qr(caderno, blocos, alunos, nome_professor):
    """Função de fallback - gera PDF simples com QR Code sem template"""
    return gerar_pdf_cartoes_gabarito_simples(caderno, blocos, alunos, nome_professor)

def gerar_pdf_cartoes_gabarito_simples(caderno, blocos, alunos, nome_professor):
    """Gera PDF simples com layout básico + QR Code"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm, mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus.flowables import Flowable
    from reportlab.graphics.shapes import Drawing, Circle
    import qrcode
    import json
    import uuid
    from io import BytesIO
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                          rightMargin=1.5*cm, leftMargin=1.5*cm,
                          topMargin=1*cm, bottomMargin=1*cm)
    
    styles = getSampleStyleSheet()
    
    # Estilos profissionais
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=10,
        alignment=TA_CENTER,
        textColor=colors.black,
        fontName='Helvetica-Bold'
    )
    
    def gerar_qr_code(dados_qr):
        """Gera QR Code com dados do aluno e retorna como imagem"""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        
        # Dados para o QR Code
        qr_data = json.dumps(dados_qr, separators=(',', ':'))
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        # Criar imagem do QR Code
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Converter para bytes
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        return qr_buffer
    
    story = []
    
    for i, aluno_data in enumerate(alunos):
        aluno = aluno_data
        turma = aluno['turma']
        escola = aluno['escola']
        
        # ID único para o gabarito
        gabarito_id = str(uuid.uuid4())[:8].upper()
        
        # Dados para o QR Code incluindo matrícula e código do caderno
        qr_dados = {
            "aluno_id": aluno['id'],
            "aluno_matricula": f"{aluno['id']:05d}",  # Matrícula de 5 dígitos
            "aluno_nome": aluno['nome'],
            "caderno_id": caderno.id,
            "caderno_codigo": f"{caderno.id:03d}",  # Código do caderno de 3 dígitos
            "caderno_titulo": caderno.titulo,
            "turma_id": aluno['turma_id'],
            "turma_nome": turma.nome,
            "escola_id": aluno['escola_id'],
            "escola_nome": escola.nome if escola else "N/A",
            "gabarito_id": gabarito_id,
            "serie": caderno.serie,
            "total_questoes": sum(b.total_questoes for b in blocos),
            "tipo": "edu_gabarito_qr",
            "versao": "2.0"
        }
        
        # Gerar QR Code
        qr_buffer = gerar_qr_code(qr_dados)
        
        # Título principal
        story.append(Paragraph("FOLHA DE RESPOSTA - GABARITO EDU PLATAFORMA", title_style))
        story.append(Spacer(1, 0.3*cm))
        
        # Layout organizado com QR Code real na primeira coluna
        qr_image = Image(qr_buffer, width=2.5*cm, height=2.5*cm)
        
        layout_data = [
            [qr_image, 'DADOS DO ALUNO E AVALIAÇÃO', f'{caderno.id:03d}'],  # Apenas números
            ['ESCANEIE\nNO APP', f'Professor(a): {nome_professor}', f'{aluno["id"]:05d}'],  # Apenas números
            ['', f'Escola: {escola.nome if escola else "N/A"}', f'ID: {gabarito_id}'],
            ['', f'Aluno(a): {aluno["nome"]}', f'Data: ___/___/______'],
            ['', f'Turma: {turma.nome}', f'{caderno.serie}º ano'],
            ['', f'Turno: {turma.turno if turma else "N/A"}', f'Total: {sum(b.total_questoes for b in blocos)} questões']
        ]
        
        # Criar tabela principal com layout organizado
        layout_table = Table(layout_data, colWidths=[3*cm, 9*cm, 4*cm])
        layout_table.setStyle(TableStyle([
            # Alinhamentos
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # QR Code centralizado
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),    # Dados alinhados à esquerda
            ('ALIGN', (2, 0), (2, -1), 'CENTER'),  # Códigos centralizados
            ('VALIGN', (0, 0), (0, -1), 'MIDDLE'), # QR Code centralizado verticalmente
            
            # Fontes
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),   # Cabeçalho dados
            ('FONTSIZE', (1, 0), (1, 0), 11),
            ('FONTNAME', (0, 1), (0, 1), 'Helvetica-Bold'),   # Texto "ESCANEIE"
            ('FONTSIZE', (0, 1), (0, 1), 7),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),       # Dados do aluno
            ('FONTSIZE', (1, 1), (1, -1), 10),
            ('FONTNAME', (2, 0), (2, -1), 'Times-Bold'),      # Códigos em Times New Roman
            ('FONTSIZE', (2, 0), (2, -1), 14),                # Aumentar tamanho
            ('FONTNAME', (2, 1), (2, 1), 'Times-Bold'),       # Matrícula em Times New Roman
            ('FONTSIZE', (2, 1), (2, 1), 13),                 # Tamanho específico para matrícula
            
            # Bordas
            ('GRID', (0, 0), (-1, -1), 1.5, colors.black),
            
            # Cores de fundo
            ('BACKGROUND', (0, 0), (0, 1), colors.yellow),     # Área QR Code
            ('BACKGROUND', (1, 0), (1, 0), colors.lightgrey), # Cabeçalho dados
            ('BACKGROUND', (2, 0), (2, 0), colors.lightcoral), # Código caderno
            ('BACKGROUND', (2, 1), (2, 1), colors.lightblue),  # Matrícula
            
            # Padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            
            # Destaque especial para código e matrícula
            ('TEXTCOLOR', (2, 0), (2, 0), colors.darkred),   # Código em vermelho
            ('TEXTCOLOR', (2, 1), (2, 1), colors.darkblue),  # Matrícula em azul
            
            # Fazer o QR Code ocupar duas linhas
            ('SPAN', (0, 0), (0, 1)),  # QR Code ocupa primeira e segunda linha
        ]))
        
        story.append(layout_table)
        story.append(Spacer(1, 0.2*cm))
        
        # Adicionar QR Code na coluna da esquerda (já está na tabela principal)
        # Criar rodapé com informações de identificação
        footer_data = [
            [f'🔍 QR CODE PARA ESCANEAMENTO', f'IDENTIFICAÇÃO ÚNICA'],
            ['ESCANEIE NO APP', f'ID: {gabarito_id} | {aluno["id"]:05d} | {caderno.id:03d}'],  # Apenas números
            ['', f'Aluno: {aluno["nome"][:30]}']
        ]
        
        footer_table = Table(footer_data, colWidths=[8*cm, 8*cm])
        footer_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTNAME', (0, 1), (-1, -1), 'Courier'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightyellow),
            ('BACKGROUND', (1, 0), (1, 0), colors.lightcoral),
            ('TEXTCOLOR', (1, 1), (1, 1), colors.darkred),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        story.append(footer_table)
        story.append(Spacer(1, 0.4*cm))
        
        # Adicionar break de página para o próximo aluno
        if i < len(alunos) - 1:
            story.append(PageBreak())
    
    # Construir o PDF
    doc.build(story)
    buffer.seek(0)
    
    print(f"✅ PDF simples gerado com QR Code para {len(alunos)} aluno(s)")
    return buffer

# =================== API PARA HABILIDADES FILTRADAS ===================

@app.route('/api/habilidades', methods=['GET'])
def listar_habilidades_filtradas():
    """API para listar habilidades filtradas por componente e ano - usada no frontend"""
    componente = request.args.get('componente')
    ano = request.args.get('ano')
    
    query = Habilidade.query
    
    if componente:
        # Mapear "Português" para "Língua Portuguesa" se necessário
        if componente == "Português":
            componente = "Língua Portuguesa"
        query = query.filter(Habilidade.componente == componente)
    
    if ano:
        query = query.filter(Habilidade.ano == int(ano))
    
    habilidades = query.order_by(Habilidade.codigo).all()
    
    return jsonify({
        'habilidades': [{
            'id': h.id,
            'codigo': h.codigo,
            'componente': h.componente,
            'ano': h.ano,
            'descricao': h.descricao
        } for h in habilidades]
    })

# =================== APIS PARA LANÇA RESULTADO ===================

@app.route('/api/resultados', methods=['GET'])
def listar_resultados():
    """API para listar resultados dos alunos com base nos filtros aplicados"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        print(f"[DEBUG] Iniciando listar_resultados para user_id: {session['user_id']}")
        # Obter parâmetros dos filtros
        ano = request.args.get('ano')
        periodo = request.args.get('periodo')
        serie = request.args.get('serie')
        escola_id = request.args.get('escola')
        turma_id = request.args.get('turma')
        caderno_id = request.args.get('caderno')
        componente = request.args.get('componente')
        
        print(f"[DEBUG] Filtros recebidos: ano={ano}, periodo={periodo}, serie={serie}, escola={escola_id}, turma={turma_id}, caderno={caderno_id}, componente={componente}")
        
        if not all([ano, periodo, serie, escola_id, turma_id, caderno_id, componente]):
            return jsonify({'error': 'Todos os filtros são obrigatórios'}), 400
        
        # Buscar o caderno e seus blocos
        caderno = Caderno.query.get_or_404(caderno_id)
        if caderno.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        print(f"[DEBUG] Caderno encontrado: {caderno.titulo}, qtd_blocos={caderno.qtd_blocos}, qtd_questoes_por_bloco={caderno.qtd_questoes_por_bloco}")
        
        # Buscar blocos do caderno
        blocos = BlocoCaderno.query.filter_by(caderno_id=caderno_id).order_by(BlocoCaderno.ordem).all()
        print(f"[DEBUG] Blocos encontrados: {len(blocos)}")
        for bloco in blocos:
            print(f"[DEBUG]   Bloco {bloco.ordem}: {bloco.componente} - {bloco.total_questoes} questões")
        
        # Filtrar blocos por componente se não for "Ambos"
        if componente != 'Ambos':
            blocos_filtrados = [b for b in blocos if b.componente == componente]
            print(f"[DEBUG] Blocos filtrados para componente '{componente}': {len(blocos_filtrados)}")
            for bloco in blocos_filtrados:
                print(f"[DEBUG]   Bloco filtrado {bloco.ordem}: {bloco.componente} - {bloco.total_questoes} questões")
            blocos = blocos_filtrados
        
        # Calcular total de questões com base nos blocos filtrados
        total_questoes = sum(bloco.total_questoes for bloco in blocos)
        print(f"[DEBUG] Total de questões calculado: {total_questoes}")
        
        # CORREÇÃO: Garantir que o total seja correto para evitar bugs de contagem
        if len(blocos) == 0:
            print(f"[ERROR] Nenhum bloco encontrado para o componente '{componente}'")
            return jsonify({'error': f'Nenhum bloco encontrado para o componente {componente}'}), 400
        
        # Buscar alunos da turma com filtro de série
        alunos = Aluno.query.join(Turma).filter(
            Aluno.turma_id == turma_id,
            Aluno.user_id == session['user_id'],
            Turma.ano == int(serie)
        ).all()
        
        print(f"[DEBUG] Buscando alunos da turma {turma_id}, série {serie}")
        print(f"[DEBUG] Encontrados {len(alunos)} alunos")
        for aluno in alunos:
            turma_aluno = Turma.query.get(aluno.turma_id)
            print(f"[DEBUG] Aluno: {aluno.nome}, Turma: {turma_aluno.nome if turma_aluno else 'N/A'}, Série: {turma_aluno.ano if turma_aluno else 'N/A'}")
        
        # Buscar resultados existentes para cada aluno
        resultados_alunos = []
        alunos_com_resultado = 0
        
        for aluno in alunos:
            # Buscar resultado existente com filtros de ano e período
            resultado = ResultadoAluno.query.filter_by(
                aluno_id=aluno.id,
                caderno_id=caderno_id,
                user_id=session['user_id'],
                ano_avaliacao=ano,
                periodo_avaliacao=periodo
            ).first()
            
            # Buscar dados da turma
            turma = Turma.query.get(aluno.turma_id)
            
            if resultado and resultado.fez_prova:
                print(f"[DEBUG] Aluno {aluno.nome} - Resultado encontrado: fez_prova={resultado.fez_prova}")
                print(f"[DEBUG] Total acertos no banco: {resultado.total_acertos}, Total questões: {resultado.total_questoes}")
                
                # Recalcular acertos baseado no componente filtrado
                if componente != 'Ambos':
                    # Buscar respostas do resultado específico filtradas por componente
                    respostas = db.session.query(RespostaAluno).join(
                        BlocoCaderno, RespostaAluno.bloco_id == BlocoCaderno.id
                    ).filter(
                        RespostaAluno.resultado_id == resultado.id,
                        BlocoCaderno.componente == componente
                    ).all()
                    acertos_filtrado = sum(1 for r in respostas if r.acertou)
                    print(f"[DEBUG] Componente filtrado: {componente}, Acertos: {acertos_filtrado}/{len(respostas)}")
                else:
                    acertos_filtrado = resultado.total_acertos
                    print(f"[DEBUG] Usando total_acertos do resultado: {acertos_filtrado}")
                
                resultados_alunos.append({
                    'id': aluno.id,
                    'nome': aluno.nome,
                    'turma_nome': turma.nome if turma else 'N/A',
                    'status': 'concluido',
                    'acertos': acertos_filtrado,
                    'total_questoes': total_questoes,
                    'percentual': round((acertos_filtrado / total_questoes) * 100, 1) if total_questoes > 0 else 0
                })
                alunos_com_resultado += 1
            else:
                print(f"[DEBUG] Aluno {aluno.nome} - Nenhum resultado para ano={ano}, periodo={periodo} - NÃO INCLUÍDO")
                # NÃO adicionar alunos sem resultado para o período específico
        
        print(f"[DEBUG] Total de alunos com resultado para ano={ano}, periodo={periodo}: {alunos_com_resultado}")
        
        # Preparar dados do caderno para o frontend (definir ANTES de qualquer retorno)
        caderno_data = {
            'id': caderno.id,
            'titulo': caderno.titulo,
            'serie': caderno.serie,
            'blocos': [{
                'id': bloco.id,
                'ordem': bloco.ordem,
                'componente': bloco.componente,
                'total_questoes': bloco.total_questoes
            } for bloco in blocos]
        }
        
        # Se não há nenhum resultado para o período, retornar lista vazia
        if len(resultados_alunos) == 0:
            print(f"[DEBUG] Nenhum resultado encontrado para ano={ano}, periodo={periodo} - Retornando lista vazia")
            return jsonify({
                'success': True,
                'caderno': caderno_data,
                'alunos': [],
                'message': f'Nenhum resultado encontrado para o período {periodo} do ano {ano}'
            })
        
        print(f"[DEBUG] Retornando {len(resultados_alunos)} alunos, total_questoes para frontend: {total_questoes}")
        
        return jsonify({
            'success': True,
            'caderno': caderno_data,
            'alunos': resultados_alunos
        })
                
    except Exception as e:
        print(f"[ERROR] Erro em listar_resultados: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/resultados', methods=['POST'])
def salvar_resultado():
    """API para salvar resultado de um aluno"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        data = request.json
        aluno_id = data.get('aluno_id')
        caderno_id = data.get('caderno_id')
        ano_avaliacao = data.get('ano_avaliacao')
        periodo_avaliacao = data.get('periodo_avaliacao')
        status = data.get('status', 'pendente')
        fez_prova = (status == 'concluido')
        respostas = data.get('respostas', {})
        
        if not aluno_id or not caderno_id:
            return jsonify({'error': 'aluno_id e caderno_id são obrigatórios'}), 400
        
        # Verificar se o aluno pertence ao usuário
        aluno = Aluno.query.get_or_404(aluno_id)
        if aluno.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Verificar se o caderno pertence ao usuário
        caderno = Caderno.query.get_or_404(caderno_id)
        if caderno.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar ou criar resultado do aluno com filtros de ano e período
        resultado = ResultadoAluno.query.filter_by(
            aluno_id=aluno_id,
            caderno_id=caderno_id,
            user_id=session['user_id'],
            ano_avaliacao=ano_avaliacao,
            periodo_avaliacao=periodo_avaliacao
        ).first()
        
        if not resultado:
            resultado = ResultadoAluno(
                aluno_id=aluno_id,
                caderno_id=caderno_id,
                user_id=session['user_id'],
                ano_avaliacao=ano_avaliacao,
                periodo_avaliacao=periodo_avaliacao
            )
            db.session.add(resultado)
            db.session.flush()  # Gerar ID antes de usar
        
        # Atualizar status da prova
        resultado.fez_prova = fez_prova
        
        if fez_prova and respostas:
            # Limpar respostas anteriores
            if resultado.id:
                RespostaAluno.query.filter_by(resultado_id=resultado.id).delete()
            
            # Buscar blocos do caderno
            blocos = BlocoCaderno.query.filter_by(caderno_id=caderno_id).order_by(BlocoCaderno.ordem).all()
            
            total_questoes = 0
            total_acertos = 0
            
            # Processar respostas por bloco
            for bloco_index, bloco in enumerate(blocos):
                for questao_num in range(1, bloco.total_questoes + 1):
                    questao_key = f"{bloco_index}-{questao_num}"
                    
                    if questao_key in respostas:
                        resposta_marcada = respostas[questao_key]
                        
                        # Buscar questão real do bloco para verificar resposta correta
                        questao_bloco = BlocoQuestao.query.filter_by(
                            bloco_id=bloco.id,
                            ordem=questao_num
                        ).first()
                        
                        resposta_correta = None
                        acertou = False
                        
                        print(f"[DEBUG] Processando questão {questao_key}: resposta={resposta_marcada}")
                        
                        if questao_bloco and questao_bloco.questao_id:
                            print(f"[DEBUG] Questão encontrada ID: {questao_bloco.questao_id}")
                            
                            # Buscar a questão para verificar se usa modelo novo ou antigo
                            questao_obj = Questao.query.get(questao_bloco.questao_id)
                            
                            if questao_obj and hasattr(questao_obj, 'resposta_correta') and questao_obj.resposta_correta:
                                # MODELO NOVO: Usar resposta_correta direta da questão
                                resposta_correta = questao_obj.resposta_correta
                                acertou = (resposta_marcada == resposta_correta)
                                print(f"[DEBUG] ✅ Modelo novo - Resposta correta: {resposta_correta}")
                                print(f"[DEBUG] Comparação: '{resposta_marcada}' == '{resposta_correta}' = {acertou}")
                                
                            else:
                                # MODELO ANTIGO: Usar tabela Alternativa
                                alternativas = Alternativa.query.filter_by(
                                    questao_id=questao_bloco.questao_id
                                ).order_by(Alternativa.id).all()
                                
                                print(f"[DEBUG] Modelo antigo - Encontradas {len(alternativas)} alternativas para questão {questao_bloco.questao_id}")
                                
                                if alternativas:
                                    # Debug: mostrar todas as alternativas
                                    for i, alt in enumerate(alternativas):
                                        letra = chr(65 + i)
                                        print(f"[DEBUG] Alt {i}: {letra} - correta={alt.correta} - texto='{alt.texto[:30]}...'")
                                    
                                    # Encontrar qual alternativa é a correta e mapear para letra
                                    resposta_correta = None
                                    for i, alt in enumerate(alternativas):
                                        if alt.correta:
                                            resposta_correta = chr(65 + i)  # A, B, C, D
                                            print(f"[DEBUG] ✅ Resposta correta encontrada: {resposta_correta}")
                                            break
                                    
                                    if resposta_correta:
                                        acertou = (resposta_marcada == resposta_correta)
                                        print(f"[DEBUG] Comparação: '{resposta_marcada}' == '{resposta_correta}' = {acertou}")
                                    else:
                                        resposta_correta = 'N/A'
                                        acertou = False
                                        print(f"[DEBUG] ❌ PROBLEMA: Nenhuma alternativa correta encontrada!")
                                else:
                                    # Questão sem alternativas e sem resposta_correta - erro
                                    resposta_correta = 'N/A'
                                    acertou = False
                                    print(f"[DEBUG] ❌ ERRO: Questão {questao_bloco.questao_id} não tem alternativas nem resposta_correta definida")
                        else:
                            resposta_correta = 'N/A'
                            acertou = False
                            print(f"[DEBUG] ❌ PROBLEMA: Questão do bloco não encontrada - bloco_id={bloco.id}, ordem={questao_num}")
                        
                        # Salvar resposta
                        resposta_aluno = RespostaAluno(
                            resultado_id=resultado.id,
                            bloco_id=bloco.id,
                            questao_ordem=questao_num,
                            resposta_marcada=resposta_marcada,
                            questao_id=questao_bloco.questao_id if questao_bloco else None,
                            resposta_correta=resposta_correta,
                            acertou=acertou
                        )
                        db.session.add(resposta_aluno)
                        
                        total_questoes += 1
                        if acertou:
                            total_acertos += 1
            
            # Atualizar totais no resultado
            resultado.total_questoes = total_questoes
            resultado.total_acertos = total_acertos
            resultado.percentual_acertos = (total_acertos / total_questoes * 100) if total_questoes > 0 else 0
            
            print(f"[DEBUG] Salvando resultado: {total_acertos}/{total_questoes} acertos ({resultado.percentual_acertos:.1f}%)")
        
        else:
            # Se não fez prova, zerar contadores
            resultado.total_questoes = 0
            resultado.total_acertos = 0
            resultado.percentual_acertos = 0
            
            print(f"[DEBUG] Zerando contadores - não fez prova ou sem respostas")
            
            # Limpar respostas
            if resultado.id:
                RespostaAluno.query.filter_by(resultado_id=resultado.id).delete()
        
        db.session.commit()
        print(f"[DEBUG] Resultado salvo no banco - ID: {resultado.id}")
        
        return jsonify({
            'success': True,
            'message': 'Resultado salvo com sucesso!',
            'resultado': {
                'fez_prova': resultado.fez_prova,
                'total_acertos': resultado.total_acertos,
                'total_questoes': resultado.total_questoes,
                'percentual_acertos': resultado.percentual_acertos
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao salvar resultado: {str(e)}'}), 500

@app.route('/api/resultados/<int:aluno_id>/<int:caderno_id>', methods=['GET'])
def buscar_respostas_aluno(aluno_id, caderno_id):
    """API para buscar respostas salvas de um aluno específico"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        # Verificar se o aluno e caderno pertencem ao usuário
        aluno = Aluno.query.get_or_404(aluno_id)
        caderno = Caderno.query.get_or_404(caderno_id)
        
        if aluno.user_id != session['user_id'] or caderno.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        # Buscar resultado do aluno
        resultado = ResultadoAluno.query.filter_by(
            aluno_id=aluno_id,
            caderno_id=caderno_id,
            user_id=session['user_id']
        ).first()
        
        respostas_salvas = {}
        fez_prova = False
        
        if resultado:
            fez_prova = resultado.fez_prova
            
            if fez_prova:
                # Buscar respostas do aluno
                respostas = RespostaAluno.query.filter_by(resultado_id=resultado.id).all()
                
                # Buscar blocos do caderno para mapear ordem
                blocos = BlocoCaderno.query.filter_by(caderno_id=caderno_id).order_by(BlocoCaderno.ordem).all()
                
                # Mapear respostas para o formato esperado pelo frontend
                for resposta in respostas:
                    # Encontrar índice do bloco
                    bloco_index = None
                    for i, bloco in enumerate(blocos):
                        if bloco.id == resposta.bloco_id:
                            bloco_index = i
                            break
                    
                    if bloco_index is not None:
                        questao_key = f"{bloco_index}-{resposta.questao_ordem}"
                        respostas_salvas[questao_key] = resposta.resposta_marcada
        
        return jsonify({
            'success': True,
            'fez_prova': fez_prova,
            'respostas': respostas_salvas
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar respostas: {str(e)}'}), 500

# Inicialização do banco de dados e execução do servidor
if __name__ == '__main__':
    print("🚀 INICIANDO SERVIDOR EDU PLATAFORMA")
    print("="*50)
    print("📄 Página inicial: http://127.0.0.1:5000")
    print("📋 Dashboard: http://127.0.0.1:5000/dashboard")
    print("🔐 Login: http://127.0.0.1:5000/login")
    print("="*50)
    print("🔄 Para parar o servidor, pressione Ctrl+C")
    print("="*50)
    
    # Iniciar o servidor Flask
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,  # Desabilitar debug para produção
        threaded=True,
        processes=1   # Usar apenas 1 processo para evitar conflitos
    )

# Função utilitária para autenticação JWT
from functools import wraps
SECRET_KEY = os.getenv('SECRET_KEY', 'chave_secreta_desenvolvimento')  # Usar a mesma chave do Flask

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token JWT não fornecido'}), 401
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user_id = data['user_id']
        except Exception as e:
            return jsonify({'error': f'Token inválido: {str(e)}'}), 401
        return f(user_id, *args, **kwargs)
    return decorated

# =================== ENDPOINT PARA APK: LANÇAMENTO DE RESULTADOS VIA SCAN ===================

@app.route('/api/resultados/scan', methods=['POST'])
@token_required
def lancar_resultado_scan(user_id):
    """
    Endpoint para receber resultados escaneados do APK.
    Espera payload:
    {
        "aluno_id": int,
        "caderno_id": int,
        "bloco_id": int,
        "respostas": [ {"questao_id": int, "alternativa": "A"}, ... ],
        "origem": "apk"
    }
    """
    from database import db, Aluno, Caderno, BlocoCaderno, BlocoQuestao, ResultadoAluno, RespostaAluno, Alternativa
    import traceback
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Payload JSON não fornecido'}), 400

        aluno_id = data.get('aluno_id')
        caderno_id = data.get('caderno_id')
        bloco_id = data.get('bloco_id')
        respostas = data.get('respostas')
        origem = data.get('origem', 'apk')

        # Validação básica dos campos obrigatórios
        if not all([aluno_id, caderno_id, bloco_id, respostas]):
            return jsonify({'error': 'Campos obrigatórios ausentes'}), 400

        # Validar existência dos IDs
        aluno = Aluno.query.get(aluno_id)
        caderno = Caderno.query.get(caderno_id)
        bloco = BlocoCaderno.query.get(bloco_id)
        if not aluno or not caderno or not bloco:
            return jsonify({'error': 'Aluno, caderno ou bloco não encontrado'}), 404

        # Validar permissão do user_id sobre o caderno (ajuste conforme sua lógica de permissão)
        if hasattr(caderno, 'user_id') and caderno.user_id != user_id:
            return jsonify({'error': 'Acesso negado ao caderno'}), 403

        # Buscar ou criar ResultadoAluno
        resultado = ResultadoAluno.query.filter_by(
            aluno_id=aluno_id,
            caderno_id=caderno_id,
            user_id=user_id
        ).first()
        if not resultado:
            resultado = ResultadoAluno(
                aluno_id=aluno_id,
                caderno_id=caderno_id,
                user_id=user_id
            )
            db.session.add(resultado)
            db.session.flush()  # Gera o ID

        # Limpar respostas anteriores
        RespostaAluno.query.filter_by(resultado_id=resultado.id).delete()

        total_questoes = 0
        total_acertos = 0
        questoes_salvas = []

        # Mapear ordem das questões no bloco
        questoes_bloco = BlocoQuestao.query.filter_by(bloco_id=bloco_id).order_by(BlocoQuestao.ordem).all()
        questao_id_to_ordem = {q.questao_id: q.ordem for q in questoes_bloco if q.questao_id}

        for resposta in respostas:
            questao_id = resposta.get('questao_id')
            alternativa_marcada = resposta.get('alternativa')
            if not questao_id or not alternativa_marcada:
                continue  # Ignorar respostas incompletas
            ordem = questao_id_to_ordem.get(questao_id)
            if not ordem:
                print(f"[WARN] Questão {questao_id} não encontrada no bloco {bloco_id}")
                continue
            # Buscar gabarito da questão usando modelo híbrido
            questao_obj = Questao.query.get(questao_id)
            resposta_correta = None
            acertou = False
            
            if questao_obj and hasattr(questao_obj, 'resposta_correta') and questao_obj.resposta_correta:
                # MODELO NOVO: Usar resposta_correta direta da questão
                resposta_correta = questao_obj.resposta_correta
                acertou = (alternativa_marcada == resposta_correta)
            else:
                # MODELO ANTIGO: Usar tabela Alternativa
                alternativas = Alternativa.query.filter_by(questao_id=questao_id).order_by(Alternativa.id).all()
                if alternativas:
                    for i, alt in enumerate(alternativas):
                        letra = chr(65 + i)
                        if alt.correta:
                            resposta_correta = letra
                            break
                    if resposta_correta:
                        acertou = (alternativa_marcada == resposta_correta)
                    else:
                        resposta_correta = 'N/A'
                        acertou = False
                else:
                    resposta_correta = 'N/A'
                    acertou = False
            # Salvar resposta
            resposta_aluno = RespostaAluno(
                resultado_id=resultado.id,
                bloco_id=bloco_id,
                questao_ordem=ordem,
                resposta_marcada=alternativa_marcada,
                questao_id=questao_id,
                resposta_correta=resposta_correta,
                acertou=acertou
            )
            db.session.add(resposta_aluno)
            total_questoes += 1
            if acertou:
                total_acertos += 1
            questoes_salvas.append({
                'questao_id': questao_id,
                'ordem': ordem,
                'marcada': alternativa_marcada,
                'correta': resposta_correta,
                'acertou': acertou
            })

        # Atualizar totais no resultado
        resultado.fez_prova = True
        resultado.total_questoes = total_questoes
        resultado.total_acertos = total_acertos
        resultado.percentual_acertos = (total_acertos / total_questoes * 100) if total_questoes > 0 else 0
        # Registrar origem (pode ser um campo extra, log ou tabela de auditoria)
        # Exemplo: resultado.origem = origem  # Se existir o campo

        db.session.commit()
        print(f"[LOG] Resultado salvo via APK: aluno={aluno_id}, caderno={caderno_id}, bloco={bloco_id}, acertos={total_acertos}/{total_questoes}, user_id={user_id}, origem={origem}")

        return jsonify({
            'success': True,
            'message': 'Resultados lançados com sucesso.',
            'acertos': total_acertos,
            'total_questoes': total_questoes,
            'percentual': resultado.percentual_acertos,
            'respostas': questoes_salvas
        })
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Erro ao lançar resultado via APK: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Erro ao lançar resultado: {str(e)}'}), 500

# Endpoint para receber resultados do scan via QR Code
@app.route('/api/resultados/scan-qr', methods=['POST'])
def lancar_resultado_scan_qr():
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        data = request.get_json()
        
        # Dados obrigatórios
        required_fields = ['qr_data', 'respostas']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo obrigatório não informado: {field}'}), 400
        
        qr_data = data['qr_data']  # Dados decodificados do QR Code
        respostas = data['respostas']  # Lista de respostas [{'questao': 1, 'resposta': 'A'}, ...]
        
        # Validar dados do QR Code
        qr_required_fields = ['aluno_id', 'caderno_id', 'turma_id', 'gabarito_id', 'tipo']
        for field in qr_required_fields:
            if field not in qr_data:
                return jsonify({'error': f'Campo obrigatório no QR Code: {field}'}), 400
        
        # Verificar se é um QR Code válido do EDU PLATAFORMA
        if qr_data.get('tipo') != 'edu_gabarito_qr':
            return jsonify({'error': 'QR Code inválido ou de outro sistema'}), 400
        
        # Verificar se o aluno existe e pertence ao professor
        aluno = Aluno.query.get(qr_data['aluno_id'])
        if not aluno or aluno.user_id != session['user_id']:
            return jsonify({'error': 'Aluno não encontrado ou acesso negado'}), 404
        
        # Verificar se o caderno existe e pertence ao professor
        caderno = Caderno.query.get(qr_data['caderno_id'])
        if not caderno or caderno.user_id != session['user_id']:
            return jsonify({'error': 'Caderno não encontrado ou acesso negado'}), 404
        
        # Buscar blocos do caderno para validar questões
        blocos = BlocoCaderno.query.filter_by(caderno_id=qr_data['caderno_id']).order_by(BlocoCaderno.ordem).all()
        total_questoes = sum(b.total_questoes for b in blocos)
        
        # Validar respostas
        if not isinstance(respostas, list) or len(respostas) == 0:
            return jsonify({'error': 'Lista de respostas deve conter pelo menos uma resposta'}), 400
        
        if len(respostas) > total_questoes:
            return jsonify({'error': f'Número de respostas ({len(respostas)}) excede o total de questões ({total_questoes})'}), 400
        
        # Validar cada resposta
        for resposta in respostas:
            if not isinstance(resposta, dict):
                return jsonify({'error': 'Cada resposta deve ser um objeto'}), 400
            
            if 'questao' not in resposta or 'resposta' not in resposta:
                return jsonify({'error': 'Cada resposta deve ter os campos "questao" e "resposta"'}), 400
            
            questao_num = resposta['questao']
            alternativa = resposta['resposta']
            
            # Validar número da questão
            if not isinstance(questao_num, int) or questao_num < 1 or questao_num > total_questoes:
                return jsonify({'error': f'Número da questão inválido: {questao_num}. Deve ser entre 1 e {total_questoes}'}), 400
            
            # Validar alternativa
            if alternativa not in ['A', 'B', 'C', 'D']:
                return jsonify({'error': f'Alternativa inválida: {alternativa}. Deve ser A, B, C ou D'}), 400
        
        # Verificar se já existe resultado para este aluno e caderno
        resultado_existente = ResultadoAluno.query.filter_by(
            aluno_id=qr_data['aluno_id'],
            caderno_id=qr_data['caderno_id']
        ).first()
        
        if resultado_existente:
            # Atualizar resultado existente
            resultado_existente.data_aplicacao = datetime.now()
            resultado_existente.gabarito_id = qr_data['gabarito_id']
            
            # Remover respostas antigas
            RespostaAluno.query.filter_by(resultado_id=resultado_existente.id).delete()
            
            resultado = resultado_existente
            action = "atualizado"
        else:
            # Criar novo resultado
            resultado = ResultadoAluno(
                aluno_id=qr_data['aluno_id'],
                caderno_id=qr_data['caderno_id'],
                data_aplicacao=datetime.now(),
                gabarito_id=qr_data['gabarito_id']
            )
            db.session.add(resultado)
            db.session.flush()  # Para obter o ID
            action = "criado"
        
        # Mapear questões para blocos
        questao_para_bloco = {}
        questao_atual = 1
        
        for bloco in blocos:
            # Buscar questões do bloco
            questoes_bloco = db.session.query(QuestaoBloco.questao_id).filter_by(
                bloco_id=bloco.id
            ).order_by(QuestaoBloco.ordem).all()
            
            questoes_ids = [q[0] for q in questoes_bloco]
            
            for i, questao_id in enumerate(questoes_ids):
                questao_para_bloco[questao_atual] = {
                    'questao_id': questao_id,
                    'bloco_id': bloco.id,
                    'ordem_no_bloco': i + 1
                }
                questao_atual += 1
        
        # Salvar respostas
        acertos = 0
        for resposta in respostas:
            questao_num = resposta['questao']
            alternativa = resposta['resposta']
            
            if questao_num in questao_para_bloco:
                questao_info = questao_para_bloco[questao_num]
                
                # Buscar a questão para verificar gabarito
                questao = Questao.query.get(questao_info['questao_id'])
                
                # Verificar se acertou
                acertou = (questao and questao.gabarito == alternativa)
                if acertou:
                    acertos += 1
                
                # Criar resposta do aluno
                resposta_aluno = RespostaAluno(
                    resultado_id=resultado.id,
                    questao_id=questao_info['questao_id'],
                    bloco_id=questao_info['bloco_id'],
                    resposta=alternativa,
                    acertou=acertou,
                    ordem_questao=questao_num
                )
                db.session.add(resposta_aluno)
        
        # Calcular estatísticas
        total_respondidas = len(respostas)
        percentual_acerto = (acertos / total_respondidas * 100) if total_respondidas > 0 else 0
        
        # Atualizar resultado com estatísticas
        resultado.total_questoes = total_questoes
        resultado.questoes_respondidas = total_respondidas
        resultado.acertos = acertos
        resultado.percentual_acerto = percentual_acerto
        
        # Salvar no banco
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Resultado {action} com sucesso via QR Code!',
            'resultado': {
                'aluno_nome': qr_data.get('aluno_nome', 'N/A'),
                'caderno_titulo': qr_data.get('caderno_titulo', 'N/A'),
                'gabarito_id': qr_data['gabarito_id'],
                'total_questoes': total_questoes,
                'questoes_respondidas': total_respondidas,
                'acertos': acertos,
                'percentual_acerto': round(percentual_acerto, 2),
                'data_aplicacao': resultado.data_aplicacao.strftime('%d/%m/%Y %H:%M')
            }
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao salvar resultado via QR Code: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

# Endpoint para receber logs do APK
@app.route('/api/apk/logs', methods=['POST'])
def receber_logs_apk():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'status': 'error', 'message': 'No data received'}), 400
        
        # Extrair informações do log
        nivel = data.get('nivel', 'INFO')
        mensagem = data.get('mensagem', '')
        timestamp = data.get('timestamp', '')
        app_version = data.get('app_version', 'unknown')
        device_info = data.get('device_info', '')
        erro_detalhes = data.get('erro_detalhes', '')
        
        # Formatar mensagem para o terminal
        log_formatado = f"📱 [APK-{nivel}] {timestamp} - {mensagem}"
        
        if device_info:
            log_formatado += f" | Device: {device_info}"
        
        if erro_detalhes:
            log_formatado += f" | Erro: {erro_detalhes}"
        
        # Mostrar no terminal com cores
        if nivel == 'ERROR':
            print(f"\033[91m{log_formatado}\033[0m")  # Vermelho
        elif nivel == 'WARNING':
            print(f"\033[93m{log_formatado}\033[0m")  # Amarelo
        elif nivel == 'SUCCESS':
            print(f"\033[92m{log_formatado}\033[0m")  # Verde
        else:
            print(f"\033[94m{log_formatado}\033[0m")  # Azul
        
        # Também salvar no log do Flask
        if nivel == 'ERROR':
            app.logger.error(f"APK: {mensagem} | {erro_detalhes}")
        elif nivel == 'WARNING':
            app.logger.warning(f"APK: {mensagem}")
        else:
            app.logger.info(f"APK: {mensagem}")
        
        return jsonify({'status': 'success', 'message': 'Log recebido'}), 200
        
    except Exception as e:
        app.logger.error(f"Erro ao receber log do APK: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Endpoint para testar conectividade do APK
@app.route('/api/apk/test', methods=['GET'])
def testar_conectividade_apk():
    try:
        return jsonify({
            'status': 'success',
            'message': 'Conectividade OK',
            'server_time': datetime.now().isoformat(),
            'server_ip': request.host
        }), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ====================================
# CORREÇÃO AUTOMÁTICA DE GABARITO
# ====================================

@app.route('/correcao-automatica')
def correcao_automatica():
    """Página de correção automática de gabaritos"""
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('correcao-automatica.html')

@app.route('/api/correcao-automatica/processar', methods=['POST'])
def processar_gabarito_automatico():
    """
    Processa gabaritos usando o sistema EduCorreção integrado
    Sistema 100% funcional de correção automática
    """
    try:
        print("🚀 SISTEMA DE CORREÇÃO AUTOMÁTICA - EDUCORREÇÃO INTEGRADO")
        print("="*60)
        
        # Verificar se há arquivos no request
        if 'files' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        files = request.files.getlist('files')
        if not files or len(files) == 0:
            return jsonify({'error': 'Nenhum arquivo válido encontrado'}), 400

        # Obter configurações do processamento
        num_quadrilateros = int(request.form.get('num_quadrilateros', 4))
        num_questoes = int(request.form.get('num_questoes', 11))
        num_alternativas = int(request.form.get('num_alternativas', 4))

        print(f"🔧 Configurações: {num_quadrilateros} quadriláteros, {num_questoes} questões, {num_alternativas} alternativas")

        # Importar o sistema de correção integrado
        try:
            from correcao_gabarito_integrado import processar_gabarito_pdf
            print("✅ Sistema EduCorreção integrado importado com sucesso")
        except ImportError as e:
            print(f"❌ Erro ao importar sistema de correção: {e}")
            return jsonify({'error': f'Erro na importação do sistema de correção: {str(e)}'}), 500

        resultados = []
        
        for file in files:
            if file.filename == '':
                continue
                
            if not file.filename.lower().endswith('.pdf'):
                continue
            
            try:
                print(f"📄 Processando arquivo: {file.filename}")
                
                # Processar usando o sistema EduCorreção integrado
                resultado = processar_gabarito_pdf(
                    file, 
                    num_quadrilateros, 
                    num_questoes, 
                    num_alternativas
                )
                
                if resultado['success']:
                    resultados.append({
                        'arquivo': file.filename,
                        'sucesso': True,
                        'lote': resultado.get('lote'),
                        'registration': resultado.get('registration'),
                        'answers': resultado.get('answers'),
                        'info': resultado.get('info', '')
                    })
                    print(f"✅ {file.filename} processado com sucesso")
                    if resultado.get('info'):
                        print(f"ℹ️ {resultado['info']}")
                        
                else:
                    # Erro específico retornado pela função
                    resultados.append({
                        'arquivo': file.filename,
                        'sucesso': False,
                        'erro': resultado.get('error', 'Erro desconhecido')
                    })
                    print(f"❌ Falha ao processar {file.filename}: {resultado.get('error')}")
                    
            except Exception as e:
                print(f"❌ Erro ao processar {file.filename}: {str(e)}")
                resultados.append({
                    'arquivo': file.filename,
                    'sucesso': False,
                    'erro': str(e)
                })

        # Se apenas um arquivo foi processado, retornar resultado direto
        if len(files) == 1 and len(resultados) == 1:
            resultado = resultados[0]
            if resultado['sucesso']:
                response = {
                    'lote': resultado['lote'],
                    'registration': resultado['registration'],
                    'answers': resultado['answers']
                }
                
                # Adicionar informações extras se disponíveis
                if resultado.get('info'):
                    response['info'] = resultado['info']
                
                return jsonify(response)
            else:
                return jsonify({'error': resultado['erro']}), 400

        # Para múltiplos arquivos, retornar lista de resultados
        return jsonify({
            'resultados': resultados,
            'total_processados': len(resultados),
            'total_sucesso': len([r for r in resultados if r['sucesso']]),
            'total_erros': len([r for r in resultados if not r['sucesso']]),
            'sistema_usado': 'educorrecao_integrado'
        })

    except Exception as e:
        print(f"❌ Erro crítico no processamento: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@app.route('/api/correcao-automatica/importar-resultado', methods=['POST'])
def importar_resultado_correcao():
    """
    Importa um resultado específico de correção automática para o sistema de lança resultado
    """
    try:
        dados = request.get_json()
        if not dados:
            return jsonify({'erro': 'Dados não fornecidos'}), 400

        caderno_codigo = dados.get('lote')
        matricula = dados.get('registration') 
        respostas_blocos = dados.get('answers', [])
        ano_avaliacao = dados.get('ano_avaliacao')
        periodo_avaliacao = dados.get('periodo_avaliacao')
        
        print(f"[DEBUG] Importando resultado: caderno={caderno_codigo}, matricula={matricula}")
        print(f"[DEBUG] Dados temporais: ano={ano_avaliacao}, periodo={periodo_avaliacao}")

        if not caderno_codigo or not matricula:
            return jsonify({'erro': 'Lote (caderno) e matrícula são obrigatórios'}), 400

        # Buscar caderno pelo código usando SQLAlchemy
        caderno = Caderno.buscar_por_codigo(caderno_codigo)
        if not caderno:
            return jsonify({'erro': f'Caderno não encontrado: {caderno_codigo}'}), 404

        # Buscar aluno pela matrícula usando SQLAlchemy
        aluno = Aluno.buscar_por_matricula(matricula)
        if not aluno:
            return jsonify({'erro': f'Aluno não encontrado: {matricula}'}), 404

        # Buscar ou criar ResultadoAluno usando SQLAlchemy com filtros de ano e período
        resultado_aluno = ResultadoAluno.query.filter_by(
            aluno_id=aluno.id, 
            caderno_id=caderno.id,
            ano_avaliacao=ano_avaliacao,
            periodo_avaliacao=periodo_avaliacao
        ).first()
        
        if resultado_aluno:
            # Atualizar resultado existente
            resultado_aluno.fez_prova = True
            
            # Limpar respostas anteriores
            RespostaAluno.query.filter_by(resultado_id=resultado_aluno.id).delete()
        else:
            # Criar novo resultado
            resultado_aluno = ResultadoAluno(
                aluno_id=aluno.id,
                caderno_id=caderno.id,
                user_id=caderno.user_id,
                fez_prova=True,
                data_lancamento=datetime.now(),
                ano_avaliacao=ano_avaliacao,
                periodo_avaliacao=periodo_avaliacao
            )
            db.session.add(resultado_aluno)
            db.session.flush()  # Para obter o ID

        # Buscar blocos do caderno usando SQLAlchemy
        blocos = BlocoCaderno.query.filter_by(caderno_id=caderno.id).order_by(BlocoCaderno.ordem).all()
        
        if not blocos:
            return jsonify({'erro': f'Nenhum bloco encontrado para o caderno {caderno_codigo}'}), 404

        total_questoes = 0
        total_acertos = 0

        # Processar respostas por bloco
        for i, bloco in enumerate(blocos):
            if i >= len(respostas_blocos):
                break
                
            respostas_bloco = respostas_blocos[i]
            
            # Buscar questões do bloco usando SQLAlchemy
            questoes_bloco = BlocoQuestao.query.filter_by(bloco_id=bloco.id).order_by(BlocoQuestao.ordem).all()
            
            # Salvar respostas do bloco
            for j, resposta_str in enumerate(respostas_bloco):
                if j >= bloco.total_questoes:
                    break
                    
                questao_ordem = j + 1
                questao_id = None
                resposta_correta = None
                acertou = False
                
                # Encontrar questão correspondente
                for questao_bloco in questoes_bloco:
                    if questao_bloco.ordem == questao_ordem:
                        questao_id = questao_bloco.questao_id
                        break
                
                # Converter resposta para formato adequado
                if resposta_str in ['A', 'B', 'C', 'D', 'E']:
                    resposta_processada = resposta_str
                elif resposta_str == 'Blank':
                    resposta_processada = None
                elif resposta_str and resposta_str.startswith('Multiple:'):
                    # Marcações múltiplas são consideradas erro e marcadas com 'X'
                    resposta_processada = 'X'  # Formato compatível com VARCHAR(1)
                    print(f"⚠️ Marcação múltipla detectada na questão {questao_ordem}: {resposta_str} → convertida para 'X'")
                else:
                    resposta_processada = resposta_str if resposta_str and len(resposta_str) == 1 else 'X'
                
                # Buscar gabarito se questão foi identificada
                if questao_id and resposta_processada and resposta_processada not in [None, 'X']:
                    # Buscar questão para verificar se usa modelo direto ou tabela Alternativa
                    questao_obj = Questao.query.get(questao_id)
                    
                    if questao_obj and questao_obj.resposta_correta:
                        # Usar campo direto da questão (modelo migrado)
                        resposta_correta = questao_obj.resposta_correta  # ✅ Já é apenas 1 letra
                        acertou = (resposta_processada == resposta_correta)
                    else:
                        # Usar tabela Alternativa (modelo antigo)
                        alternativas = Alternativa.query.filter_by(
                            questao_id=questao_id
                        ).order_by(Alternativa.id).all()
                        
                        if alternativas:
                            # Encontrar letra correspondente à alternativa correta
                            resposta_correta = None
                            for i, alt in enumerate(alternativas):
                                if alt.correta:
                                    resposta_correta = chr(65 + i)  # A, B, C, D
                                    break
                            
                            acertou = (resposta_processada == resposta_correta) if resposta_correta else False
                        else:
                            resposta_correta = None
                            acertou = False
                elif resposta_processada == 'X':
                    # Marcações múltiplas são sempre incorretas
                    resposta_correta = None
                    acertou = False
                
                # Criar resposta usando SQLAlchemy
                # Garantir que resposta_marcada não seja None (campo NOT NULL)
                resposta_final = resposta_processada if resposta_processada is not None else ''
                
                resposta_aluno_obj = RespostaAluno(
                    resultado_id=resultado_aluno.id,
                    bloco_id=bloco.id,
                    questao_ordem=questao_ordem,
                    resposta_marcada=resposta_final,
                    questao_id=questao_id,
                    resposta_correta=resposta_correta,
                    acertou=acertou
                )
                db.session.add(resposta_aluno_obj)
                
                total_questoes += 1
                if acertou:
                    total_acertos += 1

        # Atualizar totais no resultado
        percentual = (total_acertos / total_questoes * 100) if total_questoes > 0 else 0
        resultado_aluno.total_questoes = total_questoes
        resultado_aluno.total_acertos = total_acertos
        resultado_aluno.percentual_acertos = percentual

        # Confirmar transação usando SQLAlchemy
        db.session.commit()

        print(f"✅ Resultado importado: Caderno {caderno_codigo}, Aluno {aluno.nome} ({matricula}) - {total_acertos}/{total_questoes} acertos ({percentual:.1f}%)")

        return jsonify({
            'sucesso': True,
            'resultado_id': resultado_aluno.id,
            'aluno_nome': aluno.nome,
            'total_questoes': total_questoes,
            'total_acertos': total_acertos,
            'percentual_acertos': round(percentual, 1),
            'message': f'Resultado importado com sucesso para {aluno.nome}'
        })

    except Exception as e:
        print(f"❌ Erro crítico na importação: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Rollback da transação em caso de erro
        db.session.rollback()
            
        return jsonify({
            'sucesso': False,
            'erro': f'Erro interno do servidor: {str(e)}'
        }), 500

@app.route('/api/cadernos/teste-modelo-padrao')
def teste_modelo_padrao():
    """Rota de teste para verificar se o modelo padrão está acessível"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        import os
        current_dir = os.path.dirname(os.path.abspath(__file__))
        template_path = os.path.join(current_dir, "modelo padrão.pdf")
        
        info = {
            'diretorio_atual': current_dir,
            'caminho_template': template_path,
            'template_existe': os.path.exists(template_path),
            'arquivos_pdf': [f for f in os.listdir(current_dir) if f.endswith('.pdf')]
        }
        
        if os.path.exists(template_path):
            info['tamanho_arquivo'] = os.path.getsize(template_path)
            info['status'] = 'Template encontrado com sucesso!'
        else:
            info['status'] = 'Template não encontrado'
        
        return jsonify({
            'success': True,
            'info': info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/kanban/download-pdf', methods=['POST'])
def download_kanban_pdf():
    """Gerar PDF do relatório de atividades do Kanban - Versão Simplificada"""
    if 'user_id' not in session:
        return jsonify({'error': 'Usuário não autenticado'}), 401
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400
            
        tasks = data.get('tasks', [])
        users = data.get('users', [])
        
        if not tasks:
            return jsonify({'error': 'Nenhuma tarefa encontrada'}), 400
        
        # Criar buffer para o PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Estilos profissionais
        styles = getSampleStyleSheet()
        
        # Estilo personalizado para título principal
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2c3e50'),
            fontName='Helvetica-Bold'
        )
        
        # Estilo para subtítulos
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=18,
            spaceAfter=20,
            spaceBefore=25,
            textColor=colors.HexColor('#34495e'),
            fontName='Helvetica-Bold'
        )
        
        # Estilo para texto normal
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=12,
            textColor=colors.HexColor('#2c3e50'),
            fontName='Helvetica'
        )
        
        # Estilo para informações importantes
        info_style = ParagraphStyle(
            'CustomInfo',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=8,
            textColor=colors.HexColor('#2c3e50'),
            fontName='Helvetica-Bold'
        )
        
        # Cores para prioridades
        priority_colors = {
            'lowest': colors.HexColor('#6c757d'),  # Cinza
            'low': colors.HexColor('#28a745'),     # Verde
            'medium': colors.HexColor('#ffc107'),  # Amarelo
            'high': colors.HexColor('#dc3545')     # Vermelho
        }
        
        # Cores para status
        status_colors = {
            'todo': colors.HexColor('#007bff'),    # Azul
            'doing': colors.HexColor('#ffc107'),   # Amarelo
            'review': colors.HexColor('#6f42c1'),  # Roxo
            'done': colors.HexColor('#28a745')     # Verde
        }
        
        # Cabeçalho com logo e título
        header_style = ParagraphStyle(
            'Header',
            parent=styles['Normal'],
            fontSize=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2c3e50'),
            fontName='Helvetica-Bold',
            spaceAfter=20
        )
        
        # Título principal com design moderno
        story.append(Paragraph("🎓 EDU PLATAFORMA", header_style))
        story.append(Paragraph("Sistema Educacional Inteligente", header_style))
        story.append(Spacer(1, 15))
        
        # Título do relatório
        story.append(Paragraph("📋 RELATÓRIO DE ATIVIDADES - KANBAN", title_style))
        story.append(Spacer(1, 25))
        
        # Card de informações gerais
        info_card_style = ParagraphStyle(
            'InfoCard',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#2c3e50'),
            fontName='Helvetica',
            leftIndent=20,
            rightIndent=20,
            spaceAfter=8
        )
        
        # Card com fundo colorido
        info_data = [
            ['📅 Data de Geração', f"{datetime.now().strftime('%d/%m/%Y às %H:%M')}"],
            ['📊 Total de Atividades', f"{len(tasks)}"],
            ['👥 Usuários Ativos', f"{len(users)}"],
            ['🚀 Sistema', 'EduPlataforma v2.0']
        ]
        
        info_table = Table(info_data, colWidths=[2.5*inch, 3*inch])
        info_table_style = TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#3498db')),
            ('BACKGROUND', (1, 0), (1, -1), colors.HexColor('#ecf0f1')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#2c3e50')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bdc3c7')),
            ('ROUNDEDCORNERS', [6, 6, 6, 6]),
        ])
        info_table.setStyle(info_table_style)
        story.append(info_table)
        story.append(Spacer(1, 25))
        
        # Estatísticas por status com cards visuais
        status_counts = {'todo': 0, 'doing': 0, 'review': 0, 'done': 0}
        for task in tasks:
            try:
                if task.get('status') in status_counts:
                    status_counts[task['status']] += 1
            except Exception as e:
                continue
        
        # Cards de estatísticas
        stats_cards_data = [
            ['⏳ A Fazer', str(status_counts['todo']), colors.HexColor('#e74c3c')],
            ['🔄 Fazendo', str(status_counts['doing']), colors.HexColor('#f39c12')],
            ['🔍 Em Análise', str(status_counts['review']), colors.HexColor('#9b59b6')],
            ['✅ Concluído', str(status_counts['done']), colors.HexColor('#27ae60')]
        ]
        
        # Criar tabela de cards
        stats_cards = []
        for i in range(0, len(stats_cards_data), 2):
            row = []
            for j in range(2):
                if i + j < len(stats_cards_data):
                    card_data = stats_cards_data[i + j]
                    card_table = Table([
                        [card_data[0]],  # Título
                        [card_data[1]]   # Valor
                    ], colWidths=[1.2*inch])
                    
                    card_style = TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), card_data[2]),
                        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#ecf0f1')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                        ('TEXTCOLOR', (0, 1), (-1, 1), colors.HexColor('#2c3e50')),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica'),
                        ('FONTSIZE', (0, 0), (-1, 0), 9),
                        ('FONTSIZE', (0, 1), (-1, 1), 12),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bdc3c7')),
                        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
                    ])
                    card_table.setStyle(card_style)
                    row.append(card_table)
                else:
                    row.append('')  # Célula vazia
            stats_cards.append(row)
        
        stats_cards_table = Table(stats_cards, colWidths=[1.5*inch, 1.5*inch])
        stats_cards_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        story.append(stats_cards_table)
        story.append(Spacer(1, 30))
        
        # Agrupar tarefas por status
        status_groups = {
            'todo': {'label': '📋 A Fazer', 'tasks': []},
            'doing': {'label': '🔄 Fazendo', 'tasks': []},
            'review': {'label': '🔍 Em Análise', 'tasks': []},
            'done': {'label': '✅ Concluído', 'tasks': []}
        }
        
        for task in tasks:
            try:
                if task.get('status') in status_groups:
                    status_groups[task['status']]['tasks'].append(task)
            except Exception as e:
                continue
        
        # Função para obter nome do usuário
        def get_user_name(user_id):
            try:
                if not user_id:
                    return "Não atribuído"
                user = next((u for u in users if u.get('id') == user_id), None)
                return user.get('name', 'Usuário não encontrado') if user else "Usuário não encontrado"
            except Exception as e:
                return "Erro ao buscar usuário"
        
        # Função para obter label da prioridade
        def get_priority_label(priority):
            labels = {
                'lowest': 'Muito Baixa',
                'low': 'Baixa',
                'medium': 'Média',
                'high': 'Alta'
            }
            return labels.get(priority, priority)
        
        # Função para obter emoji da prioridade
        def get_priority_emoji(priority):
            emojis = {
                'lowest': '⚪',
                'low': '🟢',
                'medium': '🟡',
                'high': '🔴'
            }
            return emojis.get(priority, '⚪')
        
        # Seção de atividades com design moderno
        story.append(Paragraph("📋 ATIVIDADES POR STATUS", subtitle_style))
        story.append(Spacer(1, 15))
        
        # Gerar seção para cada status
        for status, group in status_groups.items():
            if group['tasks']:
                # Card de título da seção
                section_title_data = [[group['label']]]
                section_title_table = Table(section_title_data, colWidths=[7*inch])
                section_title_style = TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), status_colors[status]),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 12),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                    ('TOPPADDING', (0, 0), (-1, 0), 8),
                    ('LEFTPADDING', (0, 0), (-1, 0), 15),
                    ('RIGHTPADDING', (0, 0), (-1, 0), 15),
                    ('ROUNDEDCORNERS', [6, 6, 6, 6]),
                ])
                section_title_table.setStyle(section_title_style)
                story.append(section_title_table)
                story.append(Spacer(1, 10))
                
                # Criar tabela para as tarefas
                table_data = [['ID', 'Título', 'Prioridade', 'Responsável', 'Prazo', 'Criado em']]
                
                for task in group['tasks']:
                    try:
                        created_date = datetime.fromisoformat(task['created_at'].replace('Z', '+00:00')).strftime('%d/%m/%Y')
                        priority_emoji = get_priority_emoji(task.get('priority', 'medium'))
                        priority_text = f"{priority_emoji} {get_priority_label(task.get('priority', 'medium'))}"
                    
                        # Formatar deadline
                        deadline_text = "⏰ Sem prazo"
                        if task.get('deadline'):
                            try:
                                deadline = datetime.fromisoformat(task['deadline'].replace('Z', '+00:00'))
                                deadline_text = f"⏰ {deadline.strftime('%d/%m/%Y %H:%M')}"
                            except:
                                deadline_text = "⏰ Prazo inválido"
                        
                        # Truncar título se muito longo
                        title = task.get('title', 'Sem título')
                        if len(title) > 30:
                            title = title[:27] + '...'
                        
                        # Truncar nome do responsável se muito longo
                        responsible = get_user_name(task.get('assignee_id'))
                        if len(responsible) > 15:
                            responsible = responsible[:12] + '...'
                        
                        table_data.append([
                            f"#{task.get('id', 'N/A')}",
                            title,
                            priority_text,
                            responsible,
                            deadline_text,
                            created_date
                        ])
                    except Exception as e:
                        continue
                
                # Criar tabela com larguras ajustadas
                table = Table(table_data, colWidths=[0.6*inch, 2.5*inch, 1.2*inch, 1.3*inch, 1.2*inch, 1.0*inch])
                
                # Estilo da tabela moderno
                table_style = TableStyle([
                    # Cabeçalho
                    ('BACKGROUND', (0, 0), (-1, 0), status_colors[status]),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 9),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                    ('TOPPADDING', (0, 0), (-1, 0), 8),
                    ('LEFTPADDING', (0, 0), (-1, 0), 8),
                    ('RIGHTPADDING', (0, 0), (-1, 0), 8),
                    
                    # Dados
                    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                    ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e9ecef')),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
                    ('TOPPADDING', (0, 1), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                    
                    # Linhas alternadas
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
                    
                    # Bordas arredondadas
                    ('ROUNDEDCORNERS', [6, 6, 6, 6]),
                    
                    # Sombra sutil
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
                ])
                
                table.setStyle(table_style)
                story.append(table)
                story.append(Spacer(1, 20))
        
        # Seção de estatísticas detalhadas com design moderno
        story.append(Spacer(1, 20))
        story.append(Paragraph("📊 ANÁLISE DETALHADA", subtitle_style))
        story.append(Spacer(1, 15))
        
        # Card de introdução às estatísticas
        intro_text = "Este relatório apresenta uma análise completa das atividades do sistema, incluindo distribuição por status, prioridades e controle de prazos."
        intro_style = ParagraphStyle(
            'Intro',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#6c757d'),
            fontName='Helvetica',
            alignment=TA_CENTER,
            spaceAfter=15
        )
        story.append(Paragraph(intro_text, intro_style))
        
        # Estatísticas por prioridade
        priority_counts = {'lowest': 0, 'low': 0, 'medium': 0, 'high': 0}
        deadline_stats = {'com_prazo': 0, 'sem_prazo': 0, 'vencidas': 0, 'vencem_hoje': 0, 'vencem_amanha': 0}
        
        for task in tasks:
            try:
                if task.get('priority') in priority_counts:
                    priority_counts[task['priority']] += 1
                
                # Estatísticas de deadline
                if task.get('deadline'):
                    deadline_stats['com_prazo'] += 1
                    try:
                        deadline = datetime.fromisoformat(task['deadline'].replace('Z', '+00:00'))
                        now = datetime.now()
                        diff_days = (deadline - now).days
                        
                        if diff_days < 0:
                            deadline_stats['vencidas'] += 1
                        elif diff_days == 0:
                            deadline_stats['vencem_hoje'] += 1
                        elif diff_days == 1:
                            deadline_stats['vencem_amanha'] += 1
                    except Exception as e:
                        pass
                else:
                    deadline_stats['sem_prazo'] += 1
            except Exception as e:
                continue
        
        stats_data = [
            ['Métrica', 'Quantidade', 'Percentual'],
            ['Total de Atividades', str(len(tasks)), '100%'],
            ['A Fazer', str(status_counts['todo']), f"{status_counts['todo']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Fazendo', str(status_counts['doing']), f"{status_counts['doing']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Em Análise', str(status_counts['review']), f"{status_counts['review']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Concluído', str(status_counts['done']), f"{status_counts['done']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['', '', ''],
            ['Prioridade Muito Baixa', str(priority_counts['lowest']), f"{priority_counts['lowest']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Prioridade Baixa', str(priority_counts['low']), f"{priority_counts['low']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Prioridade Média', str(priority_counts['medium']), f"{priority_counts['medium']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Prioridade Alta', str(priority_counts['high']), f"{priority_counts['high']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['', '', ''],
            ['Com Prazo Definido', str(deadline_stats['com_prazo']), f"{deadline_stats['com_prazo']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Sem Prazo Definido', str(deadline_stats['sem_prazo']), f"{deadline_stats['sem_prazo']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Vencidas', str(deadline_stats['vencidas']), f"{deadline_stats['vencidas']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Vencem Hoje', str(deadline_stats['vencem_hoje']), f"{deadline_stats['vencem_hoje']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%'],
            ['Vencem Amanhã', str(deadline_stats['vencem_amanha']), f"{deadline_stats['vencem_amanha']/len(tasks)*100:.1f}%" if len(tasks) > 0 else '0%']
        ]
        
        stats_table = Table(stats_data, colWidths=[3*inch, 1.2*inch, 1.2*inch])
        
        # Estilos modernos da tabela
        stats_style = TableStyle([
            # Cabeçalho
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('LEFTPADDING', (0, 0), (-1, 0), 10),
            ('RIGHTPADDING', (0, 0), (-1, 0), 10),
            
            # Dados
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e9ecef')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            
            # Linhas alternadas
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
            
            # Bordas arredondadas
            ('ROUNDEDCORNERS', [8, 8, 8, 8]),
            
            # Sombra
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
        ])
        
        # Adicionar estilos condicionalmente baseado no número de linhas
        num_rows = len(stats_data)
        
        # Linha separadora 1 (após status) - linha 7
        if num_rows > 7:
            stats_style.add('BACKGROUND', (0, 7), (-1, 7), colors.HexColor('#95a5a6'))
            stats_style.add('FONTSIZE', (0, 7), (-1, 7), 1)
            stats_style.add('BOTTOMPADDING', (0, 7), (-1, 7), 4)
            stats_style.add('TOPPADDING', (0, 7), (-1, 7), 4)
        
        # Linha separadora 2 (após prioridades) - linha 13
        if num_rows > 13:
            stats_style.add('BACKGROUND', (0, 13), (-1, 13), colors.HexColor('#95a5a6'))
            stats_style.add('FONTSIZE', (0, 13), (-1, 13), 1)
            stats_style.add('BOTTOMPADDING', (0, 13), (-1, 13), 4)
            stats_style.add('TOPPADDING', (0, 13), (-1, 13), 4)
        
        # Cores especiais para deadlines - linhas 17, 18, 19
        if num_rows > 17:
            stats_style.add('BACKGROUND', (0, 17), (-1, 17), colors.HexColor('#dc3545'))  # Vencidas - vermelho
            stats_style.add('TEXTCOLOR', (0, 17), (-1, 17), colors.white)
            stats_style.add('FONTNAME', (0, 17), (-1, 17), 'Helvetica-Bold')
        
        if num_rows > 18:
            stats_style.add('BACKGROUND', (0, 18), (-1, 18), colors.HexColor('#fd7e14'))  # Vencem hoje - laranja
            stats_style.add('TEXTCOLOR', (0, 18), (-1, 18), colors.white)
            stats_style.add('FONTNAME', (0, 18), (-1, 18), 'Helvetica-Bold')
        
        if num_rows > 19:
            stats_style.add('BACKGROUND', (0, 19), (-1, 19), colors.HexColor('#ffc107'))  # Vencem amanhã - amarelo
            stats_style.add('TEXTCOLOR', (0, 19), (-1, 19), colors.black)
            stats_style.add('FONTNAME', (0, 19), (-1, 19), 'Helvetica-Bold')
        
        stats_table.setStyle(stats_style)
        story.append(stats_table)
        story.append(Spacer(1, 25))
        
        # Rodapé moderno
        story.append(Spacer(1, 30))
        
        # Linha separadora
        separator_data = [['']]
        separator_table = Table(separator_data, colWidths=[7*inch])
        separator_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e9ecef')),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 1),
            ('TOPPADDING', (0, 0), (-1, 0), 1),
        ])
        separator_table.setStyle(separator_style)
        story.append(separator_table)
        story.append(Spacer(1, 15))
        
        # Card de rodapé
        footer_data = [
            ['🎓 EDU PLATAFORMA', 'Sistema Educacional Inteligente'],
            ['📄 Relatório gerado automaticamente', f"🕒 {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}"],
            ['🚀 Versão 2.0', 'Transformando a educação brasileira']
        ]
        
        footer_table = Table(footer_data, colWidths=[3.5*inch, 3.5*inch])
        footer_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8f9fa')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#6c757d')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#dee2e6')),
            ('ROUNDEDCORNERS', [8, 8, 8, 8]),
        ])
        footer_table.setStyle(footer_style)
        story.append(footer_table)
        
        # Construir PDF
        doc.build(story)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'relatorio_kanban_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf',
            mimetype='application/pdf'
        )
        

        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'relatorio_atividades_kanban_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Erro ao gerar PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro ao gerar PDF: {str(e)}'}), 500



if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000, threaded=True, processes=1)

