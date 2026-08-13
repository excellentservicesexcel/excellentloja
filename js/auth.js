/* ==========================================================================
   Autenticação — Excellent Loja
   ========================================================================== */

const Auth = (() => {

    function currentUser() {
        return window.auth.currentUser;
    }

    function firstName() {
        const u = currentUser();
        if (!u) return 'Administradora';
        const name = u.displayName || (u.email ? u.email.split('@')[0] : 'Administradora');
        return name.split(' ')[0].replace(/^\w/, c => c.toUpperCase());
    }

    function initials() {
        const u = currentUser();
        const base = (u && (u.displayName || u.email)) || 'A';
        return base.trim().charAt(0).toUpperCase();
    }

    async function login(email, password) {
        return window.auth.signInWithEmailAndPassword(email, password);
    }

    async function register(email, password) {
        return window.auth.createUserWithEmailAndPassword(email, password);
    }

    async function loginWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        return window.auth.signInWithPopup(provider);
    }

    async function logout() {
        return window.auth.signOut();
    }

    function friendlyError(code) {
        const map = {
            'auth/invalid-email': 'E-mail inválido.',
            'auth/user-disabled': 'Este usuário está desativado.',
            'auth/user-not-found': 'E-mail ou senha incorretos.',
            'auth/wrong-password': 'E-mail ou senha incorretos.',
            'auth/invalid-credential': 'E-mail ou senha incorretos.',
            'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente novamente.',
            'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.',
            'auth/email-already-in-use': 'Este e-mail já está cadastrado. Faça login.',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
            'auth/popup-closed-by-user': 'Janela do Google fechada antes de concluir o login.',
            'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups e tente novamente.',
            'auth/cancelled-popup-request': 'Login com Google cancelado.',
            'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase Authentication.'
        };
        return map[code] || 'Não foi possível concluir. Tente novamente.';
    }

    function showPanel(name) {
        document.getElementById('panel-login').style.display = name === 'login' ? 'block' : 'none';
        document.getElementById('panel-register').style.display = name === 'register' ? 'block' : 'none';
        document.getElementById('login-error').style.display = 'none';
        document.getElementById('register-error').style.display = 'none';
    }

    async function withLoadingButton(btn, loadingHtml, action, errBox) {
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = loadingHtml;
        try {
            await action();
        } catch (err) {
            errBox.textContent = friendlyError(err.code);
            errBox.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }

    function bindLoginForm() {
        showPanel('login');

        document.getElementById('btn-go-register').addEventListener('click', () => showPanel('register'));
        document.getElementById('btn-go-login').addEventListener('click', (e) => { e.preventDefault(); showPanel('login'); });

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errBox = document.getElementById('login-error');
            errBox.style.display = 'none';
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('login-submit');
            await withLoadingButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...', () => login(email, password), errBox);
        });

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errBox = document.getElementById('register-error');
            errBox.style.display = 'none';
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const confirm = document.getElementById('register-password-confirm').value;
            if (password !== confirm) {
                errBox.textContent = 'As senhas não coincidem.';
                errBox.style.display = 'block';
                return;
            }
            const btn = document.getElementById('register-submit');
            await withLoadingButton(btn, '<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...', () => register(email, password), errBox);
        });

        document.getElementById('btn-google-login').addEventListener('click', function () {
            const errBox = document.getElementById('login-error');
            errBox.style.display = 'none';
            withLoadingButton(this, '<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...', loginWithGoogle, errBox);
        });
        document.getElementById('btn-google-register').addEventListener('click', function () {
            const errBox = document.getElementById('register-error');
            errBox.style.display = 'none';
            withLoadingButton(this, '<i class="fa-solid fa-spinner fa-spin"></i> Aguarde...', loginWithGoogle, errBox);
        });

        document.getElementById('btn-logout').addEventListener('click', () => {
            Utils.confirmDialog('Deseja realmente sair do sistema?', async () => {
                await logout();
            }, 'Sair do sistema', 'Sim, sair');
        });
    }

    return { currentUser, firstName, initials, login, register, loginWithGoogle, logout, bindLoginForm };
})();
