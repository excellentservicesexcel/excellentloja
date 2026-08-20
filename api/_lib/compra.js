/* ==========================================================================
   compras/{compraId} — assinatura de um plano da plataforma (não é um
   pedido de loja, é a cobrança da própria Excellent Loja pro dono da loja).
   Cada tentativa de pagamento (a primeira e cada renovação) vira um doc em
   compras/{compraId}/ciclos/{cicloId} — isso serve tanto de "pagamentos
   pendentes" quanto de histórico de comprovantes pro painel de Compras.

   Se o mesmo e-mail já tem uma compra (paga ou ainda pendente), uma nova
   tentativa reaproveita o mesmo documento em vez de criar um registro
   novo — só entra um novo ciclo de cobrança nela. Isso evita tanto lojas
   duplicadas (quando já tem onboarding concluído) quanto poluir o painel
   de Compras com várias tentativas nunca pagas da mesma pessoa.
   ========================================================================== */

const { getAdmin } = require('./admin');
const { inferRecorrencia } = require('./planos');
const { marcarLeadConvertido } = require('./leads');

async function criarOuReaproveitarCompra({ planoNome, planoValor, planoTipo, dadosComprador, uidComprador }) {
    const admin = getAdmin();
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;
    const email = dadosComprador.email;

    // Reaproveita QUALQUER compra já existente desse e-mail — mesmo que a
    // pessoa ainda não tenha pago nenhuma vez. Sem isso, cada tentativa
    // desistida no checkout (ex.: mudou de plano, fechou antes de pagar)
    // criava um registro novo, poluindo o painel de Compras com várias
    // linhas "Aguardando 1º pagamento" da mesma pessoa. Assim, todas as
    // tentativas viram ciclos dentro da MESMA compra; o painel de Compras
    // só mostra ela depois do primeiro pagamento de verdade (ver render()
    // em js/compras.js, que filtra pelo campo ativadaEm).
    const existentesSnap = await db.collection('compras')
        .where('emailComprador', '==', email)
        .limit(1).get();

    let compraRef;
    let reaproveitada = false;
    let lojaId = null;
    if (!existentesSnap.empty) {
        const existente = existentesSnap.docs[0];
        compraRef = existente.ref;
        reaproveitada = !!existente.data().onboardingConcluido;
        lojaId = existente.data().lojaId || null;
        const atualizacao = {
            nomeComprador: dadosComprador.nome,
            whatsappComprador: dadosComprador.whatsapp,
            uidComprador,
            atualizadoEm: FieldValue.serverTimestamp()
        };
        // Ainda não pagou nenhuma vez: pode ter mudado de plano nessa nova
        // tentativa, então atualiza o plano "atual" da compra também.
        if (existente.data().status === 'pendente') {
            atualizacao.planoNome = planoNome;
            atualizacao.planoValor = planoValor;
            atualizacao.planoTipo = planoTipo;
        }
        await compraRef.update(atualizacao);
    } else {
        compraRef = db.collection('compras').doc();
        await compraRef.set({
            emailComprador: email,
            nomeComprador: dadosComprador.nome,
            whatsappComprador: dadosComprador.whatsapp,
            uidComprador,
            planoNome, planoValor, planoTipo,
            status: 'pendente',
            lojaId: null,
            onboardingConcluido: false,
            proximoPagamentoEm: null,
            mpPreapprovalId: null,
            criadoEm: FieldValue.serverTimestamp()
        });
    }

    const cicloRef = compraRef.collection('ciclos').doc();
    await cicloRef.set({
        planoNome, planoValor, planoTipo,
        metodo: null, status: 'iniciando',
        mpPaymentId: null, mpPreapprovalId: null,
        valor: planoValor,
        criadoEm: FieldValue.serverTimestamp()
    });

    return { compraId: compraRef.id, cicloId: cicloRef.id, reaproveitada, lojaId };
}

// Confirma um ciclo de cobrança como pago — ativa a compra (na primeira vez)
// ou renova a data do próximo pagamento (nas seguintes), sempre sincronizando
// o plano da compra com o que foi efetivamente cobrado nesse ciclo (é assim
// que uma troca de plano numa recompra com o mesmo e-mail se reflete aqui).
// Idempotente: reprocessar o mesmo ciclo já aprovado não faz nada de novo.
async function confirmarCompra(compraId, cicloId, extra = {}) {
    const admin = getAdmin();
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;
    const compraRef = db.collection('compras').doc(compraId);
    const cicloRef = compraRef.collection('ciclos').doc(cicloId);

    const resultado = await db.runTransaction(async (tx) => {
        const [compraSnap, cicloSnap] = await Promise.all([tx.get(compraRef), tx.get(cicloRef)]);
        if (!compraSnap.exists || !cicloSnap.exists) throw new Error('Compra não encontrada.');
        const compra = compraSnap.data();
        const ciclo = cicloSnap.data();
        if (ciclo.status === 'aprovado') return { jaProcessado: true, lojaId: compra.lojaId || null, emailComprador: compra.emailComprador };

        const { recorrente, frequencyDays } = inferRecorrencia(ciclo.planoTipo || compra.planoTipo);
        const proximoPagamentoEm = recorrente
            ? admin.firestore.Timestamp.fromMillis(Date.now() + frequencyDays * 86400000)
            : null;

        tx.update(cicloRef, {
            status: 'aprovado',
            mpPaymentId: extra.mpPaymentId || ciclo.mpPaymentId || null,
            mpPreapprovalId: extra.mpPreapprovalId || ciclo.mpPreapprovalId || null,
            confirmadoEm: FieldValue.serverTimestamp()
        });

        const dadosCompra = {
            status: 'ativa',
            planoNome: ciclo.planoNome,
            planoValor: ciclo.planoValor,
            planoTipo: ciclo.planoTipo,
            metodoPagamento: ciclo.metodo,
            proximoPagamentoEm,
            atualizadoEm: FieldValue.serverTimestamp()
        };
        if (!compra.ativadaEm) dadosCompra.ativadaEm = FieldValue.serverTimestamp();
        if (extra.mpPreapprovalId) dadosCompra.mpPreapprovalId = extra.mpPreapprovalId;
        tx.update(compraRef, dadosCompra);

        if (compra.lojaId) {
            tx.update(db.collection('lojas').doc(compra.lojaId), { pausadaAutomatica: false });
        }

        return { jaProcessado: false, lojaId: compra.lojaId || null, emailComprador: compra.emailComprador };
    });

    if (!resultado.jaProcessado) {
        try { await marcarLeadConvertido(resultado.emailComprador, compraId); }
        catch (err) { console.error('marcarLeadConvertido', err); }
    }
    return resultado;
}

module.exports = { criarOuReaproveitarCompra, confirmarCompra };
