from flask import Flask, request, jsonify, send_from_directory, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key = 'chave-secreta-123'


def get_db():
    conn = sqlite3.connect('usuarios.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()

    conn.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            nome      TEXT NOT NULL,
            email     TEXT NOT NULL UNIQUE,
            senha     TEXT NOT NULL,
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        )
    ''')

    conn.execute('''
        CREATE TABLE IF NOT EXISTS tarefas (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            titulo     TEXT    NOT NULL,
            descricao  TEXT    DEFAULT '',
            criada_em  TEXT    DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    ''')

    conn.commit()
    conn.close()
    print("Banco de dados pronto!")

def login_obrigatorio(f):
    from functools import wraps
    @wraps(f)
    def verificar(*args, **kwargs):
        if 'usuario_id' not in session:
            return jsonify({'erro': 'Faca login para continuar'}), 401
        return f(*args, **kwargs)
    return verificar

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/cadastrar', methods=['POST'])
def cadastrar():
    dados = request.get_json()
    nome  = dados.get('nome', '').strip()
    email = dados.get('email', '').strip().lower()
    senha = dados.get('senha', '').strip()

    if not nome or not email or not senha:
        return jsonify({'erro': 'Preencha todos os campos'}), 400
    if len(senha) < 6:
        return jsonify({'erro': 'A senha deve ter pelo menos 6 caracteres'}), 400

    senha_hash = generate_password_hash(senha)

    try:
        conn = get_db()
        conn.execute(
            'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
            (nome, email, senha_hash)
        )
        conn.commit()
        conn.close()
        return jsonify({'mensagem': 'Cadastro realizado com sucesso!'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'erro': 'Este e-mail ja esta cadastrado'}), 409

@app.route('/api/login', methods=['POST'])
def login():
    dados = request.get_json()
    email = dados.get('email', '').strip().lower()
    senha = dados.get('senha', '').strip()

    conn = get_db()
    usuario = conn.execute(
        'SELECT * FROM usuarios WHERE email = ?', (email,)
    ).fetchone()
    conn.close()

    if not usuario or not check_password_hash(usuario['senha'], senha):
        return jsonify({'erro': 'E-mail ou senha incorretos'}), 401

    session['usuario_id']   = usuario['id']
    session['usuario_nome'] = usuario['nome']
    return jsonify({'mensagem': f'Bem-vindo, {usuario["nome"]}!', 'nome': usuario['nome']})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'mensagem': 'Logout realizado'})

@app.route('/api/me', methods=['GET'])
def me():
    if 'usuario_id' not in session:
        return jsonify({'logado': False})
    return jsonify({'logado': True, 'nome': session['usuario_nome']})

@app.route('/api/tarefas', methods=['GET'])
@login_obrigatorio
def listar_tarefas():
    conn = get_db()
    tarefas = conn.execute(
        'SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY criada_em DESC',
        (session['usuario_id'],)
    ).fetchall()
    conn.close()
    return jsonify([dict(t) for t in tarefas])

@app.route('/api/tarefas', methods=['POST'])
@login_obrigatorio
def criar_tarefa():
    dados     = request.get_json()
    titulo    = dados.get('titulo', '').strip()
    descricao = dados.get('descricao', '').strip()

    if not titulo:
        return jsonify({'erro': 'Titulo e obrigatorio'}), 400

    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO tarefas (usuario_id, titulo, descricao) VALUES (?, ?, ?)',
        (session['usuario_id'], titulo, descricao)
    )
    conn.commit()
    nova = conn.execute(
        'SELECT * FROM tarefas WHERE id = ?', (cursor.lastrowid,)
    ).fetchone()
    conn.close()
    return jsonify(dict(nova)), 201

if __name__ == '__main__':
    init_db()
    print("Acesse: http://localhost:5000")
    app.run(debug=True)
