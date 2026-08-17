/* ==========================================================================
   Leads — painel do super admin com quem demonstrou interesse num plano
   (preencheu os dados e avançou pro pagamento) mas pode nunca ter chegado
   a pagar. Serve pra fazer follow-up manual antes que a pessoa esfrie.
   ========================================================================== */

const Leads = (() => {
    let leadsCache = [];
    let busca = '';

    function mount() {
        const el = document.getElementById('view-leads');
        if (!el) return;
        el.innerHTML = `
            <div class="section-head">
                <div class="toolbar">
                    <input type="text" id="leads-busca" placeholder="Buscar por nome, e-mail, WhatsApp ou plano..." style="min-width:280px;">
                </div>
                <button class="btn btn-outline btn-sm" id="btn-atualizar-leads"><i class="fa-solid fa-rotate"></i> Atualizar</button>
            </div>
            <div id="leads-list" class="compras-list"><span style="font-size:0.82rem;color:var(--text-muted);">Carregando...</span></div>
        `;
        document.getElementById('btn-atualizar-leads').addEventListener('click', carregar);
        document.getElementById('leads-busca').addEventListener('input', (e) => { busca = e.target.value.trim().toLowerCase(); renderList(); });
    }

    async function carregar() {
        const souSuperAdmin = Loja.isRoot && Loja.isSuperAdmin(Auth.currentUser()?.email);
        if (!souSuperAdmin) return;
        const box = document.getElementById('leads-list');
        if (box) box.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted);">Carregando...</span>`;
        try {
            const snap = await window.db.collection('leads').orderBy('atualizadoEm', 'desc').get();
            leadsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList();
        } catch (err) {
            if (box) box.innerHTML = `<span style="font-size:0.82rem;color:var(--danger);">Erro ao carregar: ${Utils.escapeHtml(err.message)}</span>`;
        }
    }

    function render() {
        if (document.getElementById('view-leads') && document.getElementById('view-leads').innerHTML) carregar();
    }

    function passaNaBusca(l) {
        if (!busca) return true;
        const alvo = `${l.nome || ''} ${l.email || ''} ${l.whatsapp || ''} ${l.planoNome || ''}`.toLowerCase();
        return alvo.includes(busca);
    }

    function formatDataHora(ts) {
        if (!ts) return '-';
        const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
        return `${Utils.formatDateBR(d)} às ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }

    function renderList() {
        const box = document.getElementById('leads-list');
        if (!box) return;
        const lista = leadsCache.filter(passaNaBusca);
        if (!lista.length) {
            box.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted);">${leadsCache.length ? 'Nenhum lead encontrado.' : 'Nenhum lead ainda — aparece aqui assim que alguém preencher os dados pra comprar um plano.'}</span>`;
            return;
        }
        box.innerHTML = lista.map(l => {
            const tel = (l.whatsapp || '').replace(/\D/g, '');
            return `
                <div class="compra-card">
                    <div class="compra-card-head">
                        <span class="compra-plano-tag" style="--plano-cor:${l.convertido ? 'var(--success)' : 'var(--orange-500)'};">${Utils.escapeHtml(l.planoNome || '-')}${l.planoTipo ? ' · ' + Utils.escapeHtml(l.planoTipo) : ''}</span>
                        <span class="pgto-status-chip ${l.convertido ? 'on' : ''}">${l.convertido ? 'Converteu' : 'Ainda não pagou'}</span>
                    </div>
                    <div class="compra-card-body">
                        <strong>${Utils.escapeHtml(l.nome || '-')}</strong>
                        <span class="compra-email">${Utils.escapeHtml(l.email || '-')}</span>
                        <span class="compra-valor">${Utils.formatBRL(l.planoValor || 0)}</span>
                        <span class="compra-loja-link"><i class="fa-regular fa-clock"></i> Última atividade: ${formatDataHora(l.atualizadoEm)}</span>
                    </div>
                    <div class="compra-card-actions">
                        <a class="btn btn-primary btn-sm" href="https://wa.me/55${tel}?text=${encodeURIComponent(`Olá, ${l.nome || ''}! Vi que você demonstrou interesse no plano ${l.planoNome || ''} da Excellent Loja — posso te ajudar com alguma dúvida?`)}" target="_blank" rel="noopener" ${tel ? '' : 'style="pointer-events:none;opacity:0.5;"'}>
                            <i class="fa-brands fa-whatsapp"></i> Chamar no WhatsApp
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    return { mount, render, carregar };
})();
window.Leads = Leads;
