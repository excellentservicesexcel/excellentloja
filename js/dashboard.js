/* ==========================================================================
   Dashboard — Excellent Loja
   ========================================================================== */

const Dashboard = (() => {

    let fatChart = null;
    let statusChart = null;
    let period = 7;

    function mount() {
        const el = document.getElementById('view-dashboard');
        el.innerHTML = `
            <div class="stat-grid">
                <div class="stat-card acc-1">
                    <div class="icon-badge"><i class="fa-solid fa-sack-dollar"></i></div>
                    <div class="label">Faturamento hoje</div>
                    <div class="value" id="kpi-faturamento">R$ 0,00</div>
                    <div class="delta" id="kpi-faturamento-delta"></div>
                </div>
                <div class="stat-card acc-2">
                    <div class="icon-badge"><i class="fa-solid fa-bag-shopping"></i></div>
                    <div class="label">Pedidos hoje</div>
                    <div class="value" id="kpi-pedidos">0</div>
                    <div class="delta" id="kpi-pedidos-delta"></div>
                </div>
                <div class="stat-card acc-3">
                    <div class="icon-badge"><i class="fa-solid fa-box"></i></div>
                    <div class="label">Itens vendidos</div>
                    <div class="value" id="kpi-doces">0</div>
                    <div class="delta" id="kpi-doces-delta"></div>
                </div>
                <div class="stat-card acc-4">
                    <div class="icon-badge"><i class="fa-solid fa-receipt"></i></div>
                    <div class="label">Ticket médio</div>
                    <div class="value" id="kpi-ticket">R$ 0,00</div>
                    <div class="delta" id="kpi-ticket-delta"></div>
                </div>
            </div>

            <div class="grid-2">
                <div class="panel">
                    <div class="panel-head">
                        <h3><i class="fa-solid fa-chart-line" style="color:var(--orange-500);margin-right:6px;"></i>Faturamento</h3>
                        ${Utils.selectHtml({ id: 'fat-period', pill: true, value: '7', options: [
                            { value: '7', label: 'Últimos 7 dias' },
                            { value: '14', label: 'Últimos 14 dias' },
                            { value: '30', label: 'Últimos 30 dias' }
                        ] })}
                    </div>
                    <div class="chart-wrap"><canvas id="chart-faturamento"></canvas></div>
                </div>
                <div class="panel">
                    <div class="panel-head"><h3>Status dos pedidos</h3><span style="font-size:0.72rem;color:var(--text-muted);">hoje</span></div>
                    <div class="donut-flex">
                        <div class="chart-wrap donut" style="flex:1;">
                            <canvas id="chart-status"></canvas>
                            <div class="donut-center-label"><span class="n" id="donut-total">0</span><span class="t">pedidos</span></div>
                        </div>
                        <div class="donut-legend" id="status-legend"></div>
                    </div>
                </div>
            </div>

            <div class="grid-3">
                <div class="panel">
                    <div class="panel-head"><h3>Pedidos recentes</h3><span class="link" data-goto="pedidos">Ver todos</span></div>
                    <div id="dash-recent-orders" class="mini-list"></div>
                </div>
                <div class="panel">
                    <div class="panel-head"><h3>Top produtos</h3><span class="link" data-goto="relatorios">Ver relatório</span></div>
                    <div id="dash-top-produtos" class="mini-list"></div>
                </div>
                <div class="panel">
                    <div class="panel-head"><h3>Estoque baixo</h3><span class="link" data-goto="estoque">Ver estoque</span></div>
                    <div id="dash-low-stock" class="mini-list"></div>
                </div>
            </div>
        `;

        document.getElementById('fat-period').addEventListener('change', (e) => {
            period = Number(e.target.value);
            renderFaturamentoChart();
        });

        buildCharts();
        render();
    }

    function buildCharts() {
        const ctx1 = document.getElementById('chart-faturamento').getContext('2d');
        const gradient = ctx1.createLinearGradient(0, 0, 0, 230);
        gradient.addColorStop(0, 'rgba(245,130,31,0.28)');
        gradient.addColorStop(1, 'rgba(245,130,31,0.02)');

        fatChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#F5821F',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#F5821F',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: {
                    callbacks: { label: (c) => Utils.formatBRL(c.parsed.y) }
                } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: (v) => 'R$ ' + v, font: { size: 10 } }, grid: { color: '#F1E4D3' } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        });

        const ctx2 = document.getElementById('chart-status').getContext('2d');
        statusChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Aguardando', 'Em produção', 'Prontos', 'Entregues'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#F5821F', '#2F80ED', '#1F9D55', '#B5A493'],
                    borderWidth: 0,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '72%',
                plugins: { legend: { display: false } }
            }
        });
    }

    function pctDelta(hoje, ontem) {
        if (!ontem) return hoje > 0 ? 100 : 0;
        return ((hoje - ontem) / ontem) * 100;
    }

    function deltaHtml(elId, hoje, ontem) {
        const p = pctDelta(hoje, ontem);
        const up = p >= 0;
        const el = document.getElementById(elId);
        el.className = 'delta ' + (up ? 'up' : 'down');
        el.innerHTML = `<i class="fa-solid fa-arrow-${up ? 'up' : 'down'}"></i> ${Math.abs(p).toFixed(0)}% <span class="vs">vs ontem</span>`;
    }

    function isSameDay(date, ref) {
        if (!date) return false;
        return Utils.todayKey(date) === Utils.todayKey(ref);
    }

    function ordersOfDay(date) {
        return Store.pedidos.filter(p => p.status !== 'cancelado' && p.status !== 'aguardando' && isSameDay(Utils.toDate(p.createdAt), date));
    }

    function sumTotal(orders) { return orders.reduce((s, o) => s + (Number(o.total) || 0), 0); }
    function sumItens(orders) { return orders.reduce((s, o) => s + (o.itens || []).reduce((a, i) => a + (Number(i.quantidade) || 0), 0), 0); }

    function renderKpis() {
        const hoje = new Date();
        const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);

        const pedidosHoje = ordersOfDay(hoje);
        const pedidosOntem = ordersOfDay(ontem);

        const fatHoje = sumTotal(pedidosHoje);
        const fatOntem = sumTotal(pedidosOntem);
        const docesHoje = sumItens(pedidosHoje);
        const docesOntem = sumItens(pedidosOntem);
        const ticketHoje = pedidosHoje.length ? fatHoje / pedidosHoje.length : 0;
        const ticketOntem = pedidosOntem.length ? fatOntem / pedidosOntem.length : 0;

        document.getElementById('kpi-faturamento').textContent = Utils.formatBRL(fatHoje);
        document.getElementById('kpi-pedidos').textContent = pedidosHoje.length;
        document.getElementById('kpi-doces').textContent = docesHoje;
        document.getElementById('kpi-ticket').textContent = Utils.formatBRL(ticketHoje);

        deltaHtml('kpi-faturamento-delta', fatHoje, fatOntem);
        deltaHtml('kpi-pedidos-delta', pedidosHoje.length, pedidosOntem.length);
        deltaHtml('kpi-doces-delta', docesHoje, docesOntem);
        deltaHtml('kpi-ticket-delta', ticketHoje, ticketOntem);

        return pedidosHoje;
    }

    function renderFaturamentoChart() {
        const labels = [];
        const data = [];
        for (let i = period - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            data.push(sumTotal(ordersOfDay(d)));
        }
        fatChart.data.labels = labels;
        fatChart.data.datasets[0].data = data;
        fatChart.update();
    }

    function renderStatusDonut(pedidosHoje) {
        const groups = { aguardando: 0, producao: 0, pronto: 0, entregue: 0 };
        pedidosHoje.forEach(p => { if (groups[p.status] !== undefined) groups[p.status]++; });
        const total = pedidosHoje.length;
        document.getElementById('donut-total').textContent = total;
        statusChart.data.datasets[0].data = [groups.aguardando, groups.producao, groups.pronto, groups.entregue];
        statusChart.update();

        const legendData = [
            { label: 'Aguardando', color: '#F5821F', n: groups.aguardando },
            { label: 'Em produção', color: '#2F80ED', n: groups.producao },
            { label: 'Prontos', color: '#1F9D55', n: groups.pronto },
            { label: 'Entregues', color: '#B5A493', n: groups.entregue }
        ];
        document.getElementById('status-legend').innerHTML = legendData.map(l => `
            <div class="row"><span class="dot" style="background:${l.color}"></span>${l.label}<span class="n">${l.n}</span></div>
        `).join('');
    }

    function renderRecentOrders() {
        const list = Store.pedidos.slice(0, 5);
        const box = document.getElementById('dash-recent-orders');
        if (!list.length) { box.innerHTML = emptyState('fa-bag-shopping', 'Nenhum pedido ainda.'); return; }
        box.innerHTML = list.map(p => `
            <div class="order-row">
                <span class="num">#${p.numero || '—'}</span>
                <span class="name">${Utils.escapeHtml(p.clienteNome || 'Cliente')}</span>
                ${Utils.statusBadge(p.status)}
                <span class="val">${Utils.formatBRL(p.total)}</span>
            </div>
        `).join('');
    }

    function renderTopProdutos() {
        const counts = {};
        Store.pedidos.forEach(p => {
            if (p.status === 'cancelado' || p.status === 'aguardando') return;
            (p.itens || []).forEach(i => { counts[i.nome] = (counts[i.nome] || 0) + (Number(i.quantidade) || 0); });
        });
        const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const box = document.getElementById('dash-top-produtos');
        if (!arr.length) { box.innerHTML = emptyState('fa-box', 'Sem vendas registradas.'); return; }
        const max = arr[0][1];
        box.innerHTML = arr.map(([nome, qtd], idx) => `
            <div class="mini-row">
                <div class="rank">${idx + 1}</div>
                <div class="body">
                    <div class="top-line"><span>${Utils.escapeHtml(nome)}</span><span>${qtd} un</span></div>
                    <div class="bar-track"><div class="bar-fill" style="width:${(qtd / max) * 100}%"></div></div>
                </div>
            </div>
        `).join('');
    }

    function renderLowStock() {
        const low = Store.estoque.filter(e => Number(e.quantidadeAtual) <= Number(e.quantidadeMinima ?? 0))
            .sort((a, b) => (a.quantidadeAtual / (a.quantidadeMinima || 1)) - (b.quantidadeAtual / (b.quantidadeMinima || 1)))
            .slice(0, 5);
        const box = document.getElementById('dash-low-stock');
        if (!low.length) { box.innerHTML = emptyState('fa-check', 'Estoque de ingredientes OK.'); return; }
        box.innerHTML = low.map(e => `
            <div class="stock-row">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span class="name">${Utils.escapeHtml(e.nome)}</span>
                <span class="qty">${Number(e.quantidadeAtual).toLocaleString('pt-BR')} ${Utils.escapeHtml(e.unidade || '')}</span>
            </div>
        `).join('');
    }

    function emptyState(icon, msg) {
        return `<div class="empty-state"><i class="fa-solid ${icon}"></i>${msg}</div>`;
    }

    function render() {
        if (!fatChart) return;
        const pedidosHoje = renderKpis();
        renderFaturamentoChart();
        renderStatusDonut(pedidosHoje);
        renderRecentOrders();
        renderTopProdutos();
        renderLowStock();
    }

    return { mount, render };
})();
