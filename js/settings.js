/**
 * settings.js — Manajemen pengaturan AI
 * Menyimpan konfigurasi AI Agent ke localStorage.
 */
const AISettings = (() => {
    const STORAGE_KEY = 'globalNewsAISettings_v1';

    const DEFAULTS = {
    agent: {
        baseUrl: '',
        apiKey: '',
        model: 'gpt-4o-mini',
        systemPrompt:
            'Kamu adalah analis kebijakan moneter profesional. Berikan kesimpulan dalam bahasa Indonesia yang informatif dan terstruktur dengan markdown, termasuk poin-poin utama, indikator bullish/bearish, dan daftar pair yang terpengaruh.',
        temperature: 0.7,
        timeout: 30,          // ubah dari 30000 ke 30 (detik) agar konsisten dengan input form
        corsProxy: 'https://corsproxy.io/?url=',   // ← TAMBAHKAN default proxy
    },
};

    let cache = null;

    function cloneDefaults() {
        return JSON.parse(JSON.stringify(DEFAULTS));
    }

    function mergeDeep(target, source) {
        if (!source || typeof source !== 'object') return target;
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                mergeDeep(target[key], source[key]);
            } else if (source[key] !== undefined && source[key] !== null) {
                target[key] = source[key];
            }
        }
        return target;
    }

    function load() {
        if (cache) return cache;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                cache = mergeDeep(cloneDefaults(), JSON.parse(raw));
            } else {
                cache = cloneDefaults();
            }
        } catch (e) {
            console.warn('AISettings: gagal memuat, pakai default.', e);
            cache = cloneDefaults();
        }
        return cache;
    }

    function save(settings) {
        cache = settings;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error('AISettings: gagal menyimpan.', e);
        }
    }

    function getAgent() {
        return load().agent;
    }

    function saveAgent(agentConfig) {
        const s = load();
        s.agent = { ...s.agent, ...agentConfig };
        save(s);
        return s.agent;
    }

    function isAgentConfigured() {
        const a = getAgent();
        return typeof a.baseUrl === 'string' && a.baseUrl.trim() !== '' &&
               typeof a.model === 'string' && a.model.trim() !== '';
    }

    function reset() {
        cache = cloneDefaults();
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* abaikan */ }
        return cache;
    }

    return { load, save, getAgent, saveAgent, isAgentConfigured, reset, DEFAULTS };
})();
