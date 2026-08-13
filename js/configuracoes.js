/* ==========================================================================
   Configurações — Excellent Loja
   ========================================================================== */

const Configuracoes = (() => {

    let activeTab = 'loja';
    let profilePhotoDataUrl = null;
    let lojasCache = [];

    function mount() {
        const el = document.getElementById('view-configuracoes');
        const emailAtual = Auth.currentUser() && Auth.currentUser().email;
        const souSuperAdmin = Loja.isRoot && Loja.isSuperAdmin(emailAtual);
        const souSuporteAcesso = !Loja.isRoot && Loja.isSuperAdmin(emailAtual);
        el.innerHTML = `
            <div class="settings-tabs">
                <div class="settings-tab active" data-tab="loja">Dados da loja</div>
                ${souSuperAdmin ? '' : `
                <div class="settings-tab" data-tab="categorias">Categorias de produtos</div>
                <div class="settings-tab" data-tab="pagamento">Formas de pagamento</div>
                <div class="settings-tab" data-tab="pagamento-online"><i class="fa-solid fa-credit-card"></i> Pagamento online</div>`}
                <div class="settings-tab" data-tab="imagens">${souSuperAdmin ? 'Página inicial' : 'Imagens da loja'}</div>
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

            ${souSuperAdmin ? '' : `
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

            <div class="settings-panel" id="panel-pagamento-online">
                <div class="panel" style="max-width:640px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Pagamento online <span class="pgto-status-chip" id="pgto-status-chip">Não configurado</span></h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;margin-bottom:14px;">
                        Hoje a Excellent Loja processa pagamento online integrado com o <strong>Mercado Pago</strong>
                        (Pix, débito e crédito). Com isso ativado, quem compra na sua loja virtual paga direto
                        dentro do site — numa tela própria, com QR Code do Pix ou cartão — e o pedido só aparece
                        aqui no painel, em "Pedidos", depois que o pagamento for confirmado. Sem isso ativado,
                        a loja continua funcionando como hoje (o pedido é combinado direto pelo WhatsApp).
                    </p>
                    <form id="pagamento-online-form">
                        <div class="form-group">
                            <label>Public Key do Mercado Pago</label>
                            <input type="text" id="f-pgto-public-key" placeholder="APP_USR-...">
                        </div>
                        <div class="form-group">
                            <label>Access Token do Mercado Pago</label>
                            <input type="text" id="f-pgto-access-token" placeholder="APP_USR-...">
                        </div>
                        <div class="form-group">
                            <label>Chave secreta do Webhook <span style="font-weight:400;color:var(--text-muted);">(opcional, mas recomendado)</span></label>
                            <input type="text" id="f-pgto-webhook-secret" placeholder="Gerada ao cadastrar o webhook no Mercado Pago">
                        </div>
                        <label class="pgto-toggle-row">
                            <input type="checkbox" id="f-pgto-ativo">
                            <span>Pagamento online ativo nesta loja</span>
                        </label>
                        <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Salvar</button></div>
                    </form>
                </div>
                <div class="panel" style="max-width:640px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">URL para cadastrar no Mercado Pago</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">
                        Cole esta URL nas notificações (webhooks) do seu aplicativo, no painel de
                        desenvolvedor do Mercado Pago, marcando o evento "Pagamentos". É assim que o
                        sistema fica sabendo na hora que alguém pagou.
                    </p>
                    <div class="add-chip-row">
                        <input type="text" id="pgto-webhook-url" readonly>
                        <button type="button" class="btn btn-outline btn-sm" id="btn-copiar-webhook"><i class="fa-solid fa-copy"></i> Copiar</button>
                    </div>
                </div>
            </div>`}

            <div class="settings-panel" id="panel-imagens">
                ${souSuperAdmin ? `
                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Capa da página inicial</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Imagem de fundo do topo da página inicial (excellentloja.vercel.app). Aparece
                        sem escurecer — se quiser algum texto ou logotipo nela, inclua já na própria
                        imagem. Use uma foto na horizontal.
                    </p>
                    <div class="capa-grid" id="capalanding-grid"></div>
                    <label class="btn btn-outline btn-sm" style="margin-top:14px;cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> Adicionar/trocar imagem
                        <input type="file" id="capalanding-input" accept="image/*" style="display:none;">
                    </label>
                    <span id="capalanding-uploading" style="display:none;margin-left:10px;font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                </div>

                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Cores da página inicial</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Paleta usada só na página inicial (excellentloja.vercel.app) — não afeta o
                        painel de gestão nem as lojas criadas, que têm suas próprias cores em
                        Gerenciar lojas.
                    </p>
                    <div class="loja-admin-cores" style="margin:0;">
                        <label>Cor principal<input type="color" id="f-cor-landing-principal" value="${Store.config.corPrincipal || '#C9962B'}"></label>
                        <label>Cor de fundo<input type="color" id="f-cor-landing-fundo" value="${Store.config.corFundo || '#FAF5EB'}"></label>
                        <label>Cor do texto<input type="color" id="f-cor-landing-texto" value="${Store.config.corTexto || '#1C1A16'}"></label>
                        <button type="button" class="js-loja-cor-reset" id="btn-reset-cor-landing" title="Restaurar cores padrão"><i class="fa-solid fa-rotate-left"></i> Padrão</button>
                    </div>
                </div>

                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Textos da página inicial</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        O selo aparece recortado no topo da capa. O título e o texto de apresentação
                        ficam na seção logo abaixo, ao lado da imagem de apresentação.
                    </p>
                    <form id="landing-textos-form">
                        <div class="form-group"><label>Selo no topo da capa</label><input type="text" id="f-landing-eyebrow" maxlength="60" placeholder="Sistema de gestão + loja virtual"></div>
                        <div class="form-group"><label>Título da apresentação</label><input type="text" id="f-landing-ap-titulo" maxlength="80" placeholder="Sua loja virtual, do seu jeito"></div>
                        <div class="form-group"><label>Texto da apresentação</label><textarea id="f-landing-ap-texto" rows="3" placeholder="Monte uma loja com a sua cara..."></textarea></div>
                        <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Salvar textos</button></div>
                    </form>
                </div>

                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Imagem da apresentação</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Aparece ao lado do texto de apresentação, logo abaixo da capa.
                    </p>
                    <div class="capa-grid" id="apresentacao-grid"></div>
                    <label class="btn btn-outline btn-sm" style="margin-top:14px;cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> Adicionar/trocar imagem
                        <input type="file" id="apresentacao-input" accept="image/*" style="display:none;">
                    </label>
                    <span id="apresentacao-uploading" style="display:none;margin-left:10px;font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                </div>

                <div class="panel" style="max-width:820px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Cards de benefícios</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Cada card tem uma foto quadrada, um título e um texto curto. Adicione quantos
                        quiser — aparecem lado a lado (até 5 por linha) na seção "Benefícios".
                    </p>
                    <div class="capa-grid" id="beneficio-card-grid"></div>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-beneficio-card" style="margin-top:14px;">
                        <i class="fa-solid fa-plus"></i> Adicionar card
                    </button>
                </div>

                <div class="panel" style="max-width:820px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Equipe</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Cards maiores (2 por linha) pra apresentar a equipe — foto, nome e uma breve
                        descrição. Se não adicionar ninguém, a seção "Conheça nossa equipe" fica
                        escondida na página inicial.
                    </p>
                    <div class="capa-grid" id="equipe-card-grid"></div>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-equipe-card" style="margin-top:14px;">
                        <i class="fa-solid fa-plus"></i> Adicionar pessoa
                    </button>
                </div>` : `
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
                </div>`}

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

                ${souSuperAdmin ? '' : `
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
                </div>`}
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
                ${souSuporteAcesso ? `
                <div class="panel" style="max-width:560px;">
                    <p style="font-size:0.85rem;color:var(--text-body);line-height:1.6;">
                        Você está com acesso de suporte a esta loja. O nome, telefone e foto de
                        "Minha conta" pertencem a quem administra ela — não a você — por isso não
                        aparecem aqui. Para editar o seu próprio perfil, volte ao seu painel.
                    </p>
                    <div class="form-actions" style="margin-top:16px;">
                        <a href="/" class="btn btn-outline"><i class="fa-solid fa-arrow-left"></i> Voltar ao meu painel</a>
                    </div>
                </div>
                ` : `
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
                `}
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
        document.getElementById('btn-add-usuario').addEventListener('click', () => addChip('usuariosAutorizados', 'new-usuario', true));
        document.getElementById('new-usuario').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('usuariosAutorizados', 'new-usuario', true); } });
        document.getElementById('fundo-input').addEventListener('change', uploadFundoPainel);

        if (souSuperAdmin) {
            document.getElementById('capalanding-input').addEventListener('change', uploadCapaLanding);
            document.getElementById('f-cor-landing-principal').addEventListener('change', (e) => salvarCorLanding('corPrincipal', e.target.value));
            document.getElementById('f-cor-landing-fundo').addEventListener('change', (e) => salvarCorLanding('corFundo', e.target.value));
            document.getElementById('f-cor-landing-texto').addEventListener('change', (e) => salvarCorLanding('corTexto', e.target.value));
            document.getElementById('btn-reset-cor-landing').addEventListener('click', resetarCorLanding);
            document.getElementById('landing-textos-form').addEventListener('submit', salvarTextosLanding);
            document.getElementById('apresentacao-input').addEventListener('change', uploadApresentacaoImagem);
            document.getElementById('btn-add-beneficio-card').addEventListener('click', () => openBeneficioForm());
            document.getElementById('btn-add-equipe-card').addEventListener('click', () => openEquipeForm());
        } else {
            document.getElementById('btn-add-categoria').addEventListener('click', () => addChip('categoriasProdutos', 'new-categoria'));
            document.getElementById('btn-add-pagamento').addEventListener('click', () => addChip('formasPagamento', 'new-pagamento'));
            document.getElementById('new-categoria').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('categoriasProdutos', 'new-categoria'); } });
            document.getElementById('new-pagamento').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('formasPagamento', 'new-pagamento'); } });
            document.getElementById('capa-input').addEventListener('change', uploadCapa);
            document.getElementById('banner-input').addEventListener('change', uploadBanner);
            document.getElementById('fundoloja-input').addEventListener('change', uploadFundoLoja);
            document.getElementById('btn-add-insta-card').addEventListener('click', () => openInstaCardForm());
            document.getElementById('pagamento-online-form').addEventListener('submit', salvarPagamentoConfig);
            document.getElementById('pgto-webhook-url').value = `${location.origin}/api/webhook-mercadopago?loja=${encodeURIComponent(Loja.id)}`;
            document.getElementById('btn-copiar-webhook').addEventListener('click', copiarWebhookUrl);
            carregarPagamentoConfig();
        }

        if (!souSuporteAcesso) {
            document.getElementById('perfil-form').addEventListener('submit', saveProfile);
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
            document.getElementById('btn-reset-senha').addEventListener('click', async () => {
                try {
                    await window.auth.sendPasswordResetEmail(Auth.currentUser().email);
                    Utils.toast('E-mail de redefinição enviado.', 'success');
                } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
            });
            document.getElementById('btn-sair-conta').addEventListener('click', () => {
                Utils.confirmDialog('Deseja realmente sair do sistema?', async () => { await Auth.logout(); }, 'Sair do sistema', 'Sim, sair');
            });
        }

        el.addEventListener('click', (e) => {
            const rm = e.target.closest('.js-chip-remove');
            const rmCapa = e.target.closest('.js-capa-remove');
            const rmBanner = e.target.closest('.js-banner-remove');
            const rmFundo = e.target.closest('.js-fundo-remove');
            const rmFundoLoja = e.target.closest('.js-fundoloja-remove');
            const rmCapaLanding = e.target.closest('.js-capalanding-remove');
            const editInsta = e.target.closest('.js-insta-edit');
            const rmInsta = e.target.closest('.js-insta-remove');
            const rmApresentacao = e.target.closest('.js-apresentacao-remove');
            const editBeneficio = e.target.closest('.js-beneficio-edit');
            const rmBeneficio = e.target.closest('.js-beneficio-remove');
            const editEquipe = e.target.closest('.js-equipe-edit');
            const rmEquipe = e.target.closest('.js-equipe-remove');
            const rmLoja = e.target.closest('.js-loja-remove');
            const addLojaEmail = e.target.closest('.js-loja-email-add');
            const rmLojaEmail = e.target.closest('.js-loja-email-remove');
            if (rm) removeChip(rm.dataset.field, rm.dataset.value);
            if (rmCapa) removeCapa(rmCapa.dataset.id);
            if (rmBanner) removeBanner();
            if (rmFundo) removeFundoPainel();
            if (rmFundoLoja) removeFundoLoja();
            if (rmCapaLanding) removeCapaLanding();
            if (editInsta) openInstaCardForm(editInsta.dataset.id);
            if (rmInsta) removeInstaCard(rmInsta.dataset.id);
            if (rmApresentacao) removeApresentacaoImagem();
            if (editBeneficio) openBeneficioForm(editBeneficio.dataset.id);
            if (rmBeneficio) removeBeneficioCard(rmBeneficio.dataset.id);
            if (editEquipe) openEquipeForm(editEquipe.dataset.id);
            if (rmEquipe) removeEquipeCard(rmEquipe.dataset.id);
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

    async function carregarPagamentoConfig() {
        const chip = document.getElementById('pgto-status-chip');
        try {
            const snap = await Loja.col('config').doc('pagamento').get();
            const c = snap.exists ? snap.data() : {};
            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
            setVal('f-pgto-public-key', c.publicKey);
            setVal('f-pgto-access-token', c.accessToken);
            setVal('f-pgto-webhook-secret', c.webhookSecret);
            const ativoInput = document.getElementById('f-pgto-ativo');
            if (ativoInput) ativoInput.checked = !!c.ativo;
            if (chip) {
                chip.textContent = c.ativo ? 'Ativo' : (c.publicKey || c.accessToken ? 'Configurado, mas inativo' : 'Não configurado');
                chip.classList.toggle('on', !!c.ativo);
            }
        } catch (err) {
            if (chip) chip.textContent = 'Erro ao carregar';
        }
    }

    async function salvarPagamentoConfig(e) {
        e.preventDefault();
        const publicKey = document.getElementById('f-pgto-public-key').value.trim();
        const accessToken = document.getElementById('f-pgto-access-token').value.trim();
        const webhookSecret = document.getElementById('f-pgto-webhook-secret').value.trim();
        const ativo = document.getElementById('f-pgto-ativo').checked;
        if (ativo && (!publicKey || !accessToken)) {
            Utils.toast('Preencha a Public Key e o Access Token antes de ativar.', 'error');
            return;
        }
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            const batch = window.db.batch();
            batch.set(Loja.col('config').doc('pagamento'), {
                publicKey, accessToken, webhookSecret, ativo,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            // espelha só o que é seguro no doc público da loja (nunca o Access Token/segredo),
            // pra loja virtual saber se deve mostrar a tela de pagamento — sem poder ler a chave.
            batch.set(Loja.ref(), {
                pagamentoOnline: { ativo, publicKey: ativo ? publicKey : '' }
            }, { merge: true });
            await batch.commit();
            Utils.toast('Configuração de pagamento salva.', 'success');
            await carregarPagamentoConfig();
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function copiarWebhookUrl() {
        const input = document.getElementById('pgto-webhook-url');
        input.select();
        (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject())
            .then(() => Utils.toast('URL copiada!', 'success'))
            .catch(() => { try { document.execCommand('copy'); Utils.toast('URL copiada!', 'success'); } catch (e) { Utils.toast('Não foi possível copiar.', 'error'); } });
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
                    <div class="loja-admin-logos">
                        <label class="loja-admin-logo" title="Trocar logotipo (cabeçalho e rodapé)">
                            ${l.logoUrl ? `<img src="${l.logoUrl}">` : '<i class="fa-solid fa-shop"></i>'}
                            <input type="file" accept="image/*" class="js-loja-logo-input" data-loja="${l.id}" style="display:none;">
                        </label>
                        <label class="loja-admin-favicon" title="Trocar ícone da aba (favicon)">
                            ${l.faviconUrl ? `<img src="${l.faviconUrl}">` : (l.logoUrl ? `<img src="${l.logoUrl}">` : '<i class="fa-solid fa-icons"></i>')}
                            <input type="file" accept="image/*" class="js-loja-favicon-input" data-loja="${l.id}" style="display:none;">
                        </label>
                    </div>
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
        box.querySelectorAll('.js-loja-favicon-input').forEach(input => input.addEventListener('change', (e) => uploadLojaFavicon(e, input.dataset.loja)));
        box.querySelectorAll('.js-loja-cor').forEach(input => input.addEventListener('change', (e) => salvarCorLoja(input.dataset.loja, input.dataset.campo, input.value)));
        box.querySelectorAll('.js-loja-cor-reset').forEach(btn => btn.addEventListener('click', () => resetarCoresLoja(btn.dataset.loja)));
    }

    async function uploadLojaFavicon(e, lojaId) {
        const file = e.target.files[0];
        if (!file) return;
        const wrap = e.target.closest('.loja-admin-favicon');
        wrap.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
            const faviconUrl = await Utils.compressImageToBase64(file, { maxDim: 128, maxBytes: 60000, square: true });
            await window.db.collection('lojas').doc(lojaId).update({ faviconUrl });
        } catch (err) {
            Utils.toast('Não foi possível usar essa imagem: ' + err.message, 'error');
        }
        await loadLojas();
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

    async function uploadCapaLanding(e) {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('capalanding-uploading');
        status.style.display = 'inline';
        try {
            const capaLanding = await Utils.compressImageToBase64(file, { maxDim: 1400, maxBytes: 320000 });
            await Loja.ref().set({ capaLanding }, { merge: true });
            Utils.toast('Capa da página inicial atualizada.', 'success');
        } catch (err) {
            Utils.toast('Erro ao enviar imagem: ' + err.message, 'error');
        } finally {
            status.style.display = 'none';
            e.target.value = '';
        }
    }

    async function removeCapaLanding() {
        Utils.confirmDialog('Remover a capa da página inicial?', async () => {
            try {
                await Loja.ref().update({ capaLanding: firebase.firestore.FieldValue.delete() });
                Utils.closeModal();
                Utils.toast('Imagem removida.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover imagem', 'Sim, remover');
    }

    function capaLandingGridHtml(capaLanding) {
        if (!capaLanding) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma imagem definida — o topo mostra um fundo padrão.</span>';
        return `
            <div class="capa-thumb">
                <img src="${capaLanding}">
                <button class="js-capalanding-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    }

    async function salvarCorLanding(campo, valor) {
        try { await Loja.ref().update({ [campo]: valor }); } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    function resetarCorLanding() {
        Utils.confirmDialog('Restaurar as cores padrão da página inicial?', async () => {
            try {
                await Loja.ref().update({
                    corPrincipal: firebase.firestore.FieldValue.delete(),
                    corFundo: firebase.firestore.FieldValue.delete(),
                    corTexto: firebase.firestore.FieldValue.delete()
                });
                Utils.closeModal();
                Utils.toast('Cores restauradas.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Restaurar cores padrão', 'Sim, restaurar');
    }

    async function salvarTextosLanding(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
            await Loja.ref().set({
                heroEyebrow: document.getElementById('f-landing-eyebrow').value.trim(),
                apresentacaoTitulo: document.getElementById('f-landing-ap-titulo').value.trim(),
                apresentacaoTexto: document.getElementById('f-landing-ap-texto').value.trim()
            }, { merge: true });
            Utils.toast('Textos atualizados.', 'success');
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async function uploadApresentacaoImagem(e) {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('apresentacao-uploading');
        status.style.display = 'inline';
        try {
            const apresentacaoImagem = await Utils.compressImageToBase64(file, { maxDim: 1000, maxBytes: 260000 });
            await Loja.ref().set({ apresentacaoImagem }, { merge: true });
            Utils.toast('Imagem da apresentação atualizada.', 'success');
        } catch (err) {
            Utils.toast('Erro ao enviar imagem: ' + err.message, 'error');
        } finally {
            status.style.display = 'none';
            e.target.value = '';
        }
    }

    async function removeApresentacaoImagem() {
        Utils.confirmDialog('Remover a imagem da apresentação?', async () => {
            try {
                await Loja.ref().update({ apresentacaoImagem: firebase.firestore.FieldValue.delete() });
                Utils.closeModal();
                Utils.toast('Imagem removida.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover imagem', 'Sim, remover');
    }

    function apresentacaoGridHtml(imagem) {
        if (!imagem) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma imagem definida — aparece um espaço reservado no lugar.</span>';
        return `
            <div class="capa-thumb">
                <img src="${imagem}">
                <button class="js-apresentacao-remove" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    }

    function openBeneficioForm(id) {
        const c = id ? Store.beneficios.find(x => x.id === id) : null;
        let novaImagem = null;
        Utils.openModal(`
            <div class="modal-head"><h3>${c ? 'Editar card' : 'Novo card de benefício'}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="beneficio-card-form">
                <div class="form-group">
                    <label>Foto (quadrada) ${c ? '' : '*'}</label>
                    <div class="insta-form-preview" id="beneficio-card-preview">
                        ${c && c.imagem ? `<img src="${c.imagem}">` : '<i class="fa-solid fa-image" style="color:var(--text-muted);font-size:1.6rem;"></i>'}
                    </div>
                    <label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> ${c ? 'Trocar foto' : 'Escolher foto'}
                        <input type="file" id="beneficio-card-input" accept="image/*" style="display:none;">
                    </label>
                </div>
                <div class="form-group"><label>Título *</label><input type="text" id="f-beneficio-titulo" required maxlength="60" value="${c ? Utils.escapeHtml(c.titulo || '') : ''}" placeholder="Ex: Entrega rápida"></div>
                <div class="form-group"><label>Texto</label><textarea id="f-beneficio-texto" rows="2" placeholder="Um textinho curto sobre o benefício">${c ? Utils.escapeHtml(c.texto || '') : ''}</textarea></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="beneficio-card-submit"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);

        document.getElementById('beneficio-card-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const preview = document.getElementById('beneficio-card-preview');
            const original = preview.innerHTML;
            preview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                novaImagem = await Utils.compressImageToBase64(file, { maxDim: 700, maxBytes: 220000, square: true });
                preview.innerHTML = `<img src="${novaImagem}">`;
            } catch (err) {
                Utils.toast('Não foi possível usar essa imagem: ' + err.message, 'error');
                preview.innerHTML = original;
            }
        });

        document.getElementById('beneficio-card-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!novaImagem && !(c && c.imagem)) { Utils.toast('Escolha uma foto para o card.', 'error'); return; }
            const btn = document.getElementById('beneficio-card-submit');
            btn.disabled = true;
            try {
                const data = {
                    titulo: document.getElementById('f-beneficio-titulo').value.trim(),
                    texto: document.getElementById('f-beneficio-texto').value.trim()
                };
                if (novaImagem) data.imagem = novaImagem;
                if (c) {
                    await Loja.col('beneficios').doc(c.id).update(data);
                } else {
                    data.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
                    await Loja.col('beneficios').add(data);
                }
                Utils.closeModal();
                Utils.toast(c ? 'Card atualizado.' : 'Card adicionado.', 'success');
            } catch (err) {
                Utils.toast('Erro ao salvar: ' + err.message, 'error');
                btn.disabled = false;
            }
        });
    }

    async function removeBeneficioCard(id) {
        Utils.confirmDialog('Remover este card de benefício?', async () => {
            try {
                await Loja.col('beneficios').doc(id).delete();
                Utils.toast('Card removido.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover card', 'Sim, remover');
    }

    function beneficioCardGridHtml(cards) {
        if (!cards || !cards.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhum card criado ainda — a página inicial mostra 4 cards padrão no lugar.</span>';
        return cards.map(c => `
            <div class="insta-card-admin">
                <div class="insta-card-admin-img">${c.imagem ? `<img src="${c.imagem}">` : ''}</div>
                <div class="insta-card-admin-body">
                    <strong>${Utils.escapeHtml(c.titulo || '(sem título)')}</strong>
                    <span>${Utils.escapeHtml(c.texto || '')}</span>
                </div>
                <div class="insta-card-admin-actions">
                    <button class="js-beneficio-edit" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="js-beneficio-remove del" data-id="${c.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    function openEquipeForm(id) {
        const c = id ? Store.equipe.find(x => x.id === id) : null;
        let novaFoto = null;
        Utils.openModal(`
            <div class="modal-head"><h3>${c ? 'Editar pessoa' : 'Nova pessoa na equipe'}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="equipe-card-form">
                <div class="form-group">
                    <label>Foto (quadrada)</label>
                    <div class="insta-form-preview" id="equipe-card-preview">
                        ${c && c.foto ? `<img src="${c.foto}">` : '<i class="fa-solid fa-user" style="color:var(--text-muted);font-size:1.6rem;"></i>'}
                    </div>
                    <label class="btn btn-outline btn-sm" style="cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> ${c ? 'Trocar foto' : 'Escolher foto'}
                        <input type="file" id="equipe-card-input" accept="image/*" style="display:none;">
                    </label>
                </div>
                <div class="form-group"><label>Nome *</label><input type="text" id="f-equipe-nome" required maxlength="60" value="${c ? Utils.escapeHtml(c.nome || '') : ''}" placeholder="Ex: Maria Silva"></div>
                <div class="form-group"><label>Descrição</label><textarea id="f-equipe-descricao" rows="2" placeholder="Cargo ou uma breve apresentação">${c ? Utils.escapeHtml(c.descricao || '') : ''}</textarea></div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="equipe-card-submit"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);

        document.getElementById('equipe-card-input').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const preview = document.getElementById('equipe-card-preview');
            const original = preview.innerHTML;
            preview.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try {
                novaFoto = await Utils.compressImageToBase64(file, { maxDim: 600, maxBytes: 200000, square: true });
                preview.innerHTML = `<img src="${novaFoto}">`;
            } catch (err) {
                Utils.toast('Não foi possível usar essa foto: ' + err.message, 'error');
                preview.innerHTML = original;
            }
        });

        document.getElementById('equipe-card-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('equipe-card-submit');
            btn.disabled = true;
            try {
                const data = {
                    nome: document.getElementById('f-equipe-nome').value.trim(),
                    descricao: document.getElementById('f-equipe-descricao').value.trim()
                };
                if (novaFoto) data.foto = novaFoto;
                if (c) {
                    await Loja.col('equipe').doc(c.id).update(data);
                } else {
                    data.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
                    await Loja.col('equipe').add(data);
                }
                Utils.closeModal();
                Utils.toast(c ? 'Atualizado.' : 'Adicionado à equipe.', 'success');
            } catch (err) {
                Utils.toast('Erro ao salvar: ' + err.message, 'error');
                btn.disabled = false;
            }
        });
    }

    async function removeEquipeCard(id) {
        Utils.confirmDialog('Remover esta pessoa da equipe?', async () => {
            try {
                await Loja.col('equipe').doc(id).delete();
                Utils.toast('Removido.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover', 'Sim, remover');
    }

    function equipeCardGridHtml(cards) {
        if (!cards || !cards.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Ninguém adicionado ainda — a seção "Conheça nossa equipe" fica escondida na página inicial.</span>';
        return cards.map(c => `
            <div class="insta-card-admin">
                <div class="insta-card-admin-img">${c.foto ? `<img src="${c.foto}">` : ''}</div>
                <div class="insta-card-admin-body">
                    <strong>${Utils.escapeHtml(c.nome || '(sem nome)')}</strong>
                    <span>${Utils.escapeHtml(c.descricao || '')}</span>
                </div>
                <div class="insta-card-admin-actions">
                    <button class="js-equipe-edit" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="js-equipe-remove del" data-id="${c.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
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

        const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
        set('capa-grid', capaGridHtml(Store.capas));
        set('banner-grid', bannerGridHtml(c.bannerMeio));
        set('fundo-grid', fundoGridHtml(c.fundoPainel));
        set('fundoloja-grid', fundoLojaGridHtml(c.fundoLoja));
        set('insta-card-grid', instaCardGridHtml(Store.instaCards));
        set('chips-categorias', chipHtml('categoriasProdutos', c.categoriasProdutos));
        set('chips-pagamento', chipHtml('formasPagamento', c.formasPagamento));
        set('chips-usuarios', chipHtml('usuariosAutorizados', c.usuariosAutorizados));
        set('capalanding-grid', capaLandingGridHtml(c.capaLanding));
        set('apresentacao-grid', apresentacaoGridHtml(c.apresentacaoImagem));
        set('beneficio-card-grid', beneficioCardGridHtml(Store.beneficios));
        set('equipe-card-grid', equipeCardGridHtml(Store.equipe));

        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        setVal('f-cor-landing-principal', c.corPrincipal || '#C9962B');
        setVal('f-cor-landing-fundo', c.corFundo || '#FAF5EB');
        setVal('f-cor-landing-texto', c.corTexto || '#1C1A16');
        setVal('f-landing-eyebrow', c.heroEyebrow || '');
        setVal('f-landing-ap-titulo', c.apresentacaoTitulo || '');
        setVal('f-landing-ap-texto', c.apresentacaoTexto || '');

        const user = Auth.currentUser();
        const contaEmailEl = document.getElementById('conta-email');
        if (user && contaEmailEl) contaEmailEl.textContent = user.email;

        const p = Store.profile || {};
        setVal('f-perfil-nome', p.nome || '');
        setVal('f-perfil-telefone', p.telefone || '');
        const avatarEl = document.getElementById('conta-avatar');
        if (avatarEl) {
            avatarEl.innerHTML = p.fotoUrl
                ? `<img src="${p.fotoUrl}" style="width:100%;height:100%;object-fit:cover;">`
                : (p.nome || Auth.initials() || 'A').trim().charAt(0).toUpperCase();
        }
    }

    return { mount, render };
})();
