/* ==========================================================================
   Compras — painel do super admin com as assinaturas de plano da
   plataforma (não confundir com "Pedidos", que são vendas de cada loja).
   Lista todas as compras/{id}, com etiqueta do plano, contagem até o
   próximo pagamento (+ 7 dias de tolerância) e valor. Clicar mostra o
   comprovante mais recente; de lá dá pra abrir o histórico completo de
   comprovantes daquela compra, com busca.
   ========================================================================== */

const Compras = (() => {
    let comprasCache = [];
    let lojasCache = {};
    let busca = '';
    let unsub = null;

    function mount() {
        const el = document.getElementById('view-compras');
        if (!el) return;
        el.innerHTML = `
            <div class="section-head">
                <div class="toolbar">
                    <input type="text" id="compras-busca" placeholder="Buscar por nome, e-mail ou plano..." style="min-width:260px;">
                </div>
            </div>
            <div id="compras-list" class="compras-list"><span style="font-size:0.82rem;color:var(--text-muted);">Carregando...</span></div>
        `;
        document.getElementById('compras-busca').addEventListener('input', (e) => { busca = e.target.value.trim().toLowerCase(); renderList(); });
        el.addEventListener('click', (e) => {
            const pausar = e.target.closest('.js-compra-pausar');
            const card = e.target.closest('.compra-card');
            if (pausar) { e.stopPropagation(); alternarPausaLoja(pausar.dataset.loja, pausar.dataset.pausada === 'true'); return; }
            if (card) abrirComprovante(card.dataset.id);
        });
    }

    function carregar() {
        const souSuperAdmin = Loja.isRoot && Loja.isSuperAdmin(Auth.currentUser()?.email);
        if (!souSuperAdmin) return;
        if (unsub) { unsub(); unsub = null; }
        const box = document.getElementById('compras-list');
        if (box && !comprasCache.length) box.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted);">Carregando...</span>`;
        unsub = window.db.collection('compras').orderBy('criadoEm', 'desc').onSnapshot(async snap => {
            comprasCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const lojaIds = [...new Set(comprasCache.map(c => c.lojaId).filter(Boolean))];
            const faltantes = lojaIds.filter(id => !lojasCache[id]);
            if (faltantes.length) {
                const lojaSnaps = await Promise.all(faltantes.map(id => window.db.collection('lojas').doc(id).get()));
                lojaSnaps.forEach(s => { if (s.exists) lojasCache[s.id] = { id: s.id, ...s.data() }; });
            }

            renderList();
        }, err => {
            const box = document.getElementById('compras-list');
            if (box) box.innerHTML = `<span style="font-size:0.82rem;color:var(--danger);">Erro ao carregar: ${Utils.escapeHtml(err.message)}</span>`;
        });
    }

    function render() {
        if (document.getElementById('view-compras') && document.getElementById('view-compras').innerHTML) carregar();
    }

    function statusInfo(compra) {
        const map = {
            pendente: { label: 'Aguardando 1º pagamento', cls: 'neutral' },
            ativa: { label: 'Ativa', cls: 'success' },
            atrasada: { label: 'Pagamento atrasado', cls: 'warning' },
            pausada: { label: 'Pausada', cls: 'danger' },
            cancelada: { label: 'Cancelada', cls: 'danger' }
        };
        return map[compra.status] || { label: compra.status || '-', cls: 'neutral' };
    }

    function contagemHtml(compra) {
        if (!compra.proximoPagamentoEm) return '<span class="compra-contagem neutral">Plano único — sem renovação</span>';
        const venc = compra.proximoPagamentoEm.toDate ? compra.proximoPagamentoEm.toDate() : new Date(compra.proximoPagamentoEm.seconds * 1000);
        const diffMs = venc.getTime() - Date.now();
        const dias = Math.ceil(diffMs / 86400000);
        if (dias >= 0) return `<span class="compra-contagem success"><i class="fa-regular fa-clock"></i> Próximo pagamento em ${dias} dia${dias === 1 ? '' : 's'} (${Utils.formatDateBR(venc)})</span>`;
        const diasAtraso = Math.abs(dias);
        const diasParaPausar = 7 - diasAtraso;
        if (diasParaPausar > 0) return `<span class="compra-contagem warning"><i class="fa-solid fa-triangle-exclamation"></i> Atrasado há ${diasAtraso} dia${diasAtraso === 1 ? '' : 's'} — pausa automática em ${diasParaPausar} dia${diasParaPausar === 1 ? '' : 's'}</span>`;
        return `<span class="compra-contagem danger"><i class="fa-solid fa-pause"></i> Atrasado há ${diasAtraso} dias</span>`;
    }

    function passaNaBusca(c) {
        if (!busca) return true;
        const alvo = `${c.nomeComprador || ''} ${c.emailComprador || ''} ${c.planoNome || ''}`.toLowerCase();
        return alvo.includes(busca);
    }

    function renderList() {
        const box = document.getElementById('compras-list');
        if (!box) return;
        const lista = comprasCache.filter(passaNaBusca);
        if (!lista.length) {
            box.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted);">${comprasCache.length ? 'Nenhuma compra encontrada.' : 'Nenhuma compra ainda.'}</span>`;
            return;
        }
        box.innerHTML = lista.map(c => {
            const status = statusInfo(c);
            const loja = c.lojaId ? lojasCache[c.lojaId] : null;
            const pausada = !!(loja && (loja.pausadaManual || loja.pausadaAutomatica));
            return `
                <div class="compra-card" data-id="${c.id}">
                    <div class="compra-card-head">
                        <span class="compra-plano-tag" style="--plano-cor:${c.status === 'pausada' ? 'var(--danger)' : 'var(--orange-500)'};">${Utils.escapeHtml(c.planoNome || '-')}${c.planoTipo ? ' · ' + Utils.escapeHtml(c.planoTipo) : ''}</span>
                        <span class="pgto-status-chip status-${status.cls}">${status.label}</span>
                    </div>
                    <div class="compra-card-body">
                        <strong>${Utils.escapeHtml(c.nomeComprador || '-')}</strong>
                        <span class="compra-email">${Utils.escapeHtml(c.emailComprador || '-')}</span>
                        <span class="compra-valor">${Utils.formatBRL(c.planoValor || 0)}</span>
                        ${contagemHtml(c)}
                        ${loja ? `<span class="compra-loja-link"><i class="fa-solid fa-shop"></i> ${Utils.escapeHtml(loja.nomeLoja || c.lojaId)}</span>` : '<span class="compra-loja-link" style="color:var(--text-muted);">Ainda sem loja (cadastro não concluído)</span>'}
                    </div>
                    ${loja ? `
                    <div class="compra-card-actions">
                        <button type="button" class="btn btn-outline btn-sm js-compra-pausar" data-loja="${loja.id}" data-pausada="${pausada}">
                            <i class="fa-solid ${pausada ? 'fa-play' : 'fa-pause'}"></i> ${pausada ? 'Despausar loja' : 'Pausar loja'}
                        </button>
                    </div>` : ''}
                </div>
            `;
        }).join('');
    }

    async function alternarPausaLoja(lojaId, pausadaAtual) {
        try {
            await window.db.collection('lojas').doc(lojaId).update({ pausadaManual: !pausadaAtual });
            if (lojasCache[lojaId]) lojasCache[lojaId].pausadaManual = !pausadaAtual;
            Utils.toast(!pausadaAtual ? 'Loja pausada.' : 'Loja despausada.', 'success');
            renderList();
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    async function abrirComprovante(compraId) {
        const compra = comprasCache.find(c => c.id === compraId);
        if (!compra) return;
        Utils.openModal(`<div class="modal-head"><h3>Comprovante</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div><div id="compra-comprovante-body"><div class="store-payment-loading"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div></div>`, { wide: true });
        try {
            const snap = await window.db.collection('compras').doc(compraId).collection('ciclos').orderBy('criadoEm', 'desc').limit(1).get();
            if (snap.empty) { document.getElementById('compra-comprovante-body').innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);">Nenhum ciclo de cobrança ainda.</p>'; return; }
            renderComprovante(compra, { id: snap.docs[0].id, ...snap.docs[0].data() });
        } catch (err) {
            document.getElementById('compra-comprovante-body').innerHTML = `<span style="color:var(--danger);font-size:0.85rem;">Erro: ${Utils.escapeHtml(err.message)}</span>`;
        }
    }

    function formatDataHora(ts) {
        if (!ts) return '-';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return `${Utils.formatDateBR(d)} às ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    function renderComprovante(compra, ciclo) {
        const body = document.getElementById('compra-comprovante-body');
        if (!body) return;
        const statusLabel = { aprovado: 'Aprovado', pendente: 'Pendente', rejeitado: 'Recusado', cancelado: 'Cancelado', iniciando: 'Iniciando' }[ciclo.status] || ciclo.status;
        body.innerHTML = `
            <div class="comprovante-box">
                <div class="comprovante-row"><span>Cliente</span><strong>${Utils.escapeHtml(compra.nomeComprador || '-')}</strong></div>
                <div class="comprovante-row"><span>E-mail</span><strong>${Utils.escapeHtml(compra.emailComprador || '-')}</strong></div>
                <div class="comprovante-row"><span>Plano</span><strong>${Utils.escapeHtml(ciclo.planoNome || '-')}${ciclo.planoTipo ? ' · ' + Utils.escapeHtml(ciclo.planoTipo) : ''}</strong></div>
                <div class="comprovante-row"><span>Valor</span><strong>${Utils.formatBRL(ciclo.valor || 0)}</strong></div>
                <div class="comprovante-row"><span>Método</span><strong>${ciclo.metodo === 'pix' ? 'Pix' : (ciclo.metodo === 'cartao' ? 'Cartão' : '-')}</strong></div>
                <div class="comprovante-row"><span>Status</span><strong>${statusLabel}</strong></div>
                <div class="comprovante-row"><span>Criado em</span><strong>${formatDataHora(ciclo.criadoEm)}</strong></div>
                ${ciclo.confirmadoEm ? `<div class="comprovante-row"><span>Confirmado em</span><strong>${formatDataHora(ciclo.confirmadoEm)}</strong></div>` : ''}
                ${ciclo.mpPaymentId ? `<div class="comprovante-row"><span>ID Mercado Pago</span><strong>${Utils.escapeHtml(ciclo.mpPaymentId)}</strong></div>` : ''}
            </div>
            <div class="form-actions" style="margin-top:16px;">
                <button type="button" class="btn btn-outline" id="btn-ver-historico-compra"><i class="fa-solid fa-clock-rotate-left"></i> Ver todos os comprovantes</button>
            </div>
        `;
        document.getElementById('btn-ver-historico-compra').addEventListener('click', () => abrirHistorico(compra.id));
    }

    async function abrirHistorico(compraId) {
        Utils.openModal(`
            <div class="modal-head"><h3>Histórico de comprovantes</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="form-group"><input type="text" id="historico-busca" placeholder="Buscar por status, método ou ID do pagamento..."></div>
            <div id="historico-lista"><div class="store-payment-loading"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div></div>
        `, { wide: true });

        let ciclos = [];
        try {
            const snap = await window.db.collection('compras').doc(compraId).collection('ciclos').orderBy('criadoEm', 'desc').get();
            ciclos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
            document.getElementById('historico-lista').innerHTML = `<span style="color:var(--danger);font-size:0.85rem;">Erro: ${Utils.escapeHtml(err.message)}</span>`;
            return;
        }

        function renderHistorico(filtro) {
            const f = (filtro || '').trim().toLowerCase();
            const filtrados = !f ? ciclos : ciclos.filter(c => `${c.status || ''} ${c.metodo || ''} ${c.mpPaymentId || ''} ${c.planoNome || ''}`.toLowerCase().includes(f));
            const lista = document.getElementById('historico-lista');
            if (!filtrados.length) { lista.innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);">Nenhum comprovante encontrado.</p>'; return; }
            const statusLabel = { aprovado: 'Aprovado', pendente: 'Pendente', rejeitado: 'Recusado', cancelado: 'Cancelado', iniciando: 'Iniciando' };
            lista.innerHTML = `<div class="table-scroll"><table>
                <thead><tr><th>Data</th><th>Método</th><th>Valor</th><th>Status</th></tr></thead>
                <tbody>${filtrados.map(c => `
                    <tr>
                        <td>${formatDataHora(c.criadoEm)}</td>
                        <td>${c.metodo === 'pix' ? 'Pix' : (c.metodo === 'cartao' ? 'Cartão' : '-')}</td>
                        <td>${Utils.formatBRL(c.valor || 0)}</td>
                        <td><span class="pgto-status-chip ${c.status === 'aprovado' ? 'on' : ''}">${statusLabel[c.status] || c.status}</span></td>
                    </tr>
                `).join('')}</tbody>
            </table></div>`;
        }

        renderHistorico('');
        document.getElementById('historico-busca').addEventListener('input', (e) => renderHistorico(e.target.value));
    }

    return { mount, render };
})();
window.Compras = Compras;
