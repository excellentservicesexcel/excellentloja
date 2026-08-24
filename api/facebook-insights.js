/* ==========================================================================
   GET /api/facebook-insights?loja=<id>&periodo=diario|mensal
   Mesma lógica do instagram-metrics.js, pras métricas da página do Facebook.
   ========================================================================== */

const { getAdmin } = require('./_lib/admin');
const { verificarAdminDaLoja, getIntegracaoConfig, chamarGraphApi } = require('./_lib/meta');

async function coletarSnapshotDeHoje(lojaId) {
    const config = await getIntegracaoConfig(lojaId, 'facebook');
    if (!config || !config.ativo || !config.accessToken || !config.pageId) return null;

    const admin = getAdmin();
    const db = admin.firestore();
    const hoje = new Date().toISOString().slice(0, 10);
    const ref = db.collection('lojas').doc(lojaId).collection('metricasFacebook').doc(hoje);

    let impressoes = 0, engajados = 0, curtidas = 0;
    try {
        const insights = await chamarGraphApi(`${config.pageId}/insights`, {
            params: { metric: 'page_impressions,page_engaged_users', period: 'day', access_token: config.accessToken }
        });
        (insights.data || []).forEach(m => {
            const valor = (m.values && m.values[m.values.length - 1] && m.values[m.values.length - 1].value) || 0;
            if (m.name === 'page_impressions') impressoes = valor;
            if (m.name === 'page_engaged_users') engajados = valor;
        });
    } catch (err) { console.error('insights facebook', err.message); }

    try {
        const pagina = await chamarGraphApi(config.pageId, { params: { fields: 'fan_count', access_token: config.accessToken } });
        curtidas = pagina.fan_count || 0;
    } catch (err) { console.error('fan_count facebook', err.message); }

    const dados = { impressoes, engajados, curtidas, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() };
    await ref.set(dados, { merge: true });
    return { dia: hoje, ...dados };
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const lojaId = String(req.query.loja || '').trim();
    const periodo = req.query.periodo === 'mensal' ? 'mensal' : 'diario';
    if (!lojaId) { res.status(400).json({ erro: 'Loja não informada.' }); return; }
    if (!(await verificarAdminDaLoja(req, lojaId))) { res.status(403).json({ erro: 'Sem permissão.' }); return; }

    try {
        const admin = getAdmin();
        const db = admin.firestore();
        const colRef = db.collection('lojas').doc(lojaId).collection('metricasFacebook');

        const hoje = new Date().toISOString().slice(0, 10);
        const hojeSnap = await colRef.doc(hoje).get();
        if (!hojeSnap.exists) await coletarSnapshotDeHoje(lojaId);

        const dias = periodo === 'mensal' ? 180 : 30;
        const desde = new Date();
        desde.setDate(desde.getDate() - dias);
        const desdeKey = desde.toISOString().slice(0, 10);

        const snap = await colRef.where(admin.firestore.FieldPath.documentId(), '>=', desdeKey).orderBy(admin.firestore.FieldPath.documentId()).get();
        let pontos = snap.docs.map(d => ({ dia: d.id, ...d.data() }));

        if (periodo === 'mensal') {
            const porMes = {};
            pontos.forEach(p => {
                const mes = p.dia.slice(0, 7);
                if (!porMes[mes] || p.dia > porMes[mes].dia) porMes[mes] = p;
            });
            pontos = Object.keys(porMes).sort().map(mes => ({ dia: mes, ...porMes[mes] }));
        }

        res.status(200).json({ conectado: true, pontos });
    } catch (err) {
        console.error('facebook-insights', err);
        res.status(200).json({ conectado: false, pontos: [] });
    }
};

module.exports.coletarSnapshotDeHoje = coletarSnapshotDeHoje;
