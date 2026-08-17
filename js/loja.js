/* ==========================================================================
   Loja — resolução de tenant (qual loja está sendo acessada) — Excellent Loja
   A URL decide a loja: "/" é a loja do dono (id "root"), "/bardojoao" é a
   loja criada com o slug "bardojoao". Todo dado de negócio (produtos,
   pedidos, clientes, estoque, financeiro, produção, fichas técnicas, capas,
   cards do Instagram, newsletter) fica em lojas/{id}/<coleção>.
   ========================================================================== */

const Loja = (() => {
    const SUPER_ADMIN_EMAIL = 'excellentservices.excel@gmail.com';

    function readSlug() {
        const seg = location.pathname.split('/').filter(Boolean)[0] || '';
        return seg.toLowerCase().replace(/[^a-z0-9-]/g, '');
    }

    const slug = readSlug();
    const id = slug || 'root';

    function ref() {
        return window.db.collection('lojas').doc(id);
    }

    function col(name) {
        return window.db.collection('lojas').doc(id).collection(name);
    }

    function isSuperAdmin(email) {
        return !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL;
    }

    function slugify(s) {
        return (s || '').toString().toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9\s-]/g, '').trim()
            .replace(/\s+/g, '-').replace(/-+/g, '-');
    }

    return { id, slug, isRoot: !slug, ref, col, isSuperAdmin, slugify, SUPER_ADMIN_EMAIL };
})();
window.Loja = Loja;
