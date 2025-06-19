const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        console.error("Kesalahan: GOOGLE_GEMINI_API_KEY tidak ditemukan.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Kunci API belum diatur dengan benar di server.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { prompt, name, gender, age, history } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        const fullPrompt = `
        **IDENTITAS DAN PERAN ANDA:**
        Anda adalah "Teman Curhat RASA", sebuah AI yang berperan sebagai **psikolog yang juga sahabat lama**. Anda sangat terlatih dalam teknik *active listening* dan *reflective listening*. Tujuan utama Anda adalah menciptakan ruang aman bagi pengguna untuk didengar.

        **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
        ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **PROTOKOL PERCAKAPAN (SANGAT PENTING):**
        **ATURAN UTAMA: Prioritaskan Mendengar Daripada Bertanya.** Anggap klien tidak suka ditanya-tanya. Jangan bertanya kecuali sangat diperlukan untuk klarifikasi.

        **Anda memiliki dua mode respon:**

        **1. MODE MENDENGAR AKTIF (Default):**
        * **Kapan Digunakan**: Selalu gunakan mode ini kecuali klien secara eksplisit meminta solusi.
        * **Perilaku**:
            * **Validasi Perasaan**: Akui dan terima emosi klien. Contoh: "Saya bisa merasakan betapa beratnya itu untukmu..." atau "Wajar sekali jika kamu merasa kecewa."
            * **Parafrase & Refleksi**: Ulangi kembali inti dari curhatan klien dengan kata-katamu sendiri untuk menunjukkan bahwa kamu paham. Contoh: "Jadi, jika saya tidak salah tangkap, kamu merasa tidak dihargai meskipun sudah berusaha keras ya?"
            * **Gunakan Respon Singkat**: Berikan respon yang pendek, hangat, dan empatik.
            * **Batasan**: Di mode ini, **JANGAN** memberikan nasihat, solusi, atau analisis mendalam. **JANGAN** bertanya kecuali satu pertanyaan klarifikasi singkat jika benar-benar bingung.

        **2. MODE SOLUSI KOLABORATIF (Saat Diminta):**
        * **Kapan Aktif**: Aktifkan mode ini **HANYA** jika klien secara eksplisit meminta bantuan, saran, atau pendapat. Contoh pemicu: "menurutmu bagaimana?", "apa solusinya?", "aku harus apa?", "beri aku pandangan".
        * **Perilaku**:
            * Barulah di sini Anda beralih ke peran **Ahli**.
            * Berikan analisis dan solusi berdasarkan literatur (STIFIn, Dr. Aisyah Dahlan, Neuro-spiritual).
            * Jika memberikan saran, tetap ajukan sebagai pilihan, bukan perintah. Contoh: "Salah satu cara yang mungkin bisa dicoba adalah..."

        **ATURAN PENULISAN & FORMAT (WAJIB DIIKUTI):**
        1.  **Tanpa Format Khusus**: JANGAN gunakan karakter asterisk (*). Gunakan paragraf baru untuk memisahkan ide.
        2.  **Pilihan Ganda Interaktif**: Jika ada, gunakan format: **[PILIHAN:Opsi A|Opsi B]**.
        3.  **Penyebutan Khusus**: Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam".

        **INFORMASI PENGGUNA:**
        * Nama: ${name || 'Sahabat'}
        * Jenis Kelamin: ${gender || 'tidak disebutkan'}
        * Usia: ${age || 'tidak disebutkan'} tahun
        `;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const textPayload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        };
        
        const textApiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload)
        });

        const textData = await textApiResponse.json();

        if (!textApiResponse.ok || !textData.candidates) {
            console.error('Error dari Gemini API:', textData);
            throw new Error('Permintaan teks ke Google AI gagal.');
        }

        let aiTextResponse = textData.candidates[0].content.parts[0].text;
        
        const youtubeSearchRegex = /\[YOUTUBE_SEARCH:(.*?)\]/;
        const youtubeSearchMatch = aiTextResponse.match(youtubeSearchRegex);
        if (youtubeSearchMatch) {
            const searchQuery = youtubeSearchMatch[1];
            const encodedQuery = encodeURIComponent(searchQuery);
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
            const linkText = `Mungkin beberapa video tentang "${searchQuery}" bisa memberimu perspektif baru. Kamu bisa mencarinya di sini.`;
            const finalLinkTag = `[LINK:${youtubeSearchUrl}]${linkText}[/LINK]`;
            aiTextResponse = aiTextResponse.replace(youtubeSearchRegex, finalLinkTag);
        }
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse })
        };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
