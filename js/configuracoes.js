/* ==========================================================================
   Configurações — Excellent Loja
   ========================================================================== */

const Configuracoes = (() => {

    let activeTab = 'loja';
    let profilePhotoDataUrl = null;
    let lojasCache = [];

    function mount() {
        const el = document.getElementById('view-configuracoes');
        const souSuperAdmin = Loja.isRoot && Loja.isSuperAdmin(Auth.currentUser() && Auth.currentUser().email);
        el.innerHTML = `
            <div class="settings-tabs">
                <div class="settings-tab active" data-tab="loja">Dados da loja</div>
                <div class="settings-tab" data-tab="categorias">Categorias de produtos</div>
                <div class="settings-tab" data-tab="pagamento">Formas de pagamento</div>
                <div class="settings-tab" data-tab="imagens">Imagens da loja</div>
                <div class="settings-tab" data-tab="usuarios">Usuários autorizados</div>
                <div class="settings-tab" data-tab="conta">Minha conta</div>
                ${souSuperAdmin ? `<div class="settings-tab" data-tab="lojas"><i class="fa-solid fa-store"></i> Gerenciar lojas</div>` : ''}
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

            ${souSuperAdmin ? `
            <div class="settings-panel" id="panel-lojas">
                <div class="panel" style="max-width:640px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Criar nova loja</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Cada loja criada aqui tem seus próprios produtos, pedidos, clientes e
                        financeiro — totalmente separados dos seus. Depois de criar, adicione
                        o e-mail de quem vai administrar essa loja: só esse e-mail (e você) vê
                        o painel dela.
                    </p>
                    <form id="nova-loja-form">
                        <div class="form-group"><label>Nome da loja</label><input type="text" id="f-nova-loja-nome" placeholder="Ex: Bar do João" required></div>
                        <div class="form-group">
                            <label>Endereço da loja</label>
                            <div class="slug-input-wrap"><span>excellentloja.vercel.app/</span><input type="text" id="f-nova-loja-slug" placeholder="bardojoao"></div>
                        </div>
                        <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Criar loja</button></div>
                    </form>
                </div>
                <div class="panel" style="max-width:640px;">
                    <h3 style="font-size:0.95rem;margin-bottom:14px;">Lojas criadas</h3>
                    <div id="lojas-list"><span style="font-size:0.82rem;color:var(--text-muted);">Carregando...</span></div>
                </div>
            </div>` : ''}
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
            const rmLoja = e.target.closest('.js-loja-remove');
            const addLojaEmail = e.target.closest('.js-loja-email-add');
            const rmLojaEmail = e.target.closest('.js-loja-email-remove');
            if (rm) removeChip(rm.dataset.field, rm.dataset.value);
            if (rmCapa) removeCapa(rmCapa.dataset.id);
            if (rmBanner) removeBanner();
            if (rmFundo) removeFundoPainel();
            if (rmFundoLoja) removeFundoLoja();
            if (editInsta) openInstaCardForm(editInsta.dataset.id);
            if (rmInsta) removeInstaCard(rmInsta.dataset.id);
            if (rmLoja) removerLoja(rmLoja.dataset.id, rmLoja.dataset.nome);
            if (addLojaEmail) addAdminToLoja(addLojaEmail.dataset.loja);
            if (rmLojaEmail) removeAdminFromLoja(rmLojaEmail.dataset.loja, rmLojaEmail.dataset.email);
        });

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.classList.contains('js-loja-email-input')) {
                e.preventDefault();
                addAdminToLoja(e.target.dataset.loja);
            }
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

        if (souSuperAdmin) {
            document.getElementById('nova-loja-form').addEventListener('submit', criarLoja);
            loadLojas();
        }

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
            await Loja.ref().set(data, { merge: true });
            Utils.toast('Dados da loja atualizados.', 'success');
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    async function loadLojas() {
        try {
            const snap = await window.db.collection('lojas').get();
            lojasCache = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(l => l.id !== 'root');
            renderLojasList();
        } catch (err) {
            const box = document.getElementById('lojas-list');
            if (box) box.innerHTML = `<span style="font-size:0.82rem;color:var(--danger);">Erro ao carregar lojas: ${Utils.escapeHtml(err.message)}</span>`;
        }
    }

    function renderLojasList() {
        const box = document.getElementById('lojas-list');
        if (!box) return;
        if (!lojasCache.length) {
            box.innerHTML = '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma loja criada ainda.</span>';
            return;
        }
        box.innerHTML = lojasCache.map(l => `
            <div class="loja-admin-card">
                <div class="loja-admin-head">
                    <label class="loja-admin-logo" title="Trocar logotipo">
                        ${l.logoUrl ? `<img src="${l.logoUrl}">` : '<i class="fa-solid fa-shop"></i>'}
                        <input type="file" accept="image/*" class="js-loja-logo-input" data-loja="${l.id}" style="display:none;">
                    </label>
                    <div class="loja-admin-info">
                        <strong>${Utils.escapeHtml(l.nomeLoja || l.id)}</strong>
                        <span class="loja-admin-slug">excellentloja.vercel.app/${Utils.escapeHtml(l.id)}</span>
                    </div>
                    <a href="/${l.id}" class="js-loja-enter" title="Entrar no painel desta loja"><i class="fa-solid fa-arrow-right-to-bracket"></i></a>
                    <button class="js-loja-remove" data-id="${l.id}" data-nome="${Utils.escapeHtml(l.nomeLoja || l.id)}" title="Excluir loja"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="loja-admin-cores">
                    <label>Cor principal<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corPrincipal" value="${l.corPrincipal || '#C9962B'}"></label>
                    <label>Cor de fundo<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corFundo" value="${l.corFundo || '#FAF5EB'}"></label>
                    <label>Cor do texto<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corTexto" value="${l.corTexto || '#1C1A16'}"></label>
                    <button type="button" class="js-loja-cor-reset" data-loja="${l.id}" title="Restaurar cores padrão"><i class="fa-solid fa-rotate-left"></i> Padrão</button>
                </div>
                <div class="chip-list">${lojaEmailsHtml(l.id, l.usuariosAutorizados)}</div>
                <div class="add-chip-row">
                    <input type="email" class="js-loja-email-input" data-loja="${l.id}" placeholder="email-do-admin@exemplo.com">
                    <button class="btn btn-primary btn-sm js-loja-email-add" data-loja="${l.id}"><i class="fa-solid fa-plus"></i></button>
                </div>
            </div>
        `).join('');
        box.querySelectorAll('.js-loja-logo-input').forEach(input => input.addEventListener('change', (e) => uploadLojaLogo(e, input.dataset.loja)));
        box.querySelectorAll('.js-loja-cor').forEach(input => input.addEventListener('change', (e) => salvarCorLoja(input.dataset.loja, input.dataset.campo, input.value)));
        box.querySelectorAll('.js-loja-cor-reset').forEach(btn => btn.addEventListener('click', () => resetarCoresLoja(btn.dataset.loja)));
    }

    async function salvarCorLoja(lojaId, campo, valor) {
        try {
            await window.db.collection('lojas').doc(lojaId).update({ [campo]: valor });
            const l = lojasCache.find(x => x.id === lojaId);
            if (l) l[campo] = valor;
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function resetarCoresLoja(lojaId) {
        Utils.confirmDialog('Restaurar as cores padrão dessa loja?', async () => {
            try {
                await window.db.collection('lojas').doc(lojaId).update({
                    corPrincipal: firebase.firestore.FieldValue.delete(),
                    corFundo: firebase.firestore.FieldValue.delete(),
                    corTexto: firebase.firestore.FieldValue.delete()
                });
                Utils.closeModal();
                await loadLojas();
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Restaurar cores padrão', 'Sim, restaurar');
    }

    async function uploadLojaLogo(e, lojaId) {
        const file = e.target.files[0];
        if (!file) return;
        const wrap = e.target.closest('.loja-admin-logo');
        wrap.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
            const logoUrl = await Utils.compressImageToBase64(file, { maxDim: 300, maxBytes: 150000 });
            await window.db.collection('lojas').doc(lojaId).update({ logoUrl });
        } catch (err) {
            Utils.toast('Não foi possível usar essa imagem: ' + err.message, 'error');
        }
        await loadLojas();
    }

    async function criarLoja(e) {
        e.preventDefault();
        const nome = document.getElementById('f-nova-loja-nome').value.trim();
        const slugInput = document.getElementById('f-nova-loja-slug').value.trim();
        const slug = Loja.slugify(slugInput || nome);
        if (!nome) { Utils.toast('Digite o nome da loja.', 'error'); return; }
        if (!slug || slug === 'root') { Utils.toast('Endereço inválido. Tente outro nome.', 'error'); return; }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            const existente = await window.db.collection('lojas').doc(slug).get();
            if (existente.exists) {
                Utils.toast(`Já existe uma loja em "/${slug}". Tente outro endereço.`, 'error');
                return;
            }
            await window.db.collection('lojas').doc(slug).set({
                nomeLoja: nome,
                categoriasProdutos: ['Geral', 'Novidades', 'Mais vendidos', 'Promoções'],
                formasPagamento: ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'],
                taxaEntregaPadrao: 0,
                usuariosAutorizados: [],
                criadaEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            document.getElementById('f-nova-loja-nome').value = '';
            document.getElementById('f-nova-loja-slug').value = '';
            Utils.toast(`Loja "${nome}" criada! Adicione o e-mail de quem vai administrá-la.`, 'success');
            await loadLojas();
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function removerLoja(id, nome) {
        Utils.confirmDialog(`Excluir a loja "${nome}"? Isso não apaga os dados dela no banco, só remove o acesso — fale com o suporte se precisar apagar tudo.`, async () => {
            try {
                await window.db.collection('lojas').doc(id).delete();
                Utils.closeModal();
                Utils.toast('Loja removida.', 'success');
                await loadLojas();
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Excluir loja');
    }

    async function addAdminToLoja(lojaId) {
        const input = document.querySelector(`.js-loja-email-input[data-loja="${CSS.escape(lojaId)}"]`);
        const email = input.value.trim().toLowerCase();
        if (!email) return;
        try {
            await window.db.collection('lojas').doc(lojaId).update({
                usuariosAutorizados: firebase.firestore.FieldValue.arrayUnion(email)
            });
            input.value = '';
            await loadLojas();
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    async function removeAdminFromLoja(lojaId, email) {
        try {
            await window.db.collection('lojas').doc(lojaId).update({
                usuariosAutorizados: firebase.firestore.FieldValue.arrayRemove(email)
            });
            await loadLojas();
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
            await Loja.col('capas').add({
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
                await Loja.col('capas').doc(id).delete();
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
            await Loja.ref().set({ bannerMeio }, { merge: true });
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
                await Loja.ref().update({
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
            await Loja.ref().set({ fundoPainel }, { merge: true });
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
                await Loja.ref().update({
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
            await Loja.ref().set({ fundoLoja }, { merge: true });
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
                await Loja.ref().update({
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
                    await Loja.col('instaCards').doc(c.id).update(data);
                } else {
                    data.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
                    await Loja.col('instaCards').add(data);
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
                await Loja.col('instaCards').doc(id).delete();
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
            await Loja.ref().set({
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
            await Loja.ref().update({
                [field]: firebase.firestore.FieldValue.arrayRemove(value)
            });
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function chipHtml(field, values) {
        if (!values || !values.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhum item cadastrado.</span>';
        return values.map(v => `<span class="chip">${Utils.escapeHtml(v)}<button class="js-chip-remove" data-field="${field}" data-value="${Utils.escapeHtml(v)}"><i class="fa-solid fa-xmark"></i></button></span>`).join('');
    }

    function lojaEmailsHtml(lojaId, values) {
        if (!values || !values.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhum administrador ainda.</span>';
        return values.map(v => `<span class="chip">${Utils.escapeHtml(v)}<button class="js-loja-email-remove" data-loja="${lojaId}" data-email="${Utils.escapeHtml(v)}"><i class="fa-solid fa-xmark"></i></button></span>`).join('');
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
