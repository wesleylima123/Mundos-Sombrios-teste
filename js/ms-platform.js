/*
 * Mundos Sombrios Platform Core — v0.64.0
 * Single runtime foundation for state, events, resources, validation and UI feedback.
 * Supabase remains the source of truth; this module stores only ephemeral UI/session cache.
 */
(function () {
    'use strict';

    const state = {
        auth: { status: 'idle', error: null },
        persistence: { status: 'idle', error: null },
        builder: { status: 'idle', error: null },
        vtt: { status: 'idle', error: null }
    };

    const listeners = new Map();
    const cache = new Map();

    const rules = new Map();
    function registerRule(id, resolver, metadata = {}) {
        const key = String(id || '').trim();
        if (!key || typeof resolver !== 'function') throw new TypeError('Regra inválida.');
        rules.set(key, { resolver, metadata: clone(metadata) });
        emit('rule:registered', { id: key, metadata: clone(metadata) });
        return () => rules.delete(key);
    }
    function calculateBaseResource(type, { vig = 0, int = 0, pre = 0, currentClass = '', currentNature = '' } = {}) {
        const v = Number(vig) || 0, i = Number(int) || 0, p = Number(pre) || 0;
        const t = String(type || '');
        let value = '-';
        if (t === 'PV') {
            let base = (v * 10) + 10;
            if (base < 5) base = 5;
            if (currentClass === 'Carrasco Cinzento') value = (v * 10) + 15;
            else if (currentClass === 'Esotérico') value = (v * 10) + 12;
            else value = base;
            if (value < 5) value = 5;
        } else if (t.includes('EP') || t.includes('Energia') || t.includes('EE')) {
            if (currentClass === 'Hermético') value = 0;
            else if (currentClass === 'Esotérico') value = (i * 5) + 15;
            else if (currentNature.includes('Designado') || currentNature.includes('Envolto') || currentNature.includes('Taumatúrgico')) value = (Math.max(i, p) * 5) + 15;
            else value = 0;
        } else if (t.includes('EB') || t.includes('Estamina')) {
            value = (currentNature.includes('Carreira') || currentClass.includes('Mercador')) ? 6 + v : (v * 3) + 5;
        } else if (t.includes('Ameaça')) value = v + 3;
        else if (t.includes('DS') || t.includes('ES') || t.includes('Síntese')) value = 8 + i + p + 1;
        else if (t.includes('CO') || t.includes('Decadência') || t.includes('Assimilação')) value = 0;
        else if (t.includes('LHL')) value = 75;
        return value;
    }

    function calculateRule(id, context = {}) {
        const rule = rules.get(String(id));
        if (!rule) throw new Error(`Regra não registrada: ${id}`);
        const result = rule.resolver(clone(context));
        emit('rule:calculated', { id: String(id), result: clone(result) });
        return result;
    }

    const RESOURCE_KEYS = Object.freeze([
        'hp', 'sanity', 'stamina', 'energy', 'assimilation', 'stress',
        'lhl', 'eb', 'co', 'ee', 'pe', 'corrupcao', 'custom'
    ]);

    function clone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
    }

    function now() { return new Date().toISOString(); }

    function on(type, handler) {
        if (typeof handler !== 'function') return () => {};
        const set = listeners.get(type) || new Set();
        set.add(handler);
        listeners.set(type, set);
        return () => set.delete(handler);
    }

    function emit(type, detail = {}) {
        const payload = { type, at: now(), ...detail };
        const set = listeners.get(type);
        if (set) set.forEach(fn => { try { fn(payload); } catch (error) { console.warn('[Mundos] evento', type, error); } });
        window.dispatchEvent(new CustomEvent(type, { detail: payload }));
        return payload;
    }

    function setStatus(scope, status, error = null, meta = {}) {
        state[scope] = { status, error: error ? String(error.message || error) : null, updatedAt: now(), ...meta };
        emit('ms:status', { scope, status, error: state[scope].error, meta: clone(meta) });
        renderStatus(scope);
        return state[scope];
    }

    function getStatus(scope) { return clone(state[scope] || { status: 'idle', error: null }); }

    function renderStatus(scope) {
        const nodes = document.querySelectorAll(`[data-ms-status="${scope}"]`);
        nodes.forEach(node => {
            const current = state[scope] || {};
            node.dataset.status = current.status || 'idle';
            node.textContent = current.status === 'loading' ? 'Sincronizando…' :
                current.status === 'error' ? 'Erro de sincronização' :
                current.status === 'success' ? 'Sincronizado' : '';
        });
    }

    function toast(message, kind = 'info', options = {}) {
        const container = document.getElementById('ms-toast-region') || createToastRegion();
        const item = document.createElement('div');
        item.className = `ms-toast ms-toast-${kind}`;
        item.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        item.tabIndex = 0;
        item.innerHTML = `<span>${escapeHtml(message)}</span><button type="button" aria-label="Fechar aviso">×</button>`;
        const close = () => item.remove();
        item.querySelector('button').addEventListener('click', close);
        container.appendChild(item);
        const timeout = Number(options.timeout ?? (kind === 'error' ? 8000 : 4500));
        if (timeout > 0) setTimeout(close, timeout);
        emit('ms:toast', { message, kind });
        return item;
    }

    function createToastRegion() {
        const existing = document.getElementById('ms-toast-region');
        if (existing) return existing;
        const node = document.createElement('div');
        node.id = 'ms-toast-region';
        node.className = 'ms-toast-region';
        node.setAttribute('aria-live', 'polite');
        document.body.appendChild(node);
        return node;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
    }

    function withPersistence(task, meta = {}) {
        setStatus('persistence', 'loading', null, meta);
        return Promise.resolve().then(task).then(result => {
            setStatus('persistence', 'success', null, meta);
            emit('ms:persistence:success', { result: clone(result), meta: clone(meta) });
            return result;
        }).catch(error => {
            setStatus('persistence', 'error', error, meta);
            emit('ms:persistence:error', { error, meta: clone(meta) });
            toast(error?.message || 'Não foi possível sincronizar os dados.', 'error');
            throw error;
        });
    }

    function validateCharacter(character, { strict = false } = {}) {
        const errors = [];
        const warnings = [];
        const char = character && typeof character === 'object' ? character : {};
        const name = String(char.name || '').trim();
        const category = String(char.category || char.concept?.category || '').trim();
        const expansion = String(char.nature || '').trim();
        const className = String(char.className || '').trim();

        // V2.8.8 — Categoria torna-se etapa obrigatória antes de Expansão + Classe.
        if (!name) errors.push('Informe o nome do personagem antes de imortalizar a ficha.');
        if (!category) errors.push('Escolha Combatente, Sobrevivente ou Especialista antes de imortalizar a ficha.');
        if (!expansion) errors.push('Escolha uma expansão/origem antes de imortalizar a ficha.');
        if (!className) errors.push('Escolha uma classe antes de imortalizar a ficha.');

        if (!String(char.mode || '').trim()) warnings.push('Modo de jogo não identificado explicitamente; ele será preservado ou inferido pelo fluxo da Forja.');

        const stats = char.stats && typeof char.stats === 'object' ? char.stats : {};
        const limits = { min: -2, max: 10 };
        ['for','vig','agi','int','prn','pre'].forEach(key => {
            const raw = stats[key];
            if (raw === undefined || raw === null || raw === '') return; // atributo é opcional para imortalizar
            const value = Number(raw);
            if (!Number.isFinite(value)) warnings.push(`Atributo ${key.toUpperCase()} está inválido e pode ser revisado depois.`);
            else if (value < limits.min || value > limits.max) warnings.push(`Atributo ${key.toUpperCase()} está fora da faixa recomendada (${limits.min} a ${limits.max}) e pode ser revisado depois.`);
        });

        const points = Number(char.points ?? 0);
        if (!Number.isFinite(points)) warnings.push('O saldo de pontos livres não é numérico.');
        if (Array.isArray(char.powersHtml) && char.powersHtml.some(p => typeof p !== 'string')) warnings.push('Há poderes legados em formato não textual; revise antes de exportar.');
        if (Array.isArray(char.powers) && char.powers.some(p => !p || typeof p !== 'object' || !String(p.name || '').trim())) warnings.push('Há um poder estruturado sem nome; isso não impede a imortalização.');
        if (char.concept && typeof char.concept === 'object') {
            if (!String(char.concept.motivation || '').trim()) warnings.push('Motivação ainda não registrada.');
            if (!String(char.concept.origin || '').trim()) warnings.push('Origem/nacionalidade ainda não registrada.');
        }
        // "strict" é mantido por compatibilidade de assinatura, mas campos opcionais
        // nunca são promovidos a bloqueadores da imortalização.
        void strict;
        return Object.freeze({ valid: errors.length === 0, errors, warnings });
    }

    function validateDraft(character) {
        const result = validateCharacter(character, { strict: false });
        emit('character:validated', { valid: result.valid, errors: result.errors.slice(), warnings: result.warnings.slice() });
        return result;
    }

    function normalizeResource(resource) {
        if (!resource) return null;
        if (typeof resource === 'string') return { key: resource, label: resource, value: 0, max: null, unit: '' };
        const out = {
            key: String(resource.key || resource.id || '').trim(),
            label: String(resource.label || resource.name || resource.key || '').trim(),
            value: Number.isFinite(Number(resource.value)) ? Number(resource.value) : 0,
            max: resource.max === null || resource.max === undefined || resource.max === '' ? null : Number(resource.max),
            unit: String(resource.unit || '')
        };
        if (!out.key) return null;
        return out;
    }

    function normalizeResources(input) {
        const list = Array.isArray(input) ? input : (input && typeof input === 'object' ? Object.entries(input).map(([key, value]) => ({ key, ...(typeof value === 'object' ? value : { value }) })) : []);
        return list.map(normalizeResource).filter(Boolean);
    }

    function setCache(key, value) { cache.set(String(key), clone(value)); emit('ms:cache', { key: String(key), value: clone(value) }); return value; }
    function getCache(key, fallback = null) { return cache.has(String(key)) ? clone(cache.get(String(key))) : clone(fallback); }
    function removeCache(key) { cache.delete(String(key)); emit('ms:cache', { key: String(key), value: null, removed: true }); }

    function exportCharacter(character, format = 'json') {
        const payload = clone(character) || {};
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            return downloadBlob(blob, `${slug(payload.name || 'personagem')}.json`);
        }
        return false;
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename; link.rel = 'noopener';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        return true;
    }

    function slug(value) {
        return String(value || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'arquivo';
    }

    function init() {
        createToastRegion();
        document.addEventListener('submit', event => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (!form.checkValidity()) {
                event.preventDefault();
                form.reportValidity();
                toast('Revise os campos obrigatórios antes de continuar.', 'error');
            }
        }, true);
    }

    // Compatibilidade com módulos legados que esperam um sanitizador global.
    if (typeof window.escHtml !== 'function') window.escHtml = escapeHtml;

    window.MS_PLATFORM = Object.freeze({
        version: '0.67.0',
        RESOURCE_KEYS,
        clone,
        on,
        emit,
        setStatus,
        getStatus,
        toast,
        withPersistence,
        validateCharacter,
        validateDraft,
        normalizeResource,
        normalizeResources,
        setCache,
        getCache,
        removeCache,
        exportCharacter,
        downloadBlob,
        slug,
        escapeHtml,
        registerRule,
        calculateRule,
        calculateBaseResource
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
