/* ==========================================================================
   GET/POST /api/instagram-webhook
   URL fixa (a mesma pra todas as lojas) que cada lojista cola no Webhook do
   próprio app da Meta, junto com o Verify Token de api/_lib/meta.js. A Meta
   chama com GET uma vez, só pra confirmar que a URL é nossa; depois, cada
   mensagem nova chega por POST. Quem realmente decide se aceita a mensagem
   é o id da conta do Instagram bater com alguma loja em metaContas — o
   Verify Token não é segredo de verdade, só formalidade da checagem inicial.
   ========================================================================== */

const { WEBHOOK_VERIFY_TOKEN, acharLojaPorContaMeta, salvarMensagemRecebida } = require('./_lib/meta');

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const q = req.query || {};
        if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === WEBHOOK_VERIFY_TOKEN) {
            res.status(200).send(String(q['hub.challenge'] || ''));
            return;
        }
        res.status(403).send('Verificação falhou.');
        return;
    }

    if (req.method !== 'POST') { res.status(405).end(); return; }

    try {
        const body = req.body || {};
        const entradas = Array.isArray(body.entry) ? body.entry : [];
        for (const entrada of entradas) {
            const igUserId = entrada.id;
            const lojaId = await acharLojaPorContaMeta(igUserId);
            if (!lojaId) continue;

            const eventos = Array.isArray(entrada.messaging) ? entrada.messaging : [];
            for (const evento of eventos) {
                const texto = evento.message && evento.message.text;
                const remetente = evento.sender && evento.sender.id;
                if (!texto || !remetente) continue;
                await salvarMensagemRecebida('instagram', lojaId, remetente, null, texto);
            }
        }
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('instagram-webhook', err);
        // sempre 200 pra Meta não ficar re-tentando o mesmo evento em loop
        res.status(200).json({ ok: true });
    }
};
