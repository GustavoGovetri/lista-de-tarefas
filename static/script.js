window.onload = function () {
  verificarLogin();

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const cadastroVisivel = document.getElementById('form-cadastro').style.display !== 'none';
    cadastroVisivel ? fazerCadastro() : fazerLogin();
  });
};

async function verificarLogin() {
  const r    = await fetch('/api/me');
  const dados = await r.json();
  if (dados.logado) mostrarHome(dados.nome);
}

function mostrarAba(aba) {
  document.getElementById('form-login').style.display    = aba === 'login'    ? 'block' : 'none';
  document.getElementById('form-cadastro').style.display = aba === 'cadastro' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('ativo', (aba === 'login' && i === 0) || (aba === 'cadastro' && i === 1));
  });
  mostrarMsg('', '');
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value.trim();

  if (!email || !senha) { mostrarMsg('Preencha e-mail e senha!', 'erro'); return; }

  const r    = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  const dados = await r.json();

  if (r.ok) {
    mostrarMsg(`Bem-vindo, ${dados.nome}!`, 'sucesso');
    setTimeout(() => mostrarHome(dados.nome), 1000);
  } else {
    mostrarMsg(dados.erro, 'erro');
  }
}

async function fazerCadastro() {
  const nome  = document.getElementById('cad-nome').value.trim();
  const email = document.getElementById('cad-email').value.trim();
  const senha = document.getElementById('cad-senha').value.trim();

  if (!nome || !email || !senha) { mostrarMsg('Preencha todos os campos!', 'erro'); return; }

  const r    = await fetch('/api/cadastrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha })
  });
  const dados = await r.json();

  if (r.ok) {
    mostrarMsg('Conta criada! Agora faça login.', 'sucesso');
    setTimeout(() => mostrarAba('login'), 1500);
  } else {
    mostrarMsg(dados.erro, 'erro');
  }
}

async function fazerLogout() {
  await fetch('/api/logout', { method: 'POST' });
  document.getElementById('tela-home').style.display = 'none';
  document.getElementById('tela-auth').style.display = 'flex';
  mostrarMsg('', '');
}

function mostrarHome(nome) {
  document.getElementById('tela-auth').style.display = 'none';
  document.getElementById('tela-home').style.display = 'block';
  document.getElementById('nome-usuario').textContent = nome;
}

function mostrarMsg(texto, tipo) {
  const el = document.getElementById('msg');
  el.textContent   = texto;
  el.className     = `msg ${tipo}`;
  el.style.display = texto ? 'block' : 'none';
}
