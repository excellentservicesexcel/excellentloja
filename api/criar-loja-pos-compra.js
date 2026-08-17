/* ==========================================================================
   POST /api/criar-loja-pos-compra
   Último passo do checkout de um plano: depois que a compra foi paga e a
   pessoa respondeu as perguntas de configuração + criou a conta (Google ou
   e-mail/senha), este endpoint cria a loja de verdade — só o Admin SDK
   pode criar lojas (a regra do Firestore bloqueia criação pelo cliente).
   Exige o ID token de quem acabou de se cadastrar, pra confirmar que quem
   está pedindo a criação é realmente o dono do e-mail da compra.
   ========================================================================== */

const { getAdmin } = require('./_lib/admin');

function slugify(s) {
    return (s || '').toString().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').trim()
        .replace(/\s+/g, '-').replace(/-+/g, '-');
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido.' }); return; }

    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) { res.status(401).json({ erro: 'Não autenticado.' }); return; }

    const body = req.body || {};
    const compraId = String(body.compraId || '').trim();
    const d = body.dadosLoja || {};
    if (!compraId) { res.status(400).json({ erro: 'Compra não informada.' }); return; }

    try {
        const admin = getAdmin();
        const decoded = await admin.auth().verifyIdToken(idToken);
        const email = String(decoded.email || '').toLowerCase();
        if (!email) { res.status(400).json({ erro: 'Sua conta precisa de um e-mail associado.' }); return; }

        const db = admin.firestore();
        const compraRef = db.collection('compras').doc(compraId);
        const compraSnap = await compraRef.get();
        if (!compraSnap.exists) { res.status(404).json({ erro: 'Compra não encontrada.' }); return; }
        const compra = compraSnap.data();

        if (compra.emailComprador !== email) {
            res.status(403).json({ erro: 'Esta compra pertence a outro e-mail.' });
            return;
        }
        if (!['ativa', 'atrasada'].includes(compra.status)) {
            res.status(400).json({ erro: 'O pagamento desta compra ainda não foi confirmado.' });
            return;
        }

        if (compra.lojaId) {
            const lojaRef = db.collection('lojas').doc(compra.lojaId);
            await lojaRef.update({ usuariosAutorizados: admin.firestore.FieldValue.arrayUnion(email) });
            res.status(200).json({ lojaId: compra.lojaId });
            return;
        }

        const nome = String(d.nome || '').trim();
        if (!nome) { res.status(400).json({ erro: 'Digite o nome da loja.' }); return; }
        let slug = slugify(d.slug || nome);
        if (!slug || slug === 'root') { res.status(400).json({ erro: 'Endereço de loja inválido.' }); return; }

        const existente = await db.collection('lojas').doc(slug).get();
        if (existente.exists) {
            slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        }

        const categorias = Array.isArray(d.categorias) && d.categorias.length ? d.categorias : ['Geral', 'Novidades', 'Mais vendidos', 'Promoções'];
        const formasPagamento = Array.isArray(d.formasPagamento) && d.formasPagamento.length ? d.formasPagamento : ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'];

        await db.collection('lojas').doc(slug).set({
            nomeLoja: nome,
            telefone: String(d.telefone || '').trim(),
            instagram: String(d.instagram || '').trim(),
            categoriasProdutos: categorias,
            formasPagamento,
            taxaEntregaPadrao: 0,
            usuariosAutorizados: [email],
            planoAtual: compra.planoNome || null,
            criadaEm: admin.firestore.FieldValue.serverTimestamp()
        });

        await compraRef.update({ lojaId: slug, onboardingConcluido: true, atualizadoEm: admin.firestore.FieldValue.serverTimestamp() });

        res.status(200).json({ lojaId: slug });
    } catch (err) {
        console.error('criar-loja-pos-compra', err);
        const msg = (err && err.code === 'auth/id-token-expired') ? 'Sessão expirada, entre novamente.' : 'Erro ao criar a loja. Tente novamente.';
        res.status(500).json({ erro: msg });
    }
};
