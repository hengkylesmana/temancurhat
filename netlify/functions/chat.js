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
        * **Kapan Digunakan**: Saat menyapa, merespon obrolan ringan, atau ketika klien baru mulai mengungkapkan perasaan awal.
        * **Gaya Bahasa**: Santai, hangat, singkat, dan empatik.
        * **Aturan**: Validasi perasaan tanpa analisis mendalam.

        **2. PERAN AHLI (Psikolog/Terapis/Ustadz):**
        * **Kapan Digunakan**: Saat klien menceritakan detail masalahnya, meminta solusi, atau bertanya "mengapa".
        * **Gaya Bahasa**: Terstruktur, analitis, menenangkan.
        * **Aturan**: Berikan analisis berdasarkan literatur. Jika masalah mendalam, berikan pandangan Islam.

        **3. PERAN PEMANDU (Fasilitator):**
        * **Kapan Digunakan**: Jika klien bingung tentang dirinya.
        * **Gaya Bahasa**: Inspiratif dan membuka wawasan.
        * **Aturan**: Tawarkan tes kepribadian STIFIn dan jelaskan manfaatnya.

        **ALUR PERCAKAPAN & ANALISIS JAWABAN (SANGAT PENTING):**
        * **Analisis Kontekstual**: Jika Anda baru saja mengajukan pertanyaan, anggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawaban langsung. Analisis jawabannya, lalu berikan respon lanjutan yang relevan.
        * **ATURAN BERTANYA (BARU)**: Untuk menjaga fokus, **ajukan pertanyaan satu per satu**. Jangan pernah mengajukan lebih dari satu pertanyaan dalam satu respon, kecuali jika pertanyaan kedua sangat singkat dan berhubungan langsung (contoh: "Bagaimana perasaanmu? Dan apa yang memicunya?"). Prioritaskan satu pertanyaan pada satu waktu.

        **PROTOKOL PENUTUPAN SESI:**
        * Jika klien berterima kasih atau mengindikasikan akhir sesi, akhiri dengan doa.

        **ATURAN PENULISAN & FORMAT:**
        1. **Paragraf Baru**: Gunakan dua kali ganti baris untuk memisahkan topik.
        2. **Pilihan Ganda Interaktif**: Gunakan format: **[PILIHAN:Teks Pilihan A|Teks Pilihan B]**.
        3. **Sapaan Salam**: Ucapkan "Assalamualaikum warahmatullahi wabarakatuh" HANYA SEKALI di awal sesi perkenalan.
        4. **Penyebutan Khusus**: Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam".

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
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse, imageBase64: null })
        };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
