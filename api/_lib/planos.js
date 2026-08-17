/* ==========================================================================
   Interpreta o texto livre do campo "Tipo de cobrança" de um plano (ex:
   "Mensal", "Anual", "Único") pra decidir a frequência de cobrança —
   usado tanto pra saber quando cobrar de novo (Pix) quanto pra configurar
   a assinatura recorrente no Mercado Pago (Cartão).
   ========================================================================== */

function normalizar(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function inferRecorrencia(tipoTexto) {
    const t = normalizar(tipoTexto);
    if (/unic|vitalici|avuls/.test(t)) return { recorrente: false, frequencyDays: null, frequency: null, frequencyType: null };
    if (/semanal/.test(t)) return { recorrente: true, frequencyDays: 7, frequency: 7, frequencyType: 'days' };
    if (/quinzenal/.test(t)) return { recorrente: true, frequencyDays: 15, frequency: 15, frequencyType: 'days' };
    if (/bimestral/.test(t)) return { recorrente: true, frequencyDays: 60, frequency: 2, frequencyType: 'months' };
    if (/trimestral/.test(t)) return { recorrente: true, frequencyDays: 90, frequency: 3, frequencyType: 'months' };
    if (/semestral/.test(t)) return { recorrente: true, frequencyDays: 180, frequency: 6, frequencyType: 'months' };
    if (/anual/.test(t)) return { recorrente: true, frequencyDays: 365, frequency: 12, frequencyType: 'months' };
    // "mensal" ou qualquer texto não reconhecido: assume cobrança mensal
    return { recorrente: true, frequencyDays: 30, frequency: 1, frequencyType: 'months' };
}

module.exports = { inferRecorrencia };
