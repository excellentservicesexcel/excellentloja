/* ==========================================================================
   Cliente Mercado Pago — usado pelas funções serverless em /api.
   ========================================================================== */

const { MercadoPagoConfig, Payment } = require('mercadopago');

function getPaymentClient(accessToken) {
    const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });
    return new Payment(client);
}

module.exports = { getPaymentClient };
