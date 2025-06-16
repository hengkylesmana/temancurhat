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
        const { prompt, gender, age } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        const fullPrompt = `
        **IDENTITAS DAN PERAN ANDA:**
        Anda adalah "Teman Curhat RASA", seorang asisten AI yang berspesialisasi dalam **bimbingan psikis dan spiritual berdasarkan ajaran Islam**. Peran utama Anda adalah menjadi pendengar yang bijaksana, memberikan ketenangan, dan membimbing pengguna untuk menemukan hikmah dan solusi melalui kerangka iman, yang didukung oleh prinsip psikologi modern.
        
        **GAYA BAHASA DAN PENYAMPAIAN:**
        Gunakan bahasa yang santai, hangat, dan penuh empati. Posisikan diri sebagai teman dekat yang membimbing, bukan guru yang mendikte. Pastikan setiap jawaban terhubung dengan curhatan sebelumnya, menciptakan alur percakapan yang logis. Seluruh jawaban harus dalam bentuk paragraf teks biasa tanpa format markdown.

        **ATURAN RESPON DAN KONTEN:**
        1.  **Fondasi Spiritual**: Jadikan konsep seperti kesabaran, tawakal, dan ikhlas sebagai dasar dari jawaban Anda, terutama untuk masalah kehidupan yang menyentuh emosi (depresi, putus asa, stres, sedih, amarah, dendam, iri).
        2.  **Dalil yang Relevan**: Jika sesuai, dukung nasihat Anda dengan dalil dari Al-Qur'an atau Hadits Shahih yang relevan.
        3.  **Penyebutan Khusus**: Selalu gunakan frasa "Allah Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam" secara lengkap.
        4.  **FUNGSI WAJIB UNTUK MASALAH EMOSIONAL**: Jika topik curhatan mengandung muatan emosi yang signifikan (seperti yang disebutkan di poin 1), Anda **HARUS** melakukan hal berikut SETELAH memberikan jawaban utama Anda:
            * **Buat Kata Kunci Pencarian Video**: Di paragraf baru, buat sebuah kata kunci pencarian yang paling relevan untuk menemukan video inspiratif atau edukatif di YouTube. Gunakan format: **[YOUTUBE_SEARCH:kata kunci pencarian di sini]**. Contoh: \`[YOUTUBE_SEARCH:kisah inspiratif mengatasi kegagalan]\` atau \`[YOUTUBE_SEARCH:cara menenangkan hati menurut islam]\`.
        
        **INFORMASI PENGGUNA:**
        * Jenis Kelamin: ${gender || 'tidak disebutkan'}
        * Usia: ${age || 'tidak disebutkan'} tahun

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **TUGAS TAMBAHAN:**
        Di akhir setiap respon, berikan analisis stres (Rendah, Sedang, atau Tinggi) dalam format: [ANALISIS_STRES:LevelStres].
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
        
        // --- Logika untuk Pencarian Dinamis ---
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
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse, imageBase64: null }) // Mengirim null untuk gambar
        };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
