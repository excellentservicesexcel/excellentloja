/* ==========================================================================
   Cliente Mercado Pago — usado pelas funções serverless em /api.
   ========================================================================== */

const { MercadoPagoConfig, Payment, PreApproval } = require('mercadopago');

function getPaymentClient(accessToken) {
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
    return new Payment(client);
}

// Assinaturas (cobrança automática recorrente no cartão) — usada pros planos
// de tipo recorrente (Mensal, Anual, etc.), diferente do Payment avulso.
function getPreApprovalClient(accessToken) {
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
    return new PreApproval(client);
}

module.exports = { getPaymentClient, getPreApprovalClient };
