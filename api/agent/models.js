/**
 * api/agent/models.js — Vercel Serverless Function
 * Proxy request daftar model ke endpoint OpenAI-compatible.
 * Dipanggil dari client-side agar tidak kena CORS.
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { baseUrl, apiKey } = req.query || {};

    if (!baseUrl) {
        return res.status(400).json({ error: 'Parameter baseUrl wajib diisi.' });
    }

    // Tentukan URL models dari baseUrl
    let cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    let modelsUrl;
    if (cleanUrl.endsWith('/chat/completions')) {
        modelsUrl = cleanUrl.replace(/\/chat\/completions$/, '') + '/models';
    } else if (cleanUrl.endsWith('/models')) {
        modelsUrl = cleanUrl;
    } else {
        modelsUrl = cleanUrl + '/models';
    }

    const headers = {};
    if (apiKey && apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    try {
        const response = await fetch(modelsUrl, { method: 'GET', headers });

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
            return res.status(response.status).json({ error: errMsg });
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (e) {
        return res.status(502).json({ error: `Gagal terhubung ke API: ${e.message}` });
    }
}