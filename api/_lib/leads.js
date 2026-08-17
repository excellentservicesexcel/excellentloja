/* ==========================================================================
   leads/{leadId} — registro de quem demonstrou interesse num plano (chegou
   a preencher os dados e avançar pro pagamento) mas pode nunca chegar a
   pagar. Serve pro dono da plataforma fazer follow-up manual. Não tem
   relação com compras/{id} (que só existe depois de uma tentativa real de
   cobrança) — um lead pode nunca virar uma compra.

   Um e-mail só gera um lead — tentativas seguintes (mesmo plano ou outro)
   atualizam o mesmo registro em vez de duplicar.
   ========================================================================== */

const { getAdmin } = require('./admin');

async function registrarLead({ nome, email, whatsapp, planoNome, planoValor, planoTipo }) {
    const admin = getAdmin();
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    const dados = { nome, email, whatsapp, planoNome, planoValor, planoTipo, atualizadoEm: FieldValue.serverTimestamp() };

    const existente = await db.collection('leads').where('email', '==', email).limit(1).get();
    if (!existente.empty) {
        await existente.docs[0].ref.update(dados);
        return existente.docs[0].id;
    }

    const ref = db.collection('leads').doc();
    await ref.set({ ...dados, criadoEm: FieldValue.serverTimestamp(), convertido: false, compraId: null });
    return ref.id;
}

// Marca o lead correspondente como convertido quando a compra dele é
// confirmada — ajuda a saber quem já converteu sem precisar cruzar listas.
async function marcarLeadConvertido(email, compraId) {
    const admin = getAdmin();
    const db = admin.firestore();
    const existente = await db.collection('leads').where('email', '==', email).limit(1).get();
    if (existente.empty) return;
    await existente.docs[0].ref.update({ convertido: true, compraId, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() });
}

module.exports = { registrarLead, marcarLeadConvertido };
