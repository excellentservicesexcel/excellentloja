/* ==========================================================================
   Onboarding — assistente de boas-vindas no primeiro login (Excellent Loja)
   ========================================================================== */

const Onboarding = (() => {

    let step = 1;
    let currentUser = null;
    let onDone = null;
    let chosenPhotoUrl = null;
    let data = { nome: '', telefone: '' };
    let mode = 'admin'; // 'admin' -> usuarios/{uid} | 'cliente' -> clientes/{uid}

    function targetCollection() {
        return mode === 'admin' ? window.db.collection('usuarios') : Loja.col('clientes');
    }

    function cacheKey(uid) {
        return `onboard_ok_${mode}_${uid}`;
    }

    async function start(user, targetMode, cb) {
        currentUser = user;
        onDone = cb;
        mode = targetMode;
        if (localStorage.getItem(cacheKey(user.uid)) === '1') { cb(); return; }
        try {
            const snap = await targetCollection().doc(user.uid).get();
            if (snap.exists) { localStorage.setItem(cacheKey(user.uid), '1'); cb(); return; }
        } catch (err) {
            // Uma falha na checagem (rede instável, corrida do token logo após o
            // reload) nunca deve reexibir o onboarding pra quem já concluiu —
            // melhor pular do que incomodar de novo quem já configurou.
            console.error('onboarding check', err);
            cb();
            return;
        }
        step = 1;
        chosenPhotoUrl = user.photoURL || null;
        data = { nome: user.displayName || '', telefone: '' };
        document.getElementById('onboarding-screen').style.display = 'flex';
        render();
    }

    function avatarPreviewHtml() {
        if (chosenPhotoUrl) return `<img src="${chosenPhotoUrl}" alt="">`;
        const letter = (data.nome || currentUser?.email || 'A').trim().charAt(0).toUpperCase();
        return `<span>${letter}</span>`;
    }

    function stepFoto() {
        return `
        <div class="onboard-icon"><i class="fa-solid fa-camera"></i></div>
        <h2>Adicione uma foto de perfil</h2>
        <p class="onboard-sub">Deixa seu painel mais pessoal. Se preferir, pule esta etapa.</p>
        <div class="onboard-avatar-preview" id="onboard-avatar-preview">${avatarPreviewHtml()}</div>
        <label class="btn btn-outline btn-block onboard-upload-btn">
            <i class="fa-solid fa-upload"></i> Escolher foto
            <input type="file" id="onboard-photo-input" accept="image/*" style="display:none;">
        </label>
        <div class="onboard-actions">
            <button type="button" class="btn btn-outline" id="onboard-skip">Pular</button>
            <button type="button" class="btn btn-primary" id="onboard-next">Próximo <i class="fa-solid fa-arrow-right"></i></button>
        </div>`;
    }

    function stepNome() {
        return `
        <div class="onboard-icon"><i class="fa-solid fa-user"></i></div>
        <h2>Como você se chama?</h2>
        <p class="onboard-sub">${mode === 'admin' ? 'Vamos usar seu nome para personalizar o painel.' : 'Vamos usar seu nome para identificar seus pedidos.'}</p>
        <div class="form-group"><input type="text" id="onboard-nome" placeholder="Seu nome" value="${Utils.escapeHtml(data.nome)}" autofocus></div>
        <div class="login-error" id="onboard-error"></div>
        <div class="onboard-actions">
            <button type="button" class="btn btn-outline" id="onboard-back">Voltar</button>
            <button type="button" class="btn btn-primary" id="onboard-next">Próximo <i class="fa-solid fa-arrow-right"></i></button>
        </div>`;
    }

    function stepTelefone() {
        return `
        <div class="onboard-icon"><i class="fa-solid fa-phone"></i></div>
        <h2>Qual o seu telefone?</h2>
        <p class="onboard-sub">${mode === 'admin' ? 'Usado para contato e para o WhatsApp da loja.' : 'Usado para a loja combinar entrega e pagamento do seu pedido.'}</p>
        <div class="form-group"><input type="text" id="onboard-telefone" placeholder="(00) 00000-0000" value="${Utils.escapeHtml(data.telefone)}" autofocus></div>
        <div class="login-error" id="onboard-error"></div>
        <div class="onboard-actions">
            <button type="button" class="btn btn-outline" id="onboard-back">Voltar</button>
            <button type="button" class="btn btn-primary" id="onboard-finish"><i class="fa-solid fa-check"></i> Concluir</button>
        </div>`;
    }

    function render() {
        const el = document.getElementById('onboarding-screen');
        const stepHtml = step === 1 ? stepFoto() : step === 2 ? stepNome() : stepTelefone();
        el.innerHTML = `
            <div class="onboard-card">
                <div class="onboard-progress">
                    ${[1, 2, 3].map(n => `<span class="onboard-dot ${n === step ? 'active' : ''} ${n < step ? 'done' : ''}"></span>`).join('')}
                </div>
                ${stepHtml}
            </div>
        `;
        bind();
    }

    function bind() {
        const nextBtn = document.getElementById('onboard-next');
        const backBtn = document.getElementById('onboard-back');
        const skipBtn = document.getElementById('onboard-skip');
        const finishBtn = document.getElementById('onboard-finish');
        const photoInput = document.getElementById('onboard-photo-input');

        if (photoInput) {
            photoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const preview = document.getElementById('onboard-avatar-preview');
                preview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                try {
                    chosenPhotoUrl = await Utils.compressImageToBase64(file, { maxDim: 500, maxBytes: 350000 });
                    preview.innerHTML = `<img src="${chosenPhotoUrl}" alt="">`;
                } catch (err) {
                    Utils.toast('Não foi possível usar essa foto: ' + err.message, 'error');
                    preview.innerHTML = avatarPreviewHtml();
                }
            });
        }
        if (skipBtn) skipBtn.addEventListener('click', () => { step = 2; render(); });
        if (backBtn) backBtn.addEventListener('click', () => { step -= 1; render(); });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            if (step === 1) { step = 2; render(); return; }
            if (step === 2) {
                const val = document.getElementById('onboard-nome').value.trim();
                if (!val) { showError('Digite seu nome para continuar.'); return; }
                data.nome = val;
                step = 3;
                render();
            }
        });
        if (finishBtn) finishBtn.addEventListener('click', async () => {
            const val = document.getElementById('onboard-telefone').value.trim();
            if (!val) { showError('Digite seu telefone para continuar.'); return; }
            data.telefone = val;
            await finish(finishBtn);
        });
    }

    function showError(msg) {
        const box = document.getElementById('onboard-error');
        if (!box) return;
        box.textContent = msg;
        box.style.display = 'block';
    }

    async function finish(btn) {
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        try {
            const fotoUrl = chosenPhotoUrl || currentUser.photoURL || '';
            const payload = {
                nome: data.nome,
                telefone: data.telefone,
                fotoUrl: fotoUrl || '',
                email: currentUser.email || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (mode === 'cliente') { payload.endereco = ''; payload.observacoes = ''; }
            await targetCollection().doc(currentUser.uid).set(payload, { merge: true });
            localStorage.setItem(cacheKey(currentUser.uid), '1');
            document.getElementById('onboarding-screen').style.display = 'none';
            document.getElementById('onboarding-screen').innerHTML = '';
            if (onDone) onDone();
        } catch (err) {
            showError('Erro ao salvar: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    return { start };
})();
