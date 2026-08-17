/* ==========================================================================
   POST /api/pagar-plano-cartao
   Recebe o token do cartão já tokenizado pelo Payment Brick. Se o plano é
   recorrente (Mensal, Anual...), cria uma assinatura (PreApproval) no
   Mercado Pago — é ela que vai descontar automaticamente a cada ciclo, sem
   precisar de nenhuma ação do cliente. Se o plano é "Único", cobra uma vez
   só (Payment avulso), igual ao cartão da loja virtual.
   ========================================================================== */

const crypto = require('crypto');
const { getAdmin } = require('./_lib/admin');
const { getPagamentoPlataformaConfig } = require('./_lib/config');
const { getPaymentClient, getPreApprovalClient } = require('./_lib/mercadopago');
const { confirmarCompra } = require('./_lib/compra');
const { inferRecorrencia } = require('./_lib/planos');

function mapStatus(mpStatus) {
    if (mpStatus === 'approved' || mpStatus === 'authorized') return 'aprovado';
    if (mpStatus === 'rejected') return 'rejeitado';
    if (mpStatus === 'cancelled') return 'cancelado';
    return 'pendente';
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const body = req.body || {};
    const compraId = String(body.compraId || '').trim();
    const cicloId = String(body.cicloId || '').trim();
    const formData = body.formData || {};
    if (!compraId || !cicloId || !formData.token) { res.status(400).json({ erro: 'Dados de cartão inválidos.' }); return; }

    try {
        const config = await getPagamentoPlataformaConfig();
        if (!config) { res.status(400).json({ erro: 'O pagamento de planos ainda não foi configurado.' }); return; }

        const admin = getAdmin();
        const db = admin.firestore();
        const compraRef = db.collection('compras').doc(compraId);
        const cicloRef = compraRef.collection('ciclos').doc(cicloId);
        const [compraSnap, cicloSnap] = await Promise.all([compraRef.get(), cicloRef.get()]);
        if (!compraSnap.exists || !cicloSnap.exists) { res.status(404).json({ erro: 'Compra não encontrada.' }); return; }
        const compra = compraSnap.data();
        const ciclo = cicloSnap.data();
        if (ciclo.status === 'aprovado') { res.status(400).json({ erro: 'Este ciclo já foi pago.' }); return; }

        const { recorrente, frequency, frequencyType } = inferRecorrencia(ciclo.planoTipo || compra.planoTipo);

        if (recorrente) {
            const preapproval = getPreApprovalClient(config.accessToken);
            const resposta = await preapproval.create({
                body: {
                    reason: `Plano ${ciclo.planoNome} — Excellent Loja`,
                    external_reference: `${compraId}:${cicloId}`,
                    payer_email: compra.emailComprador,
                    card_token_id: formData.token,
                    auto_recurring: {
                        frequency,
                        frequency_type: frequencyType,
                        transaction_amount: Number(ciclo.valor),
                        currency_id: 'BRL'
                    },
                    back_url: `${req.headers.origin || 'https://excellentloja.vercel.app'}/`,
                    status: 'authorized'
                },
                requestOptions: { idempotencyKey: crypto.randomUUID() }
            });

            const statusMapeado = mapStatus(resposta.status);
            await cicloRef.update({
                metodo: 'cartao', status: statusMapeado,
                mpPreapprovalId: resposta.id,
                atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
            });

            if (statusMapeado === 'aprovado') {
                await confirmarCompra(compraId, cicloId, { mpPreapprovalId: resposta.id });
            }
            res.status(200).json({ status: statusMapeado });
            return;
        }

        const payment = getPaymentClient(config.accessToken);
        const resposta = await payment.create({
            body: {
                transaction_amount: Number(ciclo.valor),
                token: formData.token,
                description: `Plano ${ciclo.planoNome} — Excellent Loja`,
                installments: Number(formData.installments) || 1,
                payment_method_id: formData.payment_method_id,
                issuer_id: formData.issuer_id,
                payer: formData.payer,
                external_reference: `${compraId}:${cicloId}`
            },
            requestOptions: { idempotencyKey: crypto.randomUUID() }
        });

        const statusMapeado = mapStatus(resposta.status);
        await cicloRef.update({
            metodo: 'cartao', mpPaymentId: String(resposta.id), status: statusMapeado,
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });
        if (statusMapeado === 'aprovado') {
            await confirmarCompra(compraId, cicloId, { mpPaymentId: String(resposta.id) });
        }
        res.status(200).json({ status: statusMapeado });
    } catch (err) {
        console.error('pagar-plano-cartao', err);
        const msg = (err && err.message) ? err.message : 'Erro ao processar o cartão.';
        res.status(502).json({ erro: 'Não foi possível processar o cartão: ' + msg });
    }
};
