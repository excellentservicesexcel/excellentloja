/* ==========================================================================
   GET /api/instagram-metrics?loja=<id>&periodo=diario|mensal
   Devolve o histórico de métricas do Instagram pros gráficos do painel.
   O histórico é nosso (guardado em lojas/{id}/metricasInstagram, um
   documento por dia — ver api/coletar-metricas.js), porque a própria Graph
   API não guarda tudo por muito tempo. Se o dia de hoje ainda não tem
   registro (primeira vez que a loja abre essa tela, antes do cron rodar às
   9h), busca na hora e já grava, pra nunca aparecer vazio à toa.
   ========================================================================== */

const { getAdmin } = require('./_lib/admin');
const { verificarAdminDaLoja, getIntegracaoConfig, chamarGraphApi } = require('./_lib/meta');

async function coletarSnapshotDeHoje(lojaId) {
    const config = await getIntegracaoConfig(lojaId, 'instagram');
    if (!config || !config.ativo || !config.accessToken || !config.igUserId) return null;

    const admin = getAdmin();
    const db = admin.firestore();
    const hoje = new Date().toISOString().slice(0, 10);
    const ref = db.collection('lojas').doc(lojaId).collection('metricasInstagram').doc(hoje);

    let alcance = 0, visitasPerfil = 0, contasEngajadas = 0, seguidores = 0;
    try {
        const insights = await chamarGraphApi(`${config.igUserId}/insights`, {
            params: { metric: 'reach,profile_views,accounts_engaged', period: 'day', access_token: config.accessToken }
        });
        (insights.data || []).forEach(m => {
            const valor = (m.values && m.values[m.values.length - 1] && m.values[m.values.length - 1].value) || 0;
            if (m.name === 'reach') alcance = valor;
            if (m.name === 'profile_views') visitasPerfil = valor;
            if (m.name === 'accounts_engaged') contasEngajadas = valor;
        });
    } catch (err) { console.error('insights instagram', err.message); }

    try {
        const conta = await chamarGraphApi(config.igUserId, { params: { fields: 'followers_count', access_token: config.accessToken } });
        seguidores = conta.followers_count || 0;
    } catch (err) { console.error('followers_count instagram', err.message); }

    const dados = { alcance, visitasPerfil, contasEngajadas, seguidores, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() };
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
        const colRef = db.collection('lojas').doc(lojaId).collection('metricasInstagram');

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
                if (!porMes[mes] || p.dia > porMes[mes].dia) porMes[mes] = p; // último dia registrado do mês
            });
            pontos = Object.keys(porMes).sort().map(mes => ({ dia: mes, ...porMes[mes] }));
        }

        res.status(200).json({ conectado: true, pontos });
    } catch (err) {
        console.error('instagram-metrics', err);
        res.status(200).json({ conectado: false, pontos: [] });
    }
};

module.exports.coletarSnapshotDeHoje = coletarSnapshotDeHoje;
