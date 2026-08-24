/* ==========================================================================
   Instagram — só existe quando a própria loja liga a integração em
   Configurações → Integrações (cadastrando o id da conta comercial e o
   token de acesso da Meta). Duas partes: Mensagens (Direct, em tempo real
   pelo webhook) e Métricas (gráficos diário/mensal a partir do histórico
   coletado em lojas/{id}/metricasInstagram).
   ========================================================================== */

const Instagram = (() => {
    let subview = 'mensagens';
    let periodo = 'diario';
    let conversas = [];
    let conversaAtivaId = null;
    let unsubConversas = null, unsubMensagens = null;

    function mount() {
        const el = document.getElementById('view-instagram');
        if (!el) return;
        el.innerHTML = `
            <div class="modulo-subtabs">
                <button type="button" class="modulo-subtab active" data-sub="mensagens"><i class="fa-solid fa-message"></i> Mensagens</button>
                <button type="button" class="modulo-subtab" data-sub="metricas"><i class="fa-solid fa-chart-line"></i> Métricas</button>
            </div>
            <div id="insta-sub-mensagens" class="modulo-subpanel">
                <div class="chat-wrap">
                    <div class="chat-lista" id="insta-conversas-lista"><p class="chat-vazio">Nenhuma conversa ainda.</p></div>
                    <div class="chat-thread" id="insta-thread"><div class="chat-thread-empty">Selecione uma conversa à esquerda.</div></div>
                </div>
            </div>
            <div id="insta-sub-metricas" class="modulo-subpanel" style="display:none;">
                <div class="metricas-periodo">
                    <button type="button" class="metricas-periodo-btn active" data-periodo="diario">Diário</button>
                    <button type="button" class="metricas-periodo-btn" data-periodo="mensal">Mensal</button>
                </div>
                <div id="insta-metricas-vazio" class="metricas-vazio" style="display:none;">
                    Conecte o Instagram em Configurações → Integrações pra ver as métricas aqui.
                </div>
                <div class="metricas-grid" id="insta-metricas-grid">
                    <div class="metric-card"><h4>Alcance</h4><div class="metric-chart"><canvas id="chart-insta-alcance"></canvas></div></div>
                    <div class="metric-card"><h4>Visitas ao perfil</h4><div class="metric-chart"><canvas id="chart-insta-visitas"></canvas></div></div>
                    <div class="metric-card"><h4>Contas engajadas</h4><div class="metric-chart"><canvas id="chart-insta-engajadas"></canvas></div></div>
                    <div class="metric-card"><h4>Seguidores</h4><div class="metric-chart"><canvas id="chart-insta-seguidores"></canvas></div></div>
                </div>
            </div>
        `;
        bind();
        carregarConversas();
    }

    function bind() {
        document.querySelectorAll('#view-instagram .modulo-subtab').forEach(btn => {
            btn.addEventListener('click', () => {
                subview = btn.dataset.sub;
                document.querySelectorAll('#view-instagram .modulo-subtab').forEach(b => b.classList.toggle('active', b === btn));
                document.getElementById('insta-sub-mensagens').style.display = subview === 'mensagens' ? '' : 'none';
                document.getElementById('insta-sub-metricas').style.display = subview === 'metricas' ? '' : 'none';
                if (subview === 'metricas') carregarMetricas();
            });
        });
        document.querySelectorAll('#view-instagram .metricas-periodo-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                periodo = btn.dataset.periodo;
                document.querySelectorAll('#view-instagram .metricas-periodo-btn').forEach(b => b.classList.toggle('active', b === btn));
                carregarMetricas();
            });
        });
    }

    function carregarConversas() {
        if (unsubConversas) unsubConversas();
        unsubConversas = Loja.col('instagramConversas').orderBy('ultimaMensagemEm', 'desc').onSnapshot(snap => {
            conversas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderConversas();
        }, err => console.error('instagramConversas', err));
    }

    function renderConversas() {
        const box = document.getElementById('insta-conversas-lista');
        if (!box) return;
        if (!conversas.length) { box.innerHTML = '<p class="chat-vazio">Nenhuma conversa ainda.</p>'; return; }
        box.innerHTML = conversas.map(c => `
            <button type="button" class="chat-item ${c.id === conversaAtivaId ? 'active' : ''} ${c.naoLida ? 'nao-lida' : ''}" data-id="${c.id}">
                <span class="chat-item-avatar"><i class="fa-brands fa-instagram"></i></span>
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
        Loja.col('instagramConversas').doc(id).update({ naoLida: false }).catch(() => {});

        const thread = document.getElementById('insta-thread');
        thread.innerHTML = `
            <div class="chat-thread-head"><strong>${Utils.escapeHtml((conversa && conversa.nome) || id)}</strong></div>
            <div class="chat-thread-msgs" id="insta-thread-msgs"></div>
            <form class="chat-thread-form" id="insta-thread-form">
                <input type="text" id="insta-thread-input" placeholder="Escreva uma resposta..." autocomplete="off">
                <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        `;
        document.getElementById('insta-thread-form').addEventListener('submit', enviarResposta);

        if (unsubMensagens) unsubMensagens();
        unsubMensagens = Loja.col('instagramConversas').doc(id).collection('mensagens').orderBy('criadoEm').onSnapshot(snap => {
            const msgs = document.getElementById('insta-thread-msgs');
            if (!msgs) return;
            msgs.innerHTML = snap.docs.map(d => {
                const m = d.data();
                return `<div class="chat-bubble ${m.de === 'loja' ? 'minha' : ''}">${Utils.escapeHtml(m.texto)}</div>`;
            }).join('');
            msgs.scrollTop = msgs.scrollHeight;
        }, err => console.error('mensagens instagram', err));
    }

    async function enviarResposta(e) {
        e.preventDefault();
        const input = document.getElementById('insta-thread-input');
        const texto = input.value.trim();
        if (!texto || !conversaAtivaId) return;
        input.disabled = true;
        try {
            const idToken = await Auth.currentUser().getIdToken();
            const resp = await fetch(`/api/instagram-send-message?loja=${encodeURIComponent(Loja.id)}`, {
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
        const vazio = document.getElementById('insta-metricas-vazio');
        const grid = document.getElementById('insta-metricas-grid');
        try {
            const idToken = await Auth.currentUser().getIdToken();
            const resp = await fetch(`/api/instagram-metrics?loja=${encodeURIComponent(Loja.id)}&periodo=${periodo}`, {
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
            Utils.criarGraficoGlow('chart-insta-alcance', labels, dados.pontos.map(p => p.alcance || 0), '#E1306C');
            Utils.criarGraficoGlow('chart-insta-visitas', labels, dados.pontos.map(p => p.visitasPerfil || 0), '#C13584');
            Utils.criarGraficoGlow('chart-insta-engajadas', labels, dados.pontos.map(p => p.contasEngajadas || 0), '#833AB4');
            Utils.criarGraficoGlow('chart-insta-seguidores', labels, dados.pontos.map(p => p.seguidores || 0), '#F77737');
        } catch (err) {
            console.error('instagram metricas', err);
            if (vazio) { vazio.style.display = 'block'; vazio.textContent = 'Não foi possível carregar as métricas agora.'; }
            if (grid) grid.style.display = 'none';
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
window.Instagram = Instagram;
