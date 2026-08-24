/* ==========================================================================
   Facebook — mesma ideia do Instagram: só existe quando a loja liga a
   integração em Configurações → Integrações. Três partes: Mensagens
   (Messenger), Métricas (página) e Campanhas (anúncios, com chavinha pra
   ligar/desligar cada campanha).
   ========================================================================== */

const Facebook = (() => {
    let subview = 'mensagens';
    let periodo = 'diario';
    let conversas = [];
    let conversaAtivaId = null;
    let unsubConversas = null, unsubMensagens = null;
    let campanhas = [];

    function mount() {
        const el = document.getElementById('view-facebook');
        if (!el) return;
        el.innerHTML = `
            <div class="modulo-subtabs">
                <button type="button" class="modulo-subtab active" data-sub="mensagens"><i class="fa-solid fa-message"></i> Mensagens</button>
                <button type="button" class="modulo-subtab" data-sub="metricas"><i class="fa-solid fa-chart-line"></i> Métricas</button>
                <button type="button" class="modulo-subtab" data-sub="campanhas"><i class="fa-solid fa-bullhorn"></i> Campanhas</button>
            </div>
            <div id="face-sub-mensagens" class="modulo-subpanel">
                <div class="chat-wrap">
                    <div class="chat-lista" id="face-conversas-lista"><p class="chat-vazio">Nenhuma conversa ainda.</p></div>
                    <div class="chat-thread" id="face-thread"><div class="chat-thread-empty">Selecione uma conversa à esquerda.</div></div>
                </div>
            </div>
            <div id="face-sub-metricas" class="modulo-subpanel" style="display:none;">
                <div class="metricas-periodo">
                    <button type="button" class="metricas-periodo-btn active" data-periodo="diario">Diário</button>
                    <button type="button" class="metricas-periodo-btn" data-periodo="mensal">Mensal</button>
                </div>
                <div id="face-metricas-vazio" class="metricas-vazio" style="display:none;">
                    Conecte o Facebook em Configurações → Integrações pra ver as métricas aqui.
                </div>
                <div class="metricas-grid" id="face-metricas-grid">
                    <div class="metric-card"><h4>Impressões</h4><div class="metric-chart"><canvas id="chart-face-impressoes"></canvas></div></div>
                    <div class="metric-card"><h4>Contas engajadas</h4><div class="metric-chart"><canvas id="chart-face-engajados"></canvas></div></div>
                    <div class="metric-card"><h4>Curtidas da página</h4><div class="metric-chart"><canvas id="chart-face-curtidas"></canvas></div></div>
                </div>
            </div>
            <div id="face-sub-campanhas" class="modulo-subpanel" style="display:none;">
                <div id="face-campanhas-vazio" class="metricas-vazio" style="display:none;">
                    Conecte a conta de anúncios em Configurações → Integrações pra ver suas campanhas aqui.
                </div>
                <div class="ads-table-wrap" id="face-campanhas-wrap" style="display:none;">
                    <table class="ads-table">
                        <thead><tr><th>Campanha</th><th>Gasto</th><th>Impressões</th><th>Cliques</th><th>Resultados</th><th>Ativa</th></tr></thead>
                        <tbody id="face-campanhas-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        bind();
        carregarConversas();
    }

    function bind() {
        document.querySelectorAll('#view-facebook .modulo-subtab').forEach(btn => {
            btn.addEventListener('click', () => {
                subview = btn.dataset.sub;
                document.querySelectorAll('#view-facebook .modulo-subtab').forEach(b => b.classList.toggle('active', b === btn));
                document.getElementById('face-sub-mensagens').style.display = subview === 'mensagens' ? '' : 'none';
                document.getElementById('face-sub-metricas').style.display = subview === 'metricas' ? '' : 'none';
                document.getElementById('face-sub-campanhas').style.display = subview === 'campanhas' ? '' : 'none';
                if (subview === 'metricas') carregarMetricas();
                if (subview === 'campanhas') carregarCampanhas();
            });
        });
        document.querySelectorAll('#view-facebook .metricas-periodo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                periodo = btn.dataset.periodo;
                document.querySelectorAll('#view-facebook .metricas-periodo-btn').forEach(b => b.classList.toggle('active', b === btn));
                carregarMetricas();
            });
        });
    }

    function carregarConversas() {
        if (unsubConversas) unsubConversas();
        unsubConversas = Loja.col('facebookConversas').orderBy('ultimaMensagemEm', 'desc').onSnapshot(snap => {
            conversas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderConversas();
        }, err => console.error('facebookConversas', err));
    }

    function renderConversas() {
        const box = document.getElementById('face-conversas-lista');
        if (!box) return;
        if (!conversas.length) { box.innerHTML = '<p class="chat-vazio">Nenhuma conversa ainda.</p>'; return; }
        box.innerHTML = conversas.map(c => `
            <button type="button" class="chat-item ${c.id === conversaAtivaId ? 'active' : ''} ${c.naoLida ? 'nao-lida' : ''}" data-id="${c.id}">
                <span class="chat-item-avatar"><i class="fa-brands fa-facebook-messenger"></i></span>
                <span class="chat-item-info">
                    <strong>${Utils.escapeHtml(c.nome || c.id)}</strong>
                    <small>${Utils.escapeHtml(c.ultimaMensagem || '')}</small>
                </span>
            </button>
        `).join('');
        box.querySelectorAll('.chat-item').forEach(btn => btn.addEventListener('click', () => abrirConversa(btn.dataset.id)));
    }

    function abrirConversa(id) {
        conversaAtivaId = id;
        renderConversas();
        const conversa = conversas.find(c => c.id === id);
        Loja.col('facebookConversas').doc(id).update({ naoLida: false }).catch(() => {});

        const thread = document.getElementById('face-thread');
        thread.innerHTML = `
            <div class="chat-thread-head"><strong>${Utils.escapeHtml((conversa && conversa.nome) || id)}</strong></div>
            <div class="chat-thread-msgs" id="face-thread-msgs"></div>
            <form class="chat-thread-form" id="face-thread-form">
                <input type="text" id="face-thread-input" placeholder="Escreva uma resposta..." autocomplete="off">
                <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        `;
        document.getElementById('face-thread-form').addEventListener('submit', enviarResposta);

        if (unsubMensagens) unsubMensagens();
        unsubMensagens = Loja.col('facebookConversas').doc(id).collection('mensagens').orderBy('criadoEm').onSnapshot(snap => {
            const msgs = document.getElementById('face-thread-msgs');
            if (!msgs) return;
            msgs.innerHTML = snap.docs.map(d => {
                const m = d.data();
                return `<div class="chat-bubble ${m.de === 'loja' ? 'minha' : ''}">${Utils.escapeHtml(m.texto)}</div>`;
            }).join('');
            msgs.scrollTop = msgs.scrollHeight;
        }, err => console.error('mensagens facebook', err));
    }

    async function enviarResposta(e) {
        e.preventDefault();
        const input = document.getElementById('face-thread-input');
        const texto = input.value.trim();
        if (!texto || !conversaAtivaId) return;
        input.disabled = true;
        try {
            const idToken = await Auth.currentUser().getIdToken();
            const resp = await fetch(`/api/facebook-send-message?loja=${encodeURIComponent(Loja.id)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ destinatarioId: conversaAtivaId, texto })
            });
            const dados = await resp.json();
            if (!resp.ok) throw new Error(dados.erro || 'Erro ao enviar.');
            input.value = '';
        } catch (err) {
            Utils.toast(err.message, 'error');
        } finally {
            input.disabled = false;
            input.focus();
        }
    }

    async function carregarMetricas() {
        const vazio = document.getElementById('face-metricas-vazio');
        const grid = document.getElementById('face-metricas-grid');
        try {
            const idToken = await Auth.currentUser().getIdToken();
            const resp = await fetch(`/api/facebook-insights?loja=${encodeURIComponent(Loja.id)}&periodo=${periodo}`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            const dados = await resp.json();
            if (!dados.conectado || !dados.pontos || !dados.pontos.length) {
                if (vazio) vazio.style.display = 'block';
                if (grid) grid.style.display = 'none';
                return;
            }
            if (vazio) vazio.style.display = 'none';
            if (grid) grid.style.display = '';

            const labels = dados.pontos.map(p => periodo === 'mensal' ? formatMes(p.dia) : formatDiaCurto(p.dia));
            Utils.criarGraficoGlow('chart-face-impressoes', labels, dados.pontos.map(p => p.impressoes || 0), '#1877F2');
            Utils.criarGraficoGlow('chart-face-engajados', labels, dados.pontos.map(p => p.engajados || 0), '#0A5DC2');
            Utils.criarGraficoGlow('chart-face-curtidas', labels, dados.pontos.map(p => p.curtidas || 0), '#42B72A');
        } catch (err) {
            console.error('facebook metricas', err);
            if (vazio) { vazio.style.display = 'block'; vazio.textContent = 'Não foi possível carregar as métricas agora.'; }
            if (grid) grid.style.display = 'none';
        }
    }

    async function carregarCampanhas() {
        const vazio = document.getElementById('face-campanhas-vazio');
        const wrap = document.getElementById('face-campanhas-wrap');
        try {
            const idToken = await Auth.currentUser().getIdToken();
            const resp = await fetch(`/api/facebook-ads?loja=${encodeURIComponent(Loja.id)}`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            const dados = await resp.json();
            campanhas = dados.campanhas || [];
            if (!dados.conectado || !campanhas.length) {
                if (vazio) vazio.style.display = 'block';
                if (wrap) wrap.style.display = 'none';
                return;
            }
            if (vazio) vazio.style.display = 'none';
            if (wrap) wrap.style.display = '';
            renderCampanhas();
        } catch (err) {
            console.error('facebook ads', err);
            if (vazio) { vazio.style.display = 'block'; vazio.textContent = 'Não foi possível carregar as campanhas agora.'; }
            if (wrap) wrap.style.display = 'none';
        }
    }

    function renderCampanhas() {
        const tbody = document.getElementById('face-campanhas-tbody');
        if (!tbody) return;
        tbody.innerHTML = campanhas.map(c => `
            <tr>
                <td>${Utils.escapeHtml(c.nome)}</td>
                <td>${Utils.formatBRL(c.gasto)}</td>
                <td>${c.impressoes.toLocaleString('pt-BR')}</td>
                <td>${c.cliques.toLocaleString('pt-BR')}</td>
                <td>${c.resultados.toLocaleString('pt-BR')}</td>
                <td>
                    <label class="ads-switch">
                        <input type="checkbox" class="js-campanha-toggle" data-id="${c.id}" ${c.status === 'ACTIVE' ? 'checked' : ''}>
                        <span></span>
                    </label>
                </td>
            </tr>
        `).join('');
        tbody.querySelectorAll('.js-campanha-toggle').forEach(input => {
            input.addEventListener('change', () => alternarCampanha(input.dataset.id, input.checked, input));
        });
    }

    async function alternarCampanha(campanhaId, ativa, input) {
        input.disabled = true;
        try {
            const idToken = await Auth.currentUser().getIdToken();
            const resp = await fetch(`/api/facebook-ads-toggle?loja=${encodeURIComponent(Loja.id)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ campanhaId, ativa })
            });
            const dados = await resp.json();
            if (!resp.ok) throw new Error(dados.erro || 'Erro ao atualizar campanha.');
            Utils.toast(ativa ? 'Campanha ativada.' : 'Campanha pausada.', 'success');
        } catch (err) {
            Utils.toast(err.message, 'error');
            input.checked = !ativa;
        } finally {
            input.disabled = false;
        }
    }

    function formatDiaCurto(diaKey) {
        const [, m, d] = diaKey.split('-');
        return `${d}/${m}`;
    }
    function formatMes(mesKey) {
        const [ano, mes] = mesKey.split('-');
        const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        return `${nomes[Number(mes) - 1]}/${ano.slice(2)}`;
    }

    return { mount };
})();
window.Facebook = Facebook;
