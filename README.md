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
```

## Primeiro acesso — passo a passo no Firebase Console

O projeto `excellentloja` já está conectado no código (`config/firebase-config.js`). O login
da tela inicial é feito por **e-mail e senha (com cadastro direto pelo próprio sistema)** ou
por **login com Google** — não é preciso criar o usuário manualmente no console. Falta apenas
habilitar os dois provedores:

1. Acesse o [Firebase Console](https://console.firebase.google.com/) → projeto **excellentloja**.
2. **Authentication → Sign-in method** → habilite o provedor **E-mail/senha**.
3. Nessa mesma tela, habilite também o provedor **Google** (defina um e-mail de suporte
   quando pedido).
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

O sistema é multi-loja: um único deploy pode hospedar a sua loja e quantas outras lojas
você quiser criar, cada uma **totalmente isolada** das demais (produtos, pedidos, clientes,
estoque, financeiro — nada é compartilhado entre lojas).

- A sua loja (a "loja raiz", dona da plataforma) fica no endereço principal, ex.:
  `excellentloja.vercel.app`.
- Cada loja criada fica em `excellentloja.vercel.app/<endereço-da-loja>`, ex.:
  `excellentloja.vercel.app/bardojoao`.
- Só o e-mail `excellentservices.excel@gmail.com` (fixo no código, em `js/loja.js`) vê a
  aba **Configurações → Gerenciar lojas**, onde dá pra criar uma loja nova (nome + endereço),
  trocar o logotipo dela (clicando no círculo ao lado do nome) e adicionar o e-mail de quem
  vai administrá-la. Esse e-mail passa a enxergar *só* o painel daquela loja — sem nenhum
  acesso à sua loja ou às demais.
- No Firestore, cada loja é um documento em `lojas/{id}` (o `id` é o próprio endereço/slug,
  ou `root` para a sua), e todo o resto dos dados dela fica em subcoleções:
  `lojas/{id}/produtos`, `lojas/{id}/pedidos`, `lojas/{id}/clientes`, etc.
- Um endereço que não corresponde a nenhuma loja mostra uma página de "Loja não encontrada".
- A **página inicial** (endereço raiz) mostra um card para cada loja criada, com o logotipo
  configurado — clicar num card leva direto pra loja daquele endereço.

### Quem consegue entrar?

O comportamento de login **é diferente na página inicial e dentro de cada loja**:

- **Na página inicial** (endereço raiz), o login é restrito: só entra quem administra a sua
  loja ou alguma das lojas criadas. Um e-mail sem loja cadastrada é barrado (a conta chega a
  autenticar no Google/Firebase, mas o sistema desloga na hora e mostra um aviso) — a página
  inicial não é mais uma vitrine de compra pública, é só o diretório de lojas + porta de
  entrada dos painéis. Se o e-mail que logou administra uma loja diferente da atual, o sistema
  já redireciona automaticamente pro endereço dela.
- **Dentro de uma loja específica** (`/algum-endereço`), o cadastro (e-mail ou Google)
  continua aberto pra qualquer pessoa. Só quem está na lista de "Usuários autorizados"
  daquela loja (Configurações → Usuários autorizados) vê o painel de gestão dela — pedidos,
  clientes, financeiro, etc. Quem loga com um e-mail fora da lista não vê o painel: cai
  direto na **loja virtual pública** daquele endereço, com o catálogo de produtos ativos e
  um carrinho que finaliza o pedido pelo WhatsApp da loja (número configurado em Dados da
  loja) — esse fluxo de compra continua igual, só muda a página inicial.

As regras do Firestore já aplicam essas mesmas restrições no servidor, não só na tela.

No primeiro login (autorizado ou não) o sistema pede nome, telefone e foto (opcional) antes
de continuar. Para e-mails autorizados isso vira o perfil do painel (`usuarios/{uid}`, global,
não depende da loja); para clientes da loja virtual, vira um cadastro em
`lojas/{id}/clientes/{uid}` — cada pessoa que compra numa loja é cliente só daquela loja. Ao
finalizar uma compra, a loja cria um pedido de verdade (`lojas/{id}/pedidos`, com o `clienteId`
apontando pra esse cadastro) e itens em Produção — então as compras feitas pela loja aparecem
no Kanban de Pedidos, nas estatísticas de Clientes e no Dashboard daquela loja, junto com os
pedidos criados manualmente pelo painel dela.

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
- **Configurações**: dados da loja, categorias de produtos, formas de pagamento aceitas e conta.
