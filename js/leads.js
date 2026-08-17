/* ==========================================================================
   Leads — painel do super admin com quem demonstrou interesse num plano
   (preencheu os dados e avançou pro pagamento) mas pode nunca ter chegado
   a pagar. Serve pra fazer follow-up manual antes que a pessoa esfrie.

   Lista em tempo real (onSnapshot) — abrir a aba já basta, nunca precisa
   clicar em "Atualizar". Exclusão é permitida direto pelo cliente pro
   super admin (ver firestore.rules), só remove o registro de follow-up,
   não mexe em compras nem em nada relacionado a pagamento.
   ========================================================================== */

const Leads = (() => {
    let leadsCache = [];
    let busca = '';
    let unsub = null;

    function mount() {
        const el = document.getElementById('view-leads');
        if (!el) return;
        el.innerHTML = `
            <div class="section-head">
                <div class="toolbar">
                    <input type="text" id="leads-busca" placeholder="Buscar por nome, e-mail, WhatsApp ou plano..." style="min-width:280px;">
                </div>
            </div>
            <div id="leads-list" class="leads-list"><span style="font-size:0.82rem;color:var(--text-muted);">Carregando...</span></div>
        `;
        document.getElementById('leads-busca').addEventListener('input', (e) => { busca = e.target.value.trim().toLowerCase(); renderList(); });
        el.addEventListener('click', (e) => {
            const del = e.target.closest('.js-lead-remove');
            if (del) excluirLead(del.dataset.id, del.dataset.nome);
        });
    }

    function carregar() {
        const souSuperAdmin = Loja.isRoot && Loja.isSuperAdmin(Auth.currentUser()?.email);
        if (!souSuperAdmin) return;
        if (unsub) { unsub(); unsub = null; }
        const box = document.getElementById('leads-list');
        if (box && !leadsCache.length) box.innerHTML = `<span style="font-size:0.82rem;color:var(--text-muted);">Carregando...</span>`;
        unsub = window.db.collection('leads').orderBy('atualizadoEm', 'desc').onSnapshot(snap => {
            leadsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList();
        }, err => {
            const box = document.getElementById('leads-list');
            if (box) box.innerHTML = `<span style="font-size:0.82rem;color:var(--danger);">Erro ao carregar: ${Utils.escapeHtml(err.message)}</span>`;
        });
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
            const letra = (l.nome || l.email || '?').trim().charAt(0).toUpperCase();
            const nomeEscapado = Utils.escapeHtml(l.nome || 'esta pessoa');
            return `
                <div class="lead-card" data-id="${l.id}">
                    <button type="button" class="js-lead-remove" data-id="${l.id}" data-nome="${nomeEscapado}" title="Excluir lead"><i class="fa-solid fa-trash"></i></button>
                    <div class="lead-card-head">
                        <div class="avatar">${letra}</div>
                        <div class="lead-card-who">
                            <strong>${Utils.escapeHtml(l.nome || '-')}</strong>
                            <span class="compra-email">${Utils.escapeHtml(l.email || '-')}</span>
                        </div>
                    </div>
                    <div class="lead-card-tags">
                        <span class="compra-plano-tag" style="--plano-cor:${l.convertido ? 'var(--success)' : 'var(--orange-500)'};">${Utils.escapeHtml(l.planoNome || '-')}${l.planoTipo ? ' · ' + Utils.escapeHtml(l.planoTipo) : ''}</span>
                        <span class="pgto-status-chip ${l.convertido ? 'on' : ''}">${l.convertido ? 'Converteu' : 'Ainda não pagou'}</span>
                    </div>
                    <div class="lead-card-body">
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

    function excluirLead(id, nome) {
        Utils.confirmDialog(`Excluir o lead de "${nome}"? Isso só remove esse registro da sua lista de follow-up — não afeta nenhuma compra já feita.`, async () => {
            try {
                await window.db.collection('leads').doc(id).delete();
                Utils.toast('Lead excluído.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Excluir lead', 'Sim, excluir');
    }

    return { mount, render, carregar };
})();
window.Leads = Leads;
