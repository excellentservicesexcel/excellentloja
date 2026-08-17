/* ==========================================================================
   Inicialização do Firebase Admin SDK (usada só pelas funções serverless
   em /api — nunca roda no navegador). Precisa da variável de ambiente
   FIREBASE_SERVICE_ACCOUNT na Vercel, com o JSON da conta de serviço
   inteiro colado como texto. Veja o README para o passo a passo.
   ========================================================================== */

const admin = require('firebase-admin');

let app = null;

function getAdmin() {
    if (!app) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT não configurada nas variáveis de ambiente da Vercel.');
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(raw);
        } catch (e) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT não é um JSON válido — confira se colou o arquivo inteiro.');
        }
        app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin;
}

module.exports = { getAdmin };
