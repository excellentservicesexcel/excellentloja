/* ==========================================================================
   Núcleo do app — Excellent Loja
   Store central (dados em tempo real do Firestore) + navegação + boot.
   ========================================================================== */

const DEFAULT_CONFIG = {
    nomeLoja: 'Excellent Loja',
    categoriasProdutos: ['Geral', 'Novidades', 'Mais vendidos', 'Promoções'],
    formasPagamento: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'],
    taxaEntregaPadrao: 0,
    usuariosAutorizados: ['excellentservices.excel@gmail.com']
};

const Store = {
    clientes: [], produtos: [], pedidos: [], estoque: [], financeiro: [], producao: [], receitas: [], capas: [], instaCards: [],
    beneficios: [], equipe: [], capasLanding: [],
    profile: {},
    config: { ...DEFAULT_CONFIG },
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

    _unsubscribers.push(Loja.col('capasLanding').orderBy('criadoEm').onSnapshot(snap => {
        Store.capasLanding = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        Store.emit('capasLanding');
        renderLandingHero();
    }, err => console.error('capasLanding', err)));

    _unsubscribers.push(Loja.ref().onSnapshot(snap => {
        if (snap.exists) Store.config = { ...DEFAULT_CONFIG, ...snap.data() };
        Store.emit('config');
    }, err => console.error('config', err)));
}

function teardownStoreListeners() {
    _unsubscribers.forEach(u => { try { u(); } catch (e) {} });
    _unsubscribers = [];
    Store.clientes = []; Store.produtos = []; Store.pedidos = []; Store.estoque = [];
    Store.financeiro = []; Store.producao = []; Store.receitas = []; Store.capas = []; Store.instaCards = [];
    Store.beneficios = []; Store.equipe = []; Store.planos = []; Store.capasLanding = [];
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
const VIEWS = ['dashboard', 'pedidos', 'clientes', 'produtos', 'cardapio', 'producao', 'estoque', 'financeiro', 'precificacao', 'relatorios', 'configuracoes', 'compras', 'leads'];

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
    configuracoes: ['Configurações', 'Dados da loja, categorias e preferências.'],
    compras: ['Compras', 'Assinaturas dos planos da plataforma — pagamentos, renovações e comprovantes.'],
    leads: ['Leads', 'Quem demonstrou interesse num plano — faça o follow-up antes que esfrie.']
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
    Compras.mount();
    Leads.mount();
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
    Store.on('config', () => { Configuracoes.render(); Pedidos.render(); updateGreeting(); refreshSidebarUser(); applyPainelBackground(); applyPainelBranding(); applyPainelTema(); applyPainelTagline(); applyLoginTema(); });
    Store.on('capas', () => Configuracoes.render());
    Store.on('instaCards', () => Configuracoes.render());
    Store.on('beneficios', () => Configuracoes.render());
    Store.on('equipe', () => Configuracoes.render());
    Store.on('planos', () => Configuracoes.render());
    Store.on('capasLanding', () => Configuracoes.render());
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
    const sidebarText = c.painelCorSidebarTexto || text;
    const topbarText = c.painelCorCabecalhoTexto || text;
    const campoFundo = c.painelCorCampoFundo || Utils.lightenColor(bg, 0.3);
    const campoTexto = c.painelCorCampoTexto || text;
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
        '--painel-card-text': c.painelCorCardTexto || text,
        '--painel-card-text-muted': Utils.lightenColor(c.painelCorCardTexto || text, 0.45),
        '--painel-sidebar-text': sidebarText,
        '--painel-sidebar-text-muted': Utils.lightenColor(sidebarText, 0.45),
        '--painel-topbar-text': topbarText,
        '--painel-topbar-text-muted': Utils.lightenColor(topbarText, 0.45),
        '--painel-input-bg': campoFundo,
        '--painel-input-text': campoTexto
    };
    const fontFamily = Utils.fontFamilyById(c.fonteId);
    // O onboarding fica fora de #app-shell (é um overlay irmão dele), então
    // recebe a mesma paleta separadamente pra também seguir a personalização.
    [raiz, document.getElementById('onboarding-screen')].forEach(el => {
        if (!el) return;
        Object.entries(tema).forEach(([k, v]) => el.style.setProperty(k, v));
        if (fontFamily) el.style.setProperty('--font-family', fontFamily);
        else el.style.removeProperty('--font-family');
    });
}

// Tela de login — paleta própria e independente (do painel e da página
// inicial), só existe na página raiz. Configurações → Página inicial →
// "Personalize a tela de login".
function applyLoginTema() {
    if (!Loja.isRoot) return;
    const loginScreen = document.getElementById('login-screen');
    if (!loginScreen) return;
    const c = Store.config;
    const tema = {
        '--login-esquerda-fundo': c.loginCorEsquerdaFundo || '#FAF5EB',
        '--login-esquerda-destaque': c.loginCorEsquerdaDestaque || '#C9962B',
        '--login-frase': c.loginCorFrase || '#4A4136',
        '--login-direita-fundo': c.loginCorDireitaFundo || '#FFFFFF',
        '--login-titulo': c.loginCorTitulo || '#1C1A16',
        '--login-texto-secundario': c.loginCorTextoSecundario || '#8C8275',
        '--login-campo-fundo': c.loginCorCampoFundo || '#FBF6EC',
        '--login-campo-texto': c.loginCorCampoTexto || '#1C1A16',
        '--login-botao': c.loginCorBotao || '#C9962B',
        '--login-botao-texto': c.loginCorBotaoTexto || '#FFFFFF',
        '--login-botao-secundario': c.loginCorBotaoSecundario || '#FFFFFF',
        '--login-botao-secundario-text': c.loginCorBotaoSecundarioTexto || '#4A4136'
    };
    Object.entries(tema).forEach(([k, v]) => loginScreen.style.setProperty(k, v));

    const fontFamily = Utils.fontFamilyById(c.fonteId);
    if (fontFamily) loginScreen.style.setProperty('--font-family', fontFamily);
    else loginScreen.style.removeProperty('--font-family');
}

function applyPainelTagline() {
    if (!Loja.isRoot) return;
    const texto = Store.config.painelTagline || 'Excelência em cada venda 🏆';
    const sidebar = document.getElementById('sidebar-tagline');
    if (sidebar) sidebar.textContent = texto;
    const login = document.getElementById('login-tagline');
    if (login) login.textContent = texto;
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
    if (modoPlataforma) { Compras.carregar(); Leads.carregar(); }
    goToView(modoPlataforma ? 'configuracoes' : 'dashboard');
}

function applyNavMode(plataforma) {
    document.querySelectorAll('#nav-links .nav-item, #mobile-tabbar .nav-item').forEach(el => {
        const view = el.dataset.view;
        if (view === 'compras' || view === 'leads') { el.style.display = plataforma ? '' : 'none'; return; }
        el.style.display = (!plataforma || view === 'configuracoes') ? '' : 'none';
    });
    document.getElementById('btn-view-store').style.display = plataforma ? 'none' : '';
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
            return;
        }
        const comprarBtn = e.target.closest('.js-comprar-plano');
        if (comprarBtn) {
            const plano = _landingPlanosCache[Number(comprarBtn.dataset.planoI)];
            if (plano) Checkout.abrir(plano);
        }
    });
}

let _landingHeroCarouselTimer = null;
function stopLandingHeroCarousel() {
    if (_landingHeroCarouselTimer) { clearInterval(_landingHeroCarouselTimer); _landingHeroCarouselTimer = null; }
}
function startLandingHeroCarousel(count) {
    stopLandingHeroCarousel();
    if (count <= 1) return;
    let index = 0;
    _landingHeroCarouselTimer = setInterval(() => {
        index = (index + 1) % count;
        const track = document.getElementById('landing-hero-track');
        if (track) track.style.transform = `translateX(-${index * 100}%)`;
        document.querySelectorAll('#landing-hero-dots .landing-hero-dot').forEach((d, i) => d.classList.toggle('active', i === index));
    }, 3000);
}

function renderLandingHero() {
    const hero = document.getElementById('landing-hero');
    const wrap = document.getElementById('landing-hero-carousel-wrap');
    if (!hero || !wrap) return;
    const listaCapas = (Store.capasLanding && Store.capasLanding.length)
        ? Store.capasLanding.map(c => c.imagem)
        : (Store.config.capaLanding ? [Store.config.capaLanding] : []);

    if (listaCapas.length < 2) {
        stopLandingHeroCarousel();
        wrap.style.display = 'none';
        wrap.innerHTML = '';
        hero.classList.remove('has-carousel');
        const capa = listaCapas[0] || '';
        hero.classList.toggle('has-capa', !!capa);
        hero.style.backgroundImage = capa ? `url("${capa}")` : '';
        if (capa) {
            const capaImg = new Image();
            capaImg.onload = () => {
                if (capaImg.naturalWidth && capaImg.naturalHeight) {
                    hero.style.setProperty('--capa-ratio', `${capaImg.naturalWidth} / ${capaImg.naturalHeight}`);
                }
            };
            capaImg.src = capa;
        } else {
            hero.style.removeProperty('--capa-ratio');
        }
        return;
    }

    hero.classList.remove('has-capa');
    hero.style.backgroundImage = '';
    hero.classList.add('has-carousel');
    wrap.style.display = 'block';
    wrap.innerHTML = `
        <div class="landing-hero-carousel-track" id="landing-hero-track">
            ${listaCapas.map(src => `<div class="landing-hero-slide"><img src="${src}" alt=""></div>`).join('')}
        </div>
        <div class="landing-hero-dots" id="landing-hero-dots">${listaCapas.map((_, i) => `<span class="landing-hero-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}</div>
    `;
    startLandingHeroCarousel(listaCapas.length);
    // usa a proporção real da primeira foto como referência do quadro do carrossel, em vez de
    // uma proporção fixa — evita cortar as laterais quando a imagem não é exatamente 3:1
    const primeiraImg = new Image();
    primeiraImg.onload = () => {
        if (primeiraImg.naturalWidth && primeiraImg.naturalHeight) {
            wrap.style.setProperty('--capa-ratio', `${primeiraImg.naturalWidth} / ${primeiraImg.naturalHeight}`);
        }
    };
    primeiraImg.src = listaCapas[0];
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

    renderLandingHero();
    applyLandingTheme();

    const apTitulo = document.getElementById('landing-apresentacao-titulo');
    if (apTitulo && Store.config.apresentacaoTitulo) apTitulo.textContent = Store.config.apresentacaoTitulo;
    const apTexto = document.getElementById('landing-apresentacao-texto');
    if (apTexto && Store.config.apresentacaoTexto) apTexto.textContent = Store.config.apresentacaoTexto;
    const apMedia = document.getElementById('landing-apresentacao-media');
    if (apMedia) {
        apMedia.classList.toggle('has-media', !!Store.config.apresentacaoImagem);
        apMedia.innerHTML = Store.config.apresentacaoImagem
            ? `<img src="${Store.config.apresentacaoImagem}" alt="">`
            : '<i class="fa-solid fa-image"></i>';
        apMedia.style.setProperty('--apresentacao-escala', (Number(Store.config.apresentacaoImagemTamanho) || 100) / 100);
        // Imagem com transparência de verdade (logo/gráfico) mantém sem cortar/arredondar
        // pra não estranhar o recorte. Foto comum ganha cantos arredondados e o mesmo brilho
        // ao passar o mouse que os outros cards da página inicial usam. apresentacaoImagemTransparente
        // é calculado no upload (checando os pixels); imagens salvas antes disso existir caem
        // no palpite antigo (só olhar se é .png) até serem reenviadas.
        const transparente = Store.config.apresentacaoImagemTransparente !== undefined
            ? Store.config.apresentacaoImagemTransparente
            : (Store.config.apresentacaoImagem || '').startsWith('data:image/png');
        const isFoto = !!Store.config.apresentacaoImagem && !transparente;
        apMedia.classList.toggle('landing-shine', isFoto);
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
    const contatoTitulo = document.getElementById('landing-contato-titulo');
    if (contatoTitulo) contatoTitulo.textContent = Store.config.contatoTitulo || 'Quer ter sua própria loja?';
    const contatoTexto = document.getElementById('landing-contato-texto');
    if (contatoTexto) contatoTexto.textContent = Store.config.contatoTexto || 'Fale com a gente e comece a vender com o seu próprio painel de gestão.';
    const contatoMensagem = Store.config.contatoMensagem || 'Olá! Quero ter minha própria loja na Excellent Loja.';
    document.getElementById('landing-contato-btn').href = `https://wa.me/55${tel}?text=${encodeURIComponent(contatoMensagem)}`;
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
    const corCabecalho = Store.config.corCabecalho || '#FFFFFF';
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
        // cabeçalho com efeito vidro: a cor escolhida vira um "tingimento" translúcido em
        // vez de opaca, combinada com o backdrop-filter:blur do CSS
        '--landing-header-bg': Utils.hexToRgba(corCabecalho, 0.72),
        '--landing-grid-color': Utils.hexToRgba(text, 0.06),
        '--landing-btn-bg': corBotao,
        '--landing-btn-bg-hover': Utils.darkenColor(corBotao, 0.15),
        '--landing-btn-text': Store.config.corBotaoTexto || '#ffffff',
        '--landing-card-bg': Store.config.corCard || '#ffffff',
        '--landing-card-text': corCardTexto,
        '--landing-card-text-muted': Utils.lightenColor(corCardTexto, 0.55)
    };
    Object.entries(tema).forEach(([k, v]) => raiz.style.setProperty(k, v));

    const fontFamily = Utils.fontFamilyById(Store.config.fonteId);
    if (fontFamily) raiz.style.setProperty('--font-family', fontFamily);
    else raiz.style.removeProperty('--font-family');

    // Monta o fundo da página em camadas (grade + degradê/cor sólida) via background-image —
    // uma cor sólida também vira gradiente (mesma cor nas duas pontas) pra poder ficar na
    // mesma lista de camadas sem misturar com background-color e sem cortar a textura de grade
    const camadas = [];
    const tamanhos = [];
    if (Store.config.texturaGrade) {
        camadas.push('linear-gradient(var(--landing-grid-color) 1px, transparent 1px)');
        camadas.push('linear-gradient(90deg, var(--landing-grid-color) 1px, transparent 1px)');
        tamanhos.push('44px 44px', '44px 44px');
    }
    const corFundo2 = Store.config.corFundo2;
    camadas.push(Store.config.fundoDegrade && corFundo2 ? `linear-gradient(150deg, ${bg}, ${corFundo2})` : `linear-gradient(${bg}, ${bg})`);
    tamanhos.push('cover');
    raiz.style.backgroundImage = camadas.join(', ');
    raiz.style.backgroundSize = tamanhos.join(', ');
    raiz.style.backgroundAttachment = 'fixed';
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
        nome: 'Básico', valor: 'R$ 47', tipo: 'Mensal', valorCobranca: 47, cor: '#CD7F32',
        itens: [
            { texto: 'Loja virtual completa', incluido: true },
            { texto: 'Painel de pedidos, estoque e financeiro', incluido: true },
            { texto: 'Até 50 produtos cadastrados', incluido: true },
            { texto: 'Pagamento online direto na loja', incluido: false },
            { texto: 'Cores e fonte personalizadas', incluido: false }
        ]
    },
    {
        nome: 'Profissional', valor: 'R$ 97', tipo: 'Mensal', valorCobranca: 97, cor: '#B9BBBE',
        itens: [
            { texto: 'Tudo do plano Básico', incluido: true },
            { texto: 'Produtos ilimitados', incluido: true },
            { texto: 'Pagamento online direto na loja', incluido: true },
            { texto: 'Cores e fonte personalizadas', incluido: true },
            { texto: 'Múltiplos administradores', incluido: false }
        ]
    },
    {
        nome: 'Empresarial', valor: 'R$ 187', tipo: 'Mensal', valorCobranca: 187, cor: '#D4AF37',
        itens: [
            { texto: 'Tudo do plano Profissional', incluido: true },
            { texto: 'Múltiplos administradores', incluido: true },
            { texto: 'Suporte prioritário', incluido: true },
            { texto: 'Consultoria de configuração inicial', incluido: true }
        ]
    }
];

let _landingPlanosCache = [];

function renderLandingPlanos(lista) {
    const grid = document.getElementById('landing-planos-grid');
    if (!grid) return;
    const planos = (lista && lista.length) ? lista : DEFAULT_PLANOS;
    _landingPlanosCache = planos;
    grid.innerHTML = planos.map((p, i) => {
        const cor = p.cor || '#C9962B';
        const corClara = Utils.lightenColor(cor, 0.6);
        const itens = (p.itens || []).map(it => `
            <li class="${it.incluido ? 'incluido' : 'nao-incluido'}">
                <i class="fa-solid ${it.incluido ? 'fa-check' : 'fa-xmark'}"></i>
                <span>${Utils.escapeHtml(it.texto || '')}</span>
            </li>
        `).join('');
        const comprável = Number(p.valorCobranca) > 0;
        const cta = comprável
            ? `<button type="button" class="btn btn-primary landing-shine js-comprar-plano" data-plano-i="${i}">Quero esse plano</button>`
            : `<a href="#" data-scroll="landing-contato" class="btn btn-primary landing-shine">Quero esse plano</a>`;
        return `
            <div class="landing-plano-card landing-shine landing-reveal" style="--plano-cor:${cor};--plano-cor-clara:${corClara};">
                <div class="landing-plano-faixa"></div>
                <div class="landing-plano-nome"><i class="fa-solid fa-medal"></i> ${Utils.escapeHtml(p.nome || '')}</div>
                <ul class="landing-plano-itens">${itens}</ul>
                ${p.tipo ? `<div class="landing-plano-tipo">${Utils.escapeHtml(p.tipo)}</div>` : ''}
                <div class="landing-plano-preco">${Utils.escapeHtml(p.valor || '')}</div>
                <div class="landing-plano-cta">${cta}</div>
            </div>
        `;
    }).join('');
    observeLandingReveals();
}

async function loadLandingExtras() {
    if (!Loja.isRoot) return;
    try {
        const [benSnap, eqSnap, planSnap, capasSnap] = await Promise.all([
            Loja.col('beneficios').orderBy('criadoEm').get(),
            Loja.col('equipe').orderBy('criadoEm').get(),
            Loja.col('planos').orderBy('criadoEm').get(),
            Loja.col('capasLanding').orderBy('criadoEm').get()
        ]);
        renderLandingBeneficios(benSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        renderLandingEquipe(eqSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        renderLandingPlanos(planSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        Store.capasLanding = capasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderLandingHero();
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
    Checkout.init();

    let lojaSnap;
    try { lojaSnap = await Loja.ref().get(); } catch (err) { console.error('loja fetch', err); }
    const lojaExiste = !!(lojaSnap && lojaSnap.exists);

    if (lojaExiste) {
        Store.config = { ...DEFAULT_CONFIG, ...lojaSnap.data() };
        applyLandingBranding();
        applyPainelTema();
        applyPainelTagline();
        applyLoginTema();
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
                    Store.config = { ...DEFAULT_CONFIG, ...dadosIniciais };
                    applyLandingBranding();
                    applyPainelTema();
                    applyPainelTagline();
                    applyLoginTema();
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
