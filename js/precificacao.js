/* ==========================================================================
   Precificação — Excellent Loja
   Calculadora de custo e preço de venda a partir da ficha técnica (ingredientes).
   ========================================================================== */

const Precificacao = (() => {

    let ingRows = [{ insumoId: '', quantidade: '' }];
    let editingReceitaId = null;

    function mount() {
        const el = document.getElementById('view-precificacao');
        el.innerHTML = `
            <div class="pricer-grid">
                <div class="panel">
                    <div class="panel-head"><h3><i class="fa-solid fa-flask" style="color:var(--orange-500);margin-right:6px;"></i>Ficha técnica</h3></div>
                    <form id="pricer-form">
                        <div class="form-row">
                            <div class="form-group"><label>Produto</label>
                                ${Utils.selectHtml({ id: 'f-produto', placeholder: 'Sem vínculo (cálculo avulso)', options: Store.produtos.map(p => ({ value: p.id, label: p.nome })) })}
                            </div>
                            <div class="form-group"><label>Rendimento da receita (un.)</label><input type="number" min="1" id="f-rendimento" value="1"></div>
                        </div>
                        <label style="display:block;font-size:0.78rem;font-weight:700;color:var(--text-body);margin-bottom:6px;">Ingredientes usados</label>
                        <div id="ing-container"></div>
                        <button type="button" class="btn btn-outline btn-sm" id="btn-add-ing" style="margin-bottom:14px;"><i class="fa-solid fa-plus"></i> Adicionar ingrediente</button>
                        <div class="form-group"><label>Margem de lucro desejada sobre o custo (%)</label><input type="number" min="0" step="1" id="f-margem" value="150"></div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" id="btn-reset-pricer">Limpar</button>
                            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Salvar ficha</button>
                        </div>
                    </form>
                </div>
                <div class="panel pricer-summary">
                    <div class="panel-head"><h3>Resumo do custo</h3></div>
                    <div class="row"><span>Custo total da receita</span><strong id="sum-custo-total">R$ 0,00</strong></div>
                    <div class="row"><span>Rendimento</span><strong id="sum-rendimento">1 un.</strong></div>
                    <div class="row"><span>Custo por unidade</span><strong id="sum-custo-un">R$ 0,00</strong></div>
                    <div class="row"><span>Margem aplicada</span><strong id="sum-margem">150%</strong></div>
                    <div class="row"><span>Preço de venda sugerido</span><span class="total" id="sum-preco">R$ 0,00</span></div>
                    <button class="btn btn-primary btn-block" id="btn-aplicar-produto" style="margin-top:16px;"><i class="fa-solid fa-check-double"></i> Aplicar preço ao produto</button>
                    <p style="font-size:0.74rem;color:var(--text-muted);margin-top:10px;">Selecione um produto acima para poder aplicar o custo e o preço sugerido diretamente no catálogo.</p>
                </div>
            </div>

            <div class="section-head" style="margin-top:26px;">
                <div><h2 style="font-size:1.05rem;">Fichas técnicas salvas</h2></div>
            </div>
            <div class="table-card">
                <div class="table-scroll">
                    <table>
                        <thead><tr><th>Produto</th><th>Custo/un.</th><th>Margem</th><th>Preço sugerido</th><th>Preço atual</th><th></th></tr></thead>
                        <tbody id="receitas-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('btn-add-ing').addEventListener('click', () => { ingRows.push({ insumoId: '', quantidade: '' }); renderIngRows(); });
        document.getElementById('btn-reset-pricer').addEventListener('click', () => resetForm());
        document.getElementById('pricer-form').addEventListener('submit', saveFicha);
        document.getElementById('btn-aplicar-produto').addEventListener('click', aplicarAoProduto);
        document.getElementById('f-rendimento').addEventListener('input', updateSummary);
        document.getElementById('f-margem').addEventListener('input', updateSummary);
        document.getElementById('f-produto').addEventListener('change', onProdutoChange);

        document.getElementById('view-precificacao').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.js-edit-receita');
            const delBtn = e.target.closest('.js-del-receita');
            if (editBtn) loadReceita(editBtn.dataset.id);
            if (delBtn) removeReceita(delBtn.dataset.id);
        });

        renderIngRows();
        render();
    }

    function renderIngRows() {
        const box = document.getElementById('ing-container');
        if (!box) return;
        box.innerHTML = ingRows.map((row, idx) => `
            <div class="ing-row">
                ${Utils.selectHtml({ id: `ing-insumo-${idx}`, className: 'js-ing-insumo', dataAttrs: { idx }, value: row.insumoId, placeholder: 'Selecione o ingrediente...', options: Store.estoque.map(s => ({ value: s.id, label: `${s.nome} (${Utils.formatBRL(s.custoUnitario)}/${s.unidade})` })) })}
                <input type="number" step="0.001" min="0" class="js-ing-qtd" data-idx="${idx}" placeholder="Qtd." value="${row.quantidade}">
                <span class="js-ing-custo" style="font-size:0.8rem;color:var(--text-muted);">R$ 0,00</span>
                <button type="button" class="js-ing-remove" data-idx="${idx}" style="background:none;border:none;color:var(--danger);cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');
        box.querySelectorAll('.js-ing-insumo').forEach(s => s.addEventListener('change', (e) => { ingRows[e.target.dataset.idx].insumoId = e.target.value; updateSummary(); }));
        box.querySelectorAll('.js-ing-qtd').forEach(inp => inp.addEventListener('input', (e) => { ingRows[e.target.dataset.idx].quantidade = e.target.value; updateSummary(); }));
        box.querySelectorAll('.js-ing-remove').forEach(btn => btn.addEventListener('click', (e) => {
            const idx = Number(e.currentTarget.dataset.idx);
            if (ingRows.length > 1) ingRows.splice(idx, 1); else ingRows = [{ insumoId: '', quantidade: '' }];
            renderIngRows(); updateSummary();
        }));
        updateSummary();
    }

    function onProdutoChange() {
        const prod = Store.produtos.find(p => p.id === document.getElementById('f-produto').value);
        if (prod) document.getElementById('f-margem').value = prod.precoVenda && prod.custoUnitario ? (((prod.precoVenda - prod.custoUnitario) / (prod.custoUnitario || 1)) * 100).toFixed(0) : 150;
        updateSummary();
    }

    function computeCusto() {
        let total = 0;
        document.querySelectorAll('.js-ing-custo').forEach((span, idx) => {
            const row = ingRows[idx];
            const insumo = Store.estoque.find(s => s.id === row.insumoId);
            const qtd = Number(row.quantidade) || 0;
            const custo = insumo ? (Number(insumo.custoUnitario) || 0) * qtd : 0;
            span.textContent = Utils.formatBRL(custo);
            total += custo;
        });
        return total;
    }

    function updateSummary() {
        const box = document.getElementById('ing-container');
        if (!box) return;
        const custoTotal = computeCusto();
        const rendimento = Number(document.getElementById('f-rendimento').value) || 1;
        const margem = Number(document.getElementById('f-margem').value) || 0;
        const custoUn = custoTotal / rendimento;
        const preco = custoUn * (1 + margem / 100);

        document.getElementById('sum-custo-total').textContent = Utils.formatBRL(custoTotal);
        document.getElementById('sum-rendimento').textContent = `${rendimento} un.`;
        document.getElementById('sum-custo-un').textContent = Utils.formatBRL(custoUn);
        document.getElementById('sum-margem').textContent = `${margem}%`;
        document.getElementById('sum-preco').textContent = Utils.formatBRL(preco);
    }

    function resetForm() {
        editingReceitaId = null;
        ingRows = [{ insumoId: '', quantidade: '' }];
        Utils.setSelectValue('f-produto', '', 'Sem vínculo (cálculo avulso)');
        document.getElementById('f-rendimento').value = 1;
        document.getElementById('f-margem').value = 150;
        renderIngRows();
    }

    async function saveFicha(e) {
        e.preventDefault();
        const produtoId = document.getElementById('f-produto').value;
        const produto = Store.produtos.find(p => p.id === produtoId);
        const rendimento = Number(document.getElementById('f-rendimento').value) || 1;
        const margem = Number(document.getElementById('f-margem').value) || 0;
        const ingredientes = ingRows.filter(r => r.insumoId && Number(r.quantidade) > 0).map(r => {
            const insumo = Store.estoque.find(s => s.id === r.insumoId);
            return { insumoId: r.insumoId, nome: insumo ? insumo.nome : '', quantidade: Number(r.quantidade), unidade: insumo ? insumo.unidade : '', custoUnitario: insumo ? Number(insumo.custoUnitario) || 0 : 0 };
        });
        if (!ingredientes.length) { Utils.toast('Adicione ao menos um ingrediente.', 'error'); return; }

        const custoTotal = ingredientes.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0);
        const custoPorUnidade = custoTotal / rendimento;
        const precoSugerido = custoPorUnidade * (1 + margem / 100);

        const data = {
            produtoId: produtoId || null, produtoNome: produto ? produto.nome : 'Cálculo avulso',
            ingredientes, rendimento, margem, custoTotal, custoPorUnidade, precoSugerido,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (editingReceitaId) await Loja.col('receitas').doc(editingReceitaId).update(data);
            else await Loja.col('receitas').add(data);
            Utils.toast('Ficha técnica salva.', 'success');
            resetForm();
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    async function aplicarAoProduto() {
        const produtoId = document.getElementById('f-produto').value;
        if (!produtoId) { Utils.toast('Selecione um produto para aplicar o preço.', 'error'); return; }
        const custoTotal = computeCusto();
        const rendimento = Number(document.getElementById('f-rendimento').value) || 1;
        const margem = Number(document.getElementById('f-margem').value) || 0;
        const custoUn = custoTotal / rendimento;
        const preco = custoUn * (1 + margem / 100);
        try {
            await Loja.col('produtos').doc(produtoId).update({ custoUnitario: Number(custoUn.toFixed(2)), precoVenda: Number(preco.toFixed(2)) });
            Utils.toast('Preço aplicado ao produto com sucesso!', 'success');
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function loadReceita(id) {
        const r = Store.receitas.find(x => x.id === id);
        if (!r) return;
        editingReceitaId = id;
        Utils.setSelectValue('f-produto', r.produtoId || '', 'Sem vínculo (cálculo avulso)');
        document.getElementById('f-rendimento').value = r.rendimento || 1;
        document.getElementById('f-margem').value = r.margem || 0;
        ingRows = (r.ingredientes || []).map(i => ({ insumoId: i.insumoId, quantidade: i.quantidade }));
        if (!ingRows.length) ingRows = [{ insumoId: '', quantidade: '' }];
        renderIngRows();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function removeReceita(id) {
        Utils.confirmDialog('Excluir esta ficha técnica?', async () => {
            try {
                await Loja.col('receitas').doc(id).delete();
                Utils.toast('Ficha técnica excluída.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
    }

    function render() {
        const tbody = document.getElementById('receitas-tbody');
        if (!tbody) return;

        Utils.refreshSelectOptions('f-produto', Store.produtos.map(p => ({ value: p.id, label: p.nome })), 'Sem vínculo (cálculo avulso)');
        ingRows.forEach((row, idx) => {
            Utils.refreshSelectOptions(`ing-insumo-${idx}`, Store.estoque.map(s => ({ value: s.id, label: `${s.nome} (${Utils.formatBRL(s.custoUnitario)}/${s.unidade})` })), 'Selecione o ingrediente...');
        });

        if (!Store.receitas.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-tags"></i>Nenhuma ficha técnica salva ainda.</div></td></tr>`;
            return;
        }
        tbody.innerHTML = Store.receitas.map(r => {
            const produtoAtual = Store.produtos.find(p => p.id === r.produtoId);
            return `
            <tr>
                <td class="strong">${Utils.escapeHtml(r.produtoNome)}</td>
                <td>${Utils.formatBRL(r.custoPorUnidade)}</td>
                <td>${r.margem}%</td>
                <td class="strong" style="color:var(--orange-600);">${Utils.formatBRL(r.precoSugerido)}</td>
                <td>${produtoAtual ? Utils.formatBRL(produtoAtual.precoVenda) : '—'}</td>
                <td>
                    <div class="row-actions">
                        <button class="js-edit-receita" data-id="${r.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="js-del-receita del" data-id="${r.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    return { mount, render };
})();
