/* ==========================================================================
   Pedidos — Excellent Loja
   ========================================================================== */

const Pedidos = (() => {

    let search = '';
    let itemRows = []; // linhas do formulário de itens em edição

    const FLOW = ['aguardando', 'producao', 'pronto', 'entregue'];
    const COL_TITLES = { aguardando: 'Aguardando', producao: 'Em produção', pronto: 'Prontos', entregue: 'Entregues' };

    function mount() {
        const el = document.getElementById('view-pedidos');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-novo-pedido"><i class="fa-solid fa-plus"></i> Novo Pedido</button>
            </div>
            <div class="toolbar">
                <div class="search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="pedido-search" placeholder="Buscar por cliente ou nº..."></div>
                <div class="spacer"></div>
                <span class="link" data-goto="__cancelados" id="link-cancelados" style="font-size:0.8rem;"></span>
            </div>
            <div class="kanban" id="pedidos-kanban"></div>
        `;
        document.getElementById('btn-novo-pedido').addEventListener('click', () => openForm());
        document.getElementById('pedido-search').addEventListener('input', Utils.debounce((e) => { search = e.target.value.toLowerCase(); render(); }, 200));
        el.addEventListener('click', (e) => {
            const card = e.target.closest('.js-open-pedido');
            const adv = e.target.closest('.js-advance');
            const wa = e.target.closest('.js-whatsapp');
            const canc = e.target.closest('.js-cancel');
            const cancLink = e.target.closest('#link-cancelados');
            if (adv) { e.stopPropagation(); advanceStatus(adv.dataset.id); return; }
            if (wa) { e.stopPropagation(); return; }
            if (canc) { e.stopPropagation(); cancelPedido(canc.dataset.id); return; }
            if (cancLink) { openCanceladosModal(); return; }
            if (card) openDetail(card.dataset.id);
        });
        render();
    }

    function render() {
        const box = document.getElementById('pedidos-kanban');
        if (!box) return;

        let list = Store.pedidos.filter(p => p.status !== 'cancelado');
        if (search) {
            list = list.filter(p => (p.clienteNome || '').toLowerCase().includes(search) || String(p.numero || '').includes(search));
        }

        const canceladosCount = Store.pedidos.filter(p => p.status === 'cancelado').length;
        const linkEl = document.getElementById('link-cancelados');
        if (linkEl) linkEl.textContent = canceladosCount ? `${canceladosCount} pedido(s) cancelado(s)` : '';

        box.innerHTML = FLOW.map(status => {
            const items = list.filter(p => p.status === status).sort((a, b) => (b.numero || 0) - (a.numero || 0));
            return `
            <div class="kanban-col">
                <h4>${COL_TITLES[status]} <span class="count">${items.length}</span></h4>
                ${items.map(p => cardHtml(p)).join('') || '<div class="empty-state" style="padding:16px 4px;"><i class="fa-regular fa-folder-open"></i>Vazio</div>'}
            </div>`;
        }).join('');
    }

    function cardHtml(p) {
        const nextLabel = { aguardando: 'Iniciar produção', producao: 'Marcar pronto', pronto: 'Marcar entregue' }[p.status];
        const itensResumo = (p.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(', ');
        return `
        <div class="kanban-card js-open-pedido" data-id="${p.id}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <strong>#${p.numero} · ${Utils.escapeHtml(p.clienteNome || 'Cliente')}</strong>
                <span style="font-weight:700;color:var(--orange-600);font-size:0.82rem;">${Utils.formatBRL(p.total)}</span>
            </div>
            <div style="font-size:0.76rem;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${Utils.escapeHtml(itensResumo || '—')}</div>
            <div class="meta">
                <span>${p.dataEntrega ? Utils.formatDateShort(Utils.toDate(p.dataEntrega)) : Utils.formatDateShort(Utils.toDate(p.createdAt))}</span>
                <span>${Utils.escapeHtml(p.formaPagamento || '')}</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:10px;">
                ${nextLabel ? `<button class="btn btn-sm btn-primary js-advance" data-id="${p.id}" style="flex:1;">${nextLabel}</button>` : ''}
                ${p.clienteTelefone ? `<a class="btn btn-sm btn-outline js-whatsapp" target="_blank" href="https://wa.me/55${p.clienteTelefone.replace(/\D/g, '')}"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
            </div>
        </div>`;
    }

    function openCanceladosModal() {
        const list = Store.pedidos.filter(p => p.status === 'cancelado').sort((a, b) => (b.numero || 0) - (a.numero || 0));
        Utils.openModal(`
            <div class="modal-head"><h3>Pedidos cancelados</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            ${list.length ? `<div class="mini-list">${list.map(p => `
                <div class="order-row"><span class="num">#${p.numero}</span><span class="name">${Utils.escapeHtml(p.clienteNome || '')}</span><span class="val">${Utils.formatBRL(p.total)}</span></div>
            `).join('')}</div>` : `<div class="empty-state"><i class="fa-solid fa-ban"></i>Nenhum pedido cancelado.</div>`}
        `);
    }

    async function advanceStatus(id) {
        const p = Store.pedidos.find(x => x.id === id);
        if (!p) return;
        const idx = FLOW.indexOf(p.status);
        if (idx === -1 || idx === FLOW.length - 1) return;
        const novo = FLOW[idx + 1];
        try {
            const batch = window.db.batch();
            batch.update(window.db.collection('pedidos').doc(id), { status: novo });
            if (novo === 'producao') {
                const finRef = window.db.collection('financeiro').doc();
                batch.set(finRef, {
                    tipo: 'receita', categoria: 'Venda de produtos', descricao: `Pedido #${p.numero} — ${p.clienteNome}`,
                    valor: p.total, formaPagamento: p.formaPagamento, data: new Date(),
                    pedidoId: id, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await batch.commit();
            if (novo === 'entregue') {
                const snap = await window.db.collection('producao').where('pedidoId', '==', id).get();
                const batch2 = window.db.batch();
                snap.forEach(d => batch2.update(d.ref, { status: 'concluido' }));
                await batch2.commit();
            }
            Utils.toast('Status atualizado para "' + Utils.STATUS_LABELS[novo] + '".', 'success');
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        }
    }

    function cancelPedido(id) {
        const p = Store.pedidos.find(x => x.id === id);
        Utils.confirmDialog('Cancelar este pedido? O lançamento financeiro relacionado será removido e o estoque reservado será devolvido.', async () => {
            try {
                const batch = window.db.batch();
                batch.update(window.db.collection('pedidos').doc(id), { status: 'cancelado' });
                const finSnap = await window.db.collection('financeiro').where('pedidoId', '==', id).get();
                finSnap.forEach(d => batch.delete(d.ref));
                const prodSnap = await window.db.collection('producao').where('pedidoId', '==', id).get();
                prodSnap.forEach(d => batch.update(d.ref, { status: 'cancelado' }));
                (p?.itens || []).forEach(i => {
                    batch.update(window.db.collection('produtos').doc(i.produtoId), { estoqueAtual: firebase.firestore.FieldValue.increment(i.quantidade) });
                });
                await batch.commit();
                Utils.closeModal();
                Utils.toast('Pedido cancelado.', 'success');
            } catch (err) {
                Utils.toast('Erro: ' + err.message, 'error');
            }
        }, 'Cancelar pedido');
    }

    function deletePedido(id) {
        const p = Store.pedidos.find(x => x.id === id);
        Utils.confirmDialog('Excluir definitivamente este pedido e seus lançamentos relacionados?', async () => {
            try {
                const batch = window.db.batch();
                batch.delete(window.db.collection('pedidos').doc(id));
                const finSnap = await window.db.collection('financeiro').where('pedidoId', '==', id).get();
                finSnap.forEach(d => batch.delete(d.ref));
                const prodSnap = await window.db.collection('producao').where('pedidoId', '==', id).get();
                prodSnap.forEach(d => batch.delete(d.ref));
                if (p && p.status !== 'cancelado') {
                    (p.itens || []).forEach(i => {
                        batch.update(window.db.collection('produtos').doc(i.produtoId), { estoqueAtual: firebase.firestore.FieldValue.increment(i.quantidade) });
                    });
                }
                await batch.commit();
                Utils.closeModal();
                Utils.toast('Pedido excluído.', 'success');
            } catch (err) {
                Utils.toast('Erro: ' + err.message, 'error');
            }
        });
    }

    function openDetail(id) {
        const p = Store.pedidos.find(x => x.id === id);
        if (!p) return;
        const itensHtml = (p.itens || []).map(i => `
            <tr><td>${i.quantidade}x ${Utils.escapeHtml(i.nome)}</td><td style="text-align:right;">${Utils.formatBRL(i.precoUnitario)}</td><td style="text-align:right;">${Utils.formatBRL(i.subtotal)}</td></tr>
        `).join('');
        Utils.openModal(`
            <div class="modal-head">
                <h3>Pedido #${p.numero} ${Utils.statusBadge(p.status)}</h3>
                <button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div style="font-size:0.85rem; color:var(--text-body); margin-bottom:14px;">
                <div><strong>${Utils.escapeHtml(p.clienteNome || '')}</strong> · ${Utils.escapeHtml(p.clienteTelefone || '')}</div>
                ${p.endereco ? `<div>${Utils.escapeHtml(p.endereco)}</div>` : ''}
                <div style="margin-top:4px;color:var(--text-muted);">Feito em ${Utils.formatDateTimeBR(Utils.toDate(p.createdAt))}${p.dataEntrega ? ' · Entrega: ' + Utils.formatDateBR(Utils.toDate(p.dataEntrega)) : ''}</div>
            </div>
            <table style="width:100%;font-size:0.85rem;margin-bottom:12px;">${itensHtml}</table>
            <div class="pricer-summary">
                <div class="row"><span>Subtotal</span><span>${Utils.formatBRL(p.subtotal)}</span></div>
                <div class="row"><span>Taxa de entrega</span><span>${Utils.formatBRL(p.taxaEntrega)}</span></div>
                <div class="row"><strong>Total</strong><span class="total">${Utils.formatBRL(p.total)}</span></div>
            </div>
            ${p.observacoes ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:10px;"><i class="fa-solid fa-note-sticky"></i> ${Utils.escapeHtml(p.observacoes)}</div>` : ''}
            <div class="form-actions">
                ${p.status !== 'cancelado' && p.status !== 'entregue' ? `<button class="btn btn-outline" onclick="Pedidos.cancelFromModal('${p.id}')"><i class="fa-solid fa-ban"></i> Cancelar</button>` : ''}
                <button class="btn btn-danger" onclick="Pedidos.deleteFromModal('${p.id}')"><i class="fa-solid fa-trash"></i> Excluir</button>
            </div>
        `);
    }

    function openForm() {
        itemRows = [{ produtoId: '', quantidade: 1 }];
        Utils.openModal(`
            <div class="modal-head"><h3>Novo pedido</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="pedido-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Cliente *</label>
                        ${Utils.selectHtml({ id: 'f-cliente', placeholder: 'Selecione um cliente...', options: Store.clientes.map(c => ({ value: c.id, label: c.nome })) })}
                    </div>
                    <div class="form-group"><label>Data de entrega</label><input type="date" id="f-data-entrega"></div>
                </div>
                <label style="display:block;font-size:0.78rem;font-weight:700;color:var(--text-body);margin-bottom:6px;">Itens do pedido *</label>
                <div id="itens-container"></div>
                <button type="button" class="btn btn-outline btn-sm" id="btn-add-item" style="margin-bottom:14px;"><i class="fa-solid fa-plus"></i> Adicionar item</button>
                <div class="form-row">
                    <div class="form-group"><label>Forma de pagamento</label>
                        ${Utils.selectHtml({ id: 'f-pagamento', value: (Store.config.formasPagamento || ['Pix'])[0], options: (Store.config.formasPagamento || ['Pix', 'Dinheiro', 'Cartão']).map(f => ({ value: f, label: f })) })}
                    </div>
                    <div class="form-group"><label>Taxa de entrega (R$)</label><input type="number" step="0.01" min="0" id="f-taxa" value="${Store.config.taxaEntregaPadrao || 0}"></div>
                </div>
                <div class="form-group"><label>Endereço de entrega</label><input type="text" id="f-endereco"></div>
                <div class="form-group"><label>Observações</label><textarea id="f-obs" rows="2"></textarea></div>
                <div class="pricer-summary" style="margin-bottom:8px;">
                    <div class="row"><span>Subtotal</span><span id="preview-subtotal">R$ 0,00</span></div>
                    <div class="row"><strong>Total</strong><span class="total" id="preview-total">R$ 0,00</span></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="pedido-submit-btn"><i class="fa-solid fa-check"></i> Criar pedido</button>
                </div>
            </form>
        `);

        document.getElementById('f-cliente').addEventListener('change', (e) => {
            const c = Store.clientes.find(x => x.id === e.target.value);
            if (c) document.getElementById('f-endereco').value = c.endereco || '';
        });
        document.getElementById('btn-add-item').addEventListener('click', () => { itemRows.push({ produtoId: '', quantidade: 1 }); renderItemRows(); });
        renderItemRows();

        document.getElementById('pedido-form').addEventListener('submit', submitPedido);
    }

    function renderItemRows() {
        const box = document.getElementById('itens-container');
        box.innerHTML = itemRows.map((row, idx) => `
            <div class="item-picker-row">
                ${Utils.selectHtml({ id: `item-produto-${idx}`, className: 'js-item-produto', dataAttrs: { idx }, value: row.produtoId, placeholder: 'Selecione o produto...', options: Store.produtos.filter(p => p.ativo !== false).map(p => ({ value: p.id, label: p.nome })) })}
                <input type="number" min="1" class="js-item-qtd" data-idx="${idx}" value="${row.quantidade}" placeholder="Qtd">
                <span class="js-item-subtotal" style="font-size:0.82rem;color:var(--text-muted);text-align:right;">R$ 0,00</span>
                <button type="button" class="js-item-remove" data-idx="${idx}" style="background:none;border:none;color:var(--danger);cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        box.querySelectorAll('.js-item-produto').forEach(sel => sel.addEventListener('change', (e) => {
            itemRows[e.target.dataset.idx].produtoId = e.target.value; updateTotals();
        }));
        box.querySelectorAll('.js-item-qtd').forEach(inp => inp.addEventListener('input', (e) => {
            itemRows[e.target.dataset.idx].quantidade = Number(e.target.value) || 0; updateTotals();
        }));
        box.querySelectorAll('.js-item-remove').forEach(btn => btn.addEventListener('click', (e) => {
            const idx = Number(e.currentTarget.dataset.idx);
            if (itemRows.length > 1) { itemRows.splice(idx, 1); renderItemRows(); } else { itemRows[0] = { produtoId: '', quantidade: 1 }; renderItemRows(); }
        }));
        updateTotals();
    }

    function computeItems() {
        return itemRows.filter(r => r.produtoId && r.quantidade > 0).map(r => {
            const prod = Store.produtos.find(p => p.id === r.produtoId);
            const preco = prod ? Number(prod.precoVenda) || 0 : 0;
            return { produtoId: r.produtoId, nome: prod ? prod.nome : '', quantidade: r.quantidade, precoUnitario: preco, subtotal: preco * r.quantidade };
        });
    }

    function updateTotals() {
        const box = document.getElementById('itens-container');
        if (!box) return;
        box.querySelectorAll('.js-item-subtotal').forEach((span, i) => {
            const row = itemRows[i];
            const prod = Store.produtos.find(p => p.id === row.produtoId);
            const val = prod ? (Number(prod.precoVenda) || 0) * (row.quantidade || 0) : 0;
            span.textContent = Utils.formatBRL(val);
        });
        const itens = computeItems();
        const subtotal = itens.reduce((s, i) => s + i.subtotal, 0);
        const taxa = Number(document.getElementById('f-taxa')?.value) || 0;
        document.getElementById('preview-subtotal').textContent = Utils.formatBRL(subtotal);
        document.getElementById('preview-total').textContent = Utils.formatBRL(subtotal + taxa);
        const taxaInput = document.getElementById('f-taxa');
        if (taxaInput && !taxaInput._bound) { taxaInput._bound = true; taxaInput.addEventListener('input', updateTotals); }
    }

    async function submitPedido(e) {
        e.preventDefault();
        const itens = computeItems();
        if (!itens.length) { Utils.toast('Adicione ao menos um item ao pedido.', 'error'); return; }
        const clienteId = document.getElementById('f-cliente').value;
        const cliente = Store.clientes.find(c => c.id === clienteId);
        if (!cliente) { Utils.toast('Selecione um cliente.', 'error'); return; }
        for (const i of itens) {
            const prod = Store.produtos.find(p => p.id === i.produtoId);
            const disponivel = Number(prod?.estoqueAtual) || 0;
            if (i.quantidade > disponivel) {
                Utils.toast(`Estoque insuficiente de "${i.nome}" (disponível: ${disponivel}).`, 'error');
                return;
            }
        }

        const btn = document.getElementById('pedido-submit-btn');
        btn.disabled = true;
        try {
            const subtotal = itens.reduce((s, i) => s + i.subtotal, 0);
            const taxa = Number(document.getElementById('f-taxa').value) || 0;
            const total = subtotal + taxa;
            const dataEntregaVal = document.getElementById('f-data-entrega').value;
            const numero = await window.nextPedidoNumero();

            const data = {
                numero,
                clienteId: cliente.id,
                clienteNome: cliente.nome,
                clienteTelefone: cliente.telefone || '',
                itens, subtotal, taxaEntrega: taxa, total,
                formaPagamento: document.getElementById('f-pagamento').value,
                status: 'aguardando',
                endereco: document.getElementById('f-endereco').value.trim(),
                observacoes: document.getElementById('f-obs').value.trim(),
                dataEntrega: dataEntregaVal ? new Date(dataEntregaVal + 'T12:00:00') : null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const batch = window.db.batch();
            const pedidoRef = window.db.collection('pedidos').doc();
            batch.set(pedidoRef, data);

            itens.forEach(i => {
                const prodRef = window.db.collection('produtos').doc(i.produtoId);
                batch.update(prodRef, { estoqueAtual: firebase.firestore.FieldValue.increment(-i.quantidade) });
                const prodItemRef = window.db.collection('producao').doc();
                batch.set(prodItemRef, {
                    data: data.dataEntrega || new Date(), produtoId: i.produtoId, produtoNome: i.nome,
                    quantidade: i.quantidade, status: 'pendente', pedidoId: pedidoRef.id,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            Utils.closeModal();
            Utils.toast(`Pedido #${numero} criado com sucesso!`, 'success');
        } catch (err) {
            Utils.toast('Erro ao criar pedido: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    return {
        mount, render,
        cancelFromModal: (id) => cancelPedido(id),
        deleteFromModal: (id) => deletePedido(id)
    };
})();
