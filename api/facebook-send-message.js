/* ==========================================================================
   POST /api/facebook-send-message?loja=<id>
   Corpo: { destinatarioId, texto } — mesma lógica do Instagram, só que pelo
   Messenger da página do Facebook daquela loja.
   ========================================================================== */

const { verificarAdminDaLoja, getIntegracaoConfig, chamarGraphApi, salvarMensagemEnviada } = require('./_lib/meta');

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    if (!lojaId) { res.status(400).json({ erro: 'Loja não informada.' }); return; }
    if (!(await verificarAdminDaLoja(req, lojaId))) { res.status(403).json({ erro: 'Sem permissão.' }); return; }

    const { destinatarioId, texto } = req.body || {};
    if (!destinatarioId || !String(texto || '').trim()) { res.status(400).json({ erro: 'Mensagem inválida.' }); return; }

    try {
        const config = await getIntegracaoConfig(lojaId, 'facebook');
        if (!config || !config.ativo || !config.accessToken || !config.pageId) {
            res.status(400).json({ erro: 'Facebook não está conectado nesta loja.' });
            return;
        }

        await chamarGraphApi('me/messages', {
            metodo: 'POST',
            params: { access_token: config.accessToken },
            corpo: { recipient: { id: destinatarioId }, message: { text: texto }, messaging_type: 'RESPONSE' }
        });

        await salvarMensagemEnviada('facebook', lojaId, destinatarioId, texto);
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('facebook-send-message', err);
        res.status(500).json({ erro: err.message || 'Erro ao enviar mensagem.' });
    }
};
