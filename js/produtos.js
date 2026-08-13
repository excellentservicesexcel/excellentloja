/* ==========================================================================
   Produtos — Excellent Loja
   ========================================================================== */

const Produtos = (() => {

    let search = '';
    let catFilter = '';

    function mount() {
        const el = document.getElementById('view-produtos');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-novo-produto"><i class="fa-solid fa-plus"></i> Novo Produto</button>
            </div>
            <div class="toolbar">
                <div class="search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="produto-search" placeholder="Buscar produto..."></div>
                ${Utils.selectHtml({ id: 'produto-cat-filter', placeholder: 'Todas categorias', options: [] })}
                <div class="spacer"></div>
                <span style="font-size:0.8rem;color:var(--text-muted);" id="produto-count"></span>
            </div>
            <div class="table-card">
                <div class="table-scroll">
                    <table>
                        <thead><tr>
                            <th>Produto</th><th>Categoria</th><th>Preço</th><th>Custo</th><th>Margem</th><th>Estoque</th><th>Status</th><th></th>
                        </tr></thead>
                        <tbody id="produtos-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('btn-novo-produto').addEventListener('click', () => openForm());
        document.getElementById('produto-search').addEventListener('input', Utils.debounce((e) => { search = e.target.value.toLowerCase(); render(); }, 200));
        document.getElementById('produto-cat-filter').addEventListener('change', (e) => { catFilter = e.target.value; render(); });
        el.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.js-edit');
            const delBtn = e.target.closest('.js-del');
            const toggleBtn = e.target.closest('.js-toggle-ativo');
            if (editBtn) openForm(editBtn.dataset.id);
            if (delBtn) removeProduto(delBtn.dataset.id);
            if (toggleBtn) toggleAtivo(toggleBtn.dataset.id, toggleBtn.dataset.ativo === 'true');
        });
        render();
    }

    function renderCategoryOptions() {
        const cats = Store.config.categoriasProdutos || [];
        Utils.refreshSelectOptions('produto-cat-filter', cats.map(c => ({ value: c, label: c })), 'Todas categorias');
    }

    function render() {
        const tbody = document.getElementById('produtos-tbody');
        if (!tbody) return;
        renderCategoryOptions();

        let list = Store.produtos;
        if (search) list = list.filter(p => (p.nome || '').toLowerCase().includes(search));
        if (catFilter) list = list.filter(p => p.categoria === catFilter);
        document.getElementById('produto-count').textContent = `${list.length} produto(s)`;

        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="fa-solid fa-box"></i>Nenhum produto cadastrado.</div></td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(p => {
            const preco = Number(p.precoVenda) || 0;
            const custo = Number(p.custoUnitario) || 0;
            const margem = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
            const baixo = Number(p.estoqueAtual) <= Number(p.estoqueMinimo ?? 0);
            return `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:34px;height:34px;border-radius:9px;background:var(--orange-50);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                            ${p.imagemUrl ? `<img src="${p.imagemUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fa-solid fa-box" style="color:var(--orange-500);"></i>'}
                        </div>
                        <span class="strong">${Utils.escapeHtml(p.nome)}</span>
                    </div>
                </td>
                <td>${Utils.escapeHtml(p.categoria || '—')}</td>
                <td class="strong">${Utils.formatBRL(preco)}</td>
                <td>${Utils.formatBRL(custo)}</td>
                <td>${margem.toFixed(0)}%</td>
                <td style="color:${baixo ? 'var(--danger)' : 'inherit'};font-weight:${baixo ? 700 : 400};">${p.estoqueAtual ?? 0} ${Utils.escapeHtml(p.unidade || 'un')}</td>
                <td><span class="badge badge-${p.ativo !== false ? 'ativo' : 'inativo'} js-toggle-ativo" data-id="${p.id}" data-ativo="${p.ativo !== false}" style="cursor:pointer;">${p.ativo !== false ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    <div class="row-actions">
                        <button class="js-edit" data-id="${p.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="js-del del" data-id="${p.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function openForm(id) {
        const p = id ? Store.produtos.find(x => x.id === id) : null;
        Utils.openModal(`
            <div class="modal-head"><h3>${p ? 'Editar produto' : 'Novo produto'}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="produto-form">
                <div class="form-group"><label>Nome do produto *</label><input type="text" id="f-nome" required value="${p ? Utils.escapeHtml(p.nome) : ''}" placeholder="Ex: Nome do produto"></div>
                <div class="form-row">
                    <div class="form-group"><label>Categoria</label>${Utils.selectHtml({ id: 'f-categoria', placeholder: 'Selecione...', value: p?.categoria || '', options: (Store.config.categoriasProdutos || []).map(c => ({ value: c, label: c })) })}</div>
                    <div class="form-group"><label>Unidade</label>
                        ${Utils.selectHtml({ id: 'f-unidade', value: p?.unidade || 'un', options: ['un', 'kg', 'cento', 'caixa', 'pacote'].map(u => ({ value: u, label: u })) })}
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Preço de venda (R$) *</label><input type="number" step="0.01" min="0" id="f-preco" required value="${p ? p.precoVenda : ''}"></div>
                    <div class="form-group"><label>Custo unitário (R$)</label><input type="number" step="0.01" min="0" id="f-custo" value="${p ? p.custoUnitario ?? '' : ''}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Estoque atual</label><input type="number" step="1" min="0" id="f-estoque" value="${p ? p.estoqueAtual ?? 0 : 0}"></div>
                    <div class="form-group"><label>Estoque mínimo</label><input type="number" step="1" min="0" id="f-estoque-min" value="${p ? p.estoqueMinimo ?? 0 : 0}"></div>
                </div>
                <div class="form-group"><label>Descrição</label><textarea id="f-desc" rows="2">${p ? Utils.escapeHtml(p.descricao || '') : ''}</textarea></div>
                <div class="form-group"><label>Foto do produto</label><input type="file" id="f-foto" accept="image/*"></div>
                <div class="form-row">
                    <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;font-weight:600;color:var(--text-body);"><input type="checkbox" id="f-destaque" style="width:16px;height:16px;" ${p?.destaque ? 'checked' : ''}> Destacar no cardápio</label>
                    <label style="display:flex;align-items:center;gap:8px;font-size:0.85rem;font-weight:600;color:var(--text-body);"><input type="checkbox" id="f-ativo" style="width:16px;height:16px;" ${p?.ativo !== false ? 'checked' : ''}> Produto ativo</label>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="produto-submit-btn"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);
        document.getElementById('produto-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('produto-submit-btn');
            btn.disabled = true;
            const data = {
                nome: document.getElementById('f-nome').value.trim(),
                categoria: document.getElementById('f-categoria').value,
                unidade: document.getElementById('f-unidade').value,
                precoVenda: Number(document.getElementById('f-preco').value) || 0,
                custoUnitario: Number(document.getElementById('f-custo').value) || 0,
                estoqueAtual: Number(document.getElementById('f-estoque').value) || 0,
                estoqueMinimo: Number(document.getElementById('f-estoque-min').value) || 0,
                descricao: document.getElementById('f-desc').value.trim(),
                destaque: document.getElementById('f-destaque').checked,
                ativo: document.getElementById('f-ativo').checked
            };
            try {
                let docId = p ? p.id : null;
                if (p) {
                    await window.db.collection('produtos').doc(p.id).update(data);
                } else {
                    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    const ref = await window.db.collection('produtos').add(data);
                    docId = ref.id;
                }
                const file = document.getElementById('f-foto').files[0];
                if (file) {
                    const imagemUrl = await Utils.compressImageToBase64(file, { maxDim: 1000, maxBytes: 450000 });
                    await window.db.collection('produtos').doc(docId).update({ imagemUrl });
                }
                Utils.closeModal();
                Utils.toast(p ? 'Produto atualizado.' : 'Produto cadastrado.', 'success');
            } catch (err) {
                Utils.toast('Erro ao salvar produto: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
            }
        });
    }

    async function toggleAtivo(id, current) {
        try {
            await window.db.collection('produtos').doc(id).update({ ativo: !current });
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        }
    }

    function removeProduto(id) {
        const p = Store.produtos.find(x => x.id === id);
        Utils.confirmDialog(`Excluir o produto "${p ? p.nome : ''}"? Esta ação não pode ser desfeita.`, async () => {
            try {
                await window.db.collection('produtos').doc(id).delete();
                Utils.toast('Produto excluído.', 'success');
            } catch (err) {
                Utils.toast('Erro ao excluir: ' + err.message, 'error');
            }
        });
    }

    return { mount, render, openForm };
})();
