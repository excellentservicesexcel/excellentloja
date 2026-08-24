/* ==========================================================================
   Utilidades compartilhadas — Excellent Loja
   ========================================================================== */

const Utils = (() => {

    function formatBRL(value) {
        const n = Number(value) || 0;
        return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDateBR(date) {
        if (!date) return '--';
        const d = (date instanceof Date) ? date : new Date(date);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function formatDateShort(date) {
        if (!date) return '--';
        const d = (date instanceof Date) ? date : new Date(date);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    function formatDateTimeBR(date) {
        if (!date) return '--';
        const d = (date instanceof Date) ? date : new Date(date);
        return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function todayKey(date) {
        const d = date ? new Date(date) : new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function toDate(val) {
        if (!val) return null;
        if (val instanceof Date) return val;
        if (val.toDate) return val.toDate();
        return new Date(val);
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    function debounce(fn, wait = 250) {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function toast(msg, type = 'info') {
        const wrap = document.getElementById('toast-wrap');
        const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHtml(msg)}</span>`;
        wrap.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 260); }, 3200);
    }

    function openModal(html, opts = {}) {
        const overlay = document.getElementById('modal-overlay');
        const box = document.getElementById('modal-box');
        box.className = 'modal' + (opts.wide ? ' wide' : '');
        box.innerHTML = html;
        overlay.classList.add('open');
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.remove('open');
        document.getElementById('modal-box').innerHTML = '';
    }

    function confirmDialog(message, onConfirm, title = 'Confirmar exclusão', okLabel = 'Sim, excluir') {
        const overlay = document.getElementById('confirm-overlay');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-msg').textContent = message;
        document.getElementById('confirm-ok').textContent = okLabel;
        overlay.classList.add('open');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');
        const cleanup = () => { overlay.classList.remove('open'); okBtn.onclick = null; cancelBtn.onclick = null; };
        okBtn.onclick = async () => { cleanup(); await onConfirm(); };
        cancelBtn.onclick = cleanup;
    }

    // Fecha modal clicando fora
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') closeModal();
        });
        document.getElementById('confirm-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-overlay') e.currentTarget.classList.remove('open');
        });
    });

    const STATUS_LABELS = {
        aguardando: 'Aguardando',
        producao: 'Em produção',
        pronto: 'Pronto',
        entregue: 'Entregue',
        cancelado: 'Cancelado'
    };

    function statusBadge(status) {
        const label = STATUS_LABELS[status] || status;
        return `<span class="badge badge-${status}">${label}</span>`;
    }

    /* -------------------------------------------------------------- */
    /* Select customizado (substitui o <select> nativo em toda a UI)   */
    /* -------------------------------------------------------------- */

    function selectHtml({ id, className = '', dataAttrs = {}, options = [], value = '', placeholder = 'Selecione...', pill = false }) {
        const dataStr = Object.entries(dataAttrs).map(([k, v]) => ` data-${k}="${escapeHtml(v)}"`).join('');
        const selected = options.find(o => String(o.value) === String(value));
        const label = selected ? selected.label : placeholder;
        const optsHtml = options.map(o => `<div class="cselect-option ${String(o.value) === String(value) ? 'active' : ''}" data-value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</div>`).join('')
            || '<div class="cselect-option empty-opt">Nenhuma opção</div>';
        return `
        <div class="cselect ${pill ? 'pill' : ''}" data-id="${id}">
            <input type="hidden" id="${id}" class="${className}"${dataStr} value="${escapeHtml(value ?? '')}">
            <button type="button" class="cselect-trigger">
                <span class="cselect-label ${selected ? '' : 'placeholder'}">${escapeHtml(label)}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="cselect-panel">${optsHtml}</div>
        </div>`;
    }

    function refreshSelectOptions(id, options = [], placeholder = 'Selecione...') {
        const wrap = document.querySelector(`.cselect[data-id="${CSS.escape(id)}"]`);
        const input = document.getElementById(id);
        if (!wrap || !input) return;
        const currentValue = input.value;
        const selected = options.find(o => String(o.value) === String(currentValue));
        if (!selected) input.value = '';
        const labelEl = wrap.querySelector('.cselect-label');
        labelEl.textContent = selected ? selected.label : placeholder;
        labelEl.classList.toggle('placeholder', !selected);
        wrap.querySelector('.cselect-panel').innerHTML = options.map(o => `<div class="cselect-option ${selected && String(o.value) === String(currentValue) ? 'active' : ''}" data-value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</div>`).join('')
            || '<div class="cselect-option empty-opt">Nenhuma opção</div>';
    }

    function setSelectValue(id, value, placeholder = 'Selecione...') {
        const input = document.getElementById(id);
        if (!input) return;
        input.value = value ?? '';
        const wrap = document.querySelector(`.cselect[data-id="${CSS.escape(id)}"]`);
        if (!wrap) return;
        const optionEl = wrap.querySelector(`.cselect-option[data-value="${CSS.escape(String(value ?? ''))}"]`);
        const labelEl = wrap.querySelector('.cselect-label');
        labelEl.textContent = optionEl ? optionEl.textContent : placeholder;
        labelEl.classList.toggle('placeholder', !optionEl);
        wrap.querySelectorAll('.cselect-option').forEach(o => o.classList.toggle('active', o === optionEl));
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('.cselect-trigger');
            const option = e.target.closest('.cselect-option');

            if (trigger) {
                const wrap = trigger.closest('.cselect');
                const willOpen = !wrap.classList.contains('open');
                document.querySelectorAll('.cselect.open').forEach(w => w.classList.remove('open', 'drop-up'));
                if (willOpen) {
                    wrap.classList.add('open');
                    const rect = wrap.getBoundingClientRect();
                    if (window.innerHeight - rect.bottom < 240 && rect.top > 240) wrap.classList.add('drop-up');
                }
                return;
            }
            if (option && !option.classList.contains('empty-opt')) {
                const wrap = option.closest('.cselect');
                const input = document.getElementById(wrap.dataset.id) || wrap.querySelector('input[type="hidden"]');
                wrap.querySelector('.cselect-label').textContent = option.textContent;
                wrap.querySelector('.cselect-label').classList.remove('placeholder');
                wrap.querySelectorAll('.cselect-option').forEach(o => o.classList.toggle('active', o === option));
                input.value = option.dataset.value;
                wrap.classList.remove('open', 'drop-up');
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
            document.querySelectorAll('.cselect.open').forEach(w => w.classList.remove('open', 'drop-up'));
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') document.querySelectorAll('.cselect.open').forEach(w => w.classList.remove('open', 'drop-up'));
        });
    });

    // Redimensiona e comprime uma imagem no navegador, retornando um data URL
    // (base64) pronto para salvar direto num campo do Firestore — evita
    // depender do Firebase Storage (que em projetos novos exige plano pago).
    function compressImageToBase64(file, opts = {}) {
        const maxDim = opts.maxDim || 900;
        const maxBytes = opts.maxBytes || 400000;
        const startQuality = opts.quality || 0.8;
        const square = !!opts.square;
        // logos/ícones: mantém o fundo transparente do PNG em vez de "chapar" de branco —
        // só faz sentido (e só é seguro em tamanho) quando o arquivo de origem já suporta
        // transparência; uma foto comum (JPEG) vira PNG gigante sem compressão e pode
        // estourar o limite de tamanho do Firestore
        const transparentTypes = ['image/png', 'image/webp', 'image/gif'];
        const transparent = !!opts.transparent && transparentTypes.includes(file.type);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
                img.onload = () => {
                    let sx = 0, sy = 0, sw = img.width, sh = img.height;
                    if (square) {
                        // recorta o centro pra um quadrado, evitando favicon esticado
                        const side = Math.min(sw, sh);
                        sx = (sw - side) / 2; sy = (sh - side) / 2; sw = side; sh = side;
                    }
                    function renderAt(dim) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        let width = sw, height = sh;
                        if (width > dim || height > dim) {
                            if (width >= height) { height = Math.round(height * dim / width); width = dim; }
                            else { width = Math.round(width * dim / height); height = dim; }
                        }
                        canvas.width = width; canvas.height = height;
                        if (!transparent) {
                            ctx.fillStyle = '#fff';
                            ctx.fillRect(0, 0, width, height);
                        }
                        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
                        return canvas;
                    }
                    if (transparent) {
                        // PNG não tem controle de qualidade como o JPEG — se ainda ficar grande
                        // demais (foto complexa, não um gráfico simples), reduz as dimensões
                        // até caber no limite, já que reduzir "qualidade" não é uma opção
                        let dim = maxDim;
                        let dataUrl = renderAt(dim).toDataURL('image/png');
                        while (dataUrl.length > maxBytes && dim > 200) {
                            dim = Math.round(dim * 0.8);
                            dataUrl = renderAt(dim).toDataURL('image/png');
                        }
                        resolve(dataUrl);
                        return;
                    }
                    const canvas = renderAt(maxDim);
                    let q = startQuality;
                    let dataUrl = canvas.toDataURL('image/jpeg', q);
                    while (dataUrl.length > maxBytes && q > 0.35) {
                        q -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', q);
                    }
                    resolve(dataUrl);
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Detecta se uma imagem PNG tem transparência de verdade (algum pixel com alfa < 255) —
    // um arquivo .png pode muito bem ter fundo 100% opaco (ex: exportado de um editor sem
    // remover o fundo), então checar só a extensão não é suficiente pra decidir se ela deve
    // ser tratada como "logo" (sem cortar/arredondar) ou como "foto" comum.
    function imageHasTransparency(dataUrl) {
        return new Promise((resolve) => {
            if (!dataUrl || !dataUrl.startsWith('data:image/png')) { resolve(false); return; }
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width; canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    for (let i = 3; i < data.length; i += 4) {
                        if (data[i] < 255) { resolve(true); return; }
                    }
                    resolve(false);
                } catch (e) { resolve(false); }
            };
            img.onerror = () => resolve(false);
            img.src = dataUrl;
        });
    }

    function mixColor(hex, target, amount) {
        const c = (hex || '#000000').replace('#', '');
        const t = (target || '#ffffff').replace('#', '');
        const r = parseInt(c.substring(0, 2), 16) || 0, g = parseInt(c.substring(2, 4), 16) || 0, b = parseInt(c.substring(4, 6), 16) || 0;
        const tr = parseInt(t.substring(0, 2), 16) || 0, tg = parseInt(t.substring(2, 4), 16) || 0, tb = parseInt(t.substring(4, 6), 16) || 0;
        const mix = (a, z) => Math.round(a + (z - a) * amount).toString(16).padStart(2, '0');
        return `#${mix(r, tr)}${mix(g, tg)}${mix(b, tb)}`;
    }
    function lightenColor(hex, amount) { return mixColor(hex, '#ffffff', amount); }
    function darkenColor(hex, amount) { return mixColor(hex, '#000000', amount); }

    function hexToRgba(hex, alpha) {
        const c = (hex || '#000000').replace('#', '');
        const r = parseInt(c.substring(0, 2), 16) || 0, g = parseInt(c.substring(2, 4), 16) || 0, b = parseInt(c.substring(4, 6), 16) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // catálogo de fontes disponíveis pra página inicial e pras lojas — várias famílias,
    // de estilos diferentes, todas carregadas via Google Fonts em index.html
    const FONT_OPTIONS = [
        { id: 'inter', label: 'Inter (padrão)', family: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif", grupo: 'Sem serifa' },
        { id: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", grupo: 'Sem serifa' },
        { id: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", grupo: 'Sem serifa' },
        { id: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", grupo: 'Sem serifa' },
        { id: 'worksans', label: 'Work Sans', family: "'Work Sans', sans-serif", grupo: 'Sem serifa' },
        { id: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", grupo: 'Serifada / elegante' },
        { id: 'merriweather', label: 'Merriweather', family: "'Merriweather', serif", grupo: 'Serifada / elegante' },
        { id: 'lora', label: 'Lora', family: "'Lora', serif", grupo: 'Serifada / elegante' },
        { id: 'fredoka', label: 'Fredoka (padrão dos títulos)', family: "'Fredoka', sans-serif", grupo: 'Arredondada / divertida' },
        { id: 'baloo', label: 'Baloo 2', family: "'Baloo 2', cursive", grupo: 'Arredondada / divertida' },
        { id: 'quicksand', label: 'Quicksand', family: "'Quicksand', sans-serif", grupo: 'Arredondada / divertida' },
        { id: 'pacifico', label: 'Pacifico', family: "'Pacifico', cursive", grupo: 'Manuscrita' },
        { id: 'caveat', label: 'Caveat', family: "'Caveat', cursive", grupo: 'Manuscrita' },
        { id: 'dancing', label: 'Dancing Script', family: "'Dancing Script', cursive", grupo: 'Manuscrita' }
    ];

    function fontFamilyById(id) {
        const f = FONT_OPTIONS.find(x => x.id === id);
        return f ? f.family : null;
    }

    function fontSelectOptionsHtml(valorAtual) {
        const grupos = {};
        FONT_OPTIONS.forEach(f => { (grupos[f.grupo] = grupos[f.grupo] || []).push(f); });
        const padrao = `<option value="" ${!valorAtual ? 'selected' : ''}>Padrão (Inter + Fredoka)</option>`;
        const resto = Object.entries(grupos).map(([grupo, fontes]) => `
            <optgroup label="${escapeHtml(grupo)}">
                ${fontes.map(f => `<option value="${f.id}" style="font-family:${f.family};" ${valorAtual === f.id ? 'selected' : ''}>${escapeHtml(f.label)}</option>`).join('')}
            </optgroup>
        `).join('');
        return padrao + resto;
    }

    // Gráfico de linha "moderno" (glow) reutilizado pelas Métricas do
    // Instagram e do Facebook: sem legenda, curva suave, área com degradê
    // e o efeito de brilho saindo da linha via CSS (filter: drop-shadow no
    // próprio canvas) em vez de duplicar a linha via plugin do Chart.js.
    const _glowCharts = {};
    function criarGraficoGlow(canvasId, labels, valores, cor) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        if (_glowCharts[canvasId]) { _glowCharts[canvasId].destroy(); delete _glowCharts[canvasId]; }
        canvas.style.filter = `drop-shadow(0 0 6px ${hexToRgba(cor, 0.65)})`;
        const ctx = canvas.getContext('2d');
        const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.clientHeight || 160);
        gradiente.addColorStop(0, hexToRgba(cor, 0.35));
        gradiente.addColorStop(1, hexToRgba(cor, 0));
        const chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ data: valores, borderColor: cor, backgroundColor: gradiente, borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: cor }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } },
                    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } }, beginAtZero: true }
                }
            }
        });
        _glowCharts[canvasId] = chart;
        return chart;
    }

    return {
        formatBRL, formatDateBR, formatDateShort, formatDateTimeBR, todayKey, toDate,
        escapeHtml, debounce, uid, toast, openModal, closeModal, confirmDialog,
        statusBadge, STATUS_LABELS,
        selectHtml, refreshSelectOptions, setSelectValue,
        compressImageToBase64,
        imageHasTransparency,
        mixColor, lightenColor, darkenColor, hexToRgba,
        FONT_OPTIONS, fontFamilyById, fontSelectOptionsHtml,
        criarGraficoGlow
    };
})();
