import os


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'sua_chave_secreta_ultra_segura')
    SQLALCHEMY_TRACK_MODIFICATIONS = False


def get_database_uri() -> str:
    """Retorna a URI do banco de dados a partir das variáveis de ambiente.

    Prioriza DATABASE_URL (Postgres ou MySQL) e, se ausente, cai para SQLite
    no arquivo local em backend/eduplataforma.db.
    """
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        # Corrigir prefixes comuns para SQLAlchemy
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        if database_url.startswith('mysql://'):
            database_url = database_url.replace('mysql://', 'mysql+pymysql://', 1)
        return database_url

    base_dir = os.path.dirname(os.path.abspath(__file__))
    sqlite_path = os.path.join(base_dir, 'eduplataforma.db')
    return f"sqlite:///{sqlite_path}"

