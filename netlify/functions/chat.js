const express = require('express');
const serverless = require('serverless-http');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();
// const router = express.Router(); // Router tidak lagi diperlukan, kita sederhanakan

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

// PERUBAHAN: Langsung gunakan app.post di rute dasar ('/')
// Netlify akan menangani penerusan dari /api/chat ke sini
app.post('/', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'API Key belum diatur di server.' });
    }
    try {
        const { prompt, gender, age } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt tidak boleh kosong.' });
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
        
        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            console.error('Error dari Google AI:', errorBody);
            throw new Error(`API request failed with status ${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        res.json(data);

    } catch (error) {
        console.error('Error di server:', error.message);
        res.status(500).json({ error: 'Terjadi kesalahan di server.' });
    }
});

// Baris app.use(...) yang lama sudah dihapus

// Pembungkusnya tetap sama, tetapi sekarang membungkus app yang lebih sederhana
module.exports.handler = serverless(app);
