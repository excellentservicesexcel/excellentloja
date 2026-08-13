/* ==========================================================================
   Núcleo do app — Excellent Loja
   Store central (dados em tempo real do Firestore) + navegação + boot.
   ========================================================================== */

const Store = {
    clientes: [], produtos: [], pedidos: [], estoque: [], financeiro: [], producao: [], receitas: [], capas: [], instaCards: [],
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
    Store.on('config', () => { Configuracoes.render(); Pedidos.render(); updateGreeting(); refreshSidebarUser(); applyPainelBackground(); });
    Store.on('capas', () => Configuracoes.render());
    Store.on('instaCards', () => Configuracoes.render());
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

function showApp() {
    document.getElementById('not-found-screen').style.display = 'none';
    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('storefront-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'flex';
    refreshSidebarUser();

    const user = Auth.currentUser();
    const modoPlataforma = Loja.isRoot && Loja.isSuperAdmin(user && user.email);
    applyNavMode(modoPlataforma);
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
}

function applyLandingBranding() {
    const nome = Store.config.nomeLoja || 'Excellent Loja';
    document.title = `${nome} | Sistema de Gestão`;
    const heroH1 = document.querySelector('.landing-hero h1');
    if (heroH1) heroH1.textContent = nome;

    if (!Loja.isRoot && Store.config.logoUrl) {
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) favicon.href = Store.config.logoUrl;
    }

    if (!Loja.isRoot) return;
    const tel = (Store.config.telefone || '').replace(/\D/g, '');
    const contatoSection = document.getElementById('landing-contato');
    if (!contatoSection) return;
    if (!tel) { contatoSection.style.display = 'none'; return; }
    document.getElementById('landing-contato-btn').href = `https://wa.me/55${tel}?text=${encodeURIComponent('Olá! Quero ter minha própria loja na Excellent Loja.')}`;
    contatoSection.style.display = 'block';
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
            <button type="button" class="landing-loja-card" data-slug="${l.id}">
                <span class="landing-loja-logo">${l.logoUrl ? `<img src="${l.logoUrl}" alt="${Utils.escapeHtml(l.nomeLoja)}">` : '<i class="fa-solid fa-shop"></i>'}</span>
                <strong>${Utils.escapeHtml(l.nomeLoja)}</strong>
            </button>
        `).join('');
        grid.querySelectorAll('.landing-loja-card').forEach(card => {
            card.addEventListener('click', () => { location.href = '/' + card.dataset.slug; });
        });
        section.style.display = 'block';
        document.getElementById('landing-hero-sub').textContent = 'Escolha uma loja para visitar, ou entre no painel se você administra uma delas.';
    } catch (err) { console.error('landing lojas', err); }
}

document.addEventListener('DOMContentLoaded', async () => {
    updateTopbarDate();
    bindNav();
    bindLanding();
    Auth.bindLoginForm();
    mountAllModules();
    bindStoreSubscriptions();
    loadLandingLojas();

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
