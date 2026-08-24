/* ==========================================================================
   GET /api/instagram-posts?loja=<id>
   Endpoint público (qualquer visitante da loja virtual chama isso) — busca
   as publicações mais recentes do Instagram da loja pra mostrar em "Siga
   nosso Instagram" sem precisar cadastrar imagem/título/texto na mão. O
   token de acesso nunca sai do servidor.
   ========================================================================== */

const { getIntegracaoConfig, chamarGraphApi } = require('./_lib/meta');

module.exports = async (req, res) => {
    if (req.method !== 'GET') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    if (!lojaId) { res.status(400).json({ erro: 'Loja não informada.' }); return; }

    try {
        const config = await getIntegracaoConfig(lojaId, 'instagram');
        if (!config || !config.ativo || !config.accessToken || !config.igUserId) {
            res.status(200).json({ conectado: false, posts: [] });
            return;
        }

        const dados = await chamarGraphApi(`${config.igUserId}/media`, {
            params: {
                fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
                limit: 6,
                access_token: config.accessToken
            }
        });

        const posts = (dados.data || []).map(p => ({
            id: p.id,
            imagem: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
            link: p.permalink,
            legenda: p.caption || ''
        }));

        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
        res.status(200).json({ conectado: true, posts });
    } catch (err) {
        console.error('instagram-posts', err);
        res.status(200).json({ conectado: false, posts: [] });
    }
};
