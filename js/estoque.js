/* ==========================================================================
   Estoque (ingredientes/insumos) — Excellent Loja
   ========================================================================== */

const Estoque = (() => {

    let search = '';
    let onlyLow = false;

    function mount() {
        const el = document.getElementById('view-estoque');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-novo-insumo"><i class="fa-solid fa-plus"></i> Novo Ingrediente</button>
            </div>
            <div class="toolbar">
                <div class="search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="estoque-search" placeholder="Buscar ingrediente..."></div>
                <label style="display:flex;align-items:center;gap:6px;font-size:0.82rem;color:var(--text-body);cursor:pointer;">
                    <input type="checkbox" id="estoque-low-toggle"> Apenas estoque baixo
                </label>
                <div class="spacer"></div>
                <span style="font-size:0.8rem;color:var(--text-muted);" id="estoque-count"></span>
            </div>
            <div class="table-card">
                <div class="table-scroll">
                    <table>
                        <thead><tr><th>Ingrediente</th><th>Categoria</th><th>Qtd. atual</th><th>Qtd. mínima</th><th>Custo por g/kg/un</th><th>Fornecedor</th><th></th></tr></thead>
                        <tbody id="estoque-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('btn-novo-insumo').addEventListener('click', () => openForm());
        document.getElementById('estoque-search').addEventListener('input', Utils.debounce((e) => { search = e.target.value.toLowerCase(); render(); }, 200));
        document.getElementById('estoque-low-toggle').addEventListener('change', (e) => { onlyLow = e.target.checked; render(); });
        el.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.js-edit');
            const delBtn = e.target.closest('.js-del');
            const adjBtn = e.target.closest('.js-adjust');
            if (editBtn) openForm(editBtn.dataset.id);
            if (delBtn) removeInsumo(delBtn.dataset.id);
            if (adjBtn) openAdjust(adjBtn.dataset.id);
        });
        render();
    }

    function render() {
        const tbody = document.getElementById('estoque-tbody');
        if (!tbody) return;
        let list = Store.estoque;
        if (search) list = list.filter(i => (i.nome || '').toLowerCase().includes(search));
        if (onlyLow) list = list.filter(i => Number(i.quantidadeAtual) <= Number(i.quantidadeMinima ?? 0));
        document.getElementById('estoque-count').textContent = `${list.length} ingrediente(s)`;

        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-warehouse"></i>Nenhum ingrediente cadastrado.</div></td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(i => {
            const baixo = Number(i.quantidadeAtual) <= Number(i.quantidadeMinima ?? 0);
            return `
            <tr>
                <td class="strong">${baixo ? '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);margin-right:6px;"></i>' : ''}${Utils.escapeHtml(i.nome)}</td>
                <td>${Utils.escapeHtml(i.categoria || '—')}</td>
                <td style="color:${baixo ? 'var(--danger)' : 'inherit'};font-weight:${baixo ? 700 : 400};">${Number(i.quantidadeAtual || 0).toLocaleString('pt-BR')} ${Utils.escapeHtml(i.unidade || '')}</td>
                <td>${Number(i.quantidadeMinima || 0).toLocaleString('pt-BR')} ${Utils.escapeHtml(i.unidade || '')}</td>
                <td>R$ ${Number(i.custoUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/${Utils.escapeHtml(i.unidade || 'un')}</td>
                <td>${Utils.escapeHtml(i.fornecedor || '—')}</td>
                <td>
                    <div class="row-actions">
                        <button class="js-adjust" data-id="${i.id}" title="Ajustar estoque"><i class="fa-solid fa-scale-balanced"></i></button>
                        <button class="js-edit" data-id="${i.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="js-del del" data-id="${i.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function openForm(id) {
        const i = id ? Store.estoque.find(x => x.id === id) : null;
        Utils.openModal(`
            <div class="modal-head"><h3>${i ? 'Editar ingrediente' : 'Novo ingrediente'}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="insumo-form">
                <div class="form-group"><label>Nome *</label><input type="text" id="f-nome" required value="${i ? Utils.escapeHtml(i.nome) : ''}" placeholder="Ex: Morango"></div>
                <div class="form-row">
                    <div class="form-group"><label>Categoria</label><input type="text" id="f-categoria" value="${i ? Utils.escapeHtml(i.categoria || '') : ''}" placeholder="Ex: Frutas"></div>
                    <div class="form-group"><label>Unidade</label>
                        ${Utils.selectHtml({ id: 'f-unidade', value: i?.unidade || 'kg', options: ['kg', 'g', 'L', 'ml', 'un'].map(u => ({ value: u, label: u })) })}
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Quantidade atual</label><input type="number" step="0.01" min="0" id="f-qtd" value="${i ? i.quantidadeAtual ?? 0 : 0}"></div>
                    <div class="form-group"><label>Quantidade mínima</label><input type="number" step="0.01" min="0" id="f-qtd-min" value="${i ? i.quantidadeMinima ?? 0 : 0}"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Rende quantos (na unidade acima)?</label><input type="number" step="0.01" min="0.01" id="f-qtd-compra" value="${i ? i.quantidadeCompra ?? 1 : 1}" placeholder="Ex: 400"></div>
                    <div class="form-group"><label>Custo dessa compra (R$)</label><input type="number" step="0.01" min="0" id="f-custo-compra" value="${i ? i.custoCompra ?? i.custoUnitario ?? 0 : 0}" placeholder="Ex: 7,50"></div>
                </div>
                <p style="font-size:0.76rem;color:var(--text-muted);margin:-8px 0 14px;">
                    Ex.: um pacote de 400 g que custou R$ 7,50 → preencha 400 e 7,50. O sistema calcula
                    sozinho o custo por g/kg/un usado nas fichas técnicas — não precisa fazer essa conta.
                </p>
                <div class="form-group"><label>Fornecedor</label><input type="text" id="f-fornecedor" value="${i ? Utils.escapeHtml(i.fornecedor || '') : ''}"></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);
        document.getElementById('insumo-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const quantidadeCompra = Number(document.getElementById('f-qtd-compra').value) || 1;
            const custoCompra = Number(document.getElementById('f-custo-compra').value) || 0;
            const data = {
                nome: document.getElementById('f-nome').value.trim(),
                categoria: document.getElementById('f-categoria').value.trim(),
                unidade: document.getElementById('f-unidade').value,
                quantidadeAtual: Number(document.getElementById('f-qtd').value) || 0,
                quantidadeMinima: Number(document.getElementById('f-qtd-min').value) || 0,
                quantidadeCompra, custoCompra,
                custoUnitario: custoCompra / quantidadeCompra,
                fornecedor: document.getElementById('f-fornecedor').value.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                if (i) await Loja.col('estoque').doc(i.id).update(data);
                else await Loja.col('estoque').add(data);
                Utils.closeModal();
                Utils.toast(i ? 'Ingrediente atualizado.' : 'Ingrediente cadastrado.', 'success');
            } catch (err) { Utils.toast('Erro ao salvar: ' + err.message, 'error'); }
        });
    }

    function openAdjust(id) {
        const i = Store.estoque.find(x => x.id === id);
        if (!i) return;
        Utils.openModal(`
            <div class="modal-head"><h3>Ajustar estoque — ${Utils.escapeHtml(i.nome)}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">Estoque atual: <strong style="color:var(--text-main);">${i.quantidadeAtual} ${Utils.escapeHtml(i.unidade || '')}</strong></p>
            <form id="adjust-form">
                <div class="form-row">
                    <div class="form-group"><label>Tipo</label>
                        ${Utils.selectHtml({ id: 'f-tipo', value: 'entrada', options: [{ value: 'entrada', label: 'Entrada (compra)' }, { value: 'saida', label: 'Saída (uso/perda)' }] })}
                    </div>
                    <div class="form-group"><label>Quantidade</label><input type="number" step="0.01" min="0.01" id="f-qtd-mov" required></div>
                </div>
                <div class="form-group"><label>Motivo (opcional)</label><input type="text" id="f-motivo" placeholder="Ex: Compra semanal, perda por validade..."></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Confirmar</button>
                </div>
            </form>
        `);
        document.getElementById('adjust-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const tipo = document.getElementById('f-tipo').value;
            const qtd = Number(document.getElementById('f-qtd-mov').value) || 0;
            const delta = tipo === 'entrada' ? qtd : -qtd;
            try {
                await Loja.col('estoque').doc(id).update({
                    quantidadeAtual: firebase.firestore.FieldValue.increment(delta),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                Utils.closeModal();
                Utils.toast('Estoque ajustado.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
    }

    function removeInsumo(id) {
        const i = Store.estoque.find(x => x.id === id);
        Utils.confirmDialog(`Excluir o ingrediente "${i ? i.nome : ''}"?`, async () => {
            try {
                await Loja.col('estoque').doc(id).delete();
                Utils.toast('Ingrediente excluído.', 'success');
            } catch (err) { Utils.toast('Erro ao excluir: ' + err.message, 'error'); }
        });
    }

    return { mount, render };
})();
