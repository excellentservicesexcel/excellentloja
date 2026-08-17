/* ==========================================================================
   POST /api/pagar-cartao?loja=<id>
   Recebe os dados já tokenizados pelo Payment Brick do Mercado Pago (o
   número do cartão nunca passa por aqui, só o token) e efetiva a cobrança.
   Se aprovar na hora, já confirma o pedido — sem depender do webhook.
   ========================================================================== */

const crypto = require('crypto');
const { getAdmin } = require('./_lib/admin');
const { getPagamentoConfig } = require('./_lib/config');
const { getPaymentClient } = require('./_lib/mercadopago');
const { confirmarPedido } = require('./_lib/pedido');

function mapStatus(mpStatus) {
    if (mpStatus === 'approved') return 'aprovado';
    if (mpStatus === 'rejected') return 'rejeitado';
    if (mpStatus === 'cancelled') return 'cancelado';
    return 'pendente'; // in_process, pending, etc.
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    const body = req.body || {};
    const pendingId = String(body.pendingId || '').trim();
    const formData = body.formData || {};
    if (!lojaId || !pendingId || !formData.token || !formData.payment_method_id) {
        res.status(400).json({ erro: 'Dados de cartão inválidos.' });
        return;
    }

    try {
        const config = await getPagamentoConfig(lojaId);
        if (!config || !config.ativo || !config.accessToken) {
            res.status(400).json({ erro: 'Pagamento online não está disponível nesta loja.' });
            return;
        }

        const admin = getAdmin();
        const db = admin.firestore();
        const lojaRef = db.collection('lojas').doc(lojaId);
        const pendingRef = lojaRef.collection('pagamentosPendentes').doc(pendingId);
        const [pendingSnap, lojaSnap] = await Promise.all([pendingRef.get(), lojaRef.get()]);
        if (!pendingSnap.exists) { res.status(404).json({ erro: 'Pagamento não encontrado.' }); return; }
        const pending = pendingSnap.data();
        if (pending.pedidoId) { res.status(400).json({ erro: 'Este pedido já foi pago.' }); return; }

        const nomeLoja = (lojaSnap.exists && lojaSnap.data().nomeLoja) || lojaId;
        const payment = getPaymentClient(config.accessToken);

        const resposta = await payment.create({
            body: {
                transaction_amount: Number(pending.total),
                token: formData.token,
                description: `Pedido — ${nomeLoja}`,
                installments: Number(formData.installments) || 1,
                payment_method_id: formData.payment_method_id,
                issuer_id: formData.issuer_id,
                payer: formData.payer,
                external_reference: pendingId
            },
            requestOptions: { idempotencyKey: crypto.randomUUID() }
        });

        const statusMapeado = mapStatus(resposta.status);
        await pendingRef.update({
            metodo: 'cartao',
            mpPaymentId: String(resposta.id),
            status: statusMapeado,
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        if (statusMapeado === 'aprovado') {
            await confirmarPedido(lojaId, pendingId);
        }

        res.status(200).json({ status: statusMapeado });
    } catch (err) {
        console.error('pagar-cartao', err);
        const msg = (err && err.message) ? err.message : 'Erro ao processar o cartão.';
        res.status(502).json({ erro: 'Não foi possível processar o cartão: ' + msg });
    }
};
