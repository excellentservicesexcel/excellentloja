/* ==========================================================================
   WhatsApp — só existe quando a própria loja ativa a integração em
   Configurações → Integrações. O recebimento/envio de mensagens de verdade
   (via alguma API de WhatsApp) ainda é um próximo passo — esta tela mostra
   que a integração está conectada e guarda o lugar pra quando isso entrar.
   ========================================================================== */

const Whatsapp = (() => {
    function mount() {
        const el = document.getElementById('view-whatsapp');
        if (!el) return;
        el.innerHTML = `
            <div class="whatsapp-placeholder">
                <i class="fa-brands fa-whatsapp"></i>
                <h3>Integração conectada</h3>
                <p id="whatsapp-numero-info">Carregando número...</p>
                <p class="whatsapp-placeholder-sub">
                    O recebimento e o envio de mensagens em tempo real ainda estão em
                    construção — assim que estiver pronto, suas conversas do WhatsApp
                    aparecem direto aqui, sem precisar trocar de tela.
                </p>
            </div>
        `;
        carregarNumero();
    }

    async function carregarNumero() {
        const info = document.getElementById('whatsapp-numero-info');
        if (!info) return;
        try {
            const snap = await Loja.col('config').doc('whatsapp').get();
            const numero = snap.exists ? (snap.data().numero || '') : '';
            info.textContent = numero ? `Número conectado: ${numero}` : 'Nenhum número cadastrado ainda — cadastre em Configurações → Integrações.';
        } catch (err) {
            info.textContent = '';
        }
    }

    return { mount };
})();
window.Whatsapp = Whatsapp;
