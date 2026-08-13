/* ==========================================================================
   Catálogo — Excellent Loja
   ========================================================================== */

const Cardapio = (() => {

    let catFilter = '';

    function mount() {
        const el = document.getElementById('view-cardapio');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-novo-cardapio"><i class="fa-solid fa-plus"></i> Novo Produto</button>
            </div>
            <div class="toolbar" id="cardapio-cats"></div>
            <div class="menu-grid" id="cardapio-grid"></div>
        `;
        document.getElementById('btn-novo-cardapio').addEventListener('click', () => Produtos.openForm());
        el.addEventListener('click', (e) => {
            const chip = e.target.closest('.js-cat-chip');
            const star = e.target.closest('.js-star');
            const card = e.target.closest('.js-menu-card');
            if (chip) { catFilter = chip.dataset.cat; render(); return; }
            if (star) { toggleDestaque(star.dataset.id, star.dataset.on === 'true'); return; }
            if (card) { Produtos.openForm(card.dataset.id); }
        });
        render();
    }

    async function toggleDestaque(id, current) {
        try { await Loja.col('produtos').doc(id).update({ destaque: !current }); }
        catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function render() {
        const grid = document.getElementById('cardapio-grid');
        if (!grid) return;

        const cats = [...new Set(Store.produtos.map(p => p.categoria).filter(Boolean))];
        const catsBox = document.getElementById('cardapio-cats');
        catsBox.innerHTML = ['', ...cats].map(c => `
            <span class="settings-tab js-cat-chip ${catFilter === c ? 'active' : ''}" data-cat="${Utils.escapeHtml(c)}">${c ? Utils.escapeHtml(c) : 'Todos'}</span>
        `).join('');

        let list = Store.produtos.filter(p => p.ativo !== false);
        if (catFilter) list = list.filter(p => p.categoria === catFilter);

        if (!list.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-table-cells-large"></i>Nenhum produto ativo no catálogo ainda. Cadastre um produto para começar.</div>`;
            return;
        }

        grid.innerHTML = list.map(p => `
            <div class="menu-card js-menu-card" data-id="${p.id}">
                <div class="thumb">
                    ${p.imagemUrl ? `<img src="${p.imagemUrl}">` : '<i class="fa-solid fa-box"></i>'}
                    <div class="star js-star" data-id="${p.id}" data-on="${!!p.destaque}" title="Destacar" style="${p.destaque ? 'color:var(--orange-500);' : 'color:var(--brown-300);'}">
                        <i class="fa-solid fa-star"></i>
                    </div>
                </div>
                <div class="body">
                    <div class="cat">${Utils.escapeHtml(p.categoria || 'Produtos')}</div>
                    <div class="name">${Utils.escapeHtml(p.nome)}</div>
                    <div class="foot">
                        <span class="price">${Utils.formatBRL(p.precoVenda)}</span>
                        <span style="font-size:0.72rem;color:${Number(p.estoqueAtual) > 0 ? 'var(--success)' : 'var(--danger)'};font-weight:700;">
                            ${Number(p.estoqueAtual) > 0 ? Number(p.estoqueAtual) + ' un' : 'sem estoque'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    return { mount, render };
})();
