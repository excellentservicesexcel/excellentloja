/* ==========================================================================
   POST /api/pagar-pix?loja=<id>
   Gera (ou regenera) uma cobrança Pix no Mercado Pago para um pagamento
   pendente já criado por /api/iniciar-pagamento, e devolve o QR code.
   ========================================================================== */

const crypto = require('crypto');
const { getAdmin } = require('./_lib/admin');
const { getPagamentoConfig } = require('./_lib/config');
const { getPaymentClient } = require('./_lib/mercadopago');

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    const pendingId = String((req.body || {}).pendingId || '').trim();
    if (!lojaId || !pendingId) { res.status(400).json({ erro: 'Requisição inválida.' }); return; }

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
        const partesNome = String(pending.dadosCliente.nome || 'Cliente').trim().split(/\s+/);
        const payment = getPaymentClient(config.accessToken);

        const resposta = await payment.create({
            body: {
                transaction_amount: Number(pending.total),
                description: `Pedido — ${nomeLoja}`,
                payment_method_id: 'pix',
                payer: {
                    email: `pedido.${pendingId}@excellentloja.app`,
                    first_name: partesNome[0] || 'Cliente',
                    last_name: partesNome.slice(1).join(' ') || '-'
                },
                external_reference: pendingId
            },
            requestOptions: { idempotencyKey: crypto.randomUUID() }
        });

        const dadosTransacao = resposta.point_of_interaction && resposta.point_of_interaction.transaction_data;
        if (!dadosTransacao || !dadosTransacao.qr_code_base64) {
            res.status(502).json({ erro: 'O Mercado Pago não retornou o QR Code Pix. Confira o Access Token configurado.' });
            return;
        }

        await pendingRef.update({
            metodo: 'pix',
            mpPaymentId: String(resposta.id),
            qrCode: dadosTransacao.qr_code,
            qrCodeBase64: dadosTransacao.qr_code_base64,
            status: 'pendente',
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(200).json({ qrCode: dadosTransacao.qr_code, qrCodeBase64: dadosTransacao.qr_code_base64 });
    } catch (err) {
        console.error('pagar-pix', err);
        const msg = (err && err.message) ? err.message : 'Erro ao gerar o Pix.';
        res.status(502).json({ erro: 'Não foi possível gerar o Pix agora: ' + msg });
    }
};
