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
                <div class="panel" style="max-width:640px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Pagamento online <span class="pgto-status-chip" id="pgto-status-chip">Carregando...</span></h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);line-height:1.6;margin-bottom:14px;">
                        Com isso ativado, quem compra na sua loja virtual paga direto dentro do site — Pix
                        (com QR Code) ou cartão — numa tela própria, e o pedido só aparece aqui no painel,
                        em "Pedidos", depois que o pagamento for confirmado. Desativado, a loja continua
                        funcionando como hoje (o pedido é combinado direto pelo WhatsApp).
                    </p>
                    <div id="pgto-sem-liberar" style="display:none;font-size:0.85rem;color:var(--text-muted);background:var(--surface-soft);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;">
                        Ainda não disponível pra essa loja — fale com quem administra a Excellent Loja pra liberar.
                    </div>
                    <label class="pgto-toggle-row" id="pgto-ativo-row" style="display:none;">
                        <input type="checkbox" id="f-pgto-ativo">
                        <span>Usar pagamento online nesta loja</span>
                    </label>
                    ${Store.config.planoAtual ? `
                    <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">
                    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:10px;">
                        Precisa de ajuda pra configurar alguma API (Mercado Pago ou outra)? Fale direto com o suporte.
                    </p>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-whatsapp-suporte-api"><i class="fa-brands fa-whatsapp"></i> Falar no WhatsApp do suporte</button>
                    ` : ''}
                </div>
            </div>`}

            <div class="settings-panel" id="panel-imagens">
                ${souSuperAdmin ? `
                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Capa da página inicial</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Imagem de fundo do topo da página inicial (excellentloja.vercel.app). Aparece
                        sem escurecer — se quiser algum texto ou logotipo nela, inclua já na própria
                        imagem. Com 1 foto, o formato se ajusta à imagem sem cortar; com mais de uma,
                        elas alternam automaticamente a cada 3 segundos (use fotos na horizontal,
                        proporção 3:1, pra ficarem consistentes entre si).
                    </p>
                    <div class="capa-grid" id="capalanding-grid"></div>
                    <label class="btn btn-outline btn-sm" style="margin-top:14px;cursor:pointer;display:inline-flex;">
                        <i class="fa-solid fa-upload"></i> Adicionar foto
                        <input type="file" id="capalanding-input" accept="image/*" style="display:none;">
                    </label>
                    <span id="capalanding-uploading" style="display:none;margin-left:10px;font-size:0.82rem;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                </div>

                <div class="panel" style="max-width:680px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Cores e fonte da página inicial</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Paleta e fonte usadas só na página inicial (excellentloja.vercel.app) — não
                        afeta o painel de gestão nem as lojas criadas, que têm suas próprias cores e
                        fonte em Gerenciar lojas.
                    </p>
                    <div class="loja-admin-cores" style="margin:0 0 10px;">
                        <label>Cor principal<input type="color" id="f-cor-landing-principal" value="${Store.config.corPrincipal || '#C9962B'}"></label>
                        <label>Cor de fundo<input type="color" id="f-cor-landing-fundo" value="${Store.config.corFundo || '#FAF5EB'}"></label>
                        <label>Cor do texto<input type="color" id="f-cor-landing-texto" value="${Store.config.corTexto || '#1C1A16'}"></label>
                        <button type="button" class="js-loja-cor-reset" id="btn-reset-cor-landing" title="Restaurar cores e fonte padrão"><i class="fa-solid fa-rotate-left"></i> Padrão</button>
                    </div>
                    <div class="loja-admin-cores" style="margin:0 0 14px;">
                        <label>Cabeçalho<input type="color" id="f-cor-landing-cabecalho" value="${Store.config.corCabecalho || '#FFFFFF'}"></label>
                        <label>Rodapé<input type="color" id="f-cor-landing-rodape" value="${Store.config.corRodape || Utils.darkenColor(Store.config.corPrincipal || '#C9962B', 0.85)}"></label>
                        <label>Botão<input type="color" id="f-cor-landing-botao" value="${Store.config.corBotao || Store.config.corPrincipal || '#C9962B'}"></label>
                        <label>Texto do botão<input type="color" id="f-cor-landing-botao-texto" value="${Store.config.corBotaoTexto || '#FFFFFF'}"></label>
                        <label>Cards<input type="color" id="f-cor-landing-card" value="${Store.config.corCard || '#FFFFFF'}"></label>
                        <label>Texto dos cards<input type="color" id="f-cor-landing-card-texto" value="${Store.config.corCardTexto || Store.config.corTexto || '#1C1A16'}"></label>
                    </div>
                    <div class="loja-admin-cores" style="margin:0 0 14px;">
                        <label title="Deixa o fundo com um degradê entre duas cores em vez de uma cor só">
                            <input type="checkbox" id="f-landing-fundo-degrade" ${Store.config.fundoDegrade ? 'checked' : ''}> Fundo em degradê
                        </label>
                        <label id="wrap-cor-landing-fundo2" style="${Store.config.fundoDegrade ? '' : 'display:none;'}">
                            Cor de fundo 2<input type="color" id="f-cor-landing-fundo2" value="${Store.config.corFundo2 || '#F1DFC4'}">
                        </label>
                        <label title="Textura sutil de grade fixa no fundo da página inicial">
                            <input type="checkbox" id="f-landing-textura" ${Store.config.texturaGrade ? 'checked' : ''}> Textura de grade
                        </label>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Fonte das letras</label>
                        <select id="f-fonte-landing">${Utils.fontSelectOptionsHtml(Store.config.fonteId)}</select>
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
                    <div class="form-group" style="margin:16px 0 0;">
                        <label>Tamanho da imagem <span id="apresentacao-tamanho-valor" style="color:var(--text-muted);font-weight:400;"></span></label>
                        <input type="range" id="f-apresentacao-tamanho" min="50" max="150" step="5" value="100" style="width:100%;">
                    </div>
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
                </div>

                <div class="panel" style="max-width:820px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Planos</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Cards de planos exibidos quando alguém clica em "Quero minha loja". Cada plano
                        tem nome, preço, cor de destaque e uma lista de itens que você marca como
                        incluídos ou não. Sem nenhum plano criado, aparecem 3 planos de exemplo
                        (Básico, Profissional e Empresarial).
                    </p>
                    <div class="plano-admin-grid" id="plano-card-grid"></div>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-plano-card" style="margin-top:14px;">
                        <i class="fa-solid fa-plus"></i> Adicionar plano
                    </button>
                </div>

                <div class="panel" style="max-width:820px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Cores do checkout</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Cores da tela de pagamento que abre quando alguém clica em "Quero esse
                        plano" — independentes das cores da página inicial.
                    </p>
                    <div class="loja-admin-cores" style="margin:0 0 10px;">
                        <label>Fundo do card<input type="color" class="js-checkout-cor" data-campo="checkoutCorFundo" value="${Store.config.checkoutCorFundo || '#FFFFFF'}"></label>
                        <label>Texto<input type="color" class="js-checkout-cor" data-campo="checkoutCorTexto" value="${Store.config.checkoutCorTexto || '#1C1A16'}"></label>
                        <button type="button" class="js-loja-cor-reset" id="btn-reset-checkout-cores" title="Restaurar cores padrão do checkout"><i class="fa-solid fa-rotate-left"></i> Padrão</button>
                    </div>
                    <div class="loja-admin-cores" style="margin:0 0 10px;">
                        <label>Botões<input type="color" class="js-checkout-cor" data-campo="checkoutCorBotao" value="${Store.config.checkoutCorBotao || '#C9962B'}"></label>
                        <label>Texto dos botões<input type="color" class="js-checkout-cor" data-campo="checkoutCorBotaoTexto" value="${Store.config.checkoutCorBotaoTexto || '#FFFFFF'}"></label>
                        <label>Fundo das bolinhas<input type="color" class="js-checkout-cor" data-campo="checkoutCorBolinha" value="${Store.config.checkoutCorBolinha || Store.config.checkoutCorBotao || '#C9962B'}"></label>
                        <label>Texto das bolinhas<input type="color" class="js-checkout-cor" data-campo="checkoutCorBolinhaTexto" value="${Store.config.checkoutCorBolinhaTexto || '#FFFFFF'}"></label>
                    </div>
                    <div class="loja-admin-cores" style="margin:0;">
                        <label>Fundo da barra de preencher<input type="color" class="js-checkout-cor" data-campo="checkoutCorInputFundo" value="${Store.config.checkoutCorInputFundo || '#FBF6EC'}"></label>
                        <label>Letras da barra de preencher<input type="color" class="js-checkout-cor" data-campo="checkoutCorInputTexto" value="${Store.config.checkoutCorInputTexto || '#1C1A16'}"></label>
                    </div>
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
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Personalize seu painel</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Cores e frase do <strong>seu</strong> painel de gestão e da tela de login — não
                        afeta a página inicial nem o painel de nenhuma loja criada.
                    </p>
                    <div class="form-group" style="max-width:420px;">
                        <label>Frase abaixo da logo (barra lateral e login)</label>
                        <input type="text" id="f-root-painel-tagline" maxlength="60" value="${Utils.escapeHtml(Store.config.painelTagline || 'Excelência em cada venda 🏆')}">
                    </div>
                    <div class="loja-admin-cores" style="margin:14px 0 10px;">
                        <label>Cor principal<input type="color" class="js-root-painel-cor" data-campo="painelCorPrincipal" value="${Store.config.painelCorPrincipal || '#C9962B'}"></label>
                        <label>Cor de fundo<input type="color" class="js-root-painel-cor" data-campo="painelCorFundo" value="${Store.config.painelCorFundo || '#FAF5EB'}"></label>
                        <label>Cor do texto<input type="color" class="js-root-painel-cor" data-campo="painelCorTexto" value="${Store.config.painelCorTexto || '#1C1A16'}"></label>
                        <button type="button" class="js-loja-cor-reset" id="btn-reset-painel-root" title="Restaurar cores e frase padrão"><i class="fa-solid fa-rotate-left"></i> Padrão</button>
                    </div>
                    <div class="loja-admin-cores" style="margin:0;">
                        <label>Barra lateral<input type="color" class="js-root-painel-cor" data-campo="painelCorSidebar" value="${Store.config.painelCorSidebar || '#FFFFFF'}"></label>
                        <label>Texto da barra lateral<input type="color" class="js-root-painel-cor" data-campo="painelCorSidebarTexto" value="${Store.config.painelCorSidebarTexto || Store.config.painelCorTexto || '#1C1A16'}"></label>
                        <label>Cabeçalho<input type="color" class="js-root-painel-cor" data-campo="painelCorCabecalho" value="${Store.config.painelCorCabecalho || '#FFFFFF'}"></label>
                        <label>Texto do cabeçalho<input type="color" class="js-root-painel-cor" data-campo="painelCorCabecalhoTexto" value="${Store.config.painelCorCabecalhoTexto || Store.config.painelCorTexto || '#1C1A16'}"></label>
                        <label>Rodapé (menu mobile)<input type="color" class="js-root-painel-cor" data-campo="painelCorRodape" value="${Store.config.painelCorRodape || '#FFFFFF'}"></label>
                        <label>Botão<input type="color" class="js-root-painel-cor" data-campo="painelCorBotao" value="${Store.config.painelCorBotao || Store.config.painelCorPrincipal || '#C9962B'}"></label>
                        <label>Texto do botão<input type="color" class="js-root-painel-cor" data-campo="painelCorBotaoTexto" value="${Store.config.painelCorBotaoTexto || '#FFFFFF'}"></label>
                        <label>Cards<input type="color" class="js-root-painel-cor" data-campo="painelCorCard" value="${Store.config.painelCorCard || '#FFFFFF'}"></label>
                        <label>Texto dos cards<input type="color" class="js-root-painel-cor" data-campo="painelCorCardTexto" value="${Store.config.painelCorCardTexto || Store.config.painelCorTexto || '#1C1A16'}"></label>
                    </div>
                </div>
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
                <div class="panel" style="max-width:640px;margin-bottom:20px;">
                    <h3 style="font-size:0.95rem;margin-bottom:4px;">Cobrança da plataforma</h3>
                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
                        Credenciais do <strong>seu</strong> Mercado Pago, usadas quando alguém compra um
                        plano na página inicial (essa cobrança é sua, separada do Mercado Pago de cada loja).
                    </p>
                    <div id="pagamento-plataforma-body"><div class="store-payment-loading"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div></div>
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
            document.getElementById('f-cor-landing-cabecalho').addEventListener('change', (e) => salvarCorLanding('corCabecalho', e.target.value));
            document.getElementById('f-cor-landing-rodape').addEventListener('change', (e) => salvarCorLanding('corRodape', e.target.value));
            document.getElementById('f-cor-landing-botao').addEventListener('change', (e) => salvarCorLanding('corBotao', e.target.value));
            document.getElementById('f-cor-landing-botao-texto').addEventListener('change', (e) => salvarCorLanding('corBotaoTexto', e.target.value));
            document.getElementById('f-cor-landing-card').addEventListener('change', (e) => salvarCorLanding('corCard', e.target.value));
            document.getElementById('f-cor-landing-card-texto').addEventListener('change', (e) => salvarCorLanding('corCardTexto', e.target.value));
            document.getElementById('f-landing-fundo-degrade').addEventListener('change', (e) => {
                document.getElementById('wrap-cor-landing-fundo2').style.display = e.target.checked ? '' : 'none';
                salvarCorLanding('fundoDegrade', e.target.checked);
            });
            document.getElementById('f-cor-landing-fundo2').addEventListener('change', (e) => salvarCorLanding('corFundo2', e.target.value));
            document.getElementById('f-landing-textura').addEventListener('change', (e) => salvarCorLanding('texturaGrade', e.target.checked));
            document.getElementById('f-fonte-landing').addEventListener('change', (e) => salvarCorLanding('fonteId', e.target.value));
            document.getElementById('btn-reset-cor-landing').addEventListener('click', resetarCorLanding);
            document.querySelectorAll('.js-checkout-cor').forEach(input => input.addEventListener('change', (e) => salvarCorLanding(e.target.dataset.campo, e.target.value)));
            document.getElementById('btn-reset-checkout-cores').addEventListener('click', resetarCoresCheckout);
            document.getElementById('landing-textos-form').addEventListener('submit', salvarTextosLanding);
            document.getElementById('apresentacao-input').addEventListener('change', uploadApresentacaoImagem);
            document.getElementById('f-apresentacao-tamanho').addEventListener('input', (e) => {
                document.getElementById('apresentacao-tamanho-valor').textContent = `(${e.target.value}%)`;
            });
            document.getElementById('f-apresentacao-tamanho').addEventListener('change', (e) => salvarTamanhoApresentacao(Number(e.target.value)));
            document.getElementById('btn-add-beneficio-card').addEventListener('click', () => openBeneficioForm());
            document.getElementById('btn-add-equipe-card').addEventListener('click', () => openEquipeForm());
            document.getElementById('btn-add-plano-card').addEventListener('click', () => openPlanoForm());
        } else {
            document.getElementById('btn-add-categoria').addEventListener('click', () => addChip('categoriasProdutos', 'new-categoria'));
            document.getElementById('btn-add-pagamento').addEventListener('click', () => addChip('formasPagamento', 'new-pagamento'));
            document.getElementById('new-categoria').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('categoriasProdutos', 'new-categoria'); } });
            document.getElementById('new-pagamento').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addChip('formasPagamento', 'new-pagamento'); } });
            document.getElementById('capa-input').addEventListener('change', uploadCapa);
            document.getElementById('banner-input').addEventListener('change', uploadBanner);
            document.getElementById('fundoloja-input').addEventListener('change', uploadFundoLoja);
            document.getElementById('btn-add-insta-card').addEventListener('click', () => openInstaCardForm());
            document.getElementById('f-pgto-ativo').addEventListener('change', (e) => alternarPagamentoAtivo(e.target.checked));
            carregarPagamentoStatus();
            const btnWhatsSuporte = document.getElementById('btn-whatsapp-suporte-api');
            if (btnWhatsSuporte) btnWhatsSuporte.addEventListener('click', abrirWhatsappSuporte);
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
            const editPlano = e.target.closest('.js-plano-edit');
            const rmPlano = e.target.closest('.js-plano-remove');
            const rmLoja = e.target.closest('.js-loja-remove');
            const apisLoja = e.target.closest('.js-loja-apis');
            const addLojaEmail = e.target.closest('.js-loja-email-add');
            const rmLojaEmail = e.target.closest('.js-loja-email-remove');
            if (rm) removeChip(rm.dataset.field, rm.dataset.value);
            if (rmCapa) removeCapa(rmCapa.dataset.id);
            if (rmBanner) removeBanner();
            if (rmFundo) removeFundoPainel();
            if (rmFundoLoja) removeFundoLoja();
            if (rmCapaLanding) removeCapaLanding(rmCapaLanding.dataset.id);
            if (editInsta) openInstaCardForm(editInsta.dataset.id);
            if (rmInsta) removeInstaCard(rmInsta.dataset.id);
            if (rmApresentacao) removeApresentacaoImagem();
            if (editBeneficio) openBeneficioForm(editBeneficio.dataset.id);
            if (rmBeneficio) removeBeneficioCard(rmBeneficio.dataset.id);
            if (editEquipe) openEquipeForm(editEquipe.dataset.id);
            if (rmEquipe) removeEquipeCard(rmEquipe.dataset.id);
            if (editPlano) openPlanoForm(editPlano.dataset.id);
            if (rmPlano) removePlanoCard(rmPlano.dataset.id);
            if (rmLoja) removerLoja(rmLoja.dataset.id, rmLoja.dataset.nome);
            if (apisLoja) abrirApisLoja(apisLoja.dataset.id, apisLoja.dataset.nome);
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
            carregarPagamentoPlataforma();
            document.querySelectorAll('.js-root-painel-cor').forEach(input => input.addEventListener('change', (e) => salvarCorLoja('root', e.target.dataset.campo, e.target.value)));
            document.getElementById('btn-reset-painel-root').addEventListener('click', resetarPainelRoot);
            document.getElementById('f-root-painel-tagline').addEventListener('change', async (e) => {
                try { await Loja.ref().update({ painelTagline: e.target.value.trim() }); }
                catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
            });
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

    async function abrirWhatsappSuporte() {
        const btn = document.getElementById('btn-whatsapp-suporte-api');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Abrindo...';
        try {
            const snap = await window.db.collection('lojas').doc('root').get();
            const tel = ((snap.exists && snap.data().telefone) || '').replace(/\D/g, '');
            if (!tel) { Utils.toast('O suporte ainda não configurou um WhatsApp de contato.', 'error'); return; }
            const texto = `Olá! Sou administrador(a) da loja "${Store.config.nomeLoja || Loja.id}" e preciso de ajuda para configurar uma API.`;
            window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`, '_blank');
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }

    async function carregarPagamentoStatus() {
        const chip = document.getElementById('pgto-status-chip');
        try {
            const snap = await Loja.col('config').doc('pagamentoStatus').get();
            const s = snap.exists ? snap.data() : {};
            const liberado = !!s.liberado;
            document.getElementById('pgto-sem-liberar').style.display = liberado ? 'none' : 'block';
            document.getElementById('pgto-ativo-row').style.display = liberado ? 'flex' : 'none';
            const ativoInput = document.getElementById('f-pgto-ativo');
            if (ativoInput) ativoInput.checked = !!s.ativo;
            if (chip) {
                chip.textContent = !liberado ? 'Não disponível' : (s.ativo ? 'Ativo' : 'Disponível, mas inativo');
                chip.classList.toggle('on', liberado && !!s.ativo);
            }
        } catch (err) {
            if (chip) chip.textContent = 'Erro ao carregar';
        }
    }

    async function alternarPagamentoAtivo(ativo) {
        const input = document.getElementById('f-pgto-ativo');
        input.disabled = true;
        try {
            const statusRef = Loja.col('config').doc('pagamentoStatus');
            const statusSnap = await statusRef.get();
            const liberado = statusSnap.exists && !!statusSnap.data().liberado;
            if (!liberado) { Utils.toast('Ainda não liberado pra essa loja.', 'error'); input.checked = false; return; }
            await statusRef.update({ ativo, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
            // espelha só o "ligado/desligado" no doc público da loja — a Public Key já foi
            // gravada lá por quem liberou; aqui só ajustamos o interruptor.
            await Loja.ref().update({ 'pagamentoOnline.ativo': ativo });
            Utils.toast(ativo ? 'Pagamento online ativado.' : 'Pagamento online desativado.', 'success');
            await carregarPagamentoStatus();
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
            input.checked = !ativo;
        } finally {
            input.disabled = false;
        }
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
                    <button class="js-loja-apis" data-id="${l.id}" data-nome="${Utils.escapeHtml(l.nomeLoja || l.id)}" title="APIs / pagamento online"><i class="fa-solid fa-plug"></i></button>
                    <a href="/${l.id}" class="js-loja-enter" title="Entrar no painel desta loja"><i class="fa-solid fa-arrow-right-to-bracket"></i></a>
                    <button class="js-loja-remove" data-id="${l.id}" data-nome="${Utils.escapeHtml(l.nomeLoja || l.id)}" title="Excluir loja"><i class="fa-solid fa-trash"></i></button>
                </div>
                <span class="loja-admin-grupo-label"><i class="fa-solid fa-shop"></i> Loja virtual</span>
                <div class="loja-admin-cores">
                    <label>Cor principal<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corPrincipal" value="${l.corPrincipal || '#C9962B'}"></label>
                    <label>Cor de fundo<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corFundo" value="${l.corFundo || '#FAF5EB'}"></label>
                    <label>Cor do texto<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corTexto" value="${l.corTexto || '#1C1A16'}"></label>
                    <button type="button" class="js-loja-cor-reset" data-loja="${l.id}" title="Restaurar cores padrão"><i class="fa-solid fa-rotate-left"></i> Padrão</button>
                </div>
                <div class="loja-admin-cores">
                    <label>Cabeçalho<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corCabecalho" value="${l.corCabecalho || '#FFFFFF'}"></label>
                    <label>Rodapé<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corRodape" value="${l.corRodape || Utils.darkenColor(l.corPrincipal || '#C9962B', 0.85)}"></label>
                    <label>Botão<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corBotao" value="${l.corBotao || l.corPrincipal || '#C9962B'}"></label>
                    <label>Texto do botão<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corBotaoTexto" value="${l.corBotaoTexto || '#FFFFFF'}"></label>
                    <label>Cards<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corCard" value="${l.corCard || '#FFFFFF'}"></label>
                    <label>Texto dos cards<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="corCardTexto" value="${l.corCardTexto || l.corTexto || '#1C1A16'}"></label>
                    <label title="Textura de grade fixa no fundo da loja"><input type="checkbox" class="js-loja-textura" data-loja="${l.id}" ${l.texturaGrade ? 'checked' : ''}> Textura de grade</label>
                    <label>Fonte (loja e painel)<select class="js-loja-fonte" data-loja="${l.id}" style="width:auto;">${Utils.fontSelectOptionsHtml(l.fonteId)}</select></label>
                </div>
                <span class="loja-admin-grupo-label"><i class="fa-solid fa-gauge"></i> Painel administrativo (de quem gerencia esta loja)</span>
                <div class="loja-admin-cores">
                    <label>Cor principal<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorPrincipal" value="${l.painelCorPrincipal || '#C9962B'}"></label>
                    <label>Cor de fundo<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorFundo" value="${l.painelCorFundo || '#FAF5EB'}"></label>
                    <label>Cor do texto<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorTexto" value="${l.painelCorTexto || '#1C1A16'}"></label>
                    <button type="button" class="js-loja-cor-reset-painel" data-loja="${l.id}" title="Restaurar cores padrão do painel"><i class="fa-solid fa-rotate-left"></i> Padrão</button>
                </div>
                <div class="loja-admin-cores">
                    <label>Barra lateral<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorSidebar" value="${l.painelCorSidebar || '#FFFFFF'}"></label>
                    <label>Cabeçalho<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorCabecalho" value="${l.painelCorCabecalho || '#FFFFFF'}"></label>
                    <label>Rodapé (menu mobile)<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorRodape" value="${l.painelCorRodape || '#FFFFFF'}"></label>
                    <label>Botão<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorBotao" value="${l.painelCorBotao || l.painelCorPrincipal || '#C9962B'}"></label>
                    <label>Texto do botão<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorBotaoTexto" value="${l.painelCorBotaoTexto || '#FFFFFF'}"></label>
                    <label>Cards<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorCard" value="${l.painelCorCard || '#FFFFFF'}"></label>
                    <label>Texto dos cards<input type="color" class="js-loja-cor" data-loja="${l.id}" data-campo="painelCorCardTexto" value="${l.painelCorCardTexto || l.painelCorTexto || '#1C1A16'}"></label>
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
        box.querySelectorAll('.js-loja-cor-reset-painel').forEach(btn => btn.addEventListener('click', () => resetarCoresPainelLoja(btn.dataset.loja)));
        box.querySelectorAll('.js-loja-textura').forEach(input => input.addEventListener('change', (e) => salvarCorLoja(input.dataset.loja, 'texturaGrade', e.target.checked)));
        box.querySelectorAll('.js-loja-fonte').forEach(input => input.addEventListener('change', (e) => salvarCorLoja(input.dataset.loja, 'fonteId', e.target.value)));
    }

    async function abrirApisLoja(lojaId, nome) {
        Utils.openModal(`
            <div class="modal-head"><h3>APIs — ${Utils.escapeHtml(nome)}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:-8px 0 16px;">
                Cada chave fica só aqui no seu painel — quem administra essa loja nunca vê ou edita
                as chaves, só liga/desliga o uso depois que você libera.
            </p>
            <div id="apis-loja-body"><div class="store-payment-loading"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div></div>
        `, { wide: true });

        let dados = { liberado: false, publicKey: '', accessToken: '', webhookSecret: '' };
        try {
            const snap = await window.db.collection('lojas').doc(lojaId).collection('config').doc('pagamento').get();
            if (snap.exists) dados = { ...dados, ...snap.data() };
        } catch (err) {
            document.getElementById('apis-loja-body').innerHTML = `<span style="color:var(--danger);font-size:0.85rem;">Erro ao carregar: ${Utils.escapeHtml(err.message)}</span>`;
            return;
        }

        renderApisLojaBody(lojaId, dados);
    }

    function renderApisLojaBody(lojaId, dados) {
        const body = document.getElementById('apis-loja-body');
        if (!body) return;
        const webhookUrl = `${location.origin}/api/webhook-mercadopago?loja=${encodeURIComponent(lojaId)}`;
        body.innerHTML = `
            <div class="panel" style="margin:0;padding:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:${dados.liberado ? '14px' : '0'};">
                    <strong style="font-size:0.9rem;"><i class="fa-solid fa-credit-card"></i> Mercado Pago</strong>
                    <label class="pgto-toggle-row" style="margin:0;">
                        <input type="checkbox" id="f-api-liberado" ${dados.liberado ? 'checked' : ''}>
                        <span>Liberado pra essa loja</span>
                    </label>
                </div>
                <div id="apis-loja-campos" style="display:${dados.liberado ? 'block' : 'none'};">
                    <div class="form-group"><label>Public Key</label><input type="text" id="f-api-public-key" placeholder="APP_USR-..." value="${Utils.escapeHtml(dados.publicKey || '')}"></div>
                    <div class="form-group"><label>Access Token</label><input type="text" id="f-api-access-token" placeholder="APP_USR-..." value="${Utils.escapeHtml(dados.accessToken || '')}"></div>
                    <div class="form-group"><label>Chave secreta do Webhook <span style="font-weight:400;color:var(--text-muted);">(opcional, mas recomendado)</span></label><input type="text" id="f-api-webhook-secret" placeholder="Gerada ao cadastrar o webhook no Mercado Pago" value="${Utils.escapeHtml(dados.webhookSecret || '')}"></div>
                    <div class="form-group">
                        <label>URL para cadastrar no Mercado Pago (notificações → Pagamentos)</label>
                        <div class="add-chip-row" style="max-width:none;">
                            <input type="text" id="apis-loja-webhook-url" readonly value="${webhookUrl}">
                            <button type="button" class="btn btn-outline btn-sm" id="btn-copiar-webhook-loja"><i class="fa-solid fa-copy"></i> Copiar</button>
                        </div>
                    </div>
                </div>
                <div class="form-actions" style="margin-top:16px;">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="button" class="btn btn-primary" id="btn-salvar-api-loja"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </div>
        `;

        document.getElementById('f-api-liberado').addEventListener('change', (e) => {
            document.getElementById('apis-loja-campos').style.display = e.target.checked ? 'block' : 'none';
        });
        const copyBtn = document.getElementById('btn-copiar-webhook-loja');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            const input = document.getElementById('apis-loja-webhook-url');
            input.select();
            (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject())
                .then(() => Utils.toast('URL copiada!', 'success'))
                .catch(() => { try { document.execCommand('copy'); Utils.toast('URL copiada!', 'success'); } catch (e) { Utils.toast('Não foi possível copiar.', 'error'); } });
        });
        document.getElementById('btn-salvar-api-loja').addEventListener('click', () => salvarApiLoja(lojaId));
    }

    async function salvarApiLoja(lojaId) {
        const liberado = document.getElementById('f-api-liberado').checked;
        const publicKey = document.getElementById('f-api-public-key') ? document.getElementById('f-api-public-key').value.trim() : '';
        const accessToken = document.getElementById('f-api-access-token') ? document.getElementById('f-api-access-token').value.trim() : '';
        const webhookSecret = document.getElementById('f-api-webhook-secret') ? document.getElementById('f-api-webhook-secret').value.trim() : '';
        if (liberado && (!publicKey || !accessToken)) {
            Utils.toast('Preencha a Public Key e o Access Token antes de liberar.', 'error');
            return;
        }
        const btn = document.getElementById('btn-salvar-api-loja');
        btn.disabled = true;
        try {
            const lojaRef = window.db.collection('lojas').doc(lojaId);
            const statusSnap = await lojaRef.collection('config').doc('pagamentoStatus').get();
            const ativoEscolhidoPelaLoja = statusSnap.exists ? !!statusSnap.data().ativo : false;

            const batch = window.db.batch();
            batch.set(lojaRef.collection('config').doc('pagamento'), {
                liberado, publicKey, accessToken, webhookSecret,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            batch.set(lojaRef.collection('config').doc('pagamentoStatus'), {
                liberado, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            // a Public Key não é secreta (é usada no navegador do cliente), então fica
            // espelhada sempre que liberado — independe do interruptor "ativo" da loja,
            // que ela liga/desliga sozinha sem precisar reenviar a chave.
            batch.set(lojaRef, {
                pagamentoOnline: { ativo: liberado && ativoEscolhidoPelaLoja, publicKey: liberado ? publicKey : '' }
            }, { merge: true });
            await batch.commit();

            Utils.closeModal();
            Utils.toast('Configuração salva.', 'success');
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
            btn.disabled = false;
        }
    }

    async function carregarPagamentoPlataforma() {
        const body = document.getElementById('pagamento-plataforma-body');
        if (!body) return;
        let dados = { publicKey: '', accessToken: '', webhookSecret: '' };
        try {
            const snap = await window.db.collection('lojas').doc('root').collection('config').doc('pagamentoPlataforma').get();
            if (snap.exists) dados = { ...dados, ...snap.data() };
        } catch (err) {
            body.innerHTML = `<span style="color:var(--danger);font-size:0.85rem;">Erro ao carregar: ${Utils.escapeHtml(err.message)}</span>`;
            return;
        }
        renderPagamentoPlataformaBody(dados);
    }

    function renderPagamentoPlataformaBody(dados) {
        const body = document.getElementById('pagamento-plataforma-body');
        if (!body) return;
        const configurado = !!(dados.publicKey && dados.accessToken);
        const webhookUrl = `${location.origin}/api/webhook-compra-plano`;
        body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">
                <strong style="font-size:0.9rem;"><i class="fa-solid fa-credit-card"></i> Mercado Pago</strong>
                <span class="pgto-status-chip ${configurado ? 'on' : ''}">${configurado ? 'Configurado' : 'Não configurado'}</span>
            </div>
            <div class="form-group"><label>Public Key</label><input type="text" id="f-plataforma-public-key" placeholder="APP_USR-..." value="${Utils.escapeHtml(dados.publicKey || '')}"></div>
            <div class="form-group"><label>Access Token</label><input type="text" id="f-plataforma-access-token" placeholder="APP_USR-..." value="${Utils.escapeHtml(dados.accessToken || '')}"></div>
            <div class="form-group"><label>Chave secreta do Webhook <span style="font-weight:400;color:var(--text-muted);">(opcional, mas recomendado)</span></label><input type="text" id="f-plataforma-webhook-secret" placeholder="Gerada ao cadastrar o webhook no Mercado Pago" value="${Utils.escapeHtml(dados.webhookSecret || '')}"></div>
            <div class="form-group">
                <label>URL para cadastrar no Mercado Pago (notificações → Pagamentos)</label>
                <div class="add-chip-row" style="max-width:none;">
                    <input type="text" id="plataforma-webhook-url" readonly value="${webhookUrl}">
                    <button type="button" class="btn btn-outline btn-sm" id="btn-copiar-webhook-plataforma"><i class="fa-solid fa-copy"></i> Copiar</button>
                </div>
            </div>
            <div class="form-actions" style="margin-top:16px;">
                <button type="button" class="btn btn-primary" id="btn-salvar-plataforma-pagamento"><i class="fa-solid fa-check"></i> Salvar</button>
            </div>
        `;
        const copyBtn = document.getElementById('btn-copiar-webhook-plataforma');
        if (copyBtn) copyBtn.addEventListener('click', () => {
            const input = document.getElementById('plataforma-webhook-url');
            input.select();
            (navigator.clipboard ? navigator.clipboard.writeText(input.value) : Promise.reject())
                .then(() => Utils.toast('URL copiada!', 'success'))
                .catch(() => { try { document.execCommand('copy'); Utils.toast('URL copiada!', 'success'); } catch (e) { Utils.toast('Não foi possível copiar.', 'error'); } });
        });
        document.getElementById('btn-salvar-plataforma-pagamento').addEventListener('click', salvarPagamentoPlataforma);
    }

    async function salvarPagamentoPlataforma() {
        const publicKey = document.getElementById('f-plataforma-public-key').value.trim();
        const accessToken = document.getElementById('f-plataforma-access-token').value.trim();
        const webhookSecret = document.getElementById('f-plataforma-webhook-secret').value.trim();
        const btn = document.getElementById('btn-salvar-plataforma-pagamento');
        btn.disabled = true;
        try {
            await window.db.collection('lojas').doc('root').collection('config').doc('pagamentoPlataforma').set({
                publicKey, accessToken, webhookSecret,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            Utils.toast('Credenciais salvas.', 'success');
        } catch (err) {
            Utils.toast('Erro: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    async function uploadLojaFavicon(e, lojaId) {
        const file = e.target.files[0];
        if (!file) return;
        const wrap = e.target.closest('.loja-admin-favicon');
        wrap.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
            const faviconUrl = await Utils.compressImageToBase64(file, { maxDim: 128, maxBytes: 60000, square: true, transparent: true });
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
        Utils.confirmDialog('Restaurar as cores e a fonte padrão dessa loja? (Isso também desliga a textura de grade.)', async () => {
            try {
                await window.db.collection('lojas').doc(lojaId).update({
                    corPrincipal: firebase.firestore.FieldValue.delete(),
                    corFundo: firebase.firestore.FieldValue.delete(),
                    corTexto: firebase.firestore.FieldValue.delete(),
                    corCabecalho: firebase.firestore.FieldValue.delete(),
                    corRodape: firebase.firestore.FieldValue.delete(),
                    corBotao: firebase.firestore.FieldValue.delete(),
                    corBotaoTexto: firebase.firestore.FieldValue.delete(),
                    corCard: firebase.firestore.FieldValue.delete(),
                    corCardTexto: firebase.firestore.FieldValue.delete(),
                    texturaGrade: firebase.firestore.FieldValue.delete(),
                    fonteId: firebase.firestore.FieldValue.delete()
                });
                Utils.closeModal();
                await loadLojas();
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Restaurar cores padrão', 'Sim, restaurar');
    }

    function resetarCoresPainelLoja(lojaId) {
        Utils.confirmDialog('Restaurar as cores padrão do painel administrativo dessa loja?', async () => {
            try {
                await window.db.collection('lojas').doc(lojaId).update({
                    painelCorPrincipal: firebase.firestore.FieldValue.delete(),
                    painelCorFundo: firebase.firestore.FieldValue.delete(),
                    painelCorTexto: firebase.firestore.FieldValue.delete(),
                    painelCorSidebar: firebase.firestore.FieldValue.delete(),
                    painelCorCabecalho: firebase.firestore.FieldValue.delete(),
                    painelCorRodape: firebase.firestore.FieldValue.delete(),
                    painelCorBotao: firebase.firestore.FieldValue.delete(),
                    painelCorBotaoTexto: firebase.firestore.FieldValue.delete(),
                    painelCorCard: firebase.firestore.FieldValue.delete(),
                    painelCorCardTexto: firebase.firestore.FieldValue.delete()
                });
                Utils.closeModal();
                await loadLojas();
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Restaurar cores do painel', 'Sim, restaurar');
    }

    function resetarPainelRoot() {
        Utils.confirmDialog('Restaurar as cores e a frase padrão do seu painel e da tela de login?', async () => {
            try {
                await Loja.ref().update({
                    painelCorPrincipal: firebase.firestore.FieldValue.delete(),
                    painelCorFundo: firebase.firestore.FieldValue.delete(),
                    painelCorTexto: firebase.firestore.FieldValue.delete(),
                    painelCorSidebar: firebase.firestore.FieldValue.delete(),
                    painelCorSidebarTexto: firebase.firestore.FieldValue.delete(),
                    painelCorCabecalho: firebase.firestore.FieldValue.delete(),
                    painelCorCabecalhoTexto: firebase.firestore.FieldValue.delete(),
                    painelCorRodape: firebase.firestore.FieldValue.delete(),
                    painelCorBotao: firebase.firestore.FieldValue.delete(),
                    painelCorBotaoTexto: firebase.firestore.FieldValue.delete(),
                    painelCorCard: firebase.firestore.FieldValue.delete(),
                    painelCorCardTexto: firebase.firestore.FieldValue.delete(),
                    painelTagline: firebase.firestore.FieldValue.delete()
                });
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Restaurar painel padrão', 'Sim, restaurar');
    }

    async function uploadLojaLogo(e, lojaId) {
        const file = e.target.files[0];
        if (!file) return;
        const wrap = e.target.closest('.loja-admin-logo');
        wrap.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
            const logoUrl = await Utils.compressImageToBase64(file, { maxDim: 300, maxBytes: 150000, transparent: true });
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
            const imagem = await Utils.compressImageToBase64(file, { maxDim: 1400, maxBytes: 320000 });
            // migra a imagem única antiga (se existir) pro carrossel antes de adicionar a nova
            if (Store.config.capaLanding && !Store.capasLanding.length) {
                await Loja.col('capasLanding').add({ imagem: Store.config.capaLanding, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
                await Loja.ref().update({ capaLanding: firebase.firestore.FieldValue.delete() });
            }
            await Loja.col('capasLanding').add({ imagem, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
            Utils.toast('Foto de capa adicionada.', 'success');
        } catch (err) {
            Utils.toast('Erro ao enviar imagem: ' + err.message, 'error');
        } finally {
            status.style.display = 'none';
            e.target.value = '';
        }
    }

    async function removeCapaLanding(id) {
        Utils.confirmDialog('Remover esta foto da capa da página inicial?', async () => {
            try {
                if (id === 'legacy') {
                    await Loja.ref().update({ capaLanding: firebase.firestore.FieldValue.delete() });
                } else {
                    await Loja.col('capasLanding').doc(id).delete();
                }
                Utils.closeModal();
                Utils.toast('Foto removida.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover foto', 'Sim, remover');
    }

    function capaLandingGridHtml(capasLanding, capaLandingLegado) {
        const itens = capasLanding && capasLanding.length
            ? capasLanding
            : (capaLandingLegado ? [{ id: 'legacy', imagem: capaLandingLegado }] : []);
        if (!itens.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhuma imagem definida — o topo mostra um fundo padrão.</span>';
        return itens.map(c => `
            <div class="capa-thumb">
                <img src="${c.imagem}">
                <button class="js-capalanding-remove" data-id="${c.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
            </div>
        `).join('');
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
                    corTexto: firebase.firestore.FieldValue.delete(),
                    corCabecalho: firebase.firestore.FieldValue.delete(),
                    corRodape: firebase.firestore.FieldValue.delete(),
                    corBotao: firebase.firestore.FieldValue.delete(),
                    corBotaoTexto: firebase.firestore.FieldValue.delete(),
                    corCard: firebase.firestore.FieldValue.delete(),
                    corCardTexto: firebase.firestore.FieldValue.delete(),
                    fundoDegrade: firebase.firestore.FieldValue.delete(),
                    corFundo2: firebase.firestore.FieldValue.delete(),
                    texturaGrade: firebase.firestore.FieldValue.delete(),
                    fonteId: firebase.firestore.FieldValue.delete()
                });
                Utils.closeModal();
                Utils.toast('Cores e fonte restauradas.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Restaurar cores padrão', 'Sim, restaurar');
    }

    function resetarCoresCheckout() {
        Utils.confirmDialog('Restaurar as cores padrão do checkout dos planos?', async () => {
            try {
                await Loja.ref().update({
                    checkoutCorFundo: firebase.firestore.FieldValue.delete(),
                    checkoutCorTexto: firebase.firestore.FieldValue.delete(),
                    checkoutCorBotao: firebase.firestore.FieldValue.delete(),
                    checkoutCorBotaoTexto: firebase.firestore.FieldValue.delete(),
                    checkoutCorBolinha: firebase.firestore.FieldValue.delete(),
                    checkoutCorBolinhaTexto: firebase.firestore.FieldValue.delete(),
                    checkoutCorInputFundo: firebase.firestore.FieldValue.delete(),
                    checkoutCorInputTexto: firebase.firestore.FieldValue.delete()
                });
                Utils.closeModal();
                Utils.toast('Cores do checkout restauradas.', 'success');
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

    async function salvarTamanhoApresentacao(valor) {
        try {
            await Loja.ref().set({ apresentacaoImagemTamanho: valor }, { merge: true });
        } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
    }

    async function uploadApresentacaoImagem(e) {
        const file = e.target.files[0];
        if (!file) return;
        const status = document.getElementById('apresentacao-uploading');
        status.style.display = 'inline';
        try {
            const apresentacaoImagem = await Utils.compressImageToBase64(file, { maxDim: 1000, maxBytes: 260000, transparent: true });
            const apresentacaoImagemTransparente = await Utils.imageHasTransparency(apresentacaoImagem);
            await Loja.ref().set({ apresentacaoImagem, apresentacaoImagemTransparente }, { merge: true });
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
                await Loja.ref().update({
                    apresentacaoImagem: firebase.firestore.FieldValue.delete(),
                    apresentacaoImagemTransparente: firebase.firestore.FieldValue.delete()
                });
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

    function openPlanoForm(id) {
        const c = id ? Store.planos.find(x => x.id === id) : null;
        let itensAtual = (c && c.itens && c.itens.length) ? c.itens.map(it => ({ ...it })) : [{ texto: '', incluido: true }];

        function renderItensRows() {
            const list = document.getElementById('plano-itens-form-list');
            if (!list) return;
            list.innerHTML = itensAtual.map((it, i) => `
                <div class="plano-item-row" data-i="${i}">
                    <input type="text" class="js-plano-item-texto" placeholder="Ex: Produtos ilimitados" maxlength="80" value="${Utils.escapeHtml(it.texto || '')}">
                    <label class="plano-item-incluido"><input type="checkbox" class="js-plano-item-incluido" ${it.incluido ? 'checked' : ''}> Incluído</label>
                    <button type="button" class="js-plano-item-remove" title="Remover item"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `).join('');
            list.querySelectorAll('.js-plano-item-texto').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    itensAtual[Number(e.target.closest('.plano-item-row').dataset.i)].texto = e.target.value;
                });
            });
            list.querySelectorAll('.js-plano-item-incluido').forEach(chk => {
                chk.addEventListener('change', (e) => {
                    itensAtual[Number(e.target.closest('.plano-item-row').dataset.i)].incluido = e.target.checked;
                });
            });
            list.querySelectorAll('.js-plano-item-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    itensAtual.splice(Number(e.target.closest('.plano-item-row').dataset.i), 1);
                    renderItensRows();
                });
            });
        }

        Utils.openModal(`
            <div class="modal-head"><h3>${c ? 'Editar plano' : 'Novo plano'}</h3><button class="modal-close" onclick="Utils.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
            <form id="plano-form">
                <div class="form-row">
                    <div class="form-group"><label>Nome do plano *</label><input type="text" id="f-plano-nome" required maxlength="40" value="${c ? Utils.escapeHtml(c.nome || '') : ''}" placeholder="Ex: Profissional"></div>
                    <div class="form-group"><label>Preço exibido *</label><input type="text" id="f-plano-valor" required maxlength="30" value="${c ? Utils.escapeHtml(c.valor || '') : ''}" placeholder="Ex: R$ 97"></div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tipo de cobrança</label>
                        <input type="text" id="f-plano-tipo" maxlength="20" value="${c ? Utils.escapeHtml(c.tipo || '') : ''}" placeholder="Ex: Mensal, Anual, Semanal, Único">
                    </div>
                    <div class="form-group">
                        <label>Valor cobrado (R$) *</label>
                        <input type="number" id="f-plano-valor-cobranca" required min="0.01" step="0.01" value="${c && c.valorCobranca ? c.valorCobranca : ''}" placeholder="Ex: 97.00">
                    </div>
                </div>
                <p style="font-size:0.8rem;color:var(--text-muted);margin:-8px 0 14px;">
                    O "Preço exibido" é só o texto do card. Quem clicar em "Quero esse plano" paga sempre o
                    <strong>Valor cobrado</strong> — pode ser diferente se você quiser mostrar um preço promocional.
                </p>
                <div class="loja-admin-cores" style="margin:0 0 14px;">
                    <label>Cor de destaque<input type="color" id="f-plano-cor" value="${c && c.cor ? c.cor : '#C9962B'}"></label>
                </div>
                <div class="form-group">
                    <label>Itens do plano</label>
                    <div id="plano-itens-form-list" class="plano-itens-form-list"></div>
                    <button type="button" class="btn btn-outline btn-sm" id="btn-add-plano-item"><i class="fa-solid fa-plus"></i> Adicionar item</button>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="Utils.closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="plano-form-submit"><i class="fa-solid fa-check"></i> Salvar</button>
                </div>
            </form>
        `);

        renderItensRows();

        document.getElementById('btn-add-plano-item').addEventListener('click', () => {
            itensAtual.push({ texto: '', incluido: true });
            renderItensRows();
        });

        document.getElementById('plano-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const itens = itensAtual.map(it => ({ texto: (it.texto || '').trim(), incluido: !!it.incluido })).filter(it => it.texto);
            if (!itens.length) { Utils.toast('Adicione ao menos um item ao plano.', 'error'); return; }
            const btn = document.getElementById('plano-form-submit');
            btn.disabled = true;
            try {
                const data = {
                    nome: document.getElementById('f-plano-nome').value.trim(),
                    valor: document.getElementById('f-plano-valor').value.trim(),
                    tipo: document.getElementById('f-plano-tipo').value.trim(),
                    valorCobranca: Number(document.getElementById('f-plano-valor-cobranca').value) || 0,
                    cor: document.getElementById('f-plano-cor').value,
                    itens
                };
                if (c) {
                    await Loja.col('planos').doc(c.id).update(data);
                } else {
                    data.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
                    await Loja.col('planos').add(data);
                }
                Utils.closeModal();
                Utils.toast(c ? 'Plano atualizado.' : 'Plano adicionado.', 'success');
            } catch (err) {
                Utils.toast('Erro ao salvar: ' + err.message, 'error');
                btn.disabled = false;
            }
        });
    }

    async function removePlanoCard(id) {
        Utils.confirmDialog('Remover este plano?', async () => {
            try {
                await Loja.col('planos').doc(id).delete();
                Utils.toast('Plano removido.', 'success');
            } catch (err) { Utils.toast('Erro: ' + err.message, 'error'); }
        }, 'Remover plano', 'Sim, remover');
    }

    function planoCardGridHtml(cards) {
        if (!cards || !cards.length) return '<span style="font-size:0.82rem;color:var(--text-muted);">Nenhum plano criado ainda — a seção "Planos" mostra 3 planos de exemplo no lugar.</span>';
        return cards.map(c => `
            <div class="plano-card-admin" style="--plano-cor:${c.cor || '#C9962B'}">
                <div class="plano-card-admin-faixa"></div>
                <div class="plano-card-admin-body">
                    <strong>${Utils.escapeHtml(c.nome || '(sem nome)')}</strong>
                    <span>${Utils.escapeHtml(c.valor || '')}</span>
                    <em>${(c.itens || []).length} ${(c.itens || []).length === 1 ? 'item' : 'itens'}</em>
                </div>
                <div class="plano-card-admin-actions">
                    <button class="js-plano-edit" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="js-plano-remove del" data-id="${c.id}" title="Remover"><i class="fa-solid fa-trash"></i></button>
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
        set('capalanding-grid', capaLandingGridHtml(Store.capasLanding, c.capaLanding));
        set('apresentacao-grid', apresentacaoGridHtml(c.apresentacaoImagem));
        set('beneficio-card-grid', beneficioCardGridHtml(Store.beneficios));
        set('equipe-card-grid', equipeCardGridHtml(Store.equipe));
        set('plano-card-grid', planoCardGridHtml(Store.planos));

        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        const painelRootDefaults = {
            painelCorPrincipal: '#C9962B', painelCorFundo: '#FAF5EB', painelCorTexto: '#1C1A16',
            painelCorSidebar: '#FFFFFF', painelCorSidebarTexto: c.painelCorTexto || '#1C1A16',
            painelCorCabecalho: '#FFFFFF', painelCorCabecalhoTexto: c.painelCorTexto || '#1C1A16',
            painelCorRodape: '#FFFFFF',
            painelCorBotao: c.painelCorPrincipal || '#C9962B', painelCorBotaoTexto: '#FFFFFF',
            painelCorCard: '#FFFFFF', painelCorCardTexto: c.painelCorTexto || '#1C1A16'
        };
        document.querySelectorAll('.js-root-painel-cor').forEach(input => { input.value = c[input.dataset.campo] || painelRootDefaults[input.dataset.campo]; });
        setVal('f-root-painel-tagline', c.painelTagline || 'Excelência em cada venda 🏆');
        setVal('f-cor-landing-principal', c.corPrincipal || '#C9962B');
        setVal('f-cor-landing-fundo', c.corFundo || '#FAF5EB');
        setVal('f-cor-landing-texto', c.corTexto || '#1C1A16');
        setVal('f-cor-landing-cabecalho', c.corCabecalho || '#FFFFFF');
        setVal('f-cor-landing-rodape', c.corRodape || Utils.darkenColor(c.corPrincipal || '#C9962B', 0.85));
        setVal('f-cor-landing-botao', c.corBotao || c.corPrincipal || '#C9962B');
        setVal('f-cor-landing-botao-texto', c.corBotaoTexto || '#FFFFFF');
        setVal('f-cor-landing-card', c.corCard || '#FFFFFF');
        setVal('f-cor-landing-card-texto', c.corCardTexto || c.corTexto || '#1C1A16');
        const checkoutDefaults = {
            checkoutCorFundo: '#FFFFFF', checkoutCorTexto: '#1C1A16',
            checkoutCorBotao: '#C9962B', checkoutCorBotaoTexto: '#FFFFFF',
            checkoutCorBolinha: c.checkoutCorBotao || '#C9962B', checkoutCorBolinhaTexto: '#FFFFFF',
            checkoutCorInputFundo: '#FBF6EC', checkoutCorInputTexto: '#1C1A16'
        };
        document.querySelectorAll('.js-checkout-cor').forEach(input => { input.value = c[input.dataset.campo] || checkoutDefaults[input.dataset.campo]; });
        const fundoDegradeEl = document.getElementById('f-landing-fundo-degrade');
        if (fundoDegradeEl) fundoDegradeEl.checked = !!c.fundoDegrade;
        const fundo2WrapEl = document.getElementById('wrap-cor-landing-fundo2');
        if (fundo2WrapEl) fundo2WrapEl.style.display = c.fundoDegrade ? '' : 'none';
        setVal('f-cor-landing-fundo2', c.corFundo2 || '#F1DFC4');
        const texturaLandingEl = document.getElementById('f-landing-textura');
        if (texturaLandingEl) texturaLandingEl.checked = !!c.texturaGrade;
        setVal('f-fonte-landing', c.fonteId || '');
        setVal('f-landing-eyebrow', c.heroEyebrow || '');
        setVal('f-landing-ap-titulo', c.apresentacaoTitulo || '');
        setVal('f-landing-ap-texto', c.apresentacaoTexto || '');
        setVal('f-apresentacao-tamanho', c.apresentacaoImagemTamanho || 100);
        const tamanhoLabel = document.getElementById('apresentacao-tamanho-valor');
        if (tamanhoLabel) tamanhoLabel.textContent = `(${c.apresentacaoImagemTamanho || 100}%)`;

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
