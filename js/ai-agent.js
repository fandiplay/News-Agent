/**
 * ai-agent.js — AI Agent (Custom API via pengaturan)
 * Menggunakan endpoint Vercel server-side (/api/agent/*) untuk menghindari CORS.
 * Mendukung format OpenAI-compatible:
 *   POST /api/agent/chat  → proxy ke {baseUrl}
 *   GET  /api/agent/models → proxy ke {baseUrl}/models
 */
const AIAgent = (() => {

    /**
     * Mengirim chat completion ke endpoint Vercel proxy.
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
            baseUrl: cfg.baseUrl,
            apiKey: cfg.apiKey || '',
            model: cfg.model,
            messages,
            temperature: parseFloat(cfg.temperature) || 0.7,
        };

        const timeoutMs = (Number(cfg.timeout) || 30) * 1000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        try {
            response = await fetch('/api/agent/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                throw new Error(`Timeout setelah ${timeoutMs / 1000}s. Coba perbesar timeout di Pengaturan AI.`);
            }
            throw new Error(`Gagal menghubungi server: ${e.message}`);
        }
        clearTimeout(timer);

        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try {
                const errBody = await response.json();
                if (errBody?.error) errMsg += `: ${errBody.error}`;
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
     * Ambil daftar model dari endpoint Vercel proxy.
     * @returns {Promise<string[]>} daftar id model
     */
    async function listModels() {
        const cfg = AISettings.getAgent();
        const baseUrl = (cfg.baseUrl || '').trim();
        const apiKey = (cfg.apiKey || '').trim();

        const params = new URLSearchParams({ baseUrl });
        if (apiKey) params.set('apiKey', apiKey);

        const timeoutMs = (Number(cfg.timeout) || 30) * 1000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response;
        try {
            response = await fetch(`/api/agent/models?${params}`, {
                method: 'GET',
                signal: controller.signal,
            });
        } catch (e) {
            clearTimeout(timer);
            if (e.name === 'AbortError') {
                throw new Error(`Timeout setelah ${timeoutMs / 1000}s. Coba perbesar timeout.`);
            }
            throw new Error(`Gagal menghubungi server: ${e.message}`);
        }
        clearTimeout(timer);

        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
            try {
                const errBody = await response.json();
                if (errBody?.error) errMsg += `: ${errBody.error}`;
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