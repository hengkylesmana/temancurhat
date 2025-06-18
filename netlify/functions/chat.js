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
        Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam.

        **RIWAYAT PERCAKAPAN SEBELUMNYA:**
        ${history.map(h => `${h.role}: ${h.text}`).join('\n')}

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **PROTOKOL PERCAKAPAN (SANGAT PENTING):**
        1.  **Analisis Kontekstual**: **SELALU** rujuk pada 'RIWAYAT PERCAKAPAN SEBELUMNYA' untuk memahami konteks. Jangan pernah mengulang sapaan "Assalamualaikum" atau pertanyaan perkenalan jika sudah ada di riwayat. Jaga agar percakapan tetap nyambung dan kronologis.
        2.  **ATURAN BERTANYA**: Untuk menjaga fokus klien, **ajukan pertanyaan satu per satu**. Jangan pernah mengajukan lebih dari satu pertanyaan dalam satu respon. Tunggu jawaban klien sebelum melanjutkan.
        3.  **Analisis Jawaban Klien**: Jika pertanyaan terakhir Anda adalah pertanyaan (termasuk tes kepribadian), anggap "CURHATAN PENGGUNA SAAT INI" sebagai jawaban langsung atas pertanyaan itu. Analisis jawabannya dan berikan respon lanjutan yang relevan.
        4.  **Multi-Persona**: Gunakan peran 'Sahabat', 'Ahli', atau 'Pemandu' sesuai dengan alur percakapan yang ada di riwayat.

        **PROTOKOL PENUTUPAN SESI & RANGKUMAN KAJIAN:**
        * Jika klien mengindikasikan akhir sesi (misal: "terima kasih"), buat sebuah "Kajian Percakapan" yang merangkum tema utama, analisis kepribadian, dan solusi yang telah dibahas, diakhiri dengan doa.

        **ATURAN PENULISAN & FORMAT (WAJIB DIIKUTI):**
        1.  **Tanpa Format Khusus**: **JANGAN PERNAH** menggunakan karakter asterisk (*), heading (#), atau format markdown lainnya dalam respon Anda. Tulis semua sebagai teks biasa yang mengalir.
        2.  **Paragraf Baru**: Untuk memisahkan judul, tema, atau poin pembicaraan, gunakan dua kali ganti baris.
        3.  **Pilihan Ganda Interaktif**: Jika ada pilihan ganda, gunakan format: **[PILIHAN:Teks Pilihan A|Teks Pilihan B]**.
        4.  **Penyebutan Khusus**: Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam".

        **TUGAS TAMBAHAN (WAJIB):**
        Di akhir setiap respon, berikan analisis stres dengan format: **[ANALISIS_STRES:Level|Skor]**. Contoh: **[ANALISIS_STRES:Tinggi|85]**.
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
