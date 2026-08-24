/* ==========================================================================
   GET /api/cron-coletar-metricas — roda 1x por dia (ver vercel.json).
   Passa em toda loja com Instagram e/ou Facebook conectados e ativos, e
   grava o snapshot do dia de cada uma, pra o histórico de métricas existir
   mesmo em lojas onde ninguém abriu o painel naquele dia.
   ========================================================================== */

const { getAdmin } = require('./_lib/admin');
const instagramMetrics = require('./instagram-metrics');
const facebookInsights = require('./facebook-insights');

module.exports = async (req, res) => {
    try {
        const admin = getAdmin();
        const db = admin.firestore();
        const lojasSnap = await db.collection('lojas').get();

        let processadas = 0;
        for (const doc of lojasSnap.docs) {
            const lojaId = doc.id;
            try {
                const igConfig = await db.collection('lojas').doc(lojaId).collection('config').doc('instagram').get();
                if (igConfig.exists && igConfig.data().ativo) {
                    await instagramMetrics.coletarSnapshotDeHoje(lojaId);
                    processadas++;
                }
            } catch (err) { console.error('cron instagram', lojaId, err.message); }

            try {
                const fbConfig = await db.collection('lojas').doc(lojaId).collection('config').doc('facebook').get();
                if (fbConfig.exists && fbConfig.data().ativo) {
                    await facebookInsights.coletarSnapshotDeHoje(lojaId);
                    processadas++;
                }
            } catch (err) { console.error('cron facebook', lojaId, err.message); }
        }

        res.status(200).json({ ok: true, processadas });
    } catch (err) {
        console.error('cron-coletar-metricas', err);
        res.status(500).json({ erro: 'Erro ao coletar métricas.' });
    }
};
