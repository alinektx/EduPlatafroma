import os
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
DB_PATH = os.path.join(os.path.dirname(__file__), 'eduplataforma.db')

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    school = db.Column(db.String(100))
    whatsapp = db.Column(db.String(20))  # Campo para WhatsApp
    tipo_usuario = db.Column(db.String(20), default='normal')  # 'normal' ou 'admin'
    ativo = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, server_default=db.func.now())
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_admin(self):
        return self.tipo_usuario == 'admin'

class Habilidade(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), nullable=False)
    componente = db.Column(db.String(50), nullable=False)
    ano = db.Column(db.Integer, nullable=False)
    descricao = db.Column(db.Text, nullable=False)
    etapa = db.Column(db.String(50), default='Ensino Fundamental')
    objetos_conhecimento = db.Column(db.Text)

# NOVOS MODELOS ADICIONADOS
class Escola(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    rede = db.Column(db.String(20), nullable=False)
    zona = db.Column(db.String(10), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Turma(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False)
    ano = db.Column(db.Integer, nullable=False)
    turno = db.Column(db.String(20), nullable=False)
    escola_id = db.Column(db.Integer, db.ForeignKey('escola.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relacionamento com alunos
    alunos = db.relationship('Aluno', backref='turma', lazy=True)

class Aluno(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    sexo = db.Column(db.String(10), nullable=False)
    turma_id = db.Column(db.Integer, db.ForeignKey('turma.id'), nullable=False)
    escola_id = db.Column(db.Integer, db.ForeignKey('escola.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    @property
    def matricula(self):
        """Retorna o código de matrícula do aluno (seu próprio ID formatado com 5 dígitos)"""
        return f"{self.id:05d}"
    
    @classmethod
    def buscar_por_matricula(cls, matricula):
        """Busca um aluno pelo código de matrícula"""
        try:
            # Converter matrícula para ID (remover zeros à esquerda)
            aluno_id = int(matricula)
            return cls.query.get(aluno_id)
        except (ValueError, TypeError):
            return None
    
    @classmethod
    def buscar_por_matricula_com_dados(cls, matricula):
        """Busca um aluno por matrícula incluindo dados da turma e escola"""
        try:
            aluno_id = int(matricula)
            return cls.query.options(
                db.joinedload(cls.turma),
                db.joinedload(cls.escola)
            ).get(aluno_id)
        except (ValueError, TypeError):
            return None
    
    def to_dict(self):
        """Converte o aluno para dicionário incluindo matrícula"""
        return {
            'id': self.id,
            'matricula': self.matricula,
            'nome': self.nome,
            'sexo': self.sexo,
            'turma_id': self.turma_id,
            'escola_id': self.escola_id,
            'user_id': self.user_id
        }

class PlanoAula(db.Model):
    __tablename__ = 'plano_aula'
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    conteudo = db.Column(db.Text, nullable=False)
    criado_em = db.Column(db.DateTime, server_default=db.func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class Questao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    enunciado = db.Column(db.Text, nullable=False)
    imagem = db.Column(db.Text)  # Base64 da imagem ou URL
    habilidade_id = db.Column(db.Integer, db.ForeignKey('habilidade.id'), nullable=False)
    ano = db.Column(db.Integer, nullable=False)  # Ano escolar (1, 2, 3, 4, 5, 6, 7, 8, 9)
    escola_id = db.Column(db.Integer, db.ForeignKey('escola.id'), nullable=True)  # Opcional - questões compartilhadas nacionalmente
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    componente = db.Column(db.String(50), nullable=True)  # Componente Curricular
    dificuldade = db.Column(db.String(20), default='Médio')  # Fácil, Médio, Difícil
    criado_em = db.Column(db.DateTime, server_default=db.func.now())
    
    # Campos para questões múltipla escolha
    alternativa_a = db.Column(db.Text)
    alternativa_b = db.Column(db.Text)
    alternativa_c = db.Column(db.Text)
    alternativa_d = db.Column(db.Text)
    resposta_correta = db.Column(db.String(1))  # A, B, C ou D
    
    # Relacionamentos
    habilidade = db.relationship('Habilidade', backref='questoes')
    escola = db.relationship('Escola', backref='questoes')
    alternativas = db.relationship('Alternativa', backref='questao', lazy=True)

class Alternativa(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    texto = db.Column(db.Text, nullable=False)
    questao_id = db.Column(db.Integer, db.ForeignKey('questao.id'), nullable=False)
    correta = db.Column(db.Boolean, default=False)

class Caderno(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    serie = db.Column(db.Integer, nullable=False)
    qtd_blocos = db.Column(db.Integer, nullable=False)
    qtd_questoes_por_bloco = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    blocos = db.relationship('BlocoCaderno', backref='caderno', lazy=True, cascade='all, delete-orphan')
    # Relacionamento com resultados configurado para cascade delete
    resultados = db.relationship('ResultadoAluno', backref='caderno_ref', lazy=True, cascade='all, delete-orphan')
    
    @property
    def codigo_caderno(self):
        """Retorna o código do caderno (seu próprio ID formatado com 3 dígitos)"""
        return f"{self.id:03d}"
    
    @classmethod
    def buscar_por_codigo(cls, codigo):
        """Busca um caderno pelo código de 3 dígitos"""
        try:
            # Converter código para ID (remover zeros à esquerda)
            caderno_id = int(codigo)
            return cls.query.get(caderno_id)
        except (ValueError, TypeError):
            return None
    
    @classmethod
    def buscar_por_codigo_com_dados(cls, codigo):
        """Busca um caderno por código incluindo dados dos blocos"""
        try:
            caderno_id = int(codigo)
            return cls.query.options(
                db.joinedload(cls.blocos)
            ).get(caderno_id)
        except (ValueError, TypeError):
            return None
    
    def to_dict(self):
        """Converte o caderno para dicionário incluindo código"""
        return {
            'id': self.id,
            'codigo_caderno': self.codigo_caderno,
            'titulo': self.titulo,
            'serie': self.serie,
            'qtd_blocos': self.qtd_blocos,
            'qtd_questoes_por_bloco': self.qtd_questoes_por_bloco,
            'user_id': self.user_id
        }

class BlocoCaderno(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    caderno_id = db.Column(db.Integer, db.ForeignKey('caderno.id'), nullable=False)
    ordem = db.Column(db.Integer, nullable=False)
    componente = db.Column(db.String(50), nullable=False)  # Matemática ou Português
    total_questoes = db.Column(db.Integer, nullable=False)
    questoes = db.relationship('BlocoQuestao', backref='bloco', lazy=True, cascade='all, delete-orphan')

class BlocoQuestao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bloco_id = db.Column(db.Integer, db.ForeignKey('bloco_caderno.id'), nullable=False)
    questao_id = db.Column(db.Integer, db.ForeignKey('questao.id'), nullable=False)
    ordem = db.Column(db.Integer, nullable=False)  # Ordem da questão no bloco
    questao = db.relationship('Questao', backref='blocos')

class ResultadoAluno(db.Model):
    """Tabela para armazenar os resultados dos alunos nas provas"""
    id = db.Column(db.Integer, primary_key=True)
    aluno_id = db.Column(db.Integer, db.ForeignKey('aluno.id'), nullable=False)
    caderno_id = db.Column(db.Integer, db.ForeignKey('caderno.id'), nullable=False)
    fez_prova = db.Column(db.Boolean, default=False)
    total_questoes = db.Column(db.Integer, default=0)
    total_acertos = db.Column(db.Integer, default=0)
    percentual_acertos = db.Column(db.Float, default=0.0)
    data_lancamento = db.Column(db.DateTime, server_default=db.func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # Campos para filtro temporal
    ano_avaliacao = db.Column(db.Integer, nullable=True)  # Ano da avaliação (2024, 2025, etc.)
    periodo_avaliacao = db.Column(db.String(50), nullable=True)  # Período (1, 2, 3, 4, diagnostica, recuperacao, final)
    
    # Relacionamentos
    aluno = db.relationship('Aluno', backref='resultados')
    # Relacionamento com respostas individuais
    respostas = db.relationship('RespostaAluno', backref='resultado_ref', lazy=True, cascade='all, delete-orphan')

class RespostaAluno(db.Model):
    """Tabela para armazenar as respostas individuais dos alunos"""
    id = db.Column(db.Integer, primary_key=True)
    resultado_id = db.Column(db.Integer, db.ForeignKey('resultado_aluno.id'), nullable=False)
    bloco_id = db.Column(db.Integer, db.ForeignKey('bloco_caderno.id'), nullable=False)
    questao_ordem = db.Column(db.Integer, nullable=False)  # Ordem da questão no bloco (1, 2, 3...)
    resposta_marcada = db.Column(db.String(1), nullable=True)  # A, B, C, D, X (múltipla), '' (em branco)
    questao_id = db.Column(db.Integer, db.ForeignKey('questao.id'), nullable=True)  # Referência à questão real
    resposta_correta = db.Column(db.String(1), nullable=True)  # A alternativa correta
    acertou = db.Column(db.Boolean, default=False)
    
    # Relacionamentos corrigidos para evitar conflitos
    bloco = db.relationship('BlocoCaderno')
    questao = db.relationship('Questao')



def init_db():
    print('[LOG] Chamando init_db() - URI:', db.engine.url)
    db.create_all()
    print('[LOG] Tabelas criadas no banco')
    
    # Criar usuário admin padrão se não existir
    if not User.query.filter_by(email='admin@escola.com').first():
        admin = User(
            name='Administrador',
            email='admin@escola.com',
            school='Escola Modelo',
            tipo_usuario='admin',
            ativo=True
        )
        admin.set_password('senha123')
        db.session.add(admin)
        print("👤 Usuário admin criado")
        print("📧 Email: admin@escola.com")
        print("🔑 Senha: senha123")
        print("🛡️  Tipo: Administrador")
    
    # Criar habilidades de exemplo
    if not Habilidade.query.first():
        habilidades = [
            Habilidade(
                codigo='EF05MA01',
                componente='Matemática',
                ano=5,
                descricao='Resolver problemas com números naturais',
                objetos_conhecimento='["Operações básicas", "Resolução de problemas"]'
            ),
            Habilidade(
                codigo='EF05LP03',
                componente='Língua Portuguesa',
                ano=5,
                descricao='Leitura e compreensão de textos',
                objetos_conhecimento='["Interpretação textual", "Compreensão leitora"]'
            )
        ]
        db.session.add_all(habilidades)
        print("📚 Habilidades de exemplo criadas")
    
    db.session.commit()
    print("✅ Banco de dados inicializado com sucesso!")

def get_user_by_email(email):
    return User.query.filter_by(email=email).first()

def create_user(name, email, password, school):
    new_user = User(name=name, email=email, school=school)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    return new_user