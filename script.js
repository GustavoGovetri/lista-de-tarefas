let tarefas = [];

window.onload = function () {
  verificarLogin();

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    const authVisivel = document.getElementById('tela-auth').style.display !== 'none';
    if (!authVisivel) return;
    const cadastroVisivel = document.getElementById('form-cadastro').style.display !== 'none';
    cadastroVisivel ? fazerCadastro() : fazerLogin();
  });

  document.getElementById('input-titulo').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') adicionarTarefa();
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
  mostrarMsgAuth('', '');
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value.trim();

  if (!email || !senha) { mostrarMsgAuth('Preencha e-mail e senha!', 'erro'); return; }

  const r    = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  const dados = await r.json();

  if (r.ok) {
    mostrarMsgAuth(`Bem-vindo, ${dados.nome}!`, 'sucesso');
    setTimeout(() => mostrarHome(dados.nome), 800);
  } else {
    mostrarMsgAuth(dados.erro, 'erro');
  }
}

async function fazerCadastro() {
  const nome  = document.getElementById('cad-nome').value.trim();
  const email = document.getElementById('cad-email').value.trim();
  const senha = document.getElementById('cad-senha').value.trim();

  if (!nome || !email || !senha) { mostrarMsgAuth('Preencha todos os campos!', 'erro'); return; }

  const r    = await fetch('/api/cadastrar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email, senha })
  });
  const dados = await r.json();

  if (r.ok) {
    mostrarMsgAuth('Conta criada! Agora faça login.', 'sucesso');
    setTimeout(() => mostrarAba('login'), 1500);
  } else {
    mostrarMsgAuth(dados.erro, 'erro');
  }
}

async function fazerLogout() {
  await fetch('/api/logout', { method: 'POST' });
  tarefas = [];
  document.getElementById('tela-home').style.display = 'none';
  document.getElementById('tela-auth').style.display = 'flex';
  mostrarMsgAuth('', '');
}

function mostrarHome(nome) {
  document.getElementById('tela-auth').style.display = 'none';
  document.getElementById('tela-home').style.display = 'block';
  document.getElementById('nome-usuario').textContent = nome;
  buscarTarefas();
}

async function buscarTarefas() {
  try {
    const r = await fetch('/api/tarefas');
    if (r.status === 401) { fazerLogout(); return; }
    tarefas = await r.json();
    renderizarTabela();
  } catch {
    document.getElementById('lista-tarefas').innerHTML =
      '<div class="loading">Erro ao carregar. Servidor ligado?</div>';
  }
}

async function adicionarTarefa() {
  const titulo    = document.getElementById('input-titulo').value.trim();
  const descricao = document.getElementById('input-desc').value.trim();
  const msgErro   = document.getElementById('msg-erro');

  if (!titulo) {
    msgErro.style.display = 'block';
    document.getElementById('input-titulo').focus();
    return;
  }
  msgErro.style.display = 'none';

  const r = await fetch('/api/tarefas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, descricao })
  });

  if (r.ok) {
    const nova = await r.json();
    tarefas.unshift(nova);
    renderizarTabela();
    document.getElementById('input-titulo').value = '';
    document.getElementById('input-desc').value   = '';
    document.getElementById('input-titulo').focus();
  }
}

async function toggleTarefa(id) {
  const r = await fetch(`/api/tarefas/${id}/toggle`, { method: 'PUT' });
  if (r.ok) {
    const atualizada = await r.json();
    tarefas = tarefas.map(t => t.id === id ? atualizada : t);
    renderizarTabela();
  }
}

async function apagarTarefa(id) {
  if (!confirm('Tem certeza que deseja apagar esta tarefa?')) return;
  const r = await fetch(`/api/tarefas/${id}`, { method: 'DELETE' });
  if (r.ok) {
    tarefas = tarefas.filter(t => t.id !== id);
    renderizarTabela();
  }
}

function abrirModal(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  document.getElementById('edit-id').value         = tarefa.id;
  document.getElementById('edit-titulo').value     = tarefa.titulo;
  document.getElementById('edit-desc').value       = tarefa.descricao;
  document.getElementById('msg-edit-erro').style.display = 'none';
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('edit-titulo').focus();
}

function fecharModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

async function salvarEdicao() {
  const id        = parseInt(document.getElementById('edit-id').value);
  const titulo    = document.getElementById('edit-titulo').value.trim();
  const descricao = document.getElementById('edit-desc').value.trim();
  const msgErro   = document.getElementById('msg-edit-erro');

  if (!titulo) {
    msgErro.style.display = 'block';
    document.getElementById('edit-titulo').focus();
    return;
  }
  msgErro.style.display = 'none';

  const r = await fetch(`/api/tarefas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titulo, descricao })
  });

  if (r.ok) {
    const atualizada = await r.json();
    tarefas = tarefas.map(t => t.id === id ? atualizada : t);
    renderizarTabela();
    fecharModal();
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') fecharModal();
});

function renderizarTabela() {
  const container  = document.getElementById('lista-tarefas');
  const vazio      = document.getElementById('vazio');

  document.getElementById('total').textContent      = tarefas.length;
  document.getElementById('pendentes').textContent  = tarefas.filter(t => !t.feita).length;
  document.getElementById('concluidas').textContent = tarefas.filter(t =>  t.feita).length;

  if (tarefas.length === 0) {
    container.innerHTML  = '';
    vazio.style.display  = 'block';
    return;
  }
  vazio.style.display = 'none';

  container.innerHTML = `
    <div class="tabela-wrapper">
      <div class="tabela-header">
        <div></div>
        <div>Tarefa</div>
        <div>Status</div>
        <div></div>
      </div>
      ${tarefas.map(t => `
        <div class="tabela-linha ${t.feita ? 'feita' : ''}">
          <div
            class="checkbox ${t.feita ? 'checked' : ''}"
            onclick="toggleTarefa(${t.id})"
            title="${t.feita ? 'Marcar como pendente' : 'Marcar como concluída'}"
          ></div>
          <div>
            <div class="cel-titulo">${escaparHTML(t.titulo)}</div>
            ${t.descricao ? `<div class="cel-desc">${escaparHTML(t.descricao)}</div>` : ''}
          </div>
          <div class="cel-status">
            ${t.feita
              ? '<span class="badge-concluida">✓ Feita</span>'
              : '<span class="badge-pendente">⏳ Pendente</span>'
            }
          </div>
          <div class="cel-acoes">
            <button class="btn-edit" onclick="abrirModal(${t.id})" title="Editar tarefa">✏️</button>
            <button class="btn-del"  onclick="apagarTarefa(${t.id})" title="Apagar tarefa">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function mostrarMsgAuth(texto, tipo) {
  const el = document.getElementById('msg-auth');
  el.textContent   = texto;
  el.className     = `msg ${tipo}`;
  el.style.display = texto ? 'block' : 'none';
}

function escaparHTML(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
