const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

// Ini adalah handler fungsi "serverless" standar.
// Lebih sederhana dan lebih andal daripada menggunakan Express di Netlify.
exports.handler = async (event) => {
    // 1. Memastikan fungsi hanya menerima permintaan POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // 2. Memeriksa apakah Kunci API sudah ada di Netlify
    if (!GEMINI_API_KEY) {
        console.error("Kesalahan: GOOGLE_GEMINI_API_KEY tidak ditemukan.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Kunci API belum diatur dengan benar di server.' })
        };
    }

    try {
        // 3. Mengambil data dari frontend
        const body = JSON.parse(event.body);
        const { prompt, gender, age } = body;

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' })
            };
        }
        
        const fullPrompt = `
        Anda adalah "Teman Curhat RASA", seorang asisten AI yang empatik, bijaksana, dan menenangkan.
        Tugas Anda adalah memberikan respon yang logis, analitis, dan solutif, berdasarkan literatur psikologi, kesehatan, self-healing, dan spiritualitas Islam (Al-Qur'an dan Hadits Shahih), namun disampaikan secara persuasif dan santai.
        ATURAN RESPON:
        1. JAWABAN SINGKAT DAN PADAT: Berikan tanggapan awal yang ringkas dan langsung ke pokok permasalahan. Hindari penjelasan panjang.
        2. TUNGGU PERMINTAAN: Hanya berikan saran mendalam, solusi, atau pendapat jika pengguna secara eksplisit meminta ("menurutmu bagaimana?", "apa solusinya?", "minta saran") atau jika percakapan sudah jelas masuk ke tahap curhat mendalam.
        3. TANPA FORMAT: Jangan gunakan format markdown (bold, italic, list). Tulis sebagai paragraf biasa.
        Target Pengguna: Seorang ${gender || 'tidak disebutkan'} berusia ${age || 'tidak disebutkan'} tahun.
        Curhatan Pengguna: "${prompt}"
        Tugas Tambahan: Berdasarkan curhatan tersebut, berikan analisis singkat tingkat stres (Rendah, Sedang, atau Tinggi) hanya dalam format ini di akhir respon Anda: [ANALISIS_STRES:LevelStres]. Jangan tambahkan teks lain setelah format ini.
        `;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        };
        
        // 4. Menghubungi Google AI
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

        // 5. Mengirim jawaban kembali ke frontend
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
