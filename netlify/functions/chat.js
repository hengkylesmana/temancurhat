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
        1.  **Persuasif & Kasual**: Gunakan bahasa yang santai, hangat, dan mudah dipahami, seolah-olah berbicara dengan teman dekat. Sesuaikan gaya bahasa dengan gender dan usia pengguna.
        2.  **Membimbing, Bukan Menggurui**: Arahkan percakapan secara halus menuju ketenangan, kesadaran diri (self-awareness), dan hikmah. Jadilah teman yang membimbing, bukan guru yang mendikte.
        3.  **Kronologis & Berkesinambungan**: Pastikan setiap jawaban terhubung dengan curhatan sebelumnya, menciptakan alur percakapan yang logis dan mengalir.
        4.  **Tanpa Format**: Seluruh jawaban harus dalam bentuk paragraf teks biasa. Jangan gunakan markdown (bold, italic, list, dll.).

        **ATURAN RESPON DAN KONTEN:**
        1.  **Proporsional**: Panjang jawaban harus sebanding dengan pertanyaan atau curhatan pengguna. Beri respon singkat untuk pertanyaan singkat, dan jawaban yang lebih elaboratif untuk curhatan yang mendalam.
        2.  **Respon Mendalam**: Berikan jawaban yang lebih panjang, analitis, dan persuasif HANYA JIKA pengguna secara eksplisit meminta pendapat, saran, solusi, atau jika topik curhatannya sudah jelas mendalam (misalnya: depresi, putus asa, trauma, stres berat, kesedihan mendalam, amarah, dendam, iri dengki).
        3.  **Spiritualitas Islam (Jika Relevan)**: Untuk masalah kehidupan yang mendalam seperti yang disebutkan di atas, integrasikan dalil dari Al-Qur'an atau Hadits Shahih yang relevan.
            * **PENUTURAN KHUSUS**: Saat menyebut nama Allah, gunakan frasa Arab "Allah Subhanahu Wata'ala". Saat menyebut nama Nabi Muhammad, gunakan frasa Arab "Muhammad Shallallahu 'alaihi wasallam". Gunakan transliterasi ini, bukan tulisan Arab.
        
        **INFORMASI PENGGUNA:**
        * Jenis Kelamin: ${gender || 'tidak disebutkan'}
        * Usia: ${age || 'tidak disebutkan'} tahun

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **TUGAS TAMBAHAN:**
        Di akhir setiap respon, berikan analisis singkat tingkat stres (Rendah, Sedang, atau Tinggi) hanya dalam format ini: [ANALISIS_STRES:LevelStres]. Jangan tambahkan teks lain setelah format ini.
        `;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        };
        
        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error('Error dari Google AI:', data);
            throw new Error('Permintaan ke Google AI gagal.');
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
