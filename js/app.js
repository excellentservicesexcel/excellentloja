/* ==========================================================================
   Núcleo do app — Excellent Loja
   Store central (dados em tempo real do Firestore) + navegação + boot.
   ========================================================================== */

const Store = {
    clientes: [], produtos: [], pedidos: [], estoque: [], financeiro: [], producao: [], receitas: [], capas: [], instaCards: [],
    beneficios: [], equipe: [],
    profile: {},
    config: {
        nomeLoja: 'Excellent Loja',
        categoriasProdutos: ['Geral', 'Novidades', 'Mais vendidos', 'Promoções'],
        formasPagamento: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'],
        taxaEntregaPadrao: 0,
        usuariosAutorizados: ['excellentservices.excel@gmail.com']
    },
    listeners: {},
    on(name, cb) { (this.listeners[name] = this.listeners[name] || []).push(cb); },
    emit(name) {
        (this.listeners[name] || []).forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
        (this.listeners['*'] || []).forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
    }
};

let _unsubscribers = [];

function initStoreListeners() {
    _unsubscribers.push(Loja.col('clientes').orderBy('nome').onSnapshot(snap => {
        Store.clientes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('clientes');
    }, err => console.error('clientes', err)));

    _unsubscribers.push(Loja.col('produtos').orderBy('nome').onSnapshot(snap => {
        Store.produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('produtos');
    }, err => console.error('produtos', err)));

    _unsubscribers.push(Loja.col('pedidos').orderBy('createdAt', 'desc').onSnapshot(snap => {
        Store.pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('pedidos');
    }, err => console.error('pedidos', err)));

    _unsubscribers.push(Loja.col('estoque').orderBy('nome').onSnapshot(snap => {
        Store.estoque = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('estoque');
    }, err => console.error('estoque', err)));

    _unsubscribers.push(Loja.col('financeiro').orderBy('data', 'desc').onSnapshot(snap => {
        Store.financeiro = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('financeiro');
    }, err => console.error('financeiro', err)));

    _unsubscribers.push(Loja.col('producao').orderBy('data', 'desc').onSnapshot(snap => {
        Store.producao = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('producao');
    }, err => console.error('producao', err)));

    _unsubscribers.push(Loja.col('receitas').onSnapshot(snap => {
        Store.receitas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('receitas');
    }, err => console.error('receitas', err)));

    _unsubscribers.push(Loja.col('capas').orderBy('criadoEm').onSnapshot(snap => {
        Store.capas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('capas');
    }, err => console.error('capas', err)));

    _unsubscribers.push(Loja.col('instaCards').orderBy('criadoEm').onSnapshot(snap => {
        Store.instaCards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('instaCards');
    }, err => console.error('instaCards', err)));

    _unsubscribers.push(Loja.col('beneficios').orderBy('criadoEm').onSnapshot(snap => {
        Store.beneficios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('beneficios');
    }, err => console.error('beneficios', err)));

    _unsubscribers.push(Loja.col('equipe').orderBy('criadoEm').onSnapshot(snap => {
        Store.equipe = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('equipe');
    }, err => console.error('equipe', err)));

    _unsubscribers.push(Loja.col('planos').orderBy('criadoEm').onSnapshot(snap => {
        Store.planos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('planos');
    }, err => console.error('planos', err)));

    _unsubscribers.push(Loja.ref().onSnapshot(snap => {
        if (snap.exists) Store.config = { ...Store.config, ...snap.data() };
        Store.emit('config');
    }, err => console.error('config', err)));
}

function teardownStoreListeners() {
    _unsubscribers.forEach(u => { try { u(); } catch (e) {} });
    _unsubscribers = [];
    Store.clientes = []; Store.produtos = []; Store.pedidos = []; Store.estoque = [];
    Store.financeiro = []; Store.producao = []; Store.receitas = []; Store.capas = []; Store.instaCards = [];
    Store.beneficios = []; Store.equipe = []; Store.planos = [];
}

let _profileUnsub = null;

function watchProfile(uid) {
    if (_profileUnsub) { _profileUnsub(); _profileUnsub = null; }
    _profileUnsub = window.db.collection('usuarios').doc(uid).onSnapshot(snap => {
        Store.profile = snap.exists ? snap.data() : {};
        Store.emit('profile');
    }, err => console.error('profile', err));
}

function teardownProfile() {
    if (_profileUnsub) { _profileUnsub(); _profileUnsub = null; }
    Store.profile = {};
}

function isAuthorizedEmail(email, allowList) {
    return !!email && (allowList || []).map(e => (e || '').toLowerCase()).includes(email.toLowerCase());
}

/* Gera próximo número sequencial de pedido de forma atômica */
async function nextPedidoNumero() {
    const ref = Loja.col('meta').doc('contadores');
    return window.db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const atual = (doc.exists && doc.data().pedidos) ? doc.data().pedidos : 1000;
        const proximo = atual + 1;
        t.set(ref, { pedidos: proximo }, { merge: true });
        return proximo;
    });
}
window.nextPedidoNumero = nextPedidoNumero;

/* ---------------------------------------------------------------------- */
/* Navegação                                                               */
/* ---------------------------------------------------------------------- */
const VIEWS = ['dashboard', 'pedidos', 'clientes', 'produtos', 'cardapio', 'producao', 'estoque', 'financeiro', 'precificacao', 'relatorios', 'configuracoes'];

const TITLES = {
    dashboard: ['Olá, {nome}! 👋', 'Confira o resumo do seu negócio hoje.'],
    pedidos: ['Pedidos', 'Acompanhe e gerencie todos os pedidos da loja.'],
    clientes: ['Clientes', 'Sua base de clientes e histórico de compras.'],
    produtos: ['Produtos', 'Catálogo de produtos, preços e estoque disponível.'],
    cardapio: ['Catálogo', 'Vitrine dos produtos disponíveis para venda.'],
    producao: ['Produção', 'Organize a produção e o preparo dos pedidos.'],
    estoque: ['Estoque', 'Controle de ingredientes e insumos.'],
    financeiro: ['Financeiro', 'Receitas, despesas e saúde financeira do negócio.'],
    precificacao: ['Precificação', 'Calcule o custo e o preço ideal dos seus produtos.'],
    relatorios: ['Relatórios', 'Indicadores e desempenho de vendas.'],
    configuracoes: ['Configurações', 'Dados da loja, categorias e preferências.']
};

let _currentView = 'dashboard';

function greetingName() {
    return (Store.profile && Store.profile.nome) || Auth.firstName();
}

function updateGreeting() {
    if (_currentView !== 'dashboard') return;
    document.getElementById('topbar-title').textContent = TITLES.dashboard[0].replace('{nome}', greetingName());
}

const TABBAR_VIEWS = ['dashboard', 'pedidos', 'producao', 'financeiro'];

function goToView(name) {
    if (!VIEWS.includes(name)) return;
    _currentView = name;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === name));
    document.getElementById('tabbar-more').classList.toggle('active', !TABBAR_VIEWS.includes(name));
    document.querySelectorAll('.view-section').forEach(el => el.classList.toggle('active', el.id === `view-${name}`));
    const [title, sub] = TITLES[name];
    document.getElementById('topbar-title').textContent = name === 'dashboard' ? title.replace('{nome}', greetingName()) : title;
    document.getElementById('topbar-sub').textContent = sub;
    document.getElementById('view').scrollTop = 0;
    closeMobileSidebar();
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('open');
}

function openMobileSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-backdrop').classList.add('open');
}

function bindNav() {
    document.getElementById('nav-links').addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (item) goToView(item.dataset.view);
    });
    document.getElementById('mobile-tabbar').addEventListener('click', (e) => {
        if (e.target.closest('#tabbar-more')) { openMobileSidebar(); return; }
        const item = e.target.closest('.nav-item');
        if (item) goToView(item.dataset.view);
    });
    document.getElementById('mobile-toggle').addEventListener('click', openMobileSidebar);
    document.getElementById('sidebar-backdrop').addEventListener('click', closeMobileSidebar);
    document.getElementById('btn-view-store').addEventListener('click', () => Storefront.openAdminPreview());

    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-goto]');
        if (el) goToView(el.dataset.goto);
    });
}

function updateTopbarDate() {
    const el = document.getElementById('topbar-date');
    if (el) el.textContent = Utils.formatDateBR(new Date());
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */
function mountAllModules() {
    Dashboard.mount();
    Pedidos.mount();
    Clientes.mount();
    Produtos.mount();
    Cardapio.mount();
    Producao.mount();
    Estoque.mount();
    Financeiro.mount();
    Precificacao.mount();
    Relatorios.mount();
    Configuracoes.mount();
}

function bindStoreSubscriptions() {
    Store.on('*', () => Dashboard.render());
    Store.on('pedidos', () => Pedidos.render());
    Store.on('clientes', () => { Clientes.render(); Pedidos.render(); });
    Store.on('produtos', () => { Produtos.render(); Cardapio.render(); Pedidos.render(); Precificacao.render(); });
    Store.on('estoque', () => { Estoque.render(); Precificacao.render(); });
    Store.on('financeiro', () => Financeiro.render());
    Store.on('producao', () => Producao.render());
    Store.on('receitas', () => Precificacao.render());
    Store.on('config', () => { Configuracoes.render(); Pedidos.render(); updateGreeting(); refreshSidebarUser(); applyPainelBackground(); applyPainelBranding(); applyPainelTema(); });
    Store.on('capas', () => Configuracoes.render());
    Store.on('instaCards', () => Configuracoes.render());
    Store.on('beneficios', () => Configuracoes.render());
    Store.on('equipe', () => Configuracoes.render());
    Store.on('planos', () => Configuracoes.render());
    Store.on('profile', () => { updateGreeting(); refreshSidebarUser(); Configuracoes.render(); });
    Store.on('*', () => Relatorios.render());
}

function refreshSidebarUser() {
    const nome = greetingName();
    const email = Auth.currentUser()?.email || '';
    const foto = Store.profile && Store.profile.fotoUrl;
    const nameEl = document.getElementById('user-name');
    nameEl.textContent = nome;
    nameEl.title = email;
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.innerHTML = foto ? `<img src="${foto}" alt="">` : nome.trim().charAt(0).toUpperCase();
}

function applyPainelBackground() {
    const view = document.getElementById('view');
    if (!view) return;
    if (Store.config.fundoPainel) {
        view.style.backgroundImage = `url("${Store.config.fundoPainel}")`;
        view.style.backgroundSize = 'cover';
        view.style.backgroundPosition = 'center';
        view.style.backgroundRepeat = 'no-repeat';
    } else {
        view.style.backgroundImage = '';
    }
}

function applyPainelBranding() {
    const img = document.getElementById('sidebar-brand-img');
    if (!img) return;
    img.src = (!Loja.isRoot && Store.config.logoUrl) ? Store.config.logoUrl : 'img/logo.png?v=4';
}

function applyPainelTema() {
    const raiz = document.getElementById('app-shell');
    if (!raiz) return;
    const c = Store.config;
    const accent = c.painelCorPrincipal || '#C9962B';
    const bg = c.painelCorFundo || '#FAF5EB';
    const text = c.painelCorTexto || '#1C1A16';
    const card = c.painelCorCard || '#FFFFFF';
    const botao = c.painelCorBotao || accent;
    const tema = {
        '--orange-50': Utils.lightenColor(accent, 0.90),
        '--orange-100': Utils.lightenColor(accent, 0.75),
        '--orange-200': Utils.lightenColor(accent, 0.55),
        '--orange-500': accent,
        '--orange-600': Utils.darkenColor(accent, 0.15),
        '--orange-700': Utils.darkenColor(accent, 0.30),
        '--bg': bg,
        '--surface': card,
        '--surface-soft': Utils.lightenColor(bg, 0.3),
        '--border': Utils.darkenColor(bg, 0.08),
        '--text-main': text,
        '--text-body': Utils.lightenColor(text, 0.30),
        '--text-muted': Utils.lightenColor(text, 0.55),
        '--painel-sidebar-bg': c.painelCorSidebar || '#FFFFFF',
        '--painel-topbar-bg': c.painelCorCabecalho || '#FFFFFF',
        '--painel-tabbar-bg': c.painelCorRodape || '#FFFFFF',
        '--painel-btn-bg': botao,
        '--painel-btn-bg-hover': Utils.darkenColor(botao, 0.15),
        '--painel-btn-text': c.painelCorBotaoTexto || '#ffffff',
        '--painel-card-text': c.painelCorCardTexto || text
    };
    Object.entries(tema).forEach(([k, v]) => raiz.style.setProperty(k, v));

    const fontFamily = Utils.fontFamilyById(c.fonteId);
    if (fontFamily) raiz.style.setProperty('--font-family', fontFamily);
    else raiz.style.removeProperty('--font-family');
}

function showApp() {
    document.getElementById('not-found-screen').style.display = 'none';
    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('storefront-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    refreshSidebarUser();

    const user = Auth.currentUser();
    const souSuperAdmin = Loja.isSuperAdmin(user && user.email);
    const modoPlataforma = Loja.isRoot && souSuperAdmin;
    applyNavMode(modoPlataforma);
    document.getElementById('btn-back-my-panel').style.display = (souSuperAdmin && !Loja.isRoot) ? 'flex' : 'none';
    goToView(modoPlataforma ? 'configuracoes' : 'dashboard');
}

function applyNavMode(minimal) {
    document.querySelectorAll('#nav-links .nav-item, #mobile-tabbar .nav-item').forEach(el => {
        el.style.display = (!minimal || el.dataset.view === 'configuracoes') ? '' : 'none';
    });
    document.getElementById('btn-view-store').style.display = minimal ? 'none' : '';
}

function showLogin() {
    document.getElementById('not-found-screen').style.display = 'none';
    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('storefront-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

function showLanding() {
    document.getElementById('not-found-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('storefront-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('landing-screen').style.display = 'block';
}

function showLojaNaoEncontrada() {
    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('storefront-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('not-found-screen').style.display = 'flex';
}

function showStorefrontScreen() {
    document.getElementById('not-found-screen').style.display = 'none';
    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('storefront-screen').style.display = 'block';
    Storefront.exitPreviewMode();
    Storefront.mount();
}

function bindLanding() {
    document.getElementById('landing-year').textContent = new Date().getFullYear();
    document.getElementById('btn-landing-login').addEventListener('click', showLogin);
    document.getElementById('btn-landing-login-2').addEventListener('click', showLogin);
    document.getElementById('btn-back-landing').addEventListener('click', (e) => {
        e.preventDefault();
        if (Loja.isRoot) showLanding(); else showStorefrontScreen();
    });
    document.getElementById('landing-screen').addEventListener('click', (e) => {
        const scrollLink = e.target.closest('[data-scroll]');
        if (scrollLink) {
            e.preventDefault();
            document.getElementById(scrollLink.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

function applyLandingBranding() {
    const nome = Store.config.nomeLoja || 'Excellent Loja';
    document.title = `${nome} | Sistema de Gestão`;
    const eyebrow = document.getElementById('landing-eyebrow-text');
    if (eyebrow) eyebrow.textContent = Store.config.heroEyebrow || 'Sistema de gestão + loja virtual';

    const iconeCustom = Store.config.faviconUrl || Store.config.logoUrl;
    if (!Loja.isRoot && iconeCustom) {
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) favicon.href = iconeCustom;
    }

    if (!Loja.isRoot) return;

    const hero = document.getElementById('landing-hero');
    if (hero) {
        hero.classList.toggle('has-capa', !!Store.config.capaLanding);
        hero.style.backgroundImage = Store.config.capaLanding ? `url("${Store.config.capaLanding}")` : '';
    }
    applyLandingTheme();

    const apTitulo = document.getElementById('landing-apresentacao-titulo');
    if (apTitulo && Store.config.apresentacaoTitulo) apTitulo.textContent = Store.config.apresentacaoTitulo;
    const apTexto = document.getElementById('landing-apresentacao-texto');
    if (apTexto && Store.config.apresentacaoTexto) apTexto.textContent = Store.config.apresentacaoTexto;
    const apMedia = document.getElementById('landing-apresentacao-media');
    if (apMedia) {
        apMedia.innerHTML = Store.config.apresentacaoImagem
            ? `<img src="${Store.config.apresentacaoImagem}" alt="">`
            : '<i class="fa-solid fa-image"></i>';
    }

    const telDigits = (Store.config.telefone || '').replace(/\D/g, '');
    const telRow = document.getElementById('landing-footer-tel');
    if (telRow) {
        telRow.style.display = Store.config.telefone ? 'flex' : 'none';
        telRow.querySelector('span').textContent = Store.config.telefone || '';
    }
    const instaRow = document.getElementById('landing-footer-insta');
    if (instaRow) {
        instaRow.style.display = Store.config.instagram ? 'flex' : 'none';
        instaRow.querySelector('span').textContent = Store.config.instagram || '';
    }

    const tel = telDigits;
    const contatoSection = document.getElementById('landing-contato');
    if (!contatoSection) return;
    if (!tel) { contatoSection.style.display = 'none'; return; }
    document.getElementById('landing-contato-btn').href = `https://wa.me/55${tel}?text=${encodeURIComponent('Olá! Quero ter minha própria loja na Excellent Loja.')}`;
    contatoSection.style.display = 'block';
}

function applyLandingTheme() {
    const raiz = document.getElementById('landing-screen');
    if (!raiz) return;
    const accent = Store.config.corPrincipal || '#C9962B';
    const bg = Store.config.corFundo || '#FAF5EB';
    const text = Store.config.corTexto || '#1C1A16';
    const corBotao = Store.config.corBotao || accent;
    const corCardTexto = Store.config.corCardTexto || text;
    const tema = {
        '--orange-50': Utils.lightenColor(accent, 0.90),
        '--orange-100': Utils.lightenColor(accent, 0.75),
        '--orange-200': Utils.lightenColor(accent, 0.55),
        '--orange-500': accent,
        '--orange-600': Utils.darkenColor(accent, 0.15),
        '--orange-700': Utils.darkenColor(accent, 0.30),
        '--bg': bg,
        '--surface-soft': Utils.lightenColor(bg, 0.3),
        '--border': Utils.darkenColor(bg, 0.08),
        '--footer-bg': Store.config.corRodape || Utils.darkenColor(accent, 0.85),
        '--text-main': text,
        '--text-body': Utils.lightenColor(text, 0.30),
        '--text-muted': Utils.lightenColor(text, 0.55),
        '--landing-header-bg': Store.config.corCabecalho || 'rgba(255,255,255,0.92)',
        '--landing-btn-bg': corBotao,
        '--landing-btn-bg-hover': Utils.darkenColor(corBotao, 0.15),
        '--landing-btn-text': Store.config.corBotaoTexto || '#ffffff',
        '--landing-card-bg': Store.config.corCard || '#ffffff',
        '--landing-card-text': corCardTexto
    };
    Object.entries(tema).forEach(([k, v]) => raiz.style.setProperty(k, v));

    const fontFamily = Utils.fontFamilyById(Store.config.fonteId);
    if (fontFamily) raiz.style.setProperty('--font-family', fontFamily);
    else raiz.style.removeProperty('--font-family');
}

async function loadLandingLojas() {
    if (!Loja.isRoot) return;
    try {
        const snap = await window.db.collection('lojas').get();
        const lojas = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.id !== 'root' && l.nomeLoja);
        const section = document.getElementById('landing-lojas-section');
        const grid = document.getElementById('landing-lojas-grid');
        if (!lojas.length) { section.style.display = 'none'; return; }
        grid.innerHTML = lojas.map(l => `
            <button type="button" class="landing-loja-card landing-shine landing-reveal" data-slug="${l.id}">
                <span class="landing-loja-img">${l.logoUrl ? `<img src="${l.logoUrl}" alt="${Utils.escapeHtml(l.nomeLoja)}">` : '<i class="fa-solid fa-shop"></i>'}</span>
                <span class="landing-loja-body"><strong>${Utils.escapeHtml(l.nomeLoja)}</strong></span>
            </button>
        `).join('');
        grid.querySelectorAll('.landing-loja-card').forEach(card => {
            card.addEventListener('click', () => { location.href = '/' + card.dataset.slug; });
        });
        section.style.display = 'block';
        observeLandingReveals();
    } catch (err) { console.error('landing lojas', err); }
}

const DEFAULT_BENEFICIOS = [
    { titulo: 'Pedidos organizados', texto: 'Painel kanban, do pedido à entrega.' },
    { titulo: 'Estoque sob controle', texto: 'Baixa automática a cada venda.' },
    { titulo: 'Financeiro em dia', texto: 'Receitas, despesas e saldo do mês.' },
    { titulo: 'Relatórios completos', texto: 'Desempenho de vendas e produtos.' }
];

function renderLandingBeneficios(lista) {
    const grid = document.getElementById('landing-beneficios-grid');
    if (!grid) return;
    const itens = (lista && lista.length) ? lista : DEFAULT_BENEFICIOS;
    grid.innerHTML = itens.map(b => `
        <div class="landing-beneficio-card landing-shine landing-reveal">
            <div class="landing-beneficio-img">${b.imagem ? `<img src="${b.imagem}" alt="">` : '<i class="fa-solid fa-image"></i>'}</div>
            <div class="landing-beneficio-body">
                <strong>${Utils.escapeHtml(b.titulo || '')}</strong>
                <span>${Utils.escapeHtml(b.texto || '')}</span>
            </div>
        </div>
    `).join('');
    observeLandingReveals();
}

function renderLandingEquipe(lista) {
    const section = document.getElementById('landing-equipe-section');
    const grid = document.getElementById('landing-equipe-grid');
    if (!section || !grid) return;
    if (!lista || !lista.length) { section.style.display = 'none'; return; }
    grid.innerHTML = lista.map(m => `
        <div class="landing-equipe-card landing-shine landing-reveal">
            <div class="landing-equipe-foto">${m.foto ? `<img src="${m.foto}" alt="">` : '<i class="fa-solid fa-user"></i>'}</div>
            <div class="landing-equipe-info">
                <strong>${Utils.escapeHtml(m.nome || '')}</strong>
                <span>${Utils.escapeHtml(m.descricao || '')}</span>
            </div>
        </div>
    `).join('');
    section.style.display = 'block';
    observeLandingReveals();
}

const DEFAULT_PLANOS = [
    {
        nome: 'Básico', valor: 'R$ 47/mês', cor: '#CD7F32',
        itens: [
            { texto: 'Loja virtual completa', incluido: true },
            { texto: 'Painel de pedidos, estoque e financeiro', incluido: true },
            { texto: 'Até 50 produtos cadastrados', incluido: true },
            { texto: 'Pagamento online direto na loja', incluido: false },
            { texto: 'Cores e fonte personalizadas', incluido: false }
        ]
    },
    {
        nome: 'Profissional', valor: 'R$ 97/mês', cor: '#B9BBBE',
        itens: [
            { texto: 'Tudo do plano Básico', incluido: true },
            { texto: 'Produtos ilimitados', incluido: true },
            { texto: 'Pagamento online direto na loja', incluido: true },
            { texto: 'Cores e fonte personalizadas', incluido: true },
            { texto: 'Múltiplos administradores', incluido: false }
        ]
    },
    {
        nome: 'Empresarial', valor: 'R$ 187/mês', cor: '#D4AF37',
        itens: [
            { texto: 'Tudo do plano Profissional', incluido: true },
            { texto: 'Múltiplos administradores', incluido: true },
            { texto: 'Suporte prioritário', incluido: true },
            { texto: 'Consultoria de configuração inicial', incluido: true }
        ]
    }
];

function renderLandingPlanos(lista) {
    const grid = document.getElementById('landing-planos-grid');
    if (!grid) return;
    const planos = (lista && lista.length) ? lista : DEFAULT_PLANOS;
    grid.innerHTML = planos.map(p => {
        const cor = p.cor || '#C9962B';
        const corClara = Utils.lightenColor(cor, 0.6);
        const itens = (p.itens || []).map(it => `
            <li class="${it.incluido ? 'incluido' : 'nao-incluido'}">
                <i class="fa-solid ${it.incluido ? 'fa-check' : 'fa-xmark'}"></i>
                <span>${Utils.escapeHtml(it.texto || '')}</span>
            </li>
        `).join('');
        return `
            <div class="landing-plano-card landing-shine landing-reveal" style="--plano-cor:${cor};--plano-cor-clara:${corClara};">
                <div class="landing-plano-faixa"></div>
                <div class="landing-plano-nome"><i class="fa-solid fa-medal"></i> ${Utils.escapeHtml(p.nome || '')}</div>
                <ul class="landing-plano-itens">${itens}</ul>
                <div class="landing-plano-preco">${Utils.escapeHtml(p.valor || '')}</div>
                <div class="landing-plano-cta"><a href="#" data-scroll="landing-contato" class="btn btn-primary landing-shine">Quero esse plano</a></div>
            </div>
        `;
    }).join('');
    observeLandingReveals();
}

async function loadLandingExtras() {
    if (!Loja.isRoot) return;
    try {
        const [benSnap, eqSnap, planSnap] = await Promise.all([
            Loja.col('beneficios').orderBy('criadoEm').get(),
            Loja.col('equipe').orderBy('criadoEm').get(),
            Loja.col('planos').orderBy('criadoEm').get()
        ]);
        renderLandingBeneficios(benSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        renderLandingEquipe(eqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        renderLandingPlanos(planSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error('landing extras', err); }
}

let _landingObserver = null;
function observeLandingReveals() {
    if (!_landingObserver) {
        _landingObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    _landingObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
    }
    document.querySelectorAll('#landing-screen .landing-reveal:not(.in-view)').forEach(el => _landingObserver.observe(el));
}

function stripUrlHash() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}
window.addEventListener('hashchange', stripUrlHash);

document.addEventListener('DOMContentLoaded', async () => {
    stripUrlHash();
    updateTopbarDate();
    bindNav();
    bindLanding();
    Auth.bindLoginForm();
    mountAllModules();
    bindStoreSubscriptions();
    loadLandingLojas();
    loadLandingExtras();
    observeLandingReveals();

    let lojaSnap;
    try { lojaSnap = await Loja.ref().get(); } catch (err) { console.error('loja fetch', err); }
    const lojaExiste = !!(lojaSnap && lojaSnap.exists);

    if (lojaExiste) {
        Store.config = { ...Store.config, ...lojaSnap.data() };
        applyLandingBranding();
    } else if (!Loja.isRoot) {
        document.getElementById('app-loading').style.display = 'none';
        showLojaNaoEncontrada();
        return;
    }

    window.auth.onAuthStateChanged(async user => {
        if (!lojaExiste) {
            // só chega aqui quando é a loja "root" (do dono da plataforma) e ela ainda não foi criada
            if (user && Loja.isSuperAdmin(user.email)) {
                const dadosIniciais = {
                    nomeLoja: 'Excellent Loja',
                    categoriasProdutos: Store.config.categoriasProdutos,
                    formasPagamento: Store.config.formasPagamento,
                    taxaEntregaPadrao: 0,
                    usuariosAutorizados: [Loja.SUPER_ADMIN_EMAIL],
                    criadaEm: firebase.firestore.FieldValue.serverTimestamp()
                };
                try {
                    await Loja.ref().set(dadosIniciais);
                    Store.config = { ...Store.config, ...dadosIniciais };
                    applyLandingBranding();
                } catch (err) { console.error('bootstrap loja root', err); }
            } else {
                document.getElementById('app-loading').style.display = 'none';
                if (user) showLojaNaoEncontrada(); else showLanding();
                return;
            }
        }

        if (!user) {
            teardownStoreListeners();
            teardownProfile();
            document.getElementById('app-loading').style.display = 'none';
            if (Loja.isRoot) showLanding(); else showStorefrontScreen();
            return;
        }

        document.getElementById('app-loading').style.display = 'none';

        const souAutorizadoAqui = isAuthorizedEmail(user.email, Store.config.usuariosAutorizados) || Loja.isSuperAdmin(user.email);

        if (souAutorizadoAqui) {
            initStoreListeners();
            watchProfile(user.uid);
            Configuracoes.mount(); // remonta agora que já sabemos quem logou (a aba "Gerenciar lojas" depende disso)
            Onboarding.start(user, 'admin', () => showApp());
        } else if (Loja.isRoot) {
            // login na página inicial é só para quem administra alguma loja
            let outraLoja = null;
            try {
                const snap = await window.db.collection('lojas').where('usuariosAutorizados', 'array-contains', user.email).limit(1).get();
                if (!snap.empty) outraLoja = snap.docs[0].id;
            } catch (err) { console.error('busca loja do usuario', err); }

            if (outraLoja) {
                location.href = '/' + outraLoja;
                return;
            }
            await window.auth.signOut();
            Utils.toast('Esse e-mail não administra nenhuma loja aqui. Fale com quem administra a Excellent Loja.', 'error');
            showLanding();
        } else if (user.isAnonymous) {
            // clientes nunca fazem login de verdade: a sessão anônima é criada silenciosamente
            // no checkout, então não faz sentido pedir dados de novo aqui
            showStorefrontScreen();
        } else {
            Onboarding.start(user, 'cliente', () => showStorefrontScreen());
        }
    });
});
