/* ==========================================================================
   POST/GET /api/webhook-compra-plano
   Webhook único (não é por loja) pras notificações do Mercado Pago da
   própria plataforma: tanto pagamentos avulsos (Pix, ou Cartão de plano
   "Único") quanto os pagamentos recorrentes de uma assinatura (Cartão de
   plano Mensal/Anual/etc — evento subscription_authorized_payment).
   ========================================================================== */

const { WebhookSignatureValidator } = require('mercadopago');
const { getAdmin } = require('./_lib/admin');
const { getPagamentoPlataformaConfig } = require('./_lib/config');
const { getPaymentClient } = require('./_lib/mercadopago');
const { confirmarCompra } = require('./_lib/compra');

function mapStatus(mpStatus) {
    if (mpStatus === 'approved' || mpStatus === 'authorized') return 'aprovado';
    if (mpStatus === 'rejected') return 'rejeitado';
    if (mpStatus === 'cancelled') return 'cancelado';
    return 'pendente';
}

function extrairEvento(req) {
    const body = req.body || {};
    const q = req.query || {};
    const type = body.type || q.type || q.topic;
    const id = (body.data && body.data.id) || q['data.id'] || q.id;
    return { type, id: id ? String(id) : null };
}

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

async function tratarPagamentoAvulso(admin, db, config, paymentId) {
    const payment = getPaymentClient(config.accessToken);
    const resposta = await payment.get({ id: paymentId });
    const statusMapeado = mapStatus(resposta.status);

    const achados = await db.collectionGroup('ciclos').where('mpPaymentId', '==', paymentId).limit(1).get();
    if (achados.empty) return;
    const cicloDoc = achados.docs[0];
    const compraRef = cicloDoc.ref.parent.parent;

    if (statusMapeado !== cicloDoc.data().status) {
        await cicloDoc.ref.update({ status: statusMapeado, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() });
    }
    if (statusMapeado === 'aprovado') {
        await confirmarCompra(compraRef.id, cicloDoc.id, { mpPaymentId: paymentId });
    }
}

async function tratarPagamentoAssinatura(admin, db, config, authorizedPaymentId) {
    const resp = await fetch(`https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`, {
        headers: { Authorization: `Bearer ${config.accessToken}` }
    });
    if (!resp.ok) return;
    const dados = await resp.json();
    const preapprovalId = dados.preapproval_id;
    const statusMapeado = mapStatus(dados.status);
    if (!preapprovalId || statusMapeado !== 'aprovado') return;

    const compraSnap = await db.collection('compras').where('mpPreapprovalId', '==', preapprovalId).limit(1).get();
    if (compraSnap.empty) return;
    const compraRef = compraSnap.docs[0].ref;
    const compra = compraSnap.docs[0].data();

    const jaRegistrado = await compraRef.collection('ciclos').where('mpPaymentId', '==', String(dados.id)).limit(1).get();
    if (!jaRegistrado.empty) return;

    const cicloRef = compraRef.collection('ciclos').doc();
    await cicloRef.set({
        planoNome: compra.planoNome, planoValor: compra.planoValor, planoTipo: compra.planoTipo,
        metodo: 'cartao', status: 'pendente',
        mpPaymentId: String(dados.id), mpPreapprovalId: preapprovalId,
        valor: Number(dados.transaction_amount) || compra.planoValor,
        criadoEm: admin.firestore.FieldValue.serverTimestamp()
    });
    await confirmarCompra(compraRef.id, cicloRef.id, { mpPaymentId: String(dados.id), mpPreapprovalId: preapprovalId });
}

async function handler(req, res) {
    const { type, id } = extrairEvento(req);
    if (!id) { res.status(200).json({ ok: true }); return; }

    try {
        const config = await getPagamentoPlataformaConfig();
        if (!config) { res.status(200).json({ ok: true }); return; }

        if (config.webhookSecret) {
            if (!assinaturaValida(req, config.webhookSecret, id)) {
                res.status(401).json({ erro: 'Assinatura inválida.' });
                return;
            }
        }

        const admin = getAdmin();
        const db = admin.firestore();

        if (type === 'subscription_authorized_payment') {
            await tratarPagamentoAssinatura(admin, db, config, id);
        } else {
            await tratarPagamentoAvulso(admin, db, config, id);
        }

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('webhook-compra-plano', err);
        res.status(200).json({ ok: true });
    }
}

module.exports = handler;
module.exports.assinaturaValida = assinaturaValida;
module.exports.extrairEvento = extrairEvento;
module.exports.mapStatus = mapStatus;
