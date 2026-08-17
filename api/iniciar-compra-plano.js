/* ==========================================================================
   POST /api/iniciar-compra-plano
   Primeiro passo da compra de um plano na página inicial — não é escopado
   por loja (a loja ainda nem existe). Recebe os dados de quem está
   comprando e cria (ou reaproveita, se o e-mail já é de um cliente com
   loja) o registro da compra + um novo ciclo de cobrança.
   ========================================================================== */

const { getPagamentoPlataformaConfig } = require('./_lib/config');
const { criarOuReaproveitarCompra } = require('./_lib/compra');
const { registrarLead } = require('./_lib/leads');

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const body = req.body || {};
    const planoNome = String(body.planoNome || '').trim();
    const planoValor = Number(body.planoValor);
    const planoTipo = String(body.planoTipo || '').trim();
    const uidComprador = String(body.uidComprador || '').trim();
    const d = body.dadosComprador || {};
    const dadosComprador = {
        nome: String(d.nome || '').trim(),
        email: String(d.email || '').trim().toLowerCase(),
        whatsapp: String(d.whatsapp || '').trim()
    };

    if (!planoNome || !(planoValor > 0)) { res.status(400).json({ erro: 'Plano inválido.' }); return; }
    if (!uidComprador) { res.status(400).json({ erro: 'Comprador não identificado.' }); return; }
    if (!dadosComprador.nome || !dadosComprador.email || !dadosComprador.whatsapp) {
        res.status(400).json({ erro: 'Preencha nome, e-mail e WhatsApp.' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dadosComprador.email)) {
        res.status(400).json({ erro: 'E-mail inválido.' });
        return;
    }

    try {
        const config = await getPagamentoPlataformaConfig();
        if (!config) { res.status(400).json({ erro: 'O pagamento de planos ainda não foi configurado.' }); return; }

        // registra o interesse já aqui — mesmo que a pessoa desista antes de pagar,
        // isso fica salvo pra permitir follow-up manual (aba Leads no painel).
        try { await registrarLead({ ...dadosComprador, planoNome, planoValor, planoTipo }); }
        catch (err) { console.error('registrarLead', err); }

        const { compraId, cicloId, reaproveitada, lojaId } = await criarOuReaproveitarCompra({ planoNome, planoValor, planoTipo, dadosComprador, uidComprador });
        res.status(200).json({ compraId, cicloId, total: planoValor, publicKey: config.publicKey, reaproveitada, lojaId });
    } catch (err) {
        console.error('iniciar-compra-plano', err);
        res.status(500).json({ erro: 'Erro ao iniciar a compra. Tente novamente.' });
    }
};
