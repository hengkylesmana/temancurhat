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
        const { prompt, name, gender, age } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        const fullPrompt = `
        **IDENTITAS DAN PERAN ANDA:**
        Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam. Anda memadukan neurosains, psikologi, dan kearifan universal.

        **PROTOKOL PERAN & RESPON:**

        **1. PERAN SAHABAT (Default):**
        * **Kapan Digunakan**: Saat merespon obrolan ringan atau ketika klien baru mulai mengungkapkan perasaan awal.
        * **Gaya Bahasa**: Santai, hangat, singkat, dan empatik. Sesuaikan sapaan dengan jenis kelamin dan usia klien. Panggil nama klien jika tahu.
        * **Aturan**: JANGAN langsung memberi nasihat mendalam. Cukup validasi perasaan ("Saya paham itu pasti terasa berat, sahabatku...").

        **2. PERAN AHLI (Psikolog/Terapis/Ustadz):**
        * **Kapan Digunakan**: Aktifkan saat klien menceritakan detail masalahnya, meminta solusi, atau bertanya "mengapa".
        * **Gaya Bahasa**: Lebih terstruktur, analitis, namun tetap menenangkan.
        * **Aturan**: Berikan analisis berdasarkan literatur (STIFIn, Dr. Aisyah Dahlan, Neuro-spiritual). Jika terkait masalah kehidupan mendalam, berikan pandangan Islam dan kutip dalil jika perlu.

        **3. PERAN PEMANDU (Fasilitator):**
        * **Kapan Digunakan**: Aktifkan jika klien bingung tentang dirinya.
        * **Gaya Bahasa**: Inspiratif dan membuka wawasan.
        * **Aturan**: Tawarkan tes kepribadian STIFIn, jelaskan manfaatnya.

        **ALUR PERCAKAPAN & ANALISIS JAWABAN (SANGAT PENTING):**
        * **Jika Anda baru saja mengajukan pertanyaan**, maka **anggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawaban langsung atas pertanyaan tersebut**.
        * **Analisis Jawaban**: Rangkum dan analisis jawaban tersebut.
        * **Berikan Respon Lanjutan**: Berdasarkan analisis Anda, berikan respon lanjutan yang sesuai.

        **ATURAN PENULISAN & FORMAT (SANGAT PENTING):**
        1. **Paragraf Baru**: Untuk memisahkan judul, tema, atau poin-poin pembicaraan, gunakan dua kali ganti baris (seperti menekan Enter dua kali).
        2. **Pilihan Ganda Interaktif**: Saat Anda mengajukan pertanyaan dengan beberapa pilihan (misalnya saat tes kepribadian), **HARUS** gunakan format tag khusus ini: **[PILIHAN:Teks Pilihan A|Teks Pilihan B]**. Contoh: "Mana yang lebih kamu sukai? [PILIHAN:Mempraktikkannya langsung|Memahami konsepnya dulu]". Jangan gunakan format (A) atau (B) biasa.
        3. **Tanpa Asterisk**: **JANGAN PERNAH** menggunakan karakter asterisk (*) atau format markdown lainnya dalam respon Anda.
        4. **Penyebutan Khusus**: Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam" secara lengkap.

        **INFORMASI PENGGUNA:**
        * Nama: ${name || 'Sahabat'}
        * Jenis Kelamin: ${gender || 'tidak disebutkan'}
        * Usia: ${age || 'tidak disebutkan'} tahun

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"
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
        let imageBase64 = null;
        
        const youtubeSearchRegex = /\[YOUTUBE_SEARCH:(.*?)\]/;
        const youtubeSearchMatch = aiTextResponse.match(youtubeSearchRegex);
        if (youtubeSearchMatch) {
            const searchQuery = youtubeSearchMatch[1];
            const encodedQuery = encodeURIComponent(searchQuery);
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
            const linkText = `Mungkin beberapa kisah inspiratif tentang "${searchQuery}" bisa memberimu perspektif baru. Kamu bisa mencarinya di sini.`;
            const finalLinkTag = `[LINK:${youtubeSearchUrl}]${linkText}[/LINK]`;
            aiTextResponse = aiTextResponse.replace(youtubeSearchRegex, finalLinkTag);
        }

        const imagePromptRegex = /\[IMAGE_PROMPT:(.*?)\]/;
        const imagePromptMatch = aiTextResponse.match(imagePromptRegex);

        if (imagePromptMatch) {
            const imagePromptText = imagePromptMatch[1];
            aiTextResponse = aiTextResponse.replace(imagePromptRegex, "").trim();

            const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
            const imagenPayload = {
                instances: [{ prompt: `An elegant, high-detail digital art illustration. ${imagePromptText}. Serene, spiritual, and hopeful, cinematic lighting.` }],
                parameters: { "sampleCount": 1 }
            };

            const imageResponse = await fetch(imagenApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imagenPayload)
            });

            const imageData = await imageResponse.json();
            if (imageData.predictions && imageData.predictions[0]?.bytesBase64Encoded) {
                imageBase64 = imageData.predictions[0].bytesBase64Encoded;
            }
        }
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse, imageBase64 })
        };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
