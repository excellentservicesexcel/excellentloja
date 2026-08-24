/* ==========================================================================
   Helpers compartilhados pelas funções serverless de Instagram e Facebook
   (Graph API da Meta). Usa fetch nativo do Node (Vercel roda Node 18+).
   ========================================================================== */

const { getAdmin } = require('./admin');

const GRAPH_URL = 'https://graph.facebook.com/v21.0';

// Token que a lojista cola na configuração do Webhook, lá no painel de
// desenvolvedor da Meta (developers.facebook.com > seu app > Webhooks).
// Não é segredo de verdade: só prova que a URL é nossa durante a checagem
// inicial da Meta — quem realmente decide se uma mensagem é aceita é o
// id da página/conta do Instagram bater com alguma loja em metaContas.
const WEBHOOK_VERIFY_TOKEN = 'excellentloja_meta_webhook';

async function chamarGraphApi(caminho, { metodo = 'GET', params = {}, corpo = null } = {}) {
    const url = new URL(`${GRAPH_URL}/${caminho}`);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
    const opcoes = { method: metodo, headers: {} };
    if (corpo) {
        opcoes.headers['Content-Type'] = 'application/json';
        opcoes.body = JSON.stringify(corpo);
    }
    const resp = await fetch(url.toString(), opcoes);
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok || dados.error) {
        const msg = (dados.error && dados.error.message) || `Erro na Graph API (${resp.status})`;
        const erro = new Error(msg);
        erro.graphError = dados.error;
        throw erro;
    }
    return dados;
}

async function getIntegracaoConfig(lojaId, tipo) {
    const admin = getAdmin();
    const db = admin.firestore();
    const snap = await db.collection('lojas').doc(lojaId).collection('config').doc(tipo).get();
    return snap.exists ? snap.data() : null;
}

// Confere, pelo token de login do Firebase (Authorization: Bearer <token>),
// se quem está chamando de fato administra essa loja — mesma checagem que
// as regras do Firestore fariam, só que aqui do lado do servidor (essas
// funções usam o Admin SDK, que ignora as regras).
async function verificarAdminDaLoja(req, lojaId) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return false;
    try {
        const admin = getAdmin();
        const decoded = await admin.auth().verifyIdToken(token);
        const email = (decoded.email || '').toLowerCase();
        if (email === 'excellentservices.excel@gmail.com') return true;
        const lojaSnap = await admin.firestore().collection('lojas').doc(lojaId).get();
        if (!lojaSnap.exists) return false;
        const autorizados = (lojaSnap.data().usuariosAutorizados || []).map(e => (e || '').toLowerCase());
        return autorizados.includes(email);
    } catch (err) {
        return false;
    }
}

// Acha qual loja é dona de um id de página do Facebook / conta comercial do
// Instagram, pra rotear a mensagem recebida no webhook pro lugar certo.
async function acharLojaPorContaMeta(contaId) {
    if (!contaId) return null;
    const admin = getAdmin();
    const snap = await admin.firestore().collection('metaContas').doc(String(contaId)).get();
    return snap.exists ? snap.data().lojaId : null;
}

// tipo: 'instagram' ou 'facebook' -> nome da coleção de conversas daquela loja.
function colecaoConversas(tipo) {
    return tipo === 'instagram' ? 'instagramConversas' : 'facebookConversas';
}

async function salvarMensagemRecebida(tipo, lojaId, contatoId, nomeContato, texto) {
    const admin = getAdmin();
    const db = admin.firestore();
    const convRef = db.collection('lojas').doc(lojaId).collection(colecaoConversas(tipo)).doc(String(contatoId));
    const agora = admin.firestore.FieldValue.serverTimestamp();
    await convRef.set({
        nome: nomeContato || convRef.id,
        ultimaMensagem: texto,
        ultimaMensagemEm: agora,
        naoLida: true
    }, { merge: true });
    await convRef.collection('mensagens').add({ texto, de: 'cliente', criadoEm: agora });
}

async function salvarMensagemEnviada(tipo, lojaId, contatoId, texto) {
    const admin = getAdmin();
    const db = admin.firestore();
    const convRef = db.collection('lojas').doc(lojaId).collection(colecaoConversas(tipo)).doc(String(contatoId));
    const agora = admin.firestore.FieldValue.serverTimestamp();
    await convRef.set({ ultimaMensagem: texto, ultimaMensagemEm: agora, naoLida: false }, { merge: true });
    await convRef.collection('mensagens').add({ texto, de: 'loja', criadoEm: agora });
}

module.exports = {
    chamarGraphApi, getIntegracaoConfig, verificarAdminDaLoja, acharLojaPorContaMeta, WEBHOOK_VERIFY_TOKEN,
    salvarMensagemRecebida, salvarMensagemEnviada
};
