/* ==========================================================================
   GET /api/consultar-compra-plano?compra=<id>&ciclo=<id>
   Rede de segurança pro checkout de planos, igual à de pagamentos da loja:
   confirma direto com o Mercado Pago enquanto o navegador aguarda, caso o
   webhook não esteja configurado ou demore.
   ========================================================================== */

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

module.exports = async (req, res) => {
    if (req.method !== 'GET') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const compraId = String(req.query.compra || '').trim();
    const cicloId = String(req.query.ciclo || '').trim();
    if (!compraId || !cicloId) { res.status(400).json({ erro: 'Requisição inválida.' }); return; }

    try {
        const admin = getAdmin();
        const db = admin.firestore();
        const cicloRef = db.collection('compras').doc(compraId).collection('ciclos').doc(cicloId);
        const cicloSnap = await cicloRef.get();
        if (!cicloSnap.exists) { res.status(404).json({ erro: 'Compra não encontrada.' }); return; }
        const ciclo = cicloSnap.data();

        if (ciclo.status === 'aprovado') { res.status(200).json({ status: 'aprovado' }); return; }
        if (ciclo.metodo === 'cartao' && ciclo.mpPreapprovalId) {
            // assinatura recorrente: o status já veio junto da criação (pagar-plano-cartao);
            // a confirmação de renovações futuras chega pelo webhook, não por aqui.
            res.status(200).json({ status: ciclo.status || 'pendente' });
            return;
        }
        if (!ciclo.mpPaymentId) { res.status(200).json({ status: ciclo.status || 'iniciando' }); return; }

        const config = await getPagamentoPlataformaConfig();
        if (!config) { res.status(200).json({ status: ciclo.status || 'pendente' }); return; }

        const payment = getPaymentClient(config.accessToken);
        const resposta = await payment.get({ id: ciclo.mpPaymentId });
        const statusMapeado = mapStatus(resposta.status);

        if (statusMapeado !== ciclo.status) {
            await cicloRef.update({ status: statusMapeado, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() });
        }
        if (statusMapeado === 'aprovado') {
            await confirmarCompra(compraId, cicloId, { mpPaymentId: ciclo.mpPaymentId });
        }

        res.status(200).json({ status: statusMapeado });
    } catch (err) {
        console.error('consultar-compra-plano', err);
        res.status(200).json({ status: 'pendente' });
    }
};
