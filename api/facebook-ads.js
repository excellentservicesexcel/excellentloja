/* ==========================================================================
   GET /api/facebook-ads?loja=<id>
   Lista as campanhas da conta de anúncios da loja (Marketing API), com
   gasto e resultados dos últimos 30 dias, pra tabela de Campanhas.
   ========================================================================== */

const { verificarAdminDaLoja, getIntegracaoConfig, chamarGraphApi } = require('./_lib/meta');

module.exports = async (req, res) => {
    if (req.method !== 'GET') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    if (!lojaId) { res.status(400).json({ erro: 'Loja não informada.' }); return; }
    if (!(await verificarAdminDaLoja(req, lojaId))) { res.status(403).json({ erro: 'Sem permissão.' }); return; }

    try {
        const config = await getIntegracaoConfig(lojaId, 'facebook');
        if (!config || !config.ativo || !config.accessToken || !config.adAccountId) {
            res.status(200).json({ conectado: false, campanhas: [] });
            return;
        }

        const dados = await chamarGraphApi(`act_${config.adAccountId.replace(/^act_/, '')}/campaigns`, {
            params: {
                fields: 'id,name,status,insights.date_preset(last_30d){spend,impressions,clicks,actions}',
                access_token: config.accessToken
            }
        });

        const campanhas = (dados.data || []).map(c => {
            const ins = c.insights && c.insights.data && c.insights.data[0];
            const resultados = ins && ins.actions ? ins.actions.reduce((s, a) => s + (Number(a.value) || 0), 0) : 0;
            return {
                id: c.id,
                nome: c.name,
                status: c.status,
                gasto: ins ? Number(ins.spend) || 0 : 0,
                impressoes: ins ? Number(ins.impressions) || 0 : 0,
                cliques: ins ? Number(ins.clicks) || 0 : 0,
                resultados
            };
        });

        res.status(200).json({ conectado: true, campanhas });
    } catch (err) {
        console.error('facebook-ads', err);
        res.status(200).json({ conectado: false, campanhas: [], erro: err.message });
    }
};
