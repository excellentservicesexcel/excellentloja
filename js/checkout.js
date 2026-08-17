/* ==========================================================================
   Checkout de plano — comprar um plano na página inicial, dentro do
   próprio site (sem WhatsApp). Usa o modal global (Utils.openModal) com
   várias etapas: dados do comprador → pagamento (Pix/Cartão) → configurar
   a loja → criar conta → pronto.

   O progresso fica salvo no localStorage (chave STORAGE_KEY), então se a
   pessoa fechar a aba no meio da compra, ao voltar o Checkout.init() (que
   roda no boot da página) reabre exatamente na etapa em que ela parou.
   ========================================================================== */

const Checkout = (() => {
    const STORAGE_KEY = 'excellentlojaCheckout';
    let mpSdkPromise = null;
    let estado = null; // ver salvarEstado() para o formato
    let unsubCiclo = null;
    let pollTimer = null;
    let brickController = null;

    function limparRecursos() {
        if (unsubCiclo) { unsubCiclo(); unsubCiclo = null; }
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        if (brickController) { try { brickController.unmount(); } catch (e) {} brickController = null; }
    }

    function salvarEstado() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(estado)); } catch (e) {}
    }

    function carregarEstado() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function limparEstado() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        estado = null;
    }

    function init() {
        if (!Loja.isRoot) return;
        const salvo = carregarEstado();
        if (!salvo || salvo.etapa === 'concluido') return;
        estado = salvo;
        abrirEtapaAtual();
    }

    async function abrir(plano) {
        limparRecursos();
        let user = Auth.currentUser();
        if (!user) {
            const cred = await window.auth.signInAnonymously();
            user = cred.user;
        }
        estado = {
            plano: { nome: plano.nome, valorCobranca: Number(plano.valorCobranca), tipo: plano.tipo || '' },
            compraId: null, cicloId: null, publicKey: null, lojaId: null,
            etapa: 'dados',
            uidComprador: user.uid,
            dadosComprador: { nome: '', email: '', whatsapp: '' },
            dadosLoja: { nome: '', slug: '', telefone: '', instagram: '' }
        };
        salvarEstado();
        abrirEtapaAtual();
    }

    function abrirEtapaAtual() {
        if (estado.etapa === 'dados') renderEtapaDados();
        else if (estado.etapa === 'pagamento') renderEtapaPagamento();
        else if (estado.etapa === 'loja') renderEtapaLoja();
        else if (estado.etapa === 'conta') renderEtapaConta();
    }

    function progressoHtml(passo) {
        const nomes = ['Seus dados', 'Pagamento', 'Sua loja', 'Sua conta'];
        return `
            <div class="checkout-progress">
                ${nomes.map((n, i) => `<span class="checkout-progress-step ${i + 1 === passo ? 'active' : ''} ${i + 1 < passo ? 'done' : ''}">${i + 1}. ${n}</span>`).join('')}
            </div>`;
    }

    /* ---------------------------------------------------------------- */
    /* Etapa 1 — dados do comprador                                       */
    /* ---------------------------------------------------------------- */
    function renderEtapaDados() {
        limparRecursos();
        const d = estado.dadosComprador;
        Utils.openModal(`
            <div class="modal-head"><h3>Plano ${Utils.escapeHtml(estado.plano.nome)}</h3><button class="modal-close" onclick="Checkout.fechar()"><i class="fa-solid fa-xmark"></i></button></div>
            ${progressoHtml(1)}
            <p style="font-size:0.85rem;color:var(--text-muted);margin:10px 0 16px;">Preencha seus dados para continuar para o pagamento de ${Utils.escapeHtml(Utils.formatBRL(estado.plano.valorCobranca))}${estado.plano.tipo ? ' (' + Utils.escapeHtml(estado.plano.tipo) + ')' : ''}.</p>
            <form id="checkout-dados-form">
                <div class="form-group"><label>Nome completo *</label><input type="text" id="ck-nome" required value="${Utils.escapeHtml(d.nome)}"></div>
                <div class="form-group"><label>E-mail *</label><input type="email" id="ck-email" required value="${Utils.escapeHtml(d.email)}"></div>
                <div class="form-group"><label>WhatsApp *</label><input type="text" id="ck-whatsapp" required placeholder="(00) 00000-0000" value="${Utils.escapeHtml(d.whatsapp)}"></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Checkout.fechar()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="checkout-dados-submit"><i class="fa-solid fa-arrow-right"></i> Ir para o pagamento</button>
                </div>
            </form>
        `, { wide: true });

        document.getElementById('checkout-dados-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            estado.dadosComprador = {
                nome: document.getElementById('ck-nome').value.trim(),
                email: document.getElementById('ck-email').value.trim().toLowerCase(),
                whatsapp: document.getElementById('ck-whatsapp').value.trim()
            };
            salvarEstado();
            const btn = document.getElementById('checkout-dados-submit');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparando pagamento...';
            try {
                const resp = await fetch('/api/iniciar-compra-plano', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planoNome: estado.plano.nome, planoValor: estado.plano.valorCobranca, planoTipo: estado.plano.tipo,
                        dadosComprador: estado.dadosComprador, uidComprador: estado.uidComprador
                    })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.erro || 'Não foi possível iniciar a compra.');

                estado.compraId = data.compraId;
                estado.cicloId = data.cicloId;
                estado.publicKey = data.publicKey;

                if (data.reaproveitada && data.lojaId) {
                    // já é cliente com loja ativa: só renova/atualiza o plano, sem repetir onboarding
                    estado.lojaId = data.lojaId;
                    estado.etapa = 'pagamento';
                    estado.pularOnboarding = true;
                } else {
                    estado.etapa = 'pagamento';
                    estado.pularOnboarding = false;
                }
                salvarEstado();
                renderEtapaPagamento();
            } catch (err) {
                Utils.toast('Erro: ' + err.message, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Ir para o pagamento';
            }
        });
    }

    /* ---------------------------------------------------------------- */
    /* Etapa 2 — pagamento (Pix / Cartão)                                  */
    /* ---------------------------------------------------------------- */
    function renderEtapaPagamento() {
        limparRecursos();
        Utils.openModal(`
            <div class="modal-head"><h3>Pagamento</h3><button class="modal-close" onclick="Checkout.fechar()"><i class="fa-solid fa-xmark"></i></button></div>
            ${progressoHtml(2)}
            <div class="store-payment-head" style="margin-top:10px;">
                <span class="store-payment-total">${Utils.formatBRL(estado.plano.valorCobranca)}</span>
            </div>
            <div class="store-payment-tabs" id="checkout-payment-tabs">
                <button type="button" class="store-payment-tab active" data-tab="pix"><i class="fa-solid fa-qrcode"></i> Pix</button>
                <button type="button" class="store-payment-tab" data-tab="cartao"><i class="fa-solid fa-credit-card"></i> Cartão</button>
            </div>
            <div class="store-payment-body" id="checkout-payment-body"></div>
        `, { wide: true });

        document.getElementById('checkout-payment-tabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.store-payment-tab');
            if (!tab) return;
            document.querySelectorAll('#checkout-payment-tabs .store-payment-tab').forEach(t => t.classList.toggle('active', t === tab));
            limparRecursos();
            if (tab.dataset.tab === 'pix') renderAbaPix(); else renderAbaCartao();
        });

        renderAbaPix();
        monitorarCiclo();
    }

    function monitorarCiclo() {
        unsubCiclo = window.db.collection('compras').doc(estado.compraId).collection('ciclos').doc(estado.cicloId)
            .onSnapshot(snap => { if (snap.exists) tratarStatusCiclo(snap.data()); });
        pollTimer = setInterval(() => {
            fetch(`/api/consultar-compra-plano?compra=${encodeURIComponent(estado.compraId)}&ciclo=${encodeURIComponent(estado.cicloId)}`).catch(() => {});
        }, 4000);
    }

    function tratarStatusCiclo(ciclo) {
        if (ciclo.status === 'aprovado') mostrarSucessoPagamento();
        else if (['rejeitado', 'cancelado', 'expirado'].includes(ciclo.status)) mostrarFalhaPagamento(ciclo.status);
    }

    function mostrarSucessoPagamento() {
        limparRecursos();
        const box = document.getElementById('checkout-payment-tabs');
        if (box) box.style.display = 'none';
        const body = document.getElementById('checkout-payment-body');
        if (body) body.innerHTML = `
            <div class="store-payment-result success">
                <i class="fa-solid fa-circle-check"></i>
                <strong>Pagamento aprovado!</strong>
                <span>${estado.pularOnboarding ? 'Sua assinatura foi renovada.' : 'Só faltam alguns passos para sua loja ficar pronta.'}</span>
            </div>`;

        setTimeout(async () => {
            if (estado.pularOnboarding) {
                limparEstado();
                Utils.closeModal();
                // a sessão até aqui é anônima (só do checkout) — sai dela e manda pro
                // login: o próprio boot já reconhece o e-mail e redireciona pra loja dela
                try { await window.auth.signOut(); } catch (e) {}
                Utils.toast('Assinatura renovada! Entre com seu e-mail para acessar sua loja.', 'success');
                showLogin();
            } else {
                estado.etapa = 'loja';
                salvarEstado();
                renderEtapaLoja();
            }
        }, 1800);
    }

    function mostrarFalhaPagamento(status) {
        limparRecursos();
        const label = status === 'rejeitado' ? 'Pagamento recusado.' : (status === 'expirado' ? 'Código Pix expirado.' : 'Pagamento cancelado.');
        const body = document.getElementById('checkout-payment-body');
        if (!body) return;
        body.innerHTML = `
            <div class="store-payment-result error">
                <i class="fa-solid fa-circle-xmark"></i>
                <strong>${label}</strong>
                <button type="button" class="btn btn-outline btn-sm" id="checkout-payment-retry">Tentar novamente</button>
            </div>`;
        document.getElementById('checkout-payment-retry').addEventListener('click', () => {
            const ativa = document.querySelector('#checkout-payment-tabs .store-payment-tab.active');
            if (ativa && ativa.dataset.tab === 'cartao') renderAbaCartao(); else renderAbaPix();
            monitorarCiclo();
        });
    }

    async function renderAbaPix() {
        const body = document.getElementById('checkout-payment-body');
        body.innerHTML = `<div class="store-payment-loading"><i class="fa-solid fa-spinner fa-spin"></i> Gerando código Pix...</div>`;
        try {
            const resp = await fetch('/api/pagar-plano-pix', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ compraId: estado.compraId, cicloId: estado.cicloId })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.erro || 'Não foi possível gerar o Pix.');
            body.innerHTML = `
                <div class="store-pix-box">
                    <img src="data:image/png;base64,${data.qrCodeBase64}" class="store-pix-qr" alt="QR Code Pix">
                    <p class="store-pix-hint">Abra o app do seu banco, escolha pagar com Pix e escaneie o código — ou copie o código abaixo.</p>
                    <div class="store-pix-code-row">
                        <input type="text" readonly id="checkout-pix-code" value="${Utils.escapeHtml(data.qrCode)}">
                        <button type="button" class="btn btn-outline btn-sm" id="checkout-pix-copy"><i class="fa-solid fa-copy"></i> Copiar</button>
                    </div>
                    <div class="store-payment-waiting"><i class="fa-solid fa-spinner fa-spin"></i> Aguardando confirmação do pagamento...</div>
                </div>`;
            document.getElementById('checkout-pix-copy').addEventListener('click', () => {
                document.getElementById('checkout-pix-code').select();
                (navigator.clipboard ? navigator.clipboard.writeText(data.qrCode) : Promise.reject())
                    .then(() => Utils.toast('Código copiado!', 'success'))
                    .catch(() => { try { document.execCommand('copy'); Utils.toast('Código copiado!', 'success'); } catch (e) {} });
            });
        } catch (err) {
            body.innerHTML = `<div class="store-payment-result error"><i class="fa-solid fa-triangle-exclamation"></i><span>${Utils.escapeHtml(err.message)}</span></div>`;
        }
    }

    function carregarSdkMercadoPago() {
        if (window.MercadoPago) return Promise.resolve();
        if (mpSdkPromise) return mpSdkPromise;
        mpSdkPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Não foi possível carregar o Mercado Pago.'));
            document.head.appendChild(script);
        });
        return mpSdkPromise;
    }

    async function renderAbaCartao() {
        const body = document.getElementById('checkout-payment-body');
        body.innerHTML = `<div class="store-payment-loading"><i class="fa-solid fa-spinner fa-spin"></i> Carregando formulário de cartão...</div>`;
        try {
            await carregarSdkMercadoPago();
            body.innerHTML = `<div id="checkout-payment-brick-container"></div>`;
            const mp = new MercadoPago(estado.publicKey, { locale: 'pt-BR' });
            const controller = await mp.bricks().create('payment', 'checkout-payment-brick-container', {
                initialization: { amount: estado.plano.valorCobranca },
                customization: {
                    paymentMethods: { creditCard: 'all', debitCard: [], bankTransfer: [], ticket: [], mercadoPago: [] }
                },
                callbacks: {
                    onReady: () => {},
                    onError: (err) => { console.error('brick', err); },
                    onSubmit: ({ formData }) => new Promise((resolve, reject) => {
                        fetch('/api/pagar-plano-cartao', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ compraId: estado.compraId, cicloId: estado.cicloId, formData })
                        })
                            .then(r => r.json().then(data => ({ ok: r.ok, data })))
                            .then(({ ok, data }) => {
                                if (!ok) { Utils.toast(data.erro || 'Não foi possível processar o cartão.', 'error'); reject(); return; }
                                if (data.status === 'aprovado') mostrarSucessoPagamento();
                                else if (data.status === 'rejeitado') mostrarFalhaPagamento('rejeitado');
                                resolve();
                            })
                            .catch(() => { Utils.toast('Erro ao processar pagamento.', 'error'); reject(); });
                    })
                }
            });
            brickController = controller;
        } catch (err) {
            body.innerHTML = `<div class="store-payment-result error"><i class="fa-solid fa-triangle-exclamation"></i><span>${Utils.escapeHtml(err.message)}</span></div>`;
        }
    }

    /* ---------------------------------------------------------------- */
    /* Etapa 3 — configurar a loja                                        */
    /* ---------------------------------------------------------------- */
    function renderEtapaLoja() {
        limparRecursos();
        const d = estado.dadosLoja;
        Utils.openModal(`
            <div class="modal-head"><h3>Configure sua loja</h3></div>
            ${progressoHtml(3)}
            <p style="font-size:0.85rem;color:var(--text-muted);margin:10px 0 16px;">Pagamento confirmado! Agora conte um pouco sobre sua loja — dá para ajustar tudo depois.</p>
            <form id="checkout-loja-form">
                <div class="form-group"><label>Nome da loja *</label><input type="text" id="ck-loja-nome" required value="${Utils.escapeHtml(d.nome)}" placeholder="Ex: Bar do João"></div>
                <div class="form-group">
                    <label>Endereço da loja</label>
                    <div class="slug-input-wrap"><span>excellentloja.vercel.app/</span><input type="text" id="ck-loja-slug" value="${Utils.escapeHtml(d.slug)}" placeholder="bardojoao"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>WhatsApp da loja *</label><input type="text" id="ck-loja-telefone" required value="${Utils.escapeHtml(d.telefone || estado.dadosComprador.whatsapp)}"></div>
                    <div class="form-group"><label>Instagram (opcional)</label><input type="text" id="ck-loja-instagram" value="${Utils.escapeHtml(d.instagram)}" placeholder="@sualoja"></div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary" id="checkout-loja-submit"><i class="fa-solid fa-arrow-right"></i> Continuar</button>
                </div>
            </form>
        `, { wide: true });

        document.getElementById('checkout-loja-form').addEventListener('submit', (e) => {
            e.preventDefault();
            estado.dadosLoja = {
                nome: document.getElementById('ck-loja-nome').value.trim(),
                slug: document.getElementById('ck-loja-slug').value.trim(),
                telefone: document.getElementById('ck-loja-telefone').value.trim(),
                instagram: document.getElementById('ck-loja-instagram').value.trim()
            };
            estado.etapa = 'conta';
            salvarEstado();
            renderEtapaConta();
        });
    }

    /* ---------------------------------------------------------------- */
    /* Etapa 4 — criar conta (Google ou e-mail/senha) e criar a loja       */
    /* ---------------------------------------------------------------- */
    function renderEtapaConta() {
        limparRecursos();
        Utils.openModal(`
            <div class="modal-head"><h3>Crie sua conta</h3></div>
            ${progressoHtml(4)}
            <p style="font-size:0.85rem;color:var(--text-muted);margin:10px 0 16px;">Último passo — crie sua conta para acessar o painel da sua loja.</p>
            <div class="checkout-conta-error" id="checkout-conta-error" style="display:none;"></div>
            <form id="checkout-conta-form">
                <div class="form-group"><label>E-mail</label><input type="email" id="ck-conta-email" value="${Utils.escapeHtml(estado.dadosComprador.email)}" readonly></div>
                <div class="form-group"><label>Senha *</label><input type="password" id="ck-conta-senha" required minlength="6" placeholder="••••••••"></div>
                <button type="submit" class="btn btn-primary btn-block" id="checkout-conta-submit"><i class="fa-solid fa-check"></i> Criar minha loja</button>
            </form>
            <div class="auth-divider">ou continue com</div>
            <button type="button" class="btn-google" id="checkout-btn-google">
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.4 10.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.4C29.6 35.4 27 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.8 39.6 16.4 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.4C39.8 37 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                </svg>
                Continuar com Google
            </button>
        `, { wide: true });

        document.getElementById('checkout-conta-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const senha = document.getElementById('ck-conta-senha').value;
            await finalizarConta(async () => {
                await Auth.register(estado.dadosComprador.email, senha);
            }, document.getElementById('checkout-conta-submit'));
        });

        document.getElementById('checkout-btn-google').addEventListener('click', async function () {
            await finalizarConta(async () => { await Auth.loginWithGoogle(); }, this);
        });
    }

    async function finalizarConta(criarConta, btn) {
        const erroBox = document.getElementById('checkout-conta-error');
        erroBox.style.display = 'none';
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando sua loja...';
        try {
            await criarConta();
            const user = Auth.currentUser();
            const idToken = await user.getIdToken();
            const resp = await fetch('/api/criar-loja-pos-compra', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ compraId: estado.compraId, dadosLoja: estado.dadosLoja })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.erro || 'Não foi possível criar sua loja.');

            limparEstado();
            Utils.closeModal();
            Utils.toast('Loja criada com sucesso! Bem-vindo(a) à Excellent Loja.', 'success');
            location.href = `/${data.lojaId}`;
        } catch (err) {
            erroBox.textContent = err.message || 'Não foi possível concluir. Tente novamente.';
            erroBox.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    function fechar() {
        limparRecursos();
        Utils.closeModal();
    }

    return { init, abrir, fechar };
})();
window.Checkout = Checkout;
