/* ==========================================================================
   Produção — Excellent Loja
   ========================================================================== */

const Producao = (() => {

    let selectedDate = Utils.todayKey();
    const FLOW = ['pendente', 'andamento', 'concluido'];
    const COL_TITLES = { pendente: 'Pendente', andamento: 'Em andamento', concluido: 'Concluído' };
    const NEXT_LABEL = { pendente: 'Iniciar', andamento: 'Concluir' };

    function mount() {
        const el = document.getElementById('view-producao');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-novo-producao"><i class="fa-solid fa-plus"></i> Item manual</button>
            </div>
            <div class="toolbar">
                <input type="date" id="producao-date" value="${selectedDate}">
                <button class="btn btn-outline btn-sm" id="producao-today">Hoje</button>
                <div class="spacer"></div>
                <span style="font-size:0.8rem;color:var(--text-muted);" id="producao-count"></span>
            </div>
            <div class="kanban" style="grid-template-columns:repeat(3,1fr);" id="producao-kanban"></div>
        `;
        document.getElementById('btn-novo-producao').addEventListener('click', () => openForm());
        document.getElementById('producao-date').addEventListener('change', (e) => { selectedDate = e.target.value; render(); });
        document.getElementById('producao-today').addEventListener('click', () => {
            selectedDate = Utils.todayKey();
            document.getElementById('producao-date').value = selectedDate;
            render();
        });
        el.addEventListener('click', (e) => {
            const adv = e.target.closest('.js-advance-prod');
            const del = e.target.closest('.js-del-prod');
            if (adv) advance(adv.dataset.id);
            if (del) remove(del.dataset.id);
        });
        render();
    }

    function render() {
        const box = document.getElementById('producao-kanban');
        if (!box) return;

        const list = Store.producao.filter(item => item.status !== 'cancelado' && Utils.todayKey(Utils.toDate(item.data)) === selectedDate);
        document.getElementById('producao-count').textContent = `${list.length} item(ns) na produção do dia`;

        box.innerHTML = FLOW.map(status => {
            const items = list.filter(i => i.status === status);
            return `
            <div class="kanban-col">
                <h4>${COL_TITLES[status]} <span class="count">${items.length}</span></h4>
                ${items.map(i => `
                    <div class="kanban-card" style="cursor:default;">
                        <strong>${Utils.escapeHtml(i.produtoNome)}</strong>
                        <div class="meta"><span>${i.quantidade} unidade(s)</span>${i.pedidoId ? '<span>Pedido</span>' : '<span>Manual</span>'}</div>
                        <div style="display:flex;gap:6px;margin-top:10px;">
                            ${NEXT_LABEL[status] ? `<button class="btn btn-sm btn-primary js-advance-prod" data-id="${i.id}" style="flex:1;">${NEXT_LABEL[status]}</button>` : '<span style="font-size:0.75rem;color:var(--success);"><i class="fa-solid fa-check"></i> Concluído</span>'}
                            <button class="btn btn-sm btn-outline js-del-prod" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `).join('') || '<div class="empty-state" style="padding:16px 4px;"><i class="fa-regular fa-folder-open"></i>Vazio</div>'}
            </div>`;
        }).join('');
    }

    async function advance(id) {
        const item = Store.producao.find(x => x.id === id);
        if (!item) return;
        const idx = FLOW.indexOf(item.status);
        if (idx === -1 || idx === FLOW.length - 1) return;
        try {
            await window.db.collection('producao').doc(id).update({ status: FLOW[idx + 1] });
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function remove(id) {
        Utils.confirmDialog('Remover este item da produção?', async () => {
            try {
                await window.db.collection('producao').doc(id).delete();
                Utils.toast('Item removido.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
    }

    function openForm() {
        Utils.openModal(`
            <div class="modal-head"><h3>Novo item de produção</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="producao-form">
                <div class="form-group"><label>Produto</label>
                    ${Utils.selectHtml({ id: 'f-produto', placeholder: 'Selecione...', options: Store.produtos.map(p => ({ value: p.id, label: p.nome })) })}
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Quantidade</label><input type="number" min="1" id="f-qtd" value="1" required></div>
                    <div class="form-group"><label>Data</label><input type="date" id="f-data" value="${selectedDate}" required></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Adicionar</button>
                </div>
            </form>
        `);
        document.getElementById('producao-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const prod = Store.produtos.find(p => p.id === document.getElementById('f-produto').value);
            if (!prod) { Utils.toast('Selecione um produto.', 'error'); return; }
            try {
                await window.db.collection('producao').add({
                    data: new Date(document.getElementById('f-data').value + 'T12:00:00'),
                    produtoId: prod.id, produtoNome: prod.nome,
                    quantidade: Number(document.getElementById('f-qtd').value) || 1,
                    status: 'pendente', pedidoId: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                Utils.closeModal();
                Utils.toast('Item de produção adicionado.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
    }

    return { mount, render };
})();
