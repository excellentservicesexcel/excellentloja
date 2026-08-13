/* ==========================================================================
   Clientes — Excellent Loja
   ========================================================================== */

const Clientes = (() => {

    let search = '';

    function mount() {
        const el = document.getElementById('view-clientes');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-novo-cliente"><i class="fa-solid fa-plus"></i> Novo Cliente</button>
            </div>
            <div class="toolbar">
                <div class="search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="cliente-search" placeholder="Buscar por nome ou telefone..."></div>
                <div class="spacer"></div>
                <span style="font-size:0.8rem;color:var(--text-muted);" id="cliente-count"></span>
            </div>
            <div class="table-card">
                <div class="table-scroll">
                    <table>
                        <thead><tr>
                            <th>Cliente</th><th>Contato</th><th>Pedidos</th><th>Total gasto</th><th>Última compra</th><th></th>
                        </tr></thead>
                        <tbody id="clientes-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('btn-novo-cliente').addEventListener('click', () => openForm());
        document.getElementById('cliente-search').addEventListener('input', Utils.debounce((e) => { search = e.target.value.toLowerCase(); render(); }, 200));
        el.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.js-edit');
            const delBtn = e.target.closest('.js-del');
            if (editBtn) openForm(editBtn.dataset.id);
            if (delBtn) removeCliente(delBtn.dataset.id);
        });
        render();
    }

    function statsFor(clienteId) {
        const pedidos = Store.pedidos.filter(p => p.clienteId === clienteId && p.status !== 'cancelado');
        const total = pedidos.reduce((s, p) => s + (Number(p.total) || 0), 0);
        const ultima = pedidos.map(p => Utils.toDate(p.createdAt)).filter(Boolean).sort((a, b) => b - a)[0];
        return { count: pedidos.length, total, ultima };
    }

    function render() {
        const tbody = document.getElementById('clientes-tbody');
        if (!tbody) return;
        let list = Store.clientes;
        if (search) list = list.filter(c => (c.nome || '').toLowerCase().includes(search) || (c.telefone || '').includes(search));
        document.getElementById('cliente-count').textContent = `${list.length} cliente(s)`;

        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-users"></i>Nenhum cliente encontrado.</div></td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(c => {
            const s = statsFor(c.id);
            return `
            <tr>
                <td class="strong">${Utils.escapeHtml(c.nome)}</td>
                <td>${Utils.escapeHtml(c.telefone || '—')}${c.email ? '<br><span style="color:var(--text-muted);font-size:0.78rem;">' + Utils.escapeHtml(c.email) + '</span>' : ''}</td>
                <td>${s.count}</td>
                <td class="strong">${Utils.formatBRL(s.total)}</td>
                <td>${s.ultima ? Utils.formatDateShort(s.ultima) : '—'}</td>
                <td>
                    <div class="row-actions">
                        <button class="js-edit" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="js-del del" data-id="${c.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    function openForm(id) {
        const c = id ? Store.clientes.find(x => x.id === id) : null;
        Utils.openModal(`
            <div class="modal-head"><h3>${c ? 'Editar cliente' : 'Novo cliente'}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="cliente-form">
                <div class="form-group"><label>Nome completo *</label><input type="text" id="f-nome" required value="${c ? Utils.escapeHtml(c.nome) : ''}"></div>
                <div class="form-row">
                    <div class="form-group"><label>Telefone / WhatsApp *</label><input type="text" id="f-telefone" required placeholder="(00) 00000-0000" value="${c ? Utils.escapeHtml(c.telefone || '') : ''}"></div>
                    <div class="form-group"><label>E-mail</label><input type="email" id="f-email" value="${c ? Utils.escapeHtml(c.email || '') : ''}"></div>
                </div>
                <div class="form-group"><label>Endereço</label><input type="text" id="f-endereco" value="${c ? Utils.escapeHtml(c.endereco || '') : ''}"></div>
                <div class="form-group"><label>Observações</label><textarea id="f-obs" rows="2">${c ? Utils.escapeHtml(c.observacoes || '') : ''}</textarea></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);
        document.getElementById('cliente-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                nome: document.getElementById('f-nome').value.trim(),
                telefone: document.getElementById('f-telefone').value.trim(),
                email: document.getElementById('f-email').value.trim(),
                endereco: document.getElementById('f-endereco').value.trim(),
                observacoes: document.getElementById('f-obs').value.trim()
            };
            try {
                if (c) {
                    await window.db.collection('clientes').doc(c.id).update(data);
                } else {
                    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await window.db.collection('clientes').add(data);
                }
                Utils.closeModal();
                Utils.toast(c ? 'Cliente atualizado.' : 'Cliente cadastrado.', 'success');
            } catch (err) {
                Utils.toast('Erro ao salvar cliente: ' + err.message, 'error');
            }
        });
    }

    function removeCliente(id) {
        const c = Store.clientes.find(x => x.id === id);
        Utils.confirmDialog(`Excluir o cliente "${c ? c.nome : ''}"? Esta ação não pode ser desfeita.`, async () => {
            try {
                await window.db.collection('clientes').doc(id).delete();
                Utils.toast('Cliente excluído.', 'success');
            } catch (err) {
                Utils.toast('Erro ao excluir: ' + err.message, 'error');
            }
        });
    }

    return { mount, render };
})();
