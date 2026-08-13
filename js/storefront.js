/* ==========================================================================
   Loja virtual pública — Excellent Loja
   Exibida para logins que não estão na lista de usuários autorizados.
   ========================================================================== */

const Storefront = (() => {

    let produtos = [];
    let config = {};
    let capas = [];
    let instaCards = [];
    let cart = [];
    let catFilter = '';
    let searchTerm = '';
    let unsubs = [];
    let mounted = false;
    let previewMode = false;
    let carouselTimer = null;
    let carouselIndex = 0;

    function mount() {
        if (mounted) { render(); return; }
        mounted = true;
        const el = document.getElementById('storefront-screen');
        el.innerHTML = shellHtml();
        bindStatic();
        listen();
    }

    function openAdminPreview() {
        previewMode = true;
        document.getElementById('app-shell').style.display = 'none';
        document.getElementById('storefront-screen').style.display = 'block';
        mount();
    }

    function closeAdminPreview() {
        document.getElementById('storefront-screen').style.display = 'none';
        document.getElementById('app-shell').style.display = 'flex';
    }

    const DADOS_KEY = 'excellentloja_dados_cliente';
    function dadosSalvos() {
        try { return JSON.parse(localStorage.getItem(DADOS_KEY) || 'null'); } catch (e) { return null; }
    }
    function salvarDados(dados) {
        try { localStorage.setItem(DADOS_KEY, JSON.stringify(dados)); } catch (e) {}
    }

    function shellHtml() {
        return `
        <div class="store-page" id="store-top">
            <header class="store-header">
                <div class="store-header-inner">
                    <img src="img/logo.png?v=3" alt="Excellent Loja" class="store-logo-img">
                    <nav class="store-nav">
                        <a href="#store-top">Início</a>
                        <a href="#store-produtos">Catálogo</a>
                        <a href="#store-kits">Ofertas</a>
                        <a href="#store-sobre">Quem somos</a>
                        <a href="#store-contato">Contato</a>
                    </nav>
                    <div class="store-header-actions">
                        ${previewMode ? `<button class="store-preview-exit" id="store-preview-exit"><i class="fa-solid fa-arrow-left"></i> Voltar ao painel</button>` : ''}
                        <button class="store-icon-btn" id="store-search-btn" title="Buscar"><i class="fa-solid fa-magnifying-glass"></i></button>
                        <button class="store-icon-btn" id="store-cart-btn" title="Carrinho">
                            <i class="fa-solid fa-cart-shopping"></i>
                            <span class="store-cart-badge" id="store-cart-badge" style="display:none;">0</span>
                        </button>
                    </div>
                </div>
                <div class="store-search-bar" id="store-search-bar">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="text" id="store-search-input" placeholder="Buscar produtos...">
                    <button id="store-search-close"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </header>

            <section class="store-hero">
                <div class="store-hero-media" id="store-hero-art-wrap"></div>
            </section>

            <section class="store-features">
                <div class="store-feature"><i class="fa-solid fa-heart"></i><strong>Feito com cuidado</strong><span>Em cada detalhe</span></div>
                <div class="store-feature"><i class="fa-solid fa-award"></i><strong>Produtos selecionados</strong><span>Qualidade que você sente</span></div>
                <div class="store-feature"><i class="fa-solid fa-wand-magic-sparkles"></i><strong>Momentos especiais</strong><span>Para celebrar e presentear</span></div>
                <div class="store-feature"><i class="fa-solid fa-gem"></i><strong>Seleção exclusiva</strong><span>Curadoria com atenção aos detalhes</span></div>
            </section>

            <section class="store-section" id="store-produtos">
                <div class="store-section-head">
                    <h2>Navegue por categoria</h2>
                    <span class="store-link" data-cat-reset="1">Ver todas <i class="fa-solid fa-arrow-right"></i></span>
                </div>
                <div class="store-cats" id="store-cats"></div>

                <div class="store-section-head" style="margin-top:36px;">
                    <h2>Nossos produtos ⭐</h2>
                </div>
                <div class="store-grid" id="store-grid"></div>
            </section>

            <section class="store-banner" id="store-kits">
                <div class="store-banner-media" id="store-banner-media"></div>
            </section>

            <section class="store-benefits" id="store-sobre">
                <div><i class="fa-solid fa-truck"></i><strong>Entrega combinada</strong><span>Direto com a loja</span></div>
                <div><i class="fa-solid fa-box"></i><strong>Embalagem segura</strong><span>Chega perfeito até você</span></div>
                <div><i class="fa-brands fa-whatsapp"></i><strong>Pedido simples</strong><span>Finalize pelo WhatsApp</span></div>
                <div><i class="fa-solid fa-comments"></i><strong>Atendimento</strong><span>Feito com carinho</span></div>
            </section>

            <section class="store-insta">
                <div class="store-section-head">
                    <div>
                        <h2>Siga nosso Instagram</h2>
                        <span class="store-insta-handle" id="store-insta-handle">@excellentloja</span>
                    </div>
                </div>
                <div class="store-insta-grid" id="store-insta-grid">
                    ${[0, 1, 2, 3, 4].map(() => `<div class="store-insta-tile"><i class="fa-solid fa-image"></i></div>`).join('')}
                </div>
            </section>

            <section class="store-newsletter">
                <div>
                    <h2>Receba novidades e promoções</h2>
                    <p>Fique por dentro dos lançamentos e ofertas da Excellent Loja.</p>
                </div>
                <form id="store-newsletter-form">
                    <input type="email" id="store-newsletter-email" placeholder="Seu melhor e-mail" required>
                    <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
                </form>
            </section>

            <footer class="store-footer" id="store-contato">
                <div class="store-footer-inner">
                    <div class="store-footer-col store-footer-brand">
                        <img src="img/logo.png?v=3" alt="Excellent Loja" class="store-logo-img">
                        <p>Excelência em cada compra, do início ao fim.</p>
                    </div>
                    <div class="store-footer-col">
                        <strong>Institucional</strong>
                        <span>Quem somos</span>
                        <span>Como comprar</span>
                        <span>Política de entrega</span>
                        <span>Trocas e devoluções</span>
                    </div>
                    <div class="store-footer-col">
                        <strong>Atendimento</strong>
                        <span id="store-contato-tel"><i class="fa-brands fa-whatsapp"></i> —</span>
                        <span id="store-contato-insta"><i class="fa-brands fa-instagram"></i> —</span>
                        <span id="store-contato-end"><i class="fa-solid fa-location-dot"></i> —</span>
                    </div>
                    <div class="store-footer-col">
                        <strong>Formas de pagamento</strong>
                        <div class="store-pay-icons">
                            <span class="store-pay-badge"><i class="fa-brands fa-cc-visa"></i></span>
                            <span class="store-pay-badge"><i class="fa-brands fa-cc-mastercard"></i></span>
                            <span class="store-pay-badge">Pix</span>
                            <span class="store-pay-badge">Boleto</span>
                        </div>
                    </div>
                </div>
                <p class="store-copy">© ${new Date().getFullYear()} Excellent Loja. Todos os direitos reservados.</p>
            </footer>
        </div>

        <div class="store-cart-backdrop" id="store-cart-backdrop"></div>
        <aside class="store-cart-drawer" id="store-cart-drawer">
            <div class="store-cart-head">
                <h3><i class="fa-solid fa-cart-shopping"></i> Seu carrinho</h3>
                <button id="store-cart-close"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="store-cart-items" id="store-cart-items"></div>
            <div class="store-cart-footer">
                <div class="row"><span>Total</span><strong id="store-cart-total">R$ 0,00</strong></div>
                <button class="btn btn-primary btn-block" id="store-cart-checkout"><i class="fa-brands fa-whatsapp"></i> Finalizar no WhatsApp</button>
                <p class="store-cart-note">Você vai finalizar o pedido direto com a loja pelo WhatsApp.</p>
            </div>
        </aside>
        `;
    }

    function bindStatic() {
        if (previewMode) {
            document.getElementById('store-preview-exit').addEventListener('click', closeAdminPreview);
        }
        document.getElementById('store-cart-btn').addEventListener('click', () => toggleCart(true));
        document.getElementById('store-cart-close').addEventListener('click', () => toggleCart(false));
        document.getElementById('store-cart-backdrop').addEventListener('click', () => toggleCart(false));
        document.getElementById('store-cart-checkout').addEventListener('click', checkout);
        document.getElementById('store-search-btn').addEventListener('click', () => {
            const bar = document.getElementById('store-search-bar');
            const open = bar.classList.toggle('open');
            if (open) document.getElementById('store-search-input').focus();
            else { searchTerm = ''; document.getElementById('store-search-input').value = ''; renderGrid(); }
        });
        document.getElementById('store-search-close').addEventListener('click', () => {
            document.getElementById('store-search-bar').classList.remove('open');
            searchTerm = ''; document.getElementById('store-search-input').value = ''; renderGrid();
        });
        document.getElementById('store-search-input').addEventListener('input', Utils.debounce((e) => {
            searchTerm = e.target.value.toLowerCase().trim();
            renderGrid();
        }, 200));
        document.getElementById('store-newsletter-form').addEventListener('submit', subscribeNewsletter);

        document.getElementById('storefront-screen').addEventListener('click', (e) => {
            const catChip = e.target.closest('.store-cat-chip');
            const catReset = e.target.closest('[data-cat-reset]');
            const addBtn = e.target.closest('.js-add-cart');
            const qtyBtn = e.target.closest('.js-cart-qty');
            const rmBtn = e.target.closest('.js-cart-remove');
            if (catChip) { catFilter = catChip.dataset.cat; renderCats(); renderGrid(); }
            if (catReset) { catFilter = ''; renderCats(); renderGrid(); document.getElementById('store-produtos').scrollIntoView({ behavior: 'smooth' }); }
            if (addBtn) addToCart(addBtn.dataset.id);
            if (qtyBtn) changeQty(qtyBtn.dataset.id, Number(qtyBtn.dataset.delta));
            if (rmBtn) removeFromCart(rmBtn.dataset.id);
        });
    }

    function toggleCart(open) {
        document.getElementById('store-cart-drawer').classList.toggle('open', open);
        document.getElementById('store-cart-backdrop').classList.toggle('open', open);
    }

    function listen() {
        unsubs.forEach(u => { try { u(); } catch (e) {} });
        unsubs = [];
        unsubs.push(Loja.col('produtos').where('ativo', '==', true).onSnapshot(snap => {
            produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            render();
        }, err => console.error('storefront produtos', err)));
        unsubs.push(Loja.ref().onSnapshot(snap => {
            config = snap.exists ? snap.data() : {};
            renderFooter();
        }, err => console.error('storefront config', err)));
        unsubs.push(Loja.col('capas').orderBy('criadoEm').onSnapshot(snap => {
            capas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderHero();
        }, err => console.error('storefront capas', err)));
        unsubs.push(Loja.col('instaCards').orderBy('criadoEm').onSnapshot(snap => {
            instaCards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderInstaCards();
        }, err => console.error('storefront instaCards', err)));
    }

    function render() {
        renderCats();
        renderGrid();
        renderCart();
    }

    function renderFooter() {
        const tel = document.getElementById('store-contato-tel');
        const insta = document.getElementById('store-contato-insta');
        const end = document.getElementById('store-contato-end');
        const handle = document.getElementById('store-insta-handle');
        if (tel) tel.innerHTML = `<i class="fa-brands fa-whatsapp"></i> ${Utils.escapeHtml(config.telefone || 'Em breve')}`;
        if (insta) insta.innerHTML = `<i class="fa-brands fa-instagram"></i> ${Utils.escapeHtml(config.instagram || '@excellentloja')}`;
        if (end) end.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${Utils.escapeHtml(config.endereco || 'Consulte a loja')}`;
        if (handle) handle.textContent = config.instagram || '@excellentloja';
        renderHero();
        renderBanner();
        applyFundoLoja();
    }

    function applyFundoLoja() {
        const page = document.querySelector('.store-page');
        if (!page) return;
        page.classList.toggle('has-fundo', !!config.fundoLoja);
        if (config.fundoLoja) {
            page.style.backgroundImage = `url("${config.fundoLoja}")`;
            page.style.backgroundSize = 'cover';
            page.style.backgroundPosition = 'center';
            page.style.backgroundRepeat = 'no-repeat';
        } else {
            page.style.backgroundImage = '';
        }
    }

    function stopCarousel() {
        if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; }
    }

    function startCarousel(count) {
        stopCarousel();
        carouselIndex = 0;
        if (count <= 1) return;
        carouselTimer = setInterval(() => {
            carouselIndex = (carouselIndex + 1) % count;
            const track = document.getElementById('store-hero-track');
            if (track) track.style.transform = `translateX(-${carouselIndex * 100}%)`;
            document.querySelectorAll('#store-hero-dots .store-hero-dot').forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
        }, 3000);
    }

    function renderHero() {
        const wrap = document.getElementById('store-hero-art-wrap');
        if (!wrap) return;
        const cta = `<div class="store-hero-cta"><a href="#store-produtos" class="btn btn-primary store-hero-btn">Comprar agora</a></div>`;
        if (!capas.length) {
            stopCarousel();
            wrap.innerHTML = `<div class="store-hero-placeholder"><i class="fa-solid fa-box"></i></div>${cta}`;
            return;
        }
        wrap.innerHTML = `
            <div class="store-hero-carousel">
                <div class="store-hero-carousel-track" id="store-hero-track">
                    ${capas.map(c => `<div class="store-hero-slide"><img src="${c.imagem}" alt=""></div>`).join('')}
                </div>
                ${capas.length > 1 ? `<div class="store-hero-dots" id="store-hero-dots">${capas.map((_, i) => `<span class="store-hero-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}</div>` : ''}
            </div>
            ${cta}
        `;
        startCarousel(capas.length);
    }

    function renderBanner() {
        const wrap = document.getElementById('store-banner-media');
        if (!wrap) return;
        const cta = `<div class="store-banner-cta"><a href="#store-produtos" class="btn btn-primary">Conferir ofertas</a></div>`;
        const media = config.bannerMeio ? `<img src="${config.bannerMeio}" alt="">` : `<i class="fa-solid fa-gift"></i>`;
        wrap.innerHTML = media + cta;
    }

    function renderInstaCards() {
        const box = document.getElementById('store-insta-grid');
        if (!box) return;
        if (!instaCards.length) {
            box.innerHTML = [0, 1, 2, 3, 4].map(() => `<div class="store-insta-tile"><i class="fa-solid fa-image"></i></div>`).join('');
            return;
        }
        box.innerHTML = instaCards.map(c => `
            <a class="store-insta-card" href="${Utils.escapeHtml(c.link || '#')}" target="_blank" rel="noopener">
                <div class="store-insta-card-img"><img src="${c.imagem}" alt=""></div>
                ${(c.titulo || c.texto) ? `<div class="store-insta-card-body">
                    ${c.titulo ? `<strong>${Utils.escapeHtml(c.titulo)}</strong>` : ''}
                    ${c.texto ? `<p>${Utils.escapeHtml(c.texto)}</p>` : ''}
                </div>` : ''}
            </a>
        `).join('');
    }

    function renderCats() {
        const box = document.getElementById('store-cats');
        if (!box) return;
        const cats = [...new Set(produtos.map(p => p.categoria).filter(Boolean))];
        const icons = { 'Geral': 'fa-grip', 'Novidades': 'fa-star', 'Mais vendidos': 'fa-fire', 'Promoções': 'fa-tag' };
        box.innerHTML = ['', ...cats].map(c => `
            <div class="store-cat-chip ${catFilter === c ? 'active' : ''}" data-cat="${Utils.escapeHtml(c)}">
                <div class="store-cat-circle"><i class="fa-solid ${icons[c] || 'fa-bag-shopping'}"></i></div>
                <span>${c || 'Todos'}</span>
            </div>
        `).join('');
    }

    function normalizarBusca(s) {
        return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    }

    function renderGrid() {
        const grid = document.getElementById('store-grid');
        if (!grid) return;
        let list = produtos;
        if (catFilter) list = list.filter(p => p.categoria === catFilter);
        if (searchTerm) {
            const termo = normalizarBusca(searchTerm);
            list = list.filter(p => [p.nome, p.categoria, p.descricao].some(campo => normalizarBusca(campo || '').includes(termo)));
        }
        if (!list.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-bag-shopping"></i>Nenhum produto encontrado.</div>`;
            return;
        }
        grid.innerHTML = list.map(p => {
            const disponivel = Number(p.estoqueAtual) || 0;
            const esgotado = disponivel <= 0;
            const qtdHtml = esgotado
                ? `<span class="store-card-stock esgotado">Esgotado</span>`
                : `<span class="store-card-stock${disponivel <= 5 ? ' baixo' : ''}">${disponivel} disponíve${disponivel === 1 ? 'l' : 'is'}</span>`;
            return `
            <div class="store-card">
                <div class="store-card-thumb">${p.imagemUrl ? `<img src="${p.imagemUrl}">` : '<i class="fa-solid fa-box"></i>'}${esgotado ? '<span class="store-card-badge">Esgotado</span>' : ''}</div>
                <div class="store-card-body">
                    <span class="store-card-cat">${Utils.escapeHtml(p.categoria || 'Produtos')}</span>
                    <strong class="store-card-name">${Utils.escapeHtml(p.nome)}</strong>
                    ${qtdHtml}
                    <div class="store-card-foot">
                        <span class="store-card-price">${Utils.formatBRL(p.precoVenda)}</span>
                        <button class="store-add-btn js-add-cart" data-id="${p.id}" ${esgotado ? 'disabled' : ''}><i class="fa-solid fa-cart-plus"></i></button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    function addToCart(id) {
        const p = produtos.find(x => x.id === id);
        if (!p) return;
        const disponivel = Number(p.estoqueAtual) || 0;
        const item = cart.find(i => i.id === id);
        const qtdNoCarrinho = item ? item.qtd : 0;
        if (disponivel <= 0) { Utils.toast(`"${p.nome}" está esgotado no momento.`, 'error'); return; }
        if (qtdNoCarrinho + 1 > disponivel) { Utils.toast(`Só temos ${disponivel} unidade(s) de "${p.nome}" disponíveis.`, 'error'); return; }
        if (item) item.qtd += 1;
        else cart.push({ id, nome: p.nome, preco: Number(p.precoVenda) || 0, qtd: 1 });
        Utils.toast(`${p.nome} adicionado ao carrinho.`, 'success');
        renderCart();
        toggleCart(true);
    }

    function changeQty(id, delta) {
        const item = cart.find(i => i.id === id);
        if (!item) return;
        if (delta > 0) {
            const p = produtos.find(x => x.id === id);
            const disponivel = Number(p?.estoqueAtual) || 0;
            if (item.qtd + delta > disponivel) { Utils.toast(`Só temos ${disponivel} unidade(s) de "${item.nome}" disponíveis.`, 'error'); return; }
        }
        item.qtd += delta;
        if (item.qtd <= 0) cart = cart.filter(i => i.id !== id);
        renderCart();
    }

    function removeFromCart(id) {
        cart = cart.filter(i => i.id !== id);
        renderCart();
    }

    function cartTotal() {
        return cart.reduce((s, i) => s + i.preco * i.qtd, 0);
    }

    function renderCart() {
        const badge = document.getElementById('store-cart-badge');
        const count = cart.reduce((s, i) => s + i.qtd, 0);
        if (badge) { badge.textContent = count; badge.style.display = count ? 'flex' : 'none'; }

        const itemsBox = document.getElementById('store-cart-items');
        if (!itemsBox) return;
        if (!cart.length) {
            itemsBox.innerHTML = `<div class="empty-state"><i class="fa-solid fa-cart-shopping"></i>Seu carrinho está vazio.</div>`;
        } else {
            itemsBox.innerHTML = cart.map(i => `
                <div class="store-cart-item">
                    <div class="store-cart-item-info">
                        <strong>${Utils.escapeHtml(i.nome)}</strong>
                        <span>${Utils.formatBRL(i.preco)}</span>
                    </div>
                    <div class="store-cart-item-qty">
                        <button class="js-cart-qty" data-id="${i.id}" data-delta="-1">−</button>
                        <span>${i.qtd}</span>
                        <button class="js-cart-qty" data-id="${i.id}" data-delta="1">+</button>
                    </div>
                    <button class="store-cart-item-remove js-cart-remove" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `).join('');
        }
        document.getElementById('store-cart-total').textContent = Utils.formatBRL(cartTotal());
    }

    function checkout() {
        if (!cart.length) { Utils.toast('Seu carrinho está vazio.', 'error'); return; }
        const tel = (config.telefone || '').replace(/\D/g, '');
        if (!tel) { Utils.toast('A loja ainda não configurou um telefone para pedidos.', 'error'); return; }

        for (const i of cart) {
            const p = produtos.find(x => x.id === i.id);
            const disponivel = Number(p?.estoqueAtual) || 0;
            if (i.qtd > disponivel) {
                Utils.toast(`"${i.nome}" tem só ${disponivel} unidade(s) disponíveis agora. Ajuste o carrinho.`, 'error');
                if (disponivel <= 0) removeFromCart(i.id); else { i.qtd = disponivel; renderCart(); }
                return;
            }
        }

        abrirFormularioDados();
    }

    function abrirFormularioDados() {
        const d = dadosSalvos() || {};
        toggleCart(false);
        Utils.openModal(`
            <div class="modal-head"><h3>Seus dados para entrega</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:-8px 0 16px;">
                ${d.nome ? 'Confira se está tudo certo antes de enviar.' : 'Preenchemos automaticamente na próxima compra — sem precisar criar conta.'}
            </p>
            <form id="checkout-dados-form">
                <div class="form-group"><label>Nome completo *</label><input type="text" id="cf-nome" required value="${Utils.escapeHtml(d.nome || '')}"></div>
                <div class="form-group"><label>WhatsApp *</label><input type="text" id="cf-whatsapp" required placeholder="(00) 00000-0000" value="${Utils.escapeHtml(d.whatsapp || '')}"></div>
                <div class="form-row">
                    <div class="form-group"><label>Endereço *</label><input type="text" id="cf-endereco" required placeholder="Rua, bairro" value="${Utils.escapeHtml(d.endereco || '')}"></div>
                    <div class="form-group" style="max-width:110px;"><label>Número *</label><input type="text" id="cf-numero" required value="${Utils.escapeHtml(d.numero || '')}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Cidade *</label><input type="text" id="cf-cidade" required value="${Utils.escapeHtml(d.cidade || '')}"></div>
                    <div class="form-group" style="max-width:110px;"><label>Estado *</label><input type="text" id="cf-estado" required maxlength="2" placeholder="SP" value="${Utils.escapeHtml(d.estado || '')}" style="text-transform:uppercase;"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="checkout-dados-submit"><i class="fa-solid fa-check"></i> Confirmar e enviar pedido</button>
                </div>
            </form>
        `);

        document.getElementById('checkout-dados-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                nome: document.getElementById('cf-nome').value.trim(),
                whatsapp: document.getElementById('cf-whatsapp').value.trim(),
                endereco: document.getElementById('cf-endereco').value.trim(),
                numero: document.getElementById('cf-numero').value.trim(),
                cidade: document.getElementById('cf-cidade').value.trim(),
                estado: document.getElementById('cf-estado').value.trim().toUpperCase()
            };
            salvarDados(dados);
            const btn = document.getElementById('checkout-dados-submit');
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando pedido...';
            try {
                await enviarPedido(dados);
                Utils.closeModal();
            } catch (err) {
                Utils.toast('Erro ao enviar pedido: ' + err.message, 'error');
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });
    }

    async function enviarPedido(dados) {
        let user = Auth.currentUser();
        if (!user) {
            const cred = await window.auth.signInAnonymously();
            user = cred.user;
        }

        const enderecoCompleto = `${dados.endereco}, ${dados.numero} - ${dados.cidade}/${dados.estado}`;
        await Loja.col('clientes').doc(user.uid).set({
            nome: dados.nome, telefone: dados.whatsapp, endereco: enderecoCompleto,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        const itens = cart.map(i => ({ produtoId: i.id, nome: i.nome, quantidade: i.qtd, precoUnitario: i.preco, subtotal: i.preco * i.qtd }));
        const total = cartTotal();
        const numero = await window.nextPedidoNumero();

        const batch = window.db.batch();
        const pedidoRef = Loja.col('pedidos').doc();
        batch.set(pedidoRef, {
            numero,
            clienteId: user.uid,
            clienteNome: dados.nome,
            clienteTelefone: dados.whatsapp,
            itens, subtotal: total, taxaEntrega: 0, total,
            formaPagamento: 'A combinar', status: 'aguardando',
            endereco: enderecoCompleto,
            observacoes: 'Pedido feito pela loja virtual.',
            dataEntrega: null, origem: 'loja-virtual',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        itens.forEach(i => {
            const prodRef = Loja.col('producao').doc();
            batch.set(prodRef, {
                data: new Date(), produtoId: i.produtoId, produtoNome: i.nome,
                quantidade: i.quantidade, status: 'pendente', pedidoId: pedidoRef.id,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            batch.update(Loja.col('produtos').doc(i.produtoId), { estoqueAtual: firebase.firestore.FieldValue.increment(-i.quantidade) });
        });

        await batch.commit();

        const tel = (config.telefone || '').replace(/\D/g, '');
        const linhas = cart.map(i => `• ${i.qtd}x ${i.nome} — ${Utils.formatBRL(i.preco * i.qtd)}`).join('\n');
        const texto = `Olá! Acabei de fazer o pedido #${numero} pelo site:\n\n${linhas}\n\n*Total: ${Utils.formatBRL(total)}*\n\nEndereço: ${enderecoCompleto}`;
        window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`, '_blank');

        cart = [];
        renderCart();
        Utils.toast(`Pedido #${numero} enviado à loja!`, 'success');
    }

    async function subscribeNewsletter(e) {
        e.preventDefault();
        const input = document.getElementById('store-newsletter-email');
        const email = input.value.trim();
        if (!email) return;
        try {
            await Loja.col('newsletter').add({ email, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            Utils.toast('Inscrição feita com sucesso!', 'success');
            input.value = '';
        } catch (err) {
            Utils.toast('Não foi possível concluir agora. Tente novamente.', 'error');
        }
    }

    return { mount, openAdminPreview, closeAdminPreview };
})();
