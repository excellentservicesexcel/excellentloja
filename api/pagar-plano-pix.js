/* ==========================================================================
   POST /api/pagar-plano-pix
   Gera a cobrança Pix (avulsa — a Pix não tem recorrência automática no
   Mercado Pago; cada renovação gera um novo código, ver api/cron-cobranca-
   planos.js) pra um ciclo de compra de plano já criado.
   ========================================================================== */

const crypto = require('crypto');
const { getAdmin } = require('./_lib/admin');
const { getPagamentoPlataformaConfig } = require('./_lib/config');
const { getPaymentClient } = require('./_lib/mercadopago');

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const body = req.body || {};
    const compraId = String(body.compraId || '').trim();
    const cicloId = String(body.cicloId || '').trim();
    if (!compraId || !cicloId) { res.status(400).json({ erro: 'Requisição inválida.' }); return; }

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

        const partesNome = String(compra.nomeComprador || 'Cliente').trim().split(/\s+/);
        const payment = getPaymentClient(config.accessToken);

        const resposta = await payment.create({
            body: {
                transaction_amount: Number(ciclo.valor),
                description: `Plano ${ciclo.planoNome} — Excellent Loja`,
                payment_method_id: 'pix',
                payer: {
                    email: compra.emailComprador,
                    first_name: partesNome[0] || 'Cliente',
                    last_name: partesNome.slice(1).join(' ') || '-'
                },
                external_reference: `${compraId}:${cicloId}`
            },
            requestOptions: { idempotencyKey: crypto.randomUUID() }
        });

        const dadosTransacao = resposta.point_of_interaction && resposta.point_of_interaction.transaction_data;
        if (!dadosTransacao || !dadosTransacao.qr_code_base64) {
            res.status(502).json({ erro: 'O Mercado Pago não retornou o QR Code Pix. Confira o Access Token configurado.' });
            return;
        }

        await cicloRef.update({
            metodo: 'pix',
            mpPaymentId: String(resposta.id),
            qrCode: dadosTransacao.qr_code,
            qrCodeBase64: dadosTransacao.qr_code_base64,
            status: 'pendente',
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ qrCode: dadosTransacao.qr_code, qrCodeBase64: dadosTransacao.qr_code_base64 });
    } catch (err) {
        console.error('pagar-plano-pix', err);
        const msg = (err && err.message) ? err.message : 'Erro ao gerar o Pix.';
        res.status(502).json({ erro: 'Não foi possível gerar o Pix agora: ' + msg });
    }
};
