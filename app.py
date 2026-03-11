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
    conn.commit()
    conn.close()
    print("Banco de dados pronto!")

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
        return jsonify({'erro': 'Este e-mail já está cadastrado'}), 409

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

if __name__ == '__main__':
    init_db()
    print("Acesse: http://localhost:5000")
    app.run(debug=True)
