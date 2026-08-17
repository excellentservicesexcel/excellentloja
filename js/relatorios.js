/* ==========================================================================
   Relatórios — Excellent Loja
   ========================================================================== */

const Relatorios = (() => {

    let dateFrom, dateTo;
    let payChart = null;

    function defaultRange() {
        const to = new Date();
        const from = new Date(); from.setDate(from.getDate() - 29);
        dateFrom = Utils.todayKey(from);
        dateTo = Utils.todayKey(to);
    }

    function mount() {
        defaultRange();
        const el = document.getElementById('view-relatorios');
        el.innerHTML = `
            <div class="section-head" style="justify-content:flex-end;">
                <button class="btn btn-outline" id="btn-export-csv"><i class="fa-solid fa-file-csv"></i> Exportar CSV</button>
            </div>
            <div class="toolbar">
                <label style="font-size:0.8rem;color:var(--text-muted);">De <input type="date" id="rel-from" value="${dateFrom}"></label>
                <label style="font-size:0.8rem;color:var(--text-muted);">até <input type="date" id="rel-to" value="${dateTo}"></label>
                <button class="btn btn-outline btn-sm" id="rel-30d">Últimos 30 dias</button>
            </div>
            <div class="kpi-row">
                <div class="kpi-box pos"><div class="lbl">Total vendido</div><div class="val" id="rel-total">R$ 0,00</div></div>
                <div class="kpi-box"><div class="lbl">Pedidos no período</div><div class="val" id="rel-pedidos">0</div></div>
                <div class="kpi-box"><div class="lbl">Ticket médio</div><div class="val" id="rel-ticket">R$ 0,00</div></div>
                <div class="kpi-box"><div class="lbl">Itens vendidos</div><div class="val" id="rel-doces">0</div></div>
            </div>
            <div class="grid-2">
                <div class="panel">
                    <div class="panel-head"><h3>Top produtos no período</h3></div>
                    <div class="mini-list" id="rel-top-produtos"></div>
                </div>
                <div class="panel">
                    <div class="panel-head"><h3>Vendas por pagamento</h3></div>
                    <div class="chart-wrap donut"><canvas id="chart-pagamento"></canvas></div>
                </div>
            </div>
            <div class="panel">
                <div class="panel-head"><h3>Top clientes no período</h3></div>
                <div class="table-scroll">
                    <table>
                        <thead><tr><th>Cliente</th><th>Pedidos</th><th style="text-align:right;">Total gasto</th></tr></thead>
                        <tbody id="rel-top-clientes"></tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('rel-from').addEventListener('change', (e) => { dateFrom = e.target.value; render(); });
        document.getElementById('rel-to').addEventListener('change', (e) => { dateTo = e.target.value; render(); });
        document.getElementById('rel-30d').addEventListener('click', () => { defaultRange(); document.getElementById('rel-from').value = dateFrom; document.getElementById('rel-to').value = dateTo; render(); });
        document.getElementById('btn-export-csv').addEventListener('click', exportCsv);

        const ctx = document.getElementById('chart-pagamento').getContext('2d');
        payChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#F5821F', '#2F80ED', '#1F9D55', '#B5A493', '#E4572E', '#8A7364'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } } }
        });

        render();
    }

    function inRange(p) {
        if (p.status === 'cancelado' || p.status === 'aguardando') return false;
        const key = Utils.todayKey(Utils.toDate(p.createdAt));
        return key >= dateFrom && key <= dateTo;
    }

    function render() {
        if (!payChart) return;
        const list = Store.pedidos.filter(inRange);

        const total = list.reduce((s, p) => s + (Number(p.total) || 0), 0);
        const doces = list.reduce((s, p) => s + (p.itens || []).reduce((a, i) => a + (Number(i.quantidade) || 0), 0), 0);
        document.getElementById('rel-total').textContent = Utils.formatBRL(total);
        document.getElementById('rel-pedidos').textContent = list.length;
        document.getElementById('rel-ticket').textContent = Utils.formatBRL(list.length ? total / list.length : 0);
        document.getElementById('rel-doces').textContent = doces;

        // top produtos
        const counts = {};
        list.forEach(p => (p.itens || []).forEach(i => { counts[i.nome] = (counts[i.nome] || 0) + (Number(i.quantidade) || 0); }));
        const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const box = document.getElementById('rel-top-produtos');
        box.innerHTML = arr.length ? arr.map(([nome, qtd], idx) => `
            <div class="mini-row">
                <div class="rank">${idx + 1}</div>
                <div class="body">
                    <div class="top-line"><span>${Utils.escapeHtml(nome)}</span><span>${qtd} un</span></div>
                    <div class="bar-track"><div class="bar-fill" style="width:${(qtd / arr[0][1]) * 100}%"></div></div>
                </div>
            </div>`).join('') : `<div class="empty-state"><i class="fa-solid fa-box"></i>Sem vendas no período.</div>`;

        // pagamento
        const payCounts = {};
        list.forEach(p => { const k = p.formaPagamento || 'Não informado'; payCounts[k] = (payCounts[k] || 0) + (Number(p.total) || 0); });
        payChart.data.labels = Object.keys(payCounts);
        payChart.data.datasets[0].data = Object.values(payCounts);
        payChart.update();

        // top clientes
        const clienteMap = {};
        list.forEach(p => {
            const k = p.clienteNome || 'Cliente';
            clienteMap[k] = clienteMap[k] || { count: 0, total: 0 };
            clienteMap[k].count++; clienteMap[k].total += Number(p.total) || 0;
        });
        const clientesArr = Object.entries(clienteMap).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
        const tbody = document.getElementById('rel-top-clientes');
        tbody.innerHTML = clientesArr.length ? clientesArr.map(([nome, s]) => `
            <tr><td class="strong">${Utils.escapeHtml(nome)}</td><td>${s.count}</td><td style="text-align:right;font-weight:700;">${Utils.formatBRL(s.total)}</td></tr>
        `).join('') : `<tr><td colspan="3"><div class="empty-state"><i class="fa-solid fa-users"></i>Sem dados no período.</div></td></tr>`;
    }

    function exportCsv() {
        const list = Store.pedidos.filter(inRange);
        if (!list.length) { Utils.toast('Nenhum dado para exportar neste período.', 'error'); return; }
        const rows = [['Numero', 'Cliente', 'Data', 'Itens', 'Forma de Pagamento', 'Status', 'Total']];
        list.forEach(p => {
            rows.push([
                p.numero, p.clienteNome || '', Utils.formatDateShort(Utils.toDate(p.createdAt)),
                (p.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(' | '),
                p.formaPagamento || '', Utils.STATUS_LABELS[p.status] || p.status, (Number(p.total) || 0).toFixed(2).replace('.', ',')
            ]);
        });
        const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `excellent-loja-relatorio-${dateFrom}_a_${dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    return { mount, render };
})();
