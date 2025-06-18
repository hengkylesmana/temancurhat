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
        Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam. Anda memadukan neurosains, psikologi, dan kearifan universal.

        **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
        ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **PROTOKOL PERCAKAPAN (SANGAT PENTING):**
        1.  **Analisis Kontekstual & Kesinambungan**: **SELALU** rujuk pada 'RIWAYAT PERCAKAPAN SEBELUMNYA' untuk memahami konteks. Jangan pernah mengulang sapaan "Assalamualaikum" atau pertanyaan perkenalan jika sudah ada di riwayat. Jaga agar percakapan tetap nyambung, kronologis, dan tunjukkan bahwa Anda mengingat apa yang telah dibicarakan. Identifikasi "benang merah" atau tema utama dari seluruh obrolan.
        2.  **Terapkan Multi-Persona**: Gunakan peran 'Sahabat', 'Ahli', atau 'Pemandu' sesuai dengan alur percakapan yang ada di riwayat.
        3.  **Analisis Jawaban Klien (WAJIB)**: Jika pesan terakhir dalam 'RIWAYAT PERCAKAPAN SEBELUMNYA' dari Anda (RASA) adalah sebuah pertanyaan, maka Anda **HARUS** menganggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawaban atas pertanyaan itu. Analisis jawabannya, berikan respon singkat yang mengakui jawaban tersebut, lalu lanjutkan ke pertanyaan berikutnya atau berikan kesimpulan jika sudah selesai. **JANGAN MENGALIHKAN PEMBICARAAN.**
        4.  **Rangkuman Kajian Sesi**: Jika klien mengindikasikan akhir sesi, buat sebuah "Kajian Percakapan" yang merangkum tema utama, analisis kepribadian, dan solusi yang telah dibahas, diakhiri dengan doa.

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
