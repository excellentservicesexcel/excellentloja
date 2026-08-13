# Excellent Loja — Sistema de Gestão

Sistema completo de gestão para a Excellent Loja: pedidos, clientes, produtos, catálogo,
produção, estoque, financeiro, precificação e relatórios — tudo em tempo real com Firebase.

## Stack

HTML, CSS e JavaScript puro (sem build/bundler), Firebase (Authentication + Firestore) e
Chart.js para os gráficos. Basta abrir/publicar os arquivos estáticos, não há passo de build.

Fotos (perfil, produtos, capa da loja) **não usam o Firebase Storage** — são redimensionadas
e comprimidas no navegador e salvas como base64 direto em campos do Firestore. Isso evita
depender do Storage, que em projetos novos do Firebase só funciona no plano pago (Blaze); o
Firestore usado aqui funciona no plano gratuito (Spark).

## Estrutura

```
index.html              shell da aplicação (login + landing + layout do painel)
vercel.json              redireciona qualquer endereço (ex: /bardojoao) para index.html
css/style.css            paleta e estilos (dourado/preto, identidade Excellent Loja)
config/firebase-config.js  credenciais do projeto Firebase (separado do restante do código)
js/utils.js               helpers (formatação, toasts, modais)
js/loja.js                 resolve qual loja está sendo acessada pela URL (multi-loja)
js/auth.js                login/logout
js/app.js                 Store central (dados em tempo real) + navegação + boot
js/dashboard.js           aba Dashboard
js/pedidos.js             aba Pedidos (kanban por status)
js/clientes.js            aba Clientes
js/produtos.js             aba Produtos
js/cardapio.js             aba Catálogo
js/producao.js             aba Produção
js/estoque.js               aba Estoque (ingredientes/insumos)
js/financeiro.js            aba Financeiro
js/precificacao.js          aba Precificação (ficha técnica de custo)
js/relatorios.js            aba Relatórios
js/configuracoes.js         aba Configurações (inclui "Gerenciar lojas" pro dono da plataforma)
js/onboarding.js            assistente de boas-vindas (primeiro login de um usuário autorizado)
js/storefront.js            loja virtual pública (login autenticado mas fora da lista de autorizados)
firestore.rules            regras de segurança do Firestore
storage.rules               regras do Storage (não usado hoje — fotos vão em base64 no Firestore)
package.json                dependências das funções de pagamento (só usado pela Vercel, no /api)
api/iniciar-pagamento.js    1º passo do pagamento online: recalcula o total, confere estoque
api/pagar-pix.js            gera o QR Code Pix na Mercado Pago
api/pagar-cartao.js         efetiva a cobrança de cartão (token já vem tokenizado do navegador)
api/consultar-pagamento.js  o navegador consulta isso enquanto espera o pagamento confirmar
api/webhook-mercadopago.js  a Mercado Pago avisa aqui quando o status de um pagamento muda
api/_lib/                   código interno compartilhado entre as funções acima
```

## Primeiro acesso — passo a passo no Firebase Console

O projeto `excellentloja` já está conectado no código (`config/firebase-config.js`). O login
de quem administra uma loja é feito por **e-mail e senha (com cadastro direto pelo próprio
sistema)** ou por **login com Google** — não é preciso criar o usuário manualmente no
console. Já os clientes que compram pela loja virtual **nunca fazem login**: o sistema cria
uma sessão anônima do Firebase por trás dos panos, só para poder salvar o pedido — por isso
o provedor **Anônimo** também precisa estar habilitado, senão o botão de finalizar pedido
falha silenciosamente. Falta habilitar os três provedores:

1. Acesse o [Firebase Console](https://console.firebase.google.com/) → projeto **excellentloja**.
2. **Authentication → Sign-in method** → habilite o provedor **E-mail/senha**.
3. Nessa mesma tela, habilite também o provedor **Google** (defina um e-mail de suporte
   quando pedido) **e o provedor Anônimo** (não pede nenhuma configuração extra).
4. **Authentication → Settings → Authorized domains** → confira se o domínio onde o
   sistema vai rodar (ex.: `excellentloja.web.app`, ou o domínio do GitHub Pages/Hosting)
   está na lista — senão o login com Google não funciona.
5. **Firestore Database** → crie o banco (modo produção) caso ainda não exista.
6. **Publique as regras de segurança — passo obrigatório, sem ele nada funciona**:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use excellentloja
   firebase deploy --only firestore:rules
   ```
   (ou cole o conteúdo de `firestore.rules` diretamente no console, em Firestore → Regras,
   e clique em "Publicar"). Toda vez que `firestore.rules` mudar neste projeto, esse passo
   precisa ser refeito manualmente — o arquivo no código não se aplica sozinho.
   Não é preciso mexer no Storage — o app não usa esse serviço (veja a seção "Stack").
7. Abra `index.html` (ou publique via Firebase Hosting / GitHub Pages / Vercel) e crie sua
   conta direto na tela de login ("Cadastrar") ou entre com o Google, usando o e-mail
   `excellentservices.excel@gmail.com` (já vem liberado por padrão — veja abaixo). Esse
   primeiro login cria automaticamente a sua loja (a "loja raiz", endereço `/`).

> As chaves em `config/firebase-config.js` são as credenciais **públicas** do app Web —
> é normal e esperado que fiquem visíveis no navegador. A segurança de verdade vem das
> regras do Firestore (passo 6) e do login.

### Múltiplas lojas

O sistema é multi-loja: um único deploy pode hospedar quantas lojas você quiser criar,
cada uma **totalmente isolada** das demais (produtos, pedidos, clientes, estoque,
financeiro — nada é compartilhado entre lojas).

- O **endereço principal** (`excellentloja.vercel.app`) é só o diretório da plataforma —
  uma página de vendas com cards de todas as lojas criadas (com o logotipo configurado de
  cada uma) e o login para quem administra alguma loja. Não é uma loja de verdade: ninguém
  compra nada por ali.
- Cada loja criada fica em `excellentloja.vercel.app/<endereço-da-loja>`, ex.:
  `excellentloja.vercel.app/bardojoao`. Ao clicar num card do diretório (ou digitar o
  endereço direto), a pessoa cai **direto na loja virtual daquele endereço** — vê o
  catálogo e pode montar o carrinho sem precisar de conta; login só é pedido quando ela
  tenta finalizar o pedido (o carrinho continua salvo depois de logar).
- Você (`excellentservices.excel@gmail.com`, fixo no código em `js/loja.js`) é a única
  pessoa que vê a aba **Configurações → Gerenciar lojas** — só aparece quando você está no
  endereço principal. Lá dá pra criar uma loja nova (nome + endereço), trocar o logotipo
  dela e adicionar o e-mail de quem vai administrá-la — esse e-mail passa a enxergar *só* o
  painel daquela loja, sem nenhum acesso à administração de outras.
- Cada card de loja em "Gerenciar lojas" tem um botão **"Entrar no painel desta loja"** —
  leva você direto pro painel completo daquela loja, com acesso total (como se você também
  fosse administradora dela), pra dar suporte a quem comprou a loja de você.
- Cada loja também pode ter **identidade visual própria**: o logotipo aparece no cabeçalho e
  rodapé da loja virtual dela, e o **ícone da aba** (favicon) é configurado separadamente —
  útil porque o logotipo costuma ser retangular e o favicon precisa ser quadrado (o sistema
  recorta o centro da imagem automaticamente pra não esticar). As 3 cores (principal, fundo e
  texto) re-pintam a loja virtual inteira — cabeçalho, botões, rodapé, carrinho lateral,
  categorias, links. Isso vale só pra loja virtual pública; o painel de gestão continua com a
  identidade da Excellent Loja para todo mundo. Sem cor definida, a loja usa a paleta padrão
  dourada/preta.
- A **página inicial** (endereço principal) é totalmente customizável em
  Configurações → Página inicial: capa (sem escurecer — o selo "Sistema de gestão + loja
  virtual" aparece recortado no topo da imagem, e os botões de login/cadastro ficam no canto
  inferior direito, ambos editáveis), cores próprias (paleta separada da de cada loja, não
  afeta o painel nem nenhuma loja criada), textos e imagem da seção de apresentação, cards de
  "Benefícios" (foto quadrada + título + texto, quantos você quiser) e cards de "Conheça
  nossa equipe" (foto + nome + descrição, 2 por linha — a seção some se não adicionar
  ninguém). Cards e textos surgem com uma animação suave ao rolar a página, e têm um brilho
  ao passar o mouse.
- Seu próprio painel (quando você está no endereço principal) só mostra **Configurações** —
  não faz sentido ver Dashboard, Pedidos, Financeiro etc. de uma loja que não existe. Isso
  só se aplica ao endereço principal: dentro de uma loja específica (inclusive via "Entrar
  no painel"), você vê o painel completo dela normalmente — com um botão extra **"Meu
  painel"** no topo (visível só pra você) pra voltar direto pro seu painel sem precisar
  deslogar. Nesse modo de suporte, a aba "Minha conta" some (o nome/telefone/foto pertencem
  a quem administra aquela loja, não a você).
- No Firestore, cada loja é um documento em `lojas/{id}` (o `id` é o próprio endereço/slug),
  e todo o resto dos dados dela fica em subcoleções: `lojas/{id}/produtos`,
  `lojas/{id}/pedidos`, `lojas/{id}/clientes`, etc.
- Um endereço que não corresponde a nenhuma loja mostra uma página de "Loja não encontrada".

### Quem consegue entrar?

**Só quem administra uma loja faz login** (e-mail/senha ou Google) — clientes nunca criam
conta nem fazem login, em lugar nenhum do sistema.

- **No endereço principal**, o login é restrito a quem administra alguma loja: só você e
  quem está na lista de administradores de alguma loja criada conseguem entrar. Um e-mail
  sem loja cadastrada é barrado (chega a autenticar no Google/Firebase, mas o sistema
  desloga na hora e mostra um aviso). Se o e-mail que logou administra uma loja diferente
  da que ele tentou acessar, o sistema já redireciona automaticamente pro endereço certo.
- **Dentro de uma loja específica** (`/algum-endereço`), qualquer pessoa vê a loja virtual e
  monta o carrinho livremente, sem precisar de conta. Ao clicar em "Finalizar pedido", em
  vez de pedir login, o sistema pede só o essencial pra entrega — **nome, WhatsApp,
  endereço, número, cidade e estado** — num formulário rápido. Esses dados ficam salvos no
  navegador da pessoa (`localStorage`), então da próxima vez que ela comprar (nessa loja ou
  em qualquer outra da plataforma, no mesmo navegador) o formulário já vem preenchido, só
  pra revisar e confirmar. Por trás dos panos, o sistema autentica a pessoa de forma anônima
  no Firebase (sem tela, sem senha) só para poder salvar o pedido com segurança — ela nunca
  vê isso como um "login". Quem *está* na lista de "Usuários autorizados" daquela loja
  (Configurações → Usuários autorizados) faz login normalmente pela tela de login do
  endereço principal, e cai no painel de gestão dela em vez da loja pública — a loja
  virtual em si não tem nenhum botão de conta/login, só busca e carrinho.

As regras do Firestore já aplicam essas mesmas restrições no servidor, não só na tela.

Cada compra vira um cadastro em `lojas/{id}/clientes/{uid}` (o `uid` da sessão anônima do
navegador) — cada pessoa que compra numa loja é cliente só daquela loja. A loja cria um
pedido de verdade (`lojas/{id}/pedidos`, com o `clienteId` apontando pra esse cadastro) e
itens em Produção — então as compras feitas pela loja aparecem no Kanban de Pedidos, nas
estatísticas de Clientes e no Dashboard daquela loja, junto com os pedidos criados
manualmente pelo painel dela.

> Criar um pedido (pelo painel ou pela loja virtual) já reserva o estoque na hora — a
> quantidade comprada é descontada do produto imediatamente, para ninguém conseguir comprar
> mais do que o disponível. Se o pedido for cancelado ou excluído, o estoque reservado volta
> automaticamente. Já o lançamento em Financeiro (a venda em si) só é criado quando o pedido
> avança para o status **"Em produção"** — enquanto estiver só "Aguardando" ele reserva o
> estoque mas ainda não entra nas contas de faturamento.

A capa da loja (Configurações → Capa da loja) aceita quantas fotos você quiser — cada uma vira
um documento na subcoleção `capas` daquela loja, então não há limite de quantidade. Com 2 ou
mais, elas aparecem na página inicial da loja como um carrossel, avançando sozinho a cada 3
segundos.

## Pagamento online (Mercado Pago)

Cada loja pode ativar pagamento online — Pix (com QR Code), débito e crédito — direto
dentro da loja virtual, em vez do fluxo antigo por WhatsApp. Hoje isso funciona só com o
**Mercado Pago** (não é possível colocar "qualquer" plataforma de pagamento — cada gateway
precisa de um código de integração próprio; Mercado Pago foi o escolhido por ser o mais
usado no Brasil e já cobrir Pix + cartão numa API só). O texto abaixo assume que você
**ainda não tem** conta no Mercado Pago — se já tiver, pule os passos 1 e 2.

### Por que isso precisa de mais do que só o Firebase

Diferente do resto do sistema (que roda 100% no navegador, direto com o Firestore), processar
pagamento **exige um servidor** — a chave secreta (Access Token) do Mercado Pago nunca pode
ficar visível no navegador, senão qualquer pessoa poderia usá-la para cobrar em nome da sua
conta. Por isso essa parte usa **Funções Serverless da própria Vercel** (a pasta `/api` —
sobem junto com o resto do site, sem custo extra e sem precisar de outro serviço) para
conversar com o Mercado Pago e confirmar pagamentos com segurança.

### Passo a passo pra ativar numa loja

1. **Crie sua conta no Mercado Pago** (ou use a que já tem): [mercadopago.com.br](https://www.mercadopago.com.br).
   Recomendo testar primeiro com credenciais de **teste** (existe um botão "Credenciais de
   teste" no painel de desenvolvedor) antes de usar as credenciais **de produção** (dinheiro
   de verdade).
2. No [painel de desenvolvedor do Mercado Pago](https://www.mercadopago.com.br/developers/panel),
   crie uma aplicação e copie duas chaves: a **Public Key** e o **Access Token**.
3. **Gere a credencial do Firebase** (o servidor precisa dela pra poder escrever pedido/estoque
   com segurança): Firebase Console → ⚙️ Configurações do projeto → **Contas de serviço** →
   **Gerar nova chave privada**. Isso baixa um arquivo `.json` — guarde com cuidado, ele dá
   acesso total ao banco.
4. **Configure as variáveis de ambiente na Vercel** (Project Settings → Environment Variables):
   - `FIREBASE_SERVICE_ACCOUNT` → abra o arquivo `.json` baixado no passo 3, copie **o
     conteúdo inteiro** e cole aqui como texto.
   Depois de salvar, faça um novo deploy (qualquer novo envio de arquivo já dispara um; ou
   use o botão "Redeploy" no painel da Vercel) — variável de ambiente só entra em vigor a
   partir do próximo deploy.
5. No painel da Excellent Loja, entre na loja desejada → **Configurações → Pagamento online**
   → cole a **Public Key** e o **Access Token** do passo 2, marque "Pagamento online ativo" e
   salve.
6. Nessa mesma tela aparece uma **URL de webhook** já pronta (com o endereço da sua loja
   embutido) — copie e cole ela no Mercado Pago, em **Sua aplicação → Webhooks → Configurar
   notificações**, marcando o evento **"Pagamentos"**. O Mercado Pago vai gerar uma **chave
   secreta de assinatura**; copie ela de volta e cole no campo "Chave secreta do Webhook" da
   Excellent Loja (recomendado, mas opcional — sem ela o sistema confirma o pagamento
   consultando o Mercado Pago mesmo assim, só que sempre por consulta periódica, nunca na hora).

Só depois desses passos o pagamento online realmente ativa. Antes disso — ou em qualquer
loja que não tiver "Pagamento online ativo" marcado — a loja continua funcionando
exatamente como hoje, combinando o pedido pelo WhatsApp.

### Como funciona por dentro

- O cliente preenche os dados de entrega normalmente; se a loja tem pagamento online
  ativo, em vez de abrir o WhatsApp ele vai pra uma tela de pagamento dentro da própria loja,
  com Pix (QR Code + código "copia e cola") e Cartão (crédito/débito, num formulário seguro
  do próprio Mercado Pago — o número do cartão nunca passa pelos servidores da Excellent Loja).
- **O pedido só é criado em "Pedidos" depois que o pagamento é confirmado.** Antes disso,
  ele existe só como um "pagamento pendente" (`lojas/{id}/pagamentosPendentes`), invisível no
  painel — não reserva estoque, não aparece no Kanban, não conta em nada.
- A confirmação acontece de duas formas ao mesmo tempo, pra não depender de uma única coisa
  funcionar: o **webhook** (o Mercado Pago avisa na hora que o status muda) e uma
  **consulta automática** que o navegador do cliente faz a cada poucos segundos enquanto
  espera. Assim que aprovado, a tela de pagamento fecha sozinha e o pedido aparece em Pedidos.
- O preço cobrado **nunca vem do navegador** — o servidor recalcula o total a partir do preço
  real de cada produto no Firestore (e confere o estoque) antes de gerar qualquer cobrança,
  então não tem como alguém adulterar o preço pela tela.

### Sobre valores e responsabilidade

O Mercado Pago cobra uma taxa por transação (consulte as condições atuais na conta de vocês)
e é quem efetivamente custodia e repassa o dinheiro — a Excellent Loja só orquestra a
integração. Eu não tenho como testar esse fluxo de ponta a ponta com dinheiro de verdade;
teste com as credenciais de teste do Mercado Pago antes de ativar em produção.

## Publicar

Este projeto já inclui `vercel.json`, então a forma mais simples é publicar direto na
[Vercel](https://vercel.com) (importe a pasta ou arraste os arquivos) — o `vercel.json` garante
que endereços como `/bardojoao` carreguem o app corretamente em vez de dar 404.

Para publicar no **Firebase Hosting** em vez da Vercel:
```bash
firebase init hosting   # escolha a pasta atual como "public directory"
```
Ao rodar `firebase init hosting`, responda "yes" para "configure as a single-page app" —
isso cria a mesma regra de redirecionamento que o `vercel.json` já traz para a Vercel. Depois:
```bash
firebase deploy --only hosting
```

No **GitHub Pages** o redirecionamento de endereços como `/bardojoao` não funciona por padrão
(ele não tem esse tipo de rewrite) — funciona bem para a loja raiz (`/`), mas lojas com endereço
próprio precisam de Vercel, Firebase Hosting ou Netlify (que suportam esse redirecionamento).

## Como o sistema funciona

- **Dashboard**: faturamento, pedidos e ticket médio do dia (com variação vs. ontem),
  gráfico de faturamento, status dos pedidos, pedidos recentes, top produtos e alertas
  de estoque baixo — tudo calculado em tempo real a partir das outras abas.
- **Pedidos**: quadro kanban (Aguardando → Em produção → Pronto → Entregue). Criar um
  pedido já reduz o estoque dos produtos vendidos; o lançamento no Financeiro só entra
  quando o pedido chega em "Em produção".
- **Clientes / Produtos / Estoque**: cadastros completos com busca e edição.
- **Catálogo**: vitrine visual dos produtos ativos, com destaque e preço.
- **Produção**: lista diária de itens a produzir, com status (pendente → em andamento → concluído).
- **Financeiro**: receitas e despesas, saldo do mês e gráfico dos últimos 6 meses.
- **Precificação**: monta a ficha técnica (ingredientes + quantidade), calcula o custo e
  sugere o preço de venda a partir da margem desejada — com um clique aplica o preço ao produto.
- **Relatórios**: desempenho por período, top produtos, formas de pagamento e top clientes,
  com exportação em CSV.
- **Configurações**: dados da loja, categorias de produtos, formas de pagamento aceitas,
  pagamento online (Mercado Pago) e conta.
