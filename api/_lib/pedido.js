/* ==========================================================================
   Confirmação de pedido pago — só roda no servidor (Admin SDK), depois que
   o Mercado Pago confirma que o pagamento foi aprovado. Espelha a criação
   de pedido que js/storefront.js faz no fluxo antigo (sem pagamento online),
   mas só executa depois do pagamento — é por isso que o pedido só "cai em
   Pedidos" depois de pago. Idempotente: se o pagamentoPendente já tiver
   pedidoId, não cria de novo (protege contra webhook + consulta de status
   chegando quase juntos).
   ========================================================================== */

const { getAdmin } = require('./admin');

async function confirmarPedido(lojaId, pendingId) {
    const admin = getAdmin();
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;
    const lojaRef = db.collection('lojas').doc(lojaId);
    const pendingRef = lojaRef.collection('pagamentosPendentes').doc(pendingId);

    return db.runTransaction(async (tx) => {
        const pendingSnap = await tx.get(pendingRef);
        if (!pendingSnap.exists) throw new Error('Pagamento pendente não encontrado.');
        const pending = pendingSnap.data();
        if (pending.pedidoId) return { pedidoId: pending.pedidoId, jaProcessado: true };

        const contadorRef = lojaRef.collection('meta').doc('contadores');
        const contadorSnap = await tx.get(contadorRef);
        const atual = (contadorSnap.exists && contadorSnap.data().pedidos) ? contadorSnap.data().pedidos : 1000;
        const numero = atual + 1;

        const produtoRefs = pending.itens.map(item => lojaRef.collection('produtos').doc(item.produtoId));
        const produtoSnaps = produtoRefs.length ? await Promise.all(produtoRefs.map(ref => tx.get(ref))) : [];

        const pedidoRef = lojaRef.collection('pedidos').doc();
        const d = pending.dadosCliente || {};
        const enderecoCompleto = `${d.endereco}, ${d.numero} - ${d.cidade}/${d.estado}`;

        tx.set(pedidoRef, {
            numero,
            clienteId: pending.uidCliente,
            clienteNome: d.nome,
            clienteTelefone: d.whatsapp,
            itens: pending.itens,
            subtotal: pending.total,
            taxaEntrega: 0,
            total: pending.total,
            formaPagamento: pending.metodo === 'pix' ? 'Pix (pago online)' : 'Cartão (pago online)',
            status: 'aguardando',
            endereco: enderecoCompleto,
            observacoes: 'Pedido feito pela loja virtual — pagamento confirmado online.',
            dataEntrega: null,
            origem: 'loja-virtual',
            pagamentoPendenteId: pendingId,
            createdAt: FieldValue.serverTimestamp()
        });

        pending.itens.forEach((item, i) => {
            const prodRef = lojaRef.collection('producao').doc();
            tx.set(prodRef, {
                data: new Date(), produtoId: item.produtoId, produtoNome: item.nome,
                quantidade: item.quantidade, status: 'pendente', pedidoId: pedidoRef.id,
                createdAt: FieldValue.serverTimestamp()
            });
            if (produtoSnaps[i] && produtoSnaps[i].exists) {
                tx.update(produtoRefs[i], { estoqueAtual: FieldValue.increment(-item.quantidade) });
            }
        });

        tx.set(contadorRef, { pedidos: numero }, { merge: true });
        tx.update(pendingRef, { status: 'aprovado', pedidoId: pedidoRef.id, confirmadoEm: FieldValue.serverTimestamp() });

        return { pedidoId: pedidoRef.id, jaProcessado: false };
    });
}

module.exports = { confirmarPedido };
