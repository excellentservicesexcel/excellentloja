/* ==========================================================================
   POST /api/iniciar-pagamento?loja=<id>
   Primeiro passo do pagamento online: recalcula o total a partir dos preços
   reais no banco (nunca confia em preço vindo do navegador), confere
   estoque, e cria o registro de "pagamento pendente" que vai acompanhar
   esse pedido até ele ser pago (ou não).
   ========================================================================== */

const { getAdmin } = require('./_lib/admin');
const { getPagamentoConfig } = require('./_lib/config');

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    if (!lojaId) { res.status(400).json({ erro: 'Loja não informada.' }); return; }

    const body = req.body || {};
    const itensPedidos = Array.isArray(body.itens) ? body.itens : [];
    const dadosCliente = body.dadosCliente || {};
    const uidCliente = String(body.uidCliente || '').trim();

    if (!itensPedidos.length) { res.status(400).json({ erro: 'Carrinho vazio.' }); return; }
    if (!uidCliente) { res.status(400).json({ erro: 'Cliente não identificado.' }); return; }
    const camposObrigatorios = ['nome', 'whatsapp', 'endereco', 'numero', 'cidade', 'estado'];
    for (const campo of camposObrigatorios) {
        if (!String(dadosCliente[campo] || '').trim()) { res.status(400).json({ erro: 'Preencha todos os dados de entrega.' }); return; }
    }

    try {
        const config = await getPagamentoConfig(lojaId);
        if (!config || !config.ativo || !config.accessToken || !config.publicKey) {
            res.status(400).json({ erro: 'Pagamento online não está disponível nesta loja.' });
            return;
        }

        const admin = getAdmin();
        const db = admin.firestore();
        const lojaRef = db.collection('lojas').doc(lojaId);

        const itensResolvidos = [];
        for (const it of itensPedidos) {
            const produtoId = String(it.produtoId || '').trim();
            const quantidade = Math.max(1, Math.floor(Number(it.quantidade) || 0));
            if (!produtoId || !quantidade) { res.status(400).json({ erro: 'Item de carrinho inválido.' }); return; }
            const prodSnap = await lojaRef.collection('produtos').doc(produtoId).get();
            if (!prodSnap.exists) { res.status(400).json({ erro: 'Um dos produtos do carrinho não existe mais.' }); return; }
            const prod = prodSnap.data();
            const disponivel = Number(prod.estoqueAtual) || 0;
            if (quantidade > disponivel) {
                res.status(400).json({ erro: `"${prod.nome}" tem só ${disponivel} unidade(s) disponível(is) agora.` });
                return;
            }
            const precoUnitario = Number(prod.precoVenda) || 0;
            itensResolvidos.push({ produtoId, nome: prod.nome, quantidade, precoUnitario, subtotal: precoUnitario * quantidade });
        }

        const total = itensResolvidos.reduce((s, i) => s + i.subtotal, 0);
        if (total <= 0) { res.status(400).json({ erro: 'Total do pedido inválido.' }); return; }

        const dadosLimpos = {
            nome: String(dadosCliente.nome).trim(),
            whatsapp: String(dadosCliente.whatsapp).trim(),
            endereco: String(dadosCliente.endereco).trim(),
            numero: String(dadosCliente.numero).trim(),
            cidade: String(dadosCliente.cidade).trim(),
            estado: String(dadosCliente.estado).trim().toUpperCase()
        };

        const pendingRef = lojaRef.collection('pagamentosPendentes').doc();
        await pendingRef.set({
            uidCliente, dadosCliente: dadosLimpos, itens: itensResolvidos, total,
            metodo: null, status: 'iniciando', mpPaymentId: null, pedidoId: null,
            criadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ pendingId: pendingRef.id, total, publicKey: config.publicKey });
    } catch (err) {
        console.error('iniciar-pagamento', err);
        res.status(500).json({ erro: 'Erro ao iniciar pagamento. Tente novamente.' });
    }
};
