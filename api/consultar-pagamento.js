/* ==========================================================================
   GET /api/consultar-pagamento?loja=<id>&pendingId=<id>
   Rede de segurança: o navegador do cliente chama isso de tempos em tempos
   enquanto aguarda o pagamento, pra confirmar direto com o Mercado Pago —
   assim o pedido não fica travado esperando o webhook caso ele não esteja
   configurado ou demore.
   ========================================================================== */

const { getAdmin } = require('./_lib/admin');
const { getPagamentoConfig } = require('./_lib/config');
const { getPaymentClient } = require('./_lib/mercadopago');
const { confirmarPedido } = require('./_lib/pedido');

function mapStatus(mpStatus) {
    if (mpStatus === 'approved') return 'aprovado';
    if (mpStatus === 'rejected') return 'rejeitado';
    if (mpStatus === 'cancelled') return 'cancelado';
    return 'pendente';
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    const pendingId = String(req.query.pendingId || '').trim();
    if (!lojaId || !pendingId) { res.status(400).json({ erro: 'Requisição inválida.' }); return; }

    try {
        const admin = getAdmin();
        const db = admin.firestore();
        const pendingRef = db.collection('lojas').doc(lojaId).collection('pagamentosPendentes').doc(pendingId);
        const pendingSnap = await pendingRef.get();
        if (!pendingSnap.exists) { res.status(404).json({ erro: 'Pagamento não encontrado.' }); return; }
        const pending = pendingSnap.data();

        if (pending.pedidoId) { res.status(200).json({ status: 'aprovado' }); return; }
        if (!pending.mpPaymentId) { res.status(200).json({ status: pending.status || 'iniciando' }); return; }

        const config = await getPagamentoConfig(lojaId);
        if (!config || !config.accessToken) { res.status(200).json({ status: pending.status || 'pendente' }); return; }

        const payment = getPaymentClient(config.accessToken);
        const resposta = await payment.get({ id: pending.mpPaymentId });
        const statusMapeado = mapStatus(resposta.status);

        if (statusMapeado !== pending.status) {
            await pendingRef.update({ status: statusMapeado, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() });
        }
        if (statusMapeado === 'aprovado') {
            await confirmarPedido(lojaId, pendingId);
        }

        res.status(200).json({ status: statusMapeado });
    } catch (err) {
        console.error('consultar-pagamento', err);
        res.status(200).json({ status: 'pendente' });
    }
};
