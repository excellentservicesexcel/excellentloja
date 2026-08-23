/* ==========================================================================
   Financeiro — Excellent Loja
   ========================================================================== */

const Financeiro = (() => {

    let monthFilter = Utils.todayKey().slice(0, 7); // YYYY-MM
    let tipoFilter = '';
    let chart = null;

    function mount() {
        const el = document.getElementById('view-financeiro');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-primary" id="btn-nova-transacao"><i class="fa-solid fa-plus"></i> Nova transação</button>
            </div>
            <div class="kpi-row">
                <div class="kpi-box pos"><div class="lbl">Receitas do mês</div><div class="val" id="fin-receitas">R$ 0,00</div></div>
                <div class="kpi-box neg"><div class="lbl">Despesas do mês</div><div class="val" id="fin-despesas">R$ 0,00</div></div>
                <div class="kpi-box" id="fin-saldo-box"><div class="lbl">Saldo do mês</div><div class="val" id="fin-saldo">R$ 0,00</div></div>
            </div>
            <div class="panel" style="margin-bottom:20px;">
                <div class="panel-head"><h3>Receitas x Despesas (6 meses)</h3></div>
                <div class="chart-wrap"><canvas id="chart-financeiro"></canvas></div>
            </div>
            <div class="toolbar">
                <input type="month" id="fin-month" value="${monthFilter}">
                ${Utils.selectHtml({ id: 'fin-tipo', placeholder: 'Todos os tipos', options: [{ value: 'receita', label: 'Receitas' }, { value: 'despesa', label: 'Despesas' }] })}
                <div class="spacer"></div>
                <span style="font-size:0.8rem;color:var(--text-muted);" id="fin-count"></span>
            </div>
            <div class="table-card">
                <div class="table-scroll">
                    <table>
                        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Pagamento</th><th style="text-align:right;">Valor</th><th></th></tr></thead>
                        <tbody id="fin-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('btn-nova-transacao').addEventListener('click', () => openForm());
        document.getElementById('fin-month').addEventListener('change', (e) => { monthFilter = e.target.value; render(); });
        document.getElementById('fin-tipo').addEventListener('change', (e) => { tipoFilter = e.target.value; render(); });
        el.addEventListener('click', (e) => {
            const del = e.target.closest('.js-del');
            if (del) removeTransacao(del.dataset.id);
        });

        buildChart();
        render();
    }

    function buildChart() {
        const ctx = document.getElementById('chart-financeiro').getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [], datasets: [
                { label: 'Receitas', data: [], backgroundColor: '#1F9D55', borderRadius: 6, maxBarThickness: 26 },
                { label: 'Despesas', data: [], backgroundColor: '#E4572E', borderRadius: 6, maxBarThickness: 26 }
            ] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${Utils.formatBRL(c.parsed.y)}` } } },
                scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'R$ ' + v } }, x: { grid: { display: false } } }
            }
        });
    }

    function monthKey(date) { const d = Utils.toDate(date); return d ? (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')) : ''; }

    function render() {
        if (!chart) return;

        // chart: últimos 6 meses
        const labels = [], receitas = [], despesas = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
            const key = monthKey(d);
            labels.push(d.toLocaleDateString('pt-BR', { month: 'short' }));
            const itemsMonth = Store.financeiro.filter(t => monthKey(t.data) === key);
            receitas.push(itemsMonth.filter(t => t.tipo === 'receita').reduce((s, t) => s + (Number(t.valor) || 0), 0));
            despesas.push(itemsMonth.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (Number(t.valor) || 0), 0));
        }
        chart.data.labels = labels;
        chart.data.datasets[0].data = receitas;
        chart.data.datasets[1].data = despesas;
        chart.update();

        // KPIs do mês selecionado
        const monthItems = Store.financeiro.filter(t => monthKey(t.data) === monthFilter);
        const totReceita = monthItems.filter(t => t.tipo === 'receita').reduce((s, t) => s + (Number(t.valor) || 0), 0);
        const totDespesa = monthItems.filter(t => t.tipo === 'despesa').reduce((s, t) => s + (Number(t.valor) || 0), 0);
        const saldo = totReceita - totDespesa;
        document.getElementById('fin-receitas').textContent = Utils.formatBRL(totReceita);
        document.getElementById('fin-despesas').textContent = Utils.formatBRL(totDespesa);
        document.getElementById('fin-saldo').textContent = Utils.formatBRL(saldo);
        document.getElementById('fin-saldo-box').className = 'kpi-box ' + (saldo >= 0 ? 'pos' : 'neg');

        // tabela
        let list = monthItems;
        if (tipoFilter) list = list.filter(t => t.tipo === tipoFilter);
        list = [...list].sort((a, b) => (Utils.toDate(b.data) || 0) - (Utils.toDate(a.data) || 0));
        document.getElementById('fin-count').textContent = `${list.length} lançamento(s)`;

        const tbody = document.getElementById('fin-tbody');
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fa-solid fa-sack-dollar"></i>Nenhum lançamento neste período.</div></td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(t => `
            <tr>
                <td>${Utils.formatDateShort(Utils.toDate(t.data))}</td>
                <td class="strong">${Utils.escapeHtml(t.descricao || '—')}</td>
                <td>${Utils.escapeHtml(t.categoria || '—')}</td>
                <td><span class="badge badge-${t.tipo}">${t.tipo === 'receita' ? 'Receita' : 'Despesa'}</span></td>
                <td>${Utils.escapeHtml(t.formaPagamento || '—')}</td>
                <td style="text-align:right;font-weight:700;color:${t.tipo === 'receita' ? 'var(--success)' : 'var(--danger)'};">${t.tipo === 'receita' ? '+' : '-'} ${Utils.formatBRL(t.valor)}</td>
                <td><div class="row-actions"><button class="js-del del" data-id="${t.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button></div></td>
            </tr>
        `).join('');
    }

    function openForm() {
        Utils.openModal(`
            <div class="modal-head"><h3>Nova transação</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="fin-form">
                <div class="form-group"><label>Tipo *</label>
                    ${Utils.selectHtml({ id: 'f-tipo', value: 'despesa', options: [{ value: 'despesa', label: 'Despesa' }, { value: 'receita', label: 'Receita' }] })}
                </div>
                <div class="form-group"><label>Descrição *</label><input type="text" id="f-desc" required placeholder="Ex: Compra de embalagens"></div>
                <div class="form-row">
                    <div class="form-group"><label>Categoria</label><input type="text" id="f-cat" list="cat-list" placeholder="Ex: Ingredientes">
                        <datalist id="cat-list"></datalist>
                    </div>
                    <div class="form-group"><label>Valor (R$) *</label><input type="number" step="0.01" min="0.01" id="f-valor" required></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Forma de pagamento</label>
                        ${Utils.selectHtml({ id: 'f-pagamento', value: (Store.config.formasPagamento || ['Pix'])[0], options: (Store.config.formasPagamento || ['Pix', 'Dinheiro', 'Cartão']).map(f => ({ value: f, label: f })) })}
                    </div>
                    <div class="form-group"><label>Data *</label><input type="date" id="f-data" required value="${Utils.todayKey()}"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);

        function atualizarCategorias() {
            const tipo = document.getElementById('f-tipo').value;
            const lista = tipo === 'receita' ? (Store.config.categoriasReceita || []) : (Store.config.categoriasDespesa || []);
            document.getElementById('cat-list').innerHTML = lista.map(c => `<option value="${Utils.escapeHtml(c)}">`).join('');
            // a categoria digitada era da lista antiga (outro tipo) — limpa pra
            // não deixar uma categoria de despesa marcada numa receita (ou vice-versa)
            const catInput = document.getElementById('f-cat');
            if (catInput.value && !lista.includes(catInput.value)) catInput.value = '';
        }
        atualizarCategorias();
        document.getElementById('f-tipo').addEventListener('change', atualizarCategorias);

        document.getElementById('fin-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await Loja.col('financeiro').add({
                    tipo: document.getElementById('f-tipo').value,
                    descricao: document.getElementById('f-desc').value.trim(),
                    categoria: document.getElementById('f-cat').value.trim(),
                    valor: Number(document.getElementById('f-valor').value) || 0,
                    formaPagamento: document.getElementById('f-pagamento').value,
                    data: new Date(document.getElementById('f-data').value + 'T12:00:00'),
                    pedidoId: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                Utils.closeModal();
                Utils.toast('Transação registrada.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
    }

    function removeTransacao(id) {
        Utils.confirmDialog('Excluir este lançamento financeiro?', async () => {
            try {
                await Loja.col('financeiro').doc(id).delete();
                Utils.toast('Lançamento excluído.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
    }

    return { mount, render };
})();
