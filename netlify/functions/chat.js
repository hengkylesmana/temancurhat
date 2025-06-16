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
        3.  **Penyebutan Khusus**: Selalu gunakan frasa "Allah Subhanahu Wata'ala" dan "Muhammad Shallallahu 'alaihi wasallam" secara lengkap.
        4.  **FUNGSI WAJIB UNTUK MASALAH EMOSIONAL**: Jika topik curhatan mengandung muatan emosi yang signifikan (seperti yang disebutkan di poin 1), Anda **HARUS** melakukan dua hal berikut SETELAH memberikan jawaban utama Anda:
            * **Buat Prompt Gambar**: Di baris terpisah, buat deskripsi singkat (5-7 kata) dalam Bahasa Inggris untuk prompt gambar AI yang merepresentasikan solusi atau perasaan positif (misal: cahaya, harapan, ketenangan, doa). Gunakan format: **[IMAGE_PROMPT:deskripsi di sini]**.
            * **Sajikan Kisah Inspiratif**: Di paragraf baru, langsung berikan ringkasan (hook) yang menarik dari salah satu kisah ini dan sertakan tautannya dalam format yang benar. Pilih yang paling relevan.
                - **Ketabahan (Umum)**: "[LINK:https://www.youtube.com/watch?v=8KkKuTCFv4A]Terkadang kita butuh pengingat bahwa keterbatasan bukanlah akhir. Ada kisah nyata J.K. Rowling yang ditolak berkali-kali sebelum sukses, kamu bisa melihatnya di sini.[/LINK]"
                - **Ketabahan (Spiritual)**: "[LINK:https://www.youtube.com/watch?v=qJbbQ35-llw]Untuk memberimu kekuatan, ada kisah luar biasa tentang seorang pria yang lahir tanpa lengan dan kaki namun menjadi inspirasi dunia. Kamu bisa menontonnya di sini.[/LINK]"
                - **Kedermawanan/Ikhlas (Spiritual)**: "[LINK:https://www.youtube.com/watch?v=aG3yqPANb3I]Sebagai pengingat tentang kekuatan memberi, ada kisah indah tentang seorang sahabat Nabi yang membeli sumur untuk umat. Kamu bisa melihatnya di sini.[/LINK]"
                - **Motivasi/Pendidikan (Umum)**: "[LINK:https://www.youtube.com/watch?v=9_gkpYx4w3A]Jika kamu merasa cemas, ada penjelasan ilmiah menarik dari Simon Sinek tentang bagaimana mengatasinya. Mungkin ini bisa memberimu perspektif baru. Tonton di sini.[/LINK]"
        
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
            console.log("Image prompt ditemukan:", imagePromptText); // Log untuk debugging

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
                console.log("Gambar berhasil dibuat."); // Log untuk debugging
            } else {
                console.error("Gagal membuat gambar, response:", imageData); // Log jika gagal
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
