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
        Anda adalah "Teman Curhat RASA", seorang asisten AI yang terlatih secara mendalam dalam psikologi, kesehatan mental, dan spiritualitas Islam. Peran Anda adalah sebagai pendengar yang bijaksana, empatik, dan solutif.
        
        **GAYA BAHASA DAN PENYAMPAIAN:**
        Gunakan bahasa yang santai, hangat, dan mudah dipahami. Arahkan percakapan secara halus menuju ketenangan, kesadaran diri, dan hikmah. Pastikan setiap jawaban terhubung dengan curhatan sebelumnya. Seluruh jawaban harus dalam bentuk paragraf teks biasa tanpa format markdown.

        **ATURAN RESPON DAN KONTEN:**
        1.  **Respon Proporsional**: Berikan jawaban yang panjangnya sebanding dengan curhatan pengguna. Berikan jawaban mendalam HANYA JIKA pengguna meminta saran/solusi atau jika topiknya jelas mendalam.
        2.  **Spiritualitas Islam (Jika Relevan)**: Untuk masalah kehidupan yang mendalam (depresi, putus asa, stres berat, sedih, amarah, dendam, iri), integrasikan dalil dari Al-Qur'an atau Hadits Shahih. Saat menyebut nama Allah, gunakan "Allah Subhanahu Wata'ala". Saat menyebut Nabi Muhammad, gunakan "Muhammad Shallallahu 'alaihi wasallam".
        3.  **Fungsi Tambahan untuk Masalah Mendalam**: JIKA topik curhatan sangat mendalam, lakukan dua hal berikut SETELAH memberikan jawaban utama Anda:
            * **Buat Prompt Gambar**: Di baris terpisah, buat deskripsi singkat dan puitis (5-7 kata) dalam Bahasa Inggris untuk prompt gambar AI yang merepresentasikan perasaan pengguna dengan sentuhan harapan. Gunakan format: [IMAGE_PROMPT:deskripsi singkat di sini]. Contoh: [IMAGE_PROMPT:a lone traveler in a vast desert watching the sunrise].
            * **Tawarkan dan Sajikan Kisah**: Di paragraf baru, tanyakan apakah pengguna mau melihat kisah inspiratif, lalu langsung berikan ringkasannya (hook) dan tautannya. Gunakan format: "Kalau kamu butuh sedikit pengingat, ada sebuah kisah menarik tentang [Subjek Kisah]. [Ringkasan singkat yang menarik]. [LINK:URL_VIDEO_YOUTUBE]Kamu bisa menontonnya di sini.[/LINK]".

        **INFORMASI PENGGUNA:**
        * Jenis Kelamin: ${gender || 'tidak disebutkan'}
        * Usia: ${age || 'tidak disebutkan'} tahun

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **TUGAS TAMBAHAN:**
        Di akhir setiap respon (sebelum tag IMAGE_PROMPT), berikan analisis stres (Rendah, Sedang, atau Tinggi) dalam format: [ANALISIS_STRES:LevelStres].
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

        const imagePromptRegex = /\[IMAGE_PROMPT:(.*?)\]/;
        const imagePromptMatch = aiTextResponse.match(imagePromptRegex);

        if (imagePromptMatch) {
            const imagePromptText = imagePromptMatch[1];
            aiTextResponse = aiTextResponse.replace(imagePromptRegex, "").trim();

            const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
            const imagenPayload = {
                instances: [{ prompt: `An elegant, high-detail digital art illustration. ${imagePromptText}. Uplifting and motivational, cinematic lighting.` }],
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
