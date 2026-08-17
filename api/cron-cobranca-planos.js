/* ==========================================================================
   GET /api/cron-cobranca-planos
   Roda uma vez por dia (vercel.json). Faz duas coisas:
   1) Pix é gerado uma cobrança nova a cada renovação (não é recorrência
      automática de verdade como o cartão) — então, pras compras pagas por
      Pix cujo próximo pagamento está perto, gera um novo código Pix.
      A renovação por cartão já é automática via assinatura (PreApproval) e
      não passa por aqui — a confirmação dela chega pelo webhook.
   2) Se já passou 7 dias do vencimento sem pagar, pausa a loja
      automaticamente (chega o pagamento depois, o próprio webhook/consulta
      já reativa via confirmarCompra).
   Protegido por CRON_SECRET (a Vercel manda esse header sozinha nos crons
   configurados em vercel.json; qualquer outra chamada sem o header correto
   é recusada).
   ========================================================================== */

const crypto = require('crypto');
const { getAdmin } = require('./_lib/admin');
const { getPagamentoPlataformaConfig } = require('./_lib/config');
const { getPaymentClient } = require('./_lib/mercadopago');

const DIAS_ANTECEDENCIA_PIX = 2;
const DIAS_TOLERANCIA_ATRASO = 7;

module.exports = async (req, res) => {
    if (process.env.CRON_SECRET) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${process.env.CRON_SECRET}`) { res.status(401).json({ erro: 'Não autorizado.' }); return; }
    }

    try {
        const admin = getAdmin();
        const db = admin.firestore();
        const FieldValue = admin.firestore.FieldValue;
        const agora = Date.now();

        const ativasSnap = await db.collection('compras').where('status', 'in', ['ativa', 'atrasada']).get();

        let pixGerados = 0;
        let pausadas = 0;
        let marcadasAtrasadas = 0;

        const config = await getPagamentoPlataformaConfig();
        const payment = config ? getPaymentClient(config.accessToken) : null;

        for (const doc of ativasSnap.docs) {
            const compra = doc.data();
            if (!compra.proximoPagamentoEm) continue; // plano "único", sem recorrência
            const vencimento = compra.proximoPagamentoEm.toMillis();

            if (compra.lojaId && agora > vencimento + DIAS_TOLERANCIA_ATRASO * 86400000) {
                await doc.ref.update({ status: 'pausada', pausadaEm: FieldValue.serverTimestamp() });
                await db.collection('lojas').doc(compra.lojaId).update({ pausadaAutomatica: true });
                pausadas++;
                continue;
            }

            if (agora > vencimento && compra.status !== 'atrasada') {
                await doc.ref.update({ status: 'atrasada' });
                marcadasAtrasadas++;
            }

            if (compra.metodoPagamento === 'pix' && payment && agora >= vencimento - DIAS_ANTECEDENCIA_PIX * 86400000) {
                const ultimoCicloSnap = await doc.ref.collection('ciclos').orderBy('criadoEm', 'desc').limit(1).get();
                const ultimoCiclo = ultimoCicloSnap.empty ? null : ultimoCicloSnap.docs[0].data();
                if (ultimoCiclo && ultimoCiclo.status !== 'aprovado') continue; // já tem renovação em aberto

                const cicloRef = doc.ref.collection('ciclos').doc();
                await cicloRef.set({
                    planoNome: compra.planoNome, planoValor: compra.planoValor, planoTipo: compra.planoTipo,
                    metodo: null, status: 'iniciando', mpPaymentId: null, mpPreapprovalId: null,
                    valor: compra.planoValor, criadoEm: FieldValue.serverTimestamp()
                });

                const partesNome = String(compra.nomeComprador || 'Cliente').trim().split(/\s+/);
                try {
                    const resposta = await payment.create({
                        body: {
                            transaction_amount: Number(compra.planoValor),
                            description: `Renovação — plano ${compra.planoNome} — Excellent Loja`,
                            payment_method_id: 'pix',
                            payer: {
                                email: compra.emailComprador,
                                first_name: partesNome[0] || 'Cliente',
                                last_name: partesNome.slice(1).join(' ') || '-'
                            },
                            external_reference: `${doc.id}:${cicloRef.id}`
                        },
                        requestOptions: { idempotencyKey: crypto.randomUUID() }
                    });
                    const dadosTransacao = resposta.point_of_interaction && resposta.point_of_interaction.transaction_data;
                    if (dadosTransacao && dadosTransacao.qr_code_base64) {
                        await cicloRef.update({
                            metodo: 'pix', mpPaymentId: String(resposta.id),
                            qrCode: dadosTransacao.qr_code, qrCodeBase64: dadosTransacao.qr_code_base64,
                            status: 'pendente', atualizadoEm: FieldValue.serverTimestamp()
                        });
                        pixGerados++;
                    }
                } catch (err) {
                    console.error('cron-cobranca-planos: falha ao gerar pix de renovação', doc.id, err.message);
                }
            }
        }

        res.status(200).json({ ok: true, pixGerados, pausadas, marcadasAtrasadas, total: ativasSnap.size });
    } catch (err) {
        console.error('cron-cobranca-planos', err);
        res.status(500).json({ erro: 'Erro ao processar cobranças.' });
    }
};
