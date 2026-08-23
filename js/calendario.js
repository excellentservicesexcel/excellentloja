/* ==========================================================================
   Calendário — Excellent Loja
   Cada loja tem o seu, independente (lojas/{lojaId}/calendario/{id}).
   Um item tem: data ("YYYY-MM-DD"), hora ("HH:MM", opcional), texto,
   concluido (bool). "Pendências" é calculado na hora (não é um campo salvo):
   qualquer item não concluído cuja data já passou.
   ========================================================================== */

const Calendario = (() => {
    const MIN_ANO = 2026, MAX_ANO = 2036;
    const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const hojeInicial = new Date();
    let viewAno = hojeInicial.getFullYear();
    let viewMes = hojeInicial.getMonth();

    function mount() {
        const el = document.getElementById('view-calendario');
        if (!el) return;
        el.innerHTML = `
            <div class="cal-toolbar">
                <div class="cal-nav">
                    <button type="button" class="btn btn-outline btn-sm" id="cal-prev"><i class="fa-solid fa-chevron-left"></i></button>
                    <div class="cal-month-year">
                        ${Utils.selectHtml({ id: 'cal-mes', options: MESES.map((m, i) => ({ value: i, label: m })), value: viewMes })}
                        ${Utils.selectHtml({ id: 'cal-ano', options: anosOptions(), value: viewAno })}
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" id="cal-next"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
                <button type="button" class="btn btn-outline btn-sm" id="cal-hoje"><i class="fa-solid fa-calendar-day"></i> Hoje</button>
            </div>
            <div class="cal-grid" id="cal-grid"></div>

            <div class="panel" style="margin-top:20px;">
                <div class="panel-head"><h3>Sua semana</h3></div>
                <div class="planner-row" id="cal-planner"></div>
            </div>

            <div class="panel" style="margin-top:20px;">
                <div class="panel-head"><h3>Hoje</h3></div>
                <div id="cal-checklist"></div>
            </div>

            <div class="panel" id="cal-pendencias-panel" style="margin-top:20px;display:none;">
                <div class="panel-head"><h3><i class="fa-solid fa-triangle-exclamation"></i> Pendências</h3></div>
                <div id="cal-pendencias-list"></div>
            </div>
        `;
        bind();
        render();
    }

    function anosOptions() {
        const arr = [];
        for (let y = MIN_ANO; y <= MAX_ANO; y++) arr.push({ value: y, label: String(y) });
        return arr;
    }

    function bind() {
        document.getElementById('cal-prev').addEventListener('click', () => mudarMes(-1));
        document.getElementById('cal-next').addEventListener('click', () => mudarMes(1));
        document.getElementById('cal-hoje').addEventListener('click', () => {
            const h = new Date();
            viewAno = h.getFullYear(); viewMes = h.getMonth();
            syncSeletores();
            render();
        });
        document.getElementById('cal-mes').addEventListener('change', (e) => { viewMes = Number(e.target.value); render(); });
        document.getElementById('cal-ano').addEventListener('change', (e) => { viewAno = Number(e.target.value); render(); });

        const el = document.getElementById('view-calendario');
        el.addEventListener('click', (e) => {
            const dia = e.target.closest('.cal-day');
            if (dia && dia.dataset.date) { abrirDia(dia.dataset.date); return; }
            const mover = e.target.closest('.js-pend-mover');
            if (mover) { moverPendencia(mover.dataset.id); return; }
            const del = e.target.closest('.js-pend-del');
            if (del) { excluirItem(del.dataset.id); return; }
        });
        el.addEventListener('change', (e) => {
            const check = e.target.closest('.cal-check-toggle');
            if (check) concluirItem(check.dataset.id, check.checked);
        });
    }

    function mudarMes(delta) {
        viewMes += delta;
        if (viewMes < 0) { viewMes = 11; viewAno--; }
        if (viewMes > 11) { viewMes = 0; viewAno++; }
        viewAno = Math.min(MAX_ANO, Math.max(MIN_ANO, viewAno));
        syncSeletores();
        render();
    }

    function syncSeletores() {
        Utils.setSelectValue('cal-mes', viewMes);
        Utils.setSelectValue('cal-ano', viewAno);
    }

    function dataKey(ano, mes, dia) {
        return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }

    // Formata "YYYY-MM-DD" sem passar por new Date(string) — evita o problema
    // clássico de fuso horário deslocando o dia numa data "pura" (sem hora).
    function formatDataBR(str) {
        if (!str) return '';
        const [y, m, d] = str.split('-');
        return `${d}/${m}/${y}`;
    }

    function itensPorData() {
        const map = {};
        Store.calendario.forEach(it => { (map[it.data] = map[it.data] || []).push(it); });
        Object.values(map).forEach(lista => lista.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')));
        return map;
    }

    function render() {
        if (!document.getElementById('cal-grid')) return;
        renderGrid();
        renderPlanner();
        renderChecklist();
        renderPendencias();
        const diaList = document.getElementById('dia-itens-list');
        if (diaList && diaList.dataset.date) atualizarItensDoDia(diaList.dataset.date);
    }

    function renderGrid() {
        const grid = document.getElementById('cal-grid');
        const map = itensPorData();
        const hojeKey = Utils.todayKey();
        const primeiroDiaSemana = new Date(viewAno, viewMes, 1).getDay();
        const diasNoMes = new Date(viewAno, viewMes + 1, 0).getDate();
        const diasMesAnterior = new Date(viewAno, viewMes, 0).getDate();

        let html = DIAS_SEMANA.map(d => `<div class="cal-weekday">${d}</div>`).join('');

        for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
            html += `<div class="cal-day outro-mes"><span class="cal-day-num">${diasMesAnterior - i}</span></div>`;
        }
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const key = dataKey(viewAno, viewMes, dia);
            const pendentes = (map[key] || []).filter(it => !it.concluido);
            const isHoje = key === hojeKey;
            html += `
                <div class="cal-day ${isHoje ? 'hoje' : ''}" data-date="${key}">
                    <span class="cal-day-num">${dia}</span>
                    ${pendentes.length ? `<span class="cal-day-dot">${pendentes.length}</span>` : ''}
                </div>`;
        }
        const totalCelulas = primeiroDiaSemana + diasNoMes;
        const restante = (7 - (totalCelulas % 7)) % 7;
        for (let dia = 1; dia <= restante; dia++) {
            html += `<div class="cal-day outro-mes"><span class="cal-day-num">${dia}</span></div>`;
        }
        grid.innerHTML = html;
    }

    function renderPlanner() {
        const wrap = document.getElementById('cal-planner');
        if (!wrap) return;
        const map = itensPorData();
        const hoje = new Date();
        let html = '';
        for (let i = 0; i < 7; i++) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
            const key = Utils.todayKey(d);
            const itens = (map[key] || []).filter(it => !it.concluido);
            const label = `${DIAS_SEMANA[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            html += `
                <div class="planner-day ${i === 0 ? 'hoje' : ''}">
                    <div class="planner-day-head">${label}</div>
                    <div class="planner-items">
                        ${itens.length
                            ? itens.map(it => `<div class="planner-item">${it.hora ? `<strong>${Utils.escapeHtml(it.hora)}</strong> ` : ''}${Utils.escapeHtml(it.texto)}</div>`).join('')
                            : '<span class="planner-empty">—</span>'}
                    </div>
                </div>`;
        }
        wrap.innerHTML = html;
    }

    function renderChecklist() {
        const box = document.getElementById('cal-checklist');
        if (!box) return;
        const hojeKey = Utils.todayKey();
        const itens = Store.calendario.filter(it => it.data === hojeKey && !it.concluido)
            .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
        if (!itens.length) {
            box.innerHTML = '<span style="font-size:0.85rem;color:var(--text-muted);">Nada marcado pra hoje.</span>';
            return;
        }
        box.innerHTML = itens.map(it => `
            <label class="cal-check-item">
                <input type="checkbox" class="cal-check-toggle" data-id="${it.id}">
                <span>${it.hora ? `<strong>${Utils.escapeHtml(it.hora)}</strong> — ` : ''}${Utils.escapeHtml(it.texto)}</span>
            </label>
        `).join('');
    }

    function renderPendencias() {
        const panel = document.getElementById('cal-pendencias-panel');
        const list = document.getElementById('cal-pendencias-list');
        if (!panel || !list) return;
        const hojeKey = Utils.todayKey();
        const itens = Store.calendario.filter(it => !it.concluido && it.data < hojeKey)
            .sort((a, b) => a.data.localeCompare(b.data) || (a.hora || '').localeCompare(b.hora || ''));
        panel.style.display = itens.length ? '' : 'none';
        if (!itens.length) return;
        list.innerHTML = itens.map(it => `
            <div class="pendencia-item">
                <span><strong>${formatDataBR(it.data)}</strong>${it.hora ? ' às ' + Utils.escapeHtml(it.hora) : ''} — ${Utils.escapeHtml(it.texto)}</span>
                <div class="pendencia-actions">
                    <button type="button" class="btn btn-outline btn-sm js-pend-mover" data-id="${it.id}"><i class="fa-solid fa-calendar-days"></i> Mover</button>
                    <button type="button" class="btn btn-outline btn-sm js-pend-del" data-id="${it.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    function abrirDia(key) {
        Utils.openModal(`
            <div class="modal-head"><h3>${formatDataBR(key)}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <div id="dia-itens-list" data-date="${key}" style="margin-bottom:16px;"></div>
            <form id="dia-form">
                <div class="form-row">
                    <div class="form-group" style="flex:2;"><label>Anotação</label><input type="text" id="f-dia-texto" required placeholder="Ex: Ligar pro fornecedor"></div>
                    <div class="form-group"><label>Horário</label><input type="time" id="f-dia-hora"></div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Adicionar</button></div>
            </form>
        `);
        atualizarItensDoDia(key);

        document.getElementById('dia-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const texto = document.getElementById('f-dia-texto').value.trim();
            if (!texto) return;
            const hora = document.getElementById('f-dia-hora').value;
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                await Loja.col('calendario').add({
                    data: key, hora: hora || '', texto, concluido: false,
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                });
                document.getElementById('f-dia-texto').value = '';
                document.getElementById('f-dia-hora').value = '';
                Utils.toast('Anotação adicionada.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
            finally { btn.disabled = false; }
        });

        const list = document.getElementById('dia-itens-list');
        list.addEventListener('click', (e) => {
            const del = e.target.closest('.js-dia-del');
            if (del) excluirItem(del.dataset.id);
        });
        list.addEventListener('change', (e) => {
            const chk = e.target.closest('.js-dia-check');
            if (chk) concluirItem(chk.dataset.id, chk.checked);
        });
    }

    function atualizarItensDoDia(key) {
        const list = document.getElementById('dia-itens-list');
        if (!list) return;
        const itens = Store.calendario.filter(it => it.data === key).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
        list.innerHTML = itens.length ? itens.map(it => `
            <div class="dia-item ${it.concluido ? 'concluido' : ''}">
                <label class="cal-check-item" style="flex:1;">
                    <input type="checkbox" class="js-dia-check" data-id="${it.id}" ${it.concluido ? 'checked' : ''}>
                    <span>${it.hora ? `<strong>${Utils.escapeHtml(it.hora)}</strong> — ` : ''}${Utils.escapeHtml(it.texto)}</span>
                </label>
                <button type="button" class="js-dia-del" data-id="${it.id}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('') : '<span style="font-size:0.85rem;color:var(--text-muted);">Nenhuma anotação ainda.</span>';
    }

    async function concluirItem(id, concluido) {
        try {
            await Loja.col('calendario').doc(id).update({
                concluido,
                concluidoEm: concluido ? firebase.firestore.FieldValue.serverTimestamp() : null
            });
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function excluirItem(id) {
        Utils.confirmDialog('Excluir esta anotação?', async () => {
            try {
                await Loja.col('calendario').doc(id).delete();
                Utils.toast('Anotação excluída.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
    }

    function moverPendencia(id) {
        const item = Store.calendario.find(it => it.id === id);
        if (!item) return;
        Utils.openModal(`
            <div class="modal-head"><h3>Mover anotação</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:-8px 0 16px;">${Utils.escapeHtml(item.texto)}</p>
            <form id="mover-form">
                <div class="form-row">
                    <div class="form-group"><label>Nova data</label><input type="date" id="f-mover-data" required value="${Utils.todayKey()}" min="${Utils.todayKey()}"></div>
                    <div class="form-group"><label>Novo horário</label><input type="time" id="f-mover-hora" value="${Utils.escapeHtml(item.hora || '')}"></div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Mover</button>
                </div>
            </form>
        `);
        document.getElementById('mover-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                await Loja.col('calendario').doc(id).update({
                    data: document.getElementById('f-mover-data').value,
                    hora: document.getElementById('f-mover-hora').value || ''
                });
                Utils.closeModal();
                Utils.toast('Anotação movida.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); btn.disabled = false; }
        });
    }

    return { mount, render };
})();
window.Calendario = Calendario;
