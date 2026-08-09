/**
 * ai.js — AI Biasa (API default)
 * Menggunakan endpoint API default (Gemini via siputzx).
 */
const AIDefault = (() => {
    const AI_API_ENDPOINT = 'https://api.siputzx.my.id/api/ai/gemini';
    const AI_COOKIE = 'kand';

    /**
     * Mengirim prompt ke API default dan mengembalikan teks jawaban.
     * @param {string} userPrompt — prompt dari user
     * @param {string} systemPrompt — system prompt
     * @returns {Promise<string>} jawaban AI
     */
    async function ask(userPrompt, systemPrompt) {
        const apiUrl = new URL(AI_API_ENDPOINT);
        apiUrl.searchParams.set('text', userPrompt);
        apiUrl.searchParams.set('cookie', AI_COOKIE);
        apiUrl.searchParams.set('promptSystem', systemPrompt);

        const response = await fetch(apiUrl.toString());
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const rawAnswer = data?.data?.response || data?.response || '';

        if (!rawAnswer || rawAnswer.trim() === '') {
            throw new Error('API default mengembalikan jawaban kosong.');
        }

        return rawAnswer;
    }

    /**
     * Ekstrak markdown dari jawaban yang mungkin mengandung JSON {"kesimpulan": "..."}
     * atau plain markdown.
     * @param {string} raw — jawaban mentah dari API
     * @returns {string} markdown string
     */
    function extractMarkdown(raw) {
        let cleaned = raw.trim();
        cleaned = cleaned.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            try {
                const parsed = JSON.parse(cleaned.slice(start, end + 1));
                if (parsed.kesimpulan) return parsed.kesimpulan;
            } catch (e) { /* bukan JSON valid */ }
        }
        return cleaned;
    }

    return { ask, extractMarkdown };
})();
