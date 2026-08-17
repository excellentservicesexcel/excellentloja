/* ==========================================================================
   Leitura da configuração de pagamento (privada) de uma loja.

   As credenciais (Public Key, Access Token, Webhook Secret) e o campo
   "liberado" ficam em lojas/{id}/config/pagamento, editável só pelo super
   admin. O campo "ativo" (se a própria loja optou por usar) fica separado,
   em lojas/{id}/config/pagamentoStatus, editável pela loja — assim ela nunca
   tem acesso de leitura às chaves, só ao próprio interruptor. Esta função
   combina os dois num único objeto pros endpoints não precisarem saber
   dessa separação.
   ========================================================================== */

const { getAdmin } = require('./admin');

async function getPagamentoConfig(lojaId) {
    const admin = getAdmin();
    const db = admin.firestore();
    const configRef = db.collection('lojas').doc(lojaId).collection('config');
    const [credSnap, statusSnap] = await Promise.all([
        configRef.doc('pagamento').get(),
        configRef.doc('pagamentoStatus').get()
    ]);
    if (!credSnap.exists) return null;
    const cred = credSnap.data();
    const status = statusSnap.exists ? statusSnap.data() : {};
    return {
        ...cred,
        ativo: !!(cred.liberado && status.ativo)
    };
}

/* Credenciais do Mercado Pago da própria plataforma (não de uma loja) —
   usadas quando alguém compra um plano na página inicial. Ficam em
   lojas/root/config/pagamentoPlataforma, editável só pelo super admin. */
async function getPagamentoPlataformaConfig() {
    const admin = getAdmin();
    const db = admin.firestore();
    const snap = await db.collection('lojas').doc('root').collection('config').doc('pagamentoPlataforma').get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (!d.accessToken || !d.publicKey) return null;
    return d;
}

module.exports = { getPagamentoConfig, getPagamentoPlataformaConfig };
