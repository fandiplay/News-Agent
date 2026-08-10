/**
 * api/agent/chat.js — Vercel Serverless Function
 * Proxy chat completion ke API OpenAI-compatible.
 * Dipanggil dari client-side agar tidak kena CORS.
 */
export default async function handler(req, res) {
    // Hanya terima POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { baseUrl, apiKey, model, messages, temperature } = req.body || {};

    if (!baseUrl || !model || !messages) {
        return res.status(400).json({ error: 'baseUrl, model, dan messages wajib diisi.' });
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey && apiKey.trim() !== '') {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const body = {
        model,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
    };

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            let errMsg = `HTTP ${response.status}`;
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