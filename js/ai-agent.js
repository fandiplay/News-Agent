/**
 * ai-agent.js — AI Agent (Custom API via pengaturan)
 * Mendukung format OpenAI-compatible:
 *   POST {baseUrl}
 *   Headers: Authorization: Bearer {apiKey}
 *   Body: { model, messages: [{role, content}], temperature }
 */
const AIAgent = (() => {

    /**
     * Bungkus URL dengan CORS proxy jika dikonfigurasi.
     * Proxy dimasukkan user di pengaturan, contoh:
     *   https://corsproxy.io/?url=
     *   https://api.allorigins.win/raw?url=
     *   https://api.codetabs.com/v1/proxy?quest=
     */
    function withProxy(url) {
        const proxy = (AISettings.getAgent().corsProxy || '').trim();
        if (!proxy) return url;
        return proxy.endsWith('=') ? proxy + encodeURIComponent(url) : proxy + encodeURIComponent(url);
    }

    /**
     * Konversi error fetch menjadi pesan yang jelas (terutama CORS).
     */
    function describeFetchError(e, url) {
    if (e.name === 'AbortError') return null;
    const corsHint =
        '⚠️ Diblokir CORS oleh browser. ' +
        'Solusi: buka ⚙️ Pengaturan AI → isi "CORS Proxy" dengan https://corsproxy.io/?url= ' +
        '(atau proxy lain), lalu Simpan dan coba lagi.';
    if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
        return `CORS BLOCKED — ${corsHint}`;
    }
    if (e instanceof TypeError) {
        return `Gagal terhubung ke ${url} — ${corsHint} (${e.message})`;
    }
    return `Gagal menghubungi AI Agent: ${e.message}`;
}
    /**
     * Mengirim chat completion ke endpoint custom.
     * @param {string} userPrompt — prompt dari user
     * @returns {Promise<string>} jawaban AI
     */
    async function ask(userPrompt) {
        const cfg = AISettings.getAgent();

        if (!cfg.baseUrl || cfg.baseUrl.trim() === '') {
            throw new Error('Base URL AI Agent belum diatur. Buka Pengaturan AI untuk mengisinya.');
        }
        if (!cfg.model || cfg.model.trim() === '') {
            throw new Error('Model AI Agent belum diatur. Buka Pengaturan AI untuk mengisinya.');
        }

        const messages = [];
        if (cfg.systemPrompt && cfg.systemPrompt.trim() !== '') {
            messages.push({ role: 'system', content: cfg.systemPrompt });
        }
        messages.push({ role: 'user', content: userPrompt });

        const body = {
            model: cfg.model,
            messages,
            temperature: parseFloat(cfg.temperature) || 0.7,
        };

        const headers = { 'Content-Type': 'application/json' };
        if (cfg.apiKey && cfg.apiKey.trim() !== '') {
            headers['Authorization'] = `Bearer ${cfg.apiKey}`;
        }

        const url = withProxy(cfg.baseUrl);
        const timeoutMs = (Number(cfg.timeout) || 30) * 1000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                throw new Error(`Timeout setelah ${timeoutMs / 1000}s. Coba perbesar timeout di Pengaturan AI.`);
            }
            throw new Error(describeFetchError(e, cfg.baseUrl));
        }
        clearTimeout(timer);

        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try {
                const errBody = await response.json();
                if (errBody?.error?.message) errMsg += `: ${errBody.error.message}`;
                else if (errBody?.message) errMsg += `: ${errBody.message}`;
            } catch (e) { /* abaikan */ }
            throw new Error(errMsg);
        }

        const data = await response.json();

        // Format OpenAI-compatible
        if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            if (choice.message && choice.message.content) return choice.message.content;
            if (choice.text) return choice.text;
        }
        // Format alternatif
        if (data.response) return data.response;
        if (data.content) return data.content;
        if (data.message) return data.message;
        if (typeof data === 'string') return data;

        throw new Error('Format respons AI Agent tidak dikenali. Cek struktur respons API kamu.');
    }

    /**
     * Tes koneksi ke AI Agent dengan prompt sederhana.
     * @returns {Promise<string>} jawaban singkat
     */
    async function testConnection() {
        return ask('Balas dengan satu kata: "OK"');
    }

    /**
     * Ambil daftar model dari endpoint OpenAI-compatible.
     * Base URL seperti: https://tokenharbor.ai/v1/chat/completions
     * -> endpoint models: https://tokenharbor.ai/v1/models
     * @returns {Promise<string[]>} daftar id model
     */
    async function listModels() {
        const cfg = AISettings.getAgent();
        const baseUrl = (cfg.baseUrl || '').trim().replace(/\/+$/, '');

        let modelsUrl;
        if (baseUrl.endsWith('/chat/completions')) {
            modelsUrl = baseUrl.replace(/\/chat\/completions$/, '') + '/models';
        } else if (baseUrl.endsWith('/models')) {
            modelsUrl = baseUrl;
        } else {
            modelsUrl = baseUrl + '/models';
        }

        const headers = {};
        if (cfg.apiKey && cfg.apiKey.trim() !== '') {
            headers['Authorization'] = `Bearer ${cfg.apiKey.trim()}`;
        }

        const url = withProxy(modelsUrl);
        const timeoutMs = (Number(cfg.timeout) || 30) * 1000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        try {
            response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                throw new Error(`Timeout setelah ${timeoutMs / 1000}s. Coba perbesar timeout.`);
            }
            throw new Error(describeFetchError(e, modelsUrl));
        }
        clearTimeout(timer);

        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            if (response.status === 401 || response.status === 403) {
                errMsg += ' — API Key tidak valid / tidak punya akses.';
            }
            try {
                const errBody = await response.json();
                if (errBody?.error?.message) errMsg += `: ${errBody.error.message}`;
                else if (errBody?.message) errMsg += `: ${errBody.message}`;
            } catch (e) { /* abaikan */ }
            throw new Error(errMsg);
        }

        const data = await response.json();
        const extract = (arr) => (arr || []).map(m => (typeof m === 'string' ? m : m.id)).filter(Boolean);

        if (Array.isArray(data.data)) return extract(data.data);
        if (Array.isArray(data.models)) return extract(data.models);
        if (Array.isArray(data)) return extract(data);

        throw new Error('Format daftar model tidak dikenali dari respons API.');
    }

    return { ask, testConnection, listModels };
})();
