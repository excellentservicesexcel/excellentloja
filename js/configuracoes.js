/* ==========================================================================
   Configurações — Excellent Loja
   ========================================================================== */

const Configuracoes = (() => {

    let activeTab = 'loja';
    let profilePhotoDataUrl = null;

    function mount() {
        const el = document.getElementById('view-configuracoes');
        el.innerHTML = `
            <div class="settings-tabs">
                <div class="settings-tab active" data-tab="loja">Dados da loja</div>
                <div class="settings-tab" data-tab="categorias">Categorias de produtos</div>
                <div class="settings-tab" data-tab="pagamento">Formas de pagamento</div>
                <div class="settings-tab" data-tab="imagens">Imagens da loja</div>
                <div class="settings-tab" data-tab="usuarios">Usuários autorizados</div>
                <div class="settings-tab" data-tab="conta">Minha conta</div>
            </div>

            <div class="settings-panel active" id="panel-loja">
                <div class="panel" style="max-width:560px;">
                    <form id="loja-form">
                        <div class="form-group"><label>Nome da loja</label><input type="text" id="f-nome-loja"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Telefone / WhatsApp</label><input type="text" id="f-telefone-loja"></div>
                            <div class="form-group"><label>Instagram</label><input type="text" id="f-instagram" placeholder="@excellentloja"></div>
                        </div>
                        <div class="form-group"><label>Endereço</label><input type="text" id="f-endereco-loja"></div>
                        <div class="form-group"><label>Taxa de entrega padrão (R$)</label><input type="number" step="0.01" min="0" id="f-taxa-padrao"></div>
                        <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Salvar dados da loja</button></div>
                    </form>
                </div>
            </div>

            <div class="settings-panel" id="panel-categorias">
                <div class="panel" style="max-width:560px;">
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">Categorias usadas em Produtos e Cardápio.</p>
                    <div class="chip-list" id="chips-categorias"></div>
                    <div class="add-chip-row">
                        <input type="text" id="new-categoria" placeholder="Nova categoria (ex: Trufas)">
                        <button class="btn btn-primary btn-sm" id="btn-add-categoria"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>

            <div class="settings-panel" id="panel-pagamento">
                <div class="panel" style="max-width:560px;">
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">Formas de pagamento aceitas nos pedidos.</p>
                    <div class="chip-list" id="chips-pagamento"></div>
                    <div class="add-chip-row">
                        <input type="text" id="new-pagamento" placeholder="Nova forma (ex: Boleto)">
                        <button class="btn btn-primary btn-sm" id="btn-add-pagamento"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>

            <div class="settings-panel" id="panel-imagens">
                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Capa da loja (início)</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Fotos exibidas no topo da loja virtual. Com mais de uma, elas alternam
                        automaticamente a cada 3 segundos, deslizando para a esquerda. Use fotos
                        na horizontal (proporção 3:1) — a mensagem promocional deve estar na
                        própria imagem, já que não há mais texto sobreposto.
                    </p>
                    <div class="capa-grid" id="capa-grid"></div>
                    <label class="btn btn-outline btn-sm" style="margin-top:14px;cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> Adicionar foto
                        <input type="file" id="capa-input" accept="image/*" style="display:none;">
                    </label>
                    <span id="capa-uploading" style="display:none;margin-left:10px;font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                </div>

                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Banner do meio ("Doçura")</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Imagem exibida na seção de destaque entre o catálogo e os benefícios,
                        acima do botão "Quero presentear". Também na horizontal (3:1).
                    </p>
                    <div class="capa-grid" id="banner-grid"></div>
                    <label class="btn btn-outline btn-sm" style="margin-top:14px;cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> Adicionar/trocar imagem
                        <input type="file" id="banner-input" accept="image/*" style="display:none;">
                    </label>
                    <span id="banner-uploading" style="display:none;margin-left:10px;font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                </div>

                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Fundo da loja virtual</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Imagem de fundo da página da loja virtual, atrás do catálogo e das outras
                        seções (no lugar da parte mais clarinha). Aparece do jeito que você enviar,
                        sem escurecer.
                    </p>
                    <div class="capa-grid" id="fundoloja-grid"></div>
                    <label class="btn btn-outline btn-sm" style="margin-top:14px;cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> Adicionar/trocar imagem
                        <input type="file" id="fundoloja-input" accept="image/*" style="display:none;">
                    </label>
                    <span id="fundoloja-uploading" style="display:none;margin-left:10px;font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                </div>

                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Fundo do painel administrativo</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Imagem de fundo só do painel de gestão (esta tela que você está vendo agora),
                        não aparece na loja virtual. Aparece do jeito que você enviar, sem escurecer.
                    </p>
                    <div class="capa-grid" id="fundo-grid"></div>
                    <label class="btn btn-outline btn-sm" style="margin-top:14px;cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> Adicionar/trocar imagem
                        <input type="file" id="fundo-input" accept="image/*" style="display:none;">
                    </label>
                    <span id="fundo-uploading" style="display:none;margin-left:10px;font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                </div>

                <div class="panel" style="max-width:680px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Cards do Instagram</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Adicione quantos cards quiser para a seção "Siga nosso Instagram" da loja.
                        Cada card tem foto, título e texto opcionais, e um link — ao clicar, a pessoa
                        é levada direto para o post (ou qualquer link que você colocar).
                    </p>
                    <div class="capa-grid" id="insta-card-grid"></div>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-insta-card" style="margin-top:14px;">
                        <i class="fa-solid fa-plus"></i> Adicionar card
                    </button>
                </div>
            </div>

            <div class="settings-panel" id="panel-usuarios">
                <div class="panel" style="max-width:560px;">
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:6px;">
                        Só e-mails desta lista têm acesso ao painel de gestão. Quem entrar com um e-mail fora
                        da lista (Google ou cadastro) vê a loja virtual pública no lugar do painel.
                    </p>
                    <div class="chip-list" id="chips-usuarios"></div>
                    <div class="add-chip-row">
                        <input type="email" id="new-usuario" placeholder="email@exemplo.com">
                        <button class="btn btn-primary btn-sm" id="btn-add-usuario"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>

            <div class="settings-panel" id="panel-conta">
                <div class="panel" style="max-width:560px;">
                    <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;">
                        <div class="avatar" style="width:64px;height:64px;font-size:1.5rem;overflow:hidden;" id="conta-avatar">A</div>
                        <div>
                            <strong id="conta-email" style="display:block;"></strong>
                            <span style="font-size:0.8rem;color:var(--text-muted);">Administrador</span>
                            <label class="btn btn-outline btn-sm" style="margin-top:8px;cursor:pointer;display:inline-flex;">
                                <i class="fa-solid fa-camera"></i> Trocar foto
                                <input type="file" id="conta-foto-input" accept="image/*" style="display:none;">
                            </label>
                        </div>
                    </div>
                    <form id="perfil-form">
                        <div class="form-row">
                            <div class="form-group"><label>Seu nome</label><input type="text" id="f-perfil-nome" placeholder="Seu nome"></div>
                            <div class="form-group"><label>Telefone</label><input type="text" id="f-perfil-telefone" placeholder="(00) 00000-0000"></div>
                        </div>
                        <div class="form-actions" style="margin-top:0;">
                            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Salvar perfil</button>
                        </div>
                    </form>
                    <hr style="border:none;border-top:1px solid var(--border);margin:22px 0;">
                    <button class="btn btn-outline" id="btn-reset-senha"><i class="fa-solid fa-key"></i> Enviar e-mail de redefinição de senha</button>
                    <button class="btn btn-danger" id="btn-sair-conta" style="margin-left:10px;"><i class="fa-solid fa-right-from-bracket"></i> Sair do sistema</button>
                </div>
            </div>
        `;

        el.querySelectorAll('.settings-tab').forEach(tab => tab.addEventListener('click', () => {
            activeTab = tab.dataset.tab;
            el.querySelectorAll('.settings-tab').forEach(t => t.classList.toggle('active', t === tab));
            el.querySelectorAll('.settings-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${activeTab}`));
        }));

        document.getElementById('loja-form').addEventListener('submit', saveLoja);
        document.getElementById('perfil-form').addEventListener('submit', saveProfile);
        document.getElementById('btn-add-categoria').addEventListener('click', () => addChip('categoriasProdutos', 'new-categoria'));
        document.getElementById('btn-add-pagamento').addEventListener('click', () => addChip('formasPagamento', 'new-pagamento'));
        document.getElementById('btn-add-usuario').addEventListener('click', () => addChip('usuariosAutorizados', 'new-usuario', true));
        document.getElementById('new-categoria').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('categoriasProdutos', 'new-categoria'); } });
        document.getElementById('new-pagamento').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('formasPagamento', 'new-pagamento'); } });
        document.getElementById('new-usuario').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('usuariosAutorizados', 'new-usuario', true); } });

        document.getElementById('capa-input').addEventListener('change', uploadCapa);
        document.getElementById('banner-input').addEventListener('change', uploadBanner);
        document.getElementById('fundo-input').addEventListener('change', uploadFundoPainel);
        document.getElementById('fundoloja-input').addEventListener('change', uploadFundoLoja);
        document.getElementById('btn-add-insta-card').addEventListener('click', () => openInstaCardForm());

        document.getElementById('conta-foto-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const avatar = document.getElementById('conta-avatar');
            const original = avatar.innerHTML;
            avatar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                profilePhotoDataUrl = await Utils.compressImageToBase64(file, { maxDim: 500, maxBytes: 350000 });
                avatar.innerHTML = `<img src="${profilePhotoDataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            } catch (err) {
                Utils.toast('Não foi possível usar essa foto: ' + err.message, 'error');
                avatar.innerHTML = original;
            }
        });

        el.addEventListener('click', (e) => {
            const rm = e.target.closest('.js-chip-remove');
            const rmCapa = e.target.closest('.js-capa-remove');
            const rmBanner = e.target.closest('.js-banner-remove');
            const rmFundo = e.target.closest('.js-fundo-remove');
            const rmFundoLoja = e.target.closest('.js-fundoloja-remove');
            const editInsta = e.target.closest('.js-insta-edit');
            const rmInsta = e.target.closest('.js-insta-remove');
            if (rm) removeChip(rm.dataset.field, rm.dataset.value);
            if (rmCapa) removeCapa(rmCapa.dataset.id);
            if (rmBanner) removeBanner();
            if (rmFundo) removeFundoPainel();
            if (rmFundoLoja) removeFundoLoja();
            if (editInsta) openInstaCardForm(editInsta.dataset.id);
            if (rmInsta) removeInstaCard(rmInsta.dataset.id);
        });

        document.getElementById('btn-reset-senha').addEventListener('click', async () => {
            try {
                await window.auth.sendPasswordResetEmail(Auth.currentUser().email);
                Utils.toast('E-mail de redefinição enviado.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        });
        document.getElementById('btn-sair-conta').addEventListener('click', () => {
            Utils.confirmDialog('Deseja realmente sair do sistema?', async () => { await Auth.logout(); }, 'Sair do sistema', 'Sim, sair');
        });

        render();
    }

    async function saveLoja(e) {
        e.preventDefault();
        const data = {
            nomeLoja: document.getElementById('f-nome-loja').value.trim(),
            telefone: document.getElementById('f-telefone-loja').value.trim(),
            instagram: document.getElementById('f-instagram').value.trim(),
            endereco: document.getElementById('f-endereco-loja').value.trim(),
            taxaEntregaPadrao: Number(document.getElementById('f-taxa-padrao').value) || 0
        };
        try {
            await window.db.collection('configuracoes').doc('geral').set(data, { merge: true });
            Utils.toast('Dados da loja atualizados.', 'success');
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    async function saveProfile(e) {
        e.preventDefault();
        const user = Auth.currentUser();
        if (!user) return;
        const btn = e.target.querySelector('button[type="submit"]');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
        try {
            const fotoUrl = profilePhotoDataUrl || Store.profile.fotoUrl || '';
            profilePhotoDataUrl = null;
            await window.db.collection('usuarios').doc(user.uid).set({
                nome: document.getElementById('f-perfil-nome').value.trim() || 'Administradora',
                telefone: document.getElementById('f-perfil-telefone').value.trim(),
                fotoUrl,
                email: user.email || ''
            }, { merge: true });
            Utils.toast('Perfil atualizado.', 'success');
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    async function uploadCapa(e) {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('capa-uploading');
        status.style.display = 'inline';
        try {
            const imagem = await Utils.compressImageToBase64(file, { maxDim: 1100, maxBytes: 260000 });
            await window.db.collection('capas').add({
                imagem,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            Utils.toast('Foto de capa adicionada.', 'success');
        } catch (err) {
            Utils.toast('Erro ao enviar foto: ' + err.message, 'error');
        } finally {
            status.style.display = 'none';
            e.target.value = '';
        }
    }

    async function removeCapa(id) {
        Utils.confirmDialog('Remover esta foto da capa da loja?', async () => {
            try {
                await window.db.collection('capas').doc(id).delete();
                Utils.toast('Foto removida.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover foto', 'Sim, remover');
    }

    function capaGridHtml(capas) {
        if (!capas || !capas.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma foto de capa ainda.</span>';
        return capas.map(c => `
            <div class="capa-thumb">
                <img src="${c.imagem}">
                <button class="js-capa-remove" data-id="${c.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
    }

    async function uploadBanner(e) {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('banner-uploading');
        status.style.display = 'inline';
        try {
            const bannerMeio = await Utils.compressImageToBase64(file, { maxDim: 1100, maxBytes: 260000 });
            await window.db.collection('configuracoes').doc('geral').set({ bannerMeio }, { merge: true });
            Utils.toast('Imagem do banner atualizada.', 'success');
        } catch (err) {
            Utils.toast('Erro ao enviar imagem: ' + err.message, 'error');
        } finally {
            status.style.display = 'none';
            e.target.value = '';
        }
    }

    async function removeBanner() {
        Utils.confirmDialog('Remover a imagem do banner do meio?', async () => {
            try {
                await window.db.collection('configuracoes').doc('geral').update({
                    bannerMeio: firebase.firestore.FieldValue.delete()
                });
                Utils.toast('Imagem removida.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover imagem', 'Sim, remover');
    }

    function bannerGridHtml(bannerMeio) {
        if (!bannerMeio) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma imagem definida — a seção mostra um fundo padrão.</span>';
        return `
            <div class="capa-thumb">
                <img src="${bannerMeio}">
                <button class="js-banner-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    }

    async function uploadFundoPainel(e) {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('fundo-uploading');
        status.style.display = 'inline';
        try {
            const fundoPainel = await Utils.compressImageToBase64(file, { maxDim: 1400, maxBytes: 300000 });
            await window.db.collection('configuracoes').doc('geral').set({ fundoPainel }, { merge: true });
            Utils.toast('Fundo do painel atualizado.', 'success');
        } catch (err) {
            Utils.toast('Erro ao enviar imagem: ' + err.message, 'error');
        } finally {
            status.style.display = 'none';
            e.target.value = '';
        }
    }

    async function removeFundoPainel() {
        Utils.confirmDialog('Remover o fundo do painel administrativo?', async () => {
            try {
                await window.db.collection('configuracoes').doc('geral').update({
                    fundoPainel: firebase.firestore.FieldValue.delete()
                });
                Utils.toast('Fundo removido.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover fundo', 'Sim, remover');
    }

    function fundoGridHtml(fundoPainel) {
        if (!fundoPainel) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma imagem definida — o painel usa o fundo padrão.</span>';
        return `
            <div class="capa-thumb">
                <img src="${fundoPainel}">
                <button class="js-fundo-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    }

    async function uploadFundoLoja(e) {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('fundoloja-uploading');
        status.style.display = 'inline';
        try {
            const fundoLoja = await Utils.compressImageToBase64(file, { maxDim: 1400, maxBytes: 300000 });
            await window.db.collection('configuracoes').doc('geral').set({ fundoLoja }, { merge: true });
            Utils.toast('Fundo da loja atualizado.', 'success');
        } catch (err) {
            Utils.toast('Erro ao enviar imagem: ' + err.message, 'error');
        } finally {
            status.style.display = 'none';
            e.target.value = '';
        }
    }

    async function removeFundoLoja() {
        Utils.confirmDialog('Remover o fundo da loja virtual?', async () => {
            try {
                await window.db.collection('configuracoes').doc('geral').update({
                    fundoLoja: firebase.firestore.FieldValue.delete()
                });
                Utils.toast('Fundo removido.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover fundo', 'Sim, remover');
    }

    function fundoLojaGridHtml(fundoLoja) {
        if (!fundoLoja) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma imagem definida — a loja usa o fundo padrão.</span>';
        return `
            <div class="capa-thumb">
                <img src="${fundoLoja}">
                <button class="js-fundoloja-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    }

    function openInstaCardForm(id) {
        const c = id ? Store.instaCards.find(x => x.id === id) : null;
        let novaImagem = null;
        Utils.openModal(`
            <div class="modal-head"><h3>${c ? 'Editar card' : 'Novo card do Instagram'}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="insta-card-form">
                <div class="form-group">
                    <label>Imagem ${c ? '' : '*'}</label>
                    <div class="insta-form-preview" id="insta-card-preview">
                        ${c && c.imagem ? `<img src="${c.imagem}">` : '<i class="fa-solid fa-image" style="color:var(--text-muted);font-size:1.6rem;"></i>'}
                    </div>
                    <label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> ${c ? 'Trocar imagem' : 'Escolher imagem'}
                        <input type="file" id="insta-card-input" accept="image/*" style="display:none;">
                    </label>
                </div>
                <div class="form-group"><label>Título</label><input type="text" id="f-insta-titulo" value="${c ? Utils.escapeHtml(c.titulo || '') : ''}" placeholder="Ex: Caixa surpresa de morango"></div>
                <div class="form-group"><label>Texto</label><textarea id="f-insta-texto" rows="2" placeholder="Um textinho curto sobre o post">${c ? Utils.escapeHtml(c.texto || '') : ''}</textarea></div>
                <div class="form-group"><label>Link do post *</label><input type="url" id="f-insta-link" required value="${c ? Utils.escapeHtml(c.link || '') : ''}" placeholder="https://www.instagram.com/p/..."></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="insta-card-submit"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);

        document.getElementById('insta-card-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const preview = document.getElementById('insta-card-preview');
            const original = preview.innerHTML;
            preview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                novaImagem = await Utils.compressImageToBase64(file, { maxDim: 900, maxBytes: 300000 });
                preview.innerHTML = `<img src="${novaImagem}">`;
            } catch (err) {
                Utils.toast('Não foi possível usar essa imagem: ' + err.message, 'error');
                preview.innerHTML = original;
            }
        });

        document.getElementById('insta-card-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!novaImagem && !(c && c.imagem)) { Utils.toast('Escolha uma imagem para o card.', 'error'); return; }
            const btn = document.getElementById('insta-card-submit');
            btn.disabled = true;
            try {
                const data = {
                    titulo: document.getElementById('f-insta-titulo').value.trim(),
                    texto: document.getElementById('f-insta-texto').value.trim(),
                    link: document.getElementById('f-insta-link').value.trim()
                };
                if (novaImagem) data.imagem = novaImagem;
                if (c) {
                    await window.db.collection('instaCards').doc(c.id).update(data);
                } else {
                    data.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
                    await window.db.collection('instaCards').add(data);
                }
                Utils.closeModal();
                Utils.toast(c ? 'Card atualizado.' : 'Card adicionado.', 'success');
            } catch (err) {
                Utils.toast('Erro ao salvar: ' + err.message, 'error');
                btn.disabled = false;
            }
        });
    }

    async function removeInstaCard(id) {
        Utils.confirmDialog('Remover este card do Instagram?', async () => {
            try {
                await window.db.collection('instaCards').doc(id).delete();
                Utils.toast('Card removido.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover card', 'Sim, remover');
    }

    function instaCardGridHtml(cards) {
        if (!cards || !cards.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhum card adicionado ainda — a loja mostra os quadradinhos decorativos padrão.</span>';
        return cards.map(c => `
            <div class="insta-card-admin">
                <div class="insta-card-admin-img">${c.imagem ? `<img src="${c.imagem}">` : ''}</div>
                <div class="insta-card-admin-body">
                    <strong>${Utils.escapeHtml(c.titulo || '(sem título)')}</strong>
                    <span>${Utils.escapeHtml(c.link || '')}</span>
                </div>
                <div class="insta-card-admin-actions">
                    <button class="js-insta-edit" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="js-insta-remove del" data-id="${c.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    async function addChip(field, inputId, isEmail = false) {
        const input = document.getElementById(inputId);
        let value = input.value.trim();
        if (!value) return;
        if (isEmail) value = value.toLowerCase();
        try {
            await window.db.collection('configuracoes').doc('geral').set({
                [field]: firebase.firestore.FieldValue.arrayUnion(value)
            }, { merge: true });
            input.value = '';
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    async function removeChip(field, value) {
        if (field === 'usuariosAutorizados' && Auth.currentUser() && value === Auth.currentUser().email) {
            Utils.toast('Você não pode remover o seu próprio e-mail da lista.', 'error');
            return;
        }
        try {
            await window.db.collection('configuracoes').doc('geral').update({
                [field]: firebase.firestore.FieldValue.arrayRemove(value)
            });
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function chipHtml(field, values) {
        if (!values || !values.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhum item cadastrado.</span>';
        return values.map(v => `<span class="chip">${Utils.escapeHtml(v)}<button class="js-chip-remove" data-field="${field}" data-value="${Utils.escapeHtml(v)}"><i class="fa-solid fa-xmark"></i></button></span>`).join('');
    }

    function render() {
        if (!document.getElementById('f-nome-loja')) return;
        const c = Store.config;
        document.getElementById('f-nome-loja').value = c.nomeLoja || '';
        document.getElementById('f-telefone-loja').value = c.telefone || '';
        document.getElementById('f-instagram').value = c.instagram || '';
        document.getElementById('f-endereco-loja').value = c.endereco || '';
        document.getElementById('f-taxa-padrao').value = c.taxaEntregaPadrao || 0;

        document.getElementById('capa-grid').innerHTML = capaGridHtml(Store.capas);
        document.getElementById('banner-grid').innerHTML = bannerGridHtml(c.bannerMeio);
        document.getElementById('fundo-grid').innerHTML = fundoGridHtml(c.fundoPainel);
        document.getElementById('fundoloja-grid').innerHTML = fundoLojaGridHtml(c.fundoLoja);
        document.getElementById('insta-card-grid').innerHTML = instaCardGridHtml(Store.instaCards);
        document.getElementById('chips-categorias').innerHTML = chipHtml('categoriasProdutos', c.categoriasProdutos);
        document.getElementById('chips-pagamento').innerHTML = chipHtml('formasPagamento', c.formasPagamento);
        document.getElementById('chips-usuarios').innerHTML = chipHtml('usuariosAutorizados', c.usuariosAutorizados);

        const user = Auth.currentUser();
        if (user) document.getElementById('conta-email').textContent = user.email;

        const p = Store.profile || {};
        document.getElementById('f-perfil-nome').value = p.nome || '';
        document.getElementById('f-perfil-telefone').value = p.telefone || '';
        const avatarEl = document.getElementById('conta-avatar');
        if (avatarEl) {
            avatarEl.innerHTML = p.fotoUrl
                ? `<img src="${p.fotoUrl}" style="width:100%;height:100%;object-fit:cover;">`
                : (p.nome || Auth.initials() || 'A').trim().charAt(0).toUpperCase();
        }
    }

    return { mount, render };
})();
