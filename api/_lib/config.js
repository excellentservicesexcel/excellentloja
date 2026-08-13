/* ==========================================================================
   Leitura da configuração de pagamento (privada) de uma loja.
   ========================================================================== */

const { getAdmin } = require('./admin');

async function getPagamentoConfig(lojaId) {
    const admin = getAdmin();
    const db = admin.firestore();
    const snap = await db.collection('lojas').doc(lojaId).collection('config').doc('pagamento').get();
    if (!snap.exists) return null;
    return snap.data();
}

module.exports = { getPagamentoConfig };
