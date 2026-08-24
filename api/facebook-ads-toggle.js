/* ==========================================================================
   POST /api/facebook-ads-toggle?loja=<id>
   Corpo: { campanhaId, ativa }
   Liga (ACTIVE) ou desliga (PAUSED) uma campanha de anúncios direto do
   painel — a chavinha na tabela de Campanhas.
   ========================================================================== */

const { verificarAdminDaLoja, getIntegracaoConfig, chamarGraphApi } = require('./_lib/meta');

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    if (!lojaId) { res.status(400).json({ erro: 'Loja não informada.' }); return; }
    if (!(await verificarAdminDaLoja(req, lojaId))) { res.status(403).json({ erro: 'Sem permissão.' }); return; }

    const { campanhaId, ativa } = req.body || {};
    if (!campanhaId) { res.status(400).json({ erro: 'Campanha não informada.' }); return; }

    try {
        const config = await getIntegracaoConfig(lojaId, 'facebook');
        if (!config || !config.ativo || !config.accessToken) {
            res.status(400).json({ erro: 'Facebook não está conectado nesta loja.' });
            return;
        }

        await chamarGraphApi(campanhaId, {
            metodo: 'POST',
            params: { access_token: config.accessToken },
            corpo: { status: ativa ? 'ACTIVE' : 'PAUSED' }
        });

        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('facebook-ads-toggle', err);
        res.status(500).json({ erro: err.message || 'Erro ao atualizar campanha.' });
    }
};
