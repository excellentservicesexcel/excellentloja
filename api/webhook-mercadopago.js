/* ==========================================================================
   POST/GET /api/webhook-mercadopago?loja=<id>
   URL que a lojista cola nas notificações (webhooks) do Mercado Pago dela.
   Nunca confia no conteúdo da notificação em si — só usa o id do pagamento
   pra ir buscar o status verdadeiro direto na API do Mercado Pago, com o
   Access Token daquela loja, antes de confirmar qualquer pedido.
   ========================================================================== */

const { WebhookSignatureValidator } = require('mercadopago');
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

function extrairPaymentId(req) {
    const body = req.body || {};
    if (body && body.data && body.data.id && (!body.type || body.type === 'payment')) return String(body.data.id);
    const q = req.query || {};
    if (q.type === 'payment' && q['data.id']) return String(q['data.id']);
    if (q.topic === 'payment' && q.id) return String(q.id);
    return null;
}

// Usa o validador oficial do SDK do Mercado Pago (mesma lógica documentada
// de manifest + HMAC-SHA256), em vez de reimplementar isso na mão.
function assinaturaValida(req, segredo, dataId) {
    try {
        WebhookSignatureValidator.validate({
            xSignature: req.headers['x-signature'],
            xRequestId: req.headers['x-request-id'],
            dataId,
            secret: segredo
        });
        return true;
    } catch (e) {
        return false;
    }
}

async function handler(req, res) {
    const lojaId = String(req.query.loja || '').trim();
    const dataId = extrairPaymentId(req);
    if (!lojaId || !dataId) { res.status(200).json({ ok: true }); return; }

    try {
        const config = await getPagamentoConfig(lojaId);
        if (!config || !config.accessToken) { res.status(200).json({ ok: true }); return; }

        if (config.webhookSecret) {
            if (!assinaturaValida(req, config.webhookSecret, dataId)) {
                res.status(401).json({ erro: 'Assinatura inválida.' });
                return;
            }
        }

        const payment = getPaymentClient(config.accessToken);
        const resposta = await payment.get({ id: dataId });
        const statusMapeado = mapStatus(resposta.status);

        const admin = getAdmin();
        const db = admin.firestore();
        const pendentesRef = db.collection('lojas').doc(lojaId).collection('pagamentosPendentes');
        const achados = await pendentesRef.where('mpPaymentId', '==', dataId).limit(1).get();
        if (achados.empty) { res.status(200).json({ ok: true }); return; }

        const pendingDoc = achados.docs[0];
        if (statusMapeado !== pendingDoc.data().status) {
            await pendingDoc.ref.update({ status: statusMapeado, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() });
        }
        if (statusMapeado === 'aprovado') {
            await confirmarPedido(lojaId, pendingDoc.id);
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('webhook-mercadopago', err);
        res.status(200).json({ ok: true });
    }
}

module.exports = handler;
module.exports.assinaturaValida = assinaturaValida;
module.exports.extrairPaymentId = extrairPaymentId;
module.exports.mapStatus = mapStatus;
