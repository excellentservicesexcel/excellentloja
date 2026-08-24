/* ==========================================================================
   GET/POST /api/facebook-webhook — mesma lógica do instagram-webhook.js,
   só que pra mensagens do Messenger (Facebook), roteadas pelo id da página.
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
            const pageId = entrada.id;
            const lojaId = await acharLojaPorContaMeta(pageId);
            if (!lojaId) continue;

            const eventos = Array.isArray(entrada.messaging) ? entrada.messaging : [];
            for (const evento of eventos) {
                const texto = evento.message && evento.message.text;
                const remetente = evento.sender && evento.sender.id;
                if (!texto || !remetente) continue;
                await salvarMensagemRecebida('facebook', lojaId, remetente, null, texto);
            }
        }
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('facebook-webhook', err);
        res.status(200).json({ ok: true });
    }
};
