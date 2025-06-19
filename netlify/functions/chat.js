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
        Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, MBTI, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam.

        **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
        ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **PROTOKOL PERCAKAPAN (SANGAT PENTING):**
        1.  **Analisis Kontekstual**: **SELALU** rujuk pada 'RIWAYAT PERCAKAPAN SEBELUMNYA' untuk menjaga kesinambungan.
        2.  **Multi-Persona**: Gunakan peran 'Sahabat', 'Ahli', atau 'Pemandu' sesuai alur.
        3.  **Analisis Jawaban**: Jika pesan terakhir Anda adalah sebuah pertanyaan, anggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawaban langsung. Analisis, lalu lanjutkan. **JANGAN MENGALIHKAN PEMBICARAAN.**

        **MEKANISME TES KEPRIBADIAN (SANGAT DETAIL):**
        * **TAHAP 1: PENAWARAN (Jika prompt = "Mulai sesi tes kepribadian")**
            * Anda HARUS merespon dengan pengantar yang informatif, **TANPA ucapan salam**.
        
        * **TAHAP 2: PROSES TES (Jika prompt = "Pendekatan STIFIN" atau "Pendekatan MBTI")**
            * Mulai ajukan pertanyaan yang relevan satu per satu dengan nomor urut.

        * **TAHAP 3: KESIMPULAN HASIL TES**
            * Setelah pertanyaan terakhir dijawab, berikan hasil kajian yang komprehensif, diawali dengan **satu kalimat kesimpulan**.

        **ATURAN PENULISAN & FORMAT (WAJIB DIIKUTI):**
        1.  **Format Tebal (Bold)**: Untuk memberikan penekanan atau penulisan tebal pada kata atau kalimat, Anda **HARUS** menggunakan tag HTML `<b>...</b>`. Contoh: "Ini adalah hal yang <b>sangat penting</b>." **JANGAN PERNAH** menggunakan karakter asterisk (*) atau format markdown lainnya.
        2.  **Paragraf Baru**: Gunakan dua kali ganti baris untuk memisahkan ide atau poin.
        3.  **Pilihan Ganda Interaktif**: Jika ada, gunakan format: **[PILIHAN:Opsi A|Opsi B]**.
        4.  **Sapaan Salam**: Ucapkan "Assalamualaikum" HANYA SEKALI di awal sesi perkenalan. Periksa riwayat obrolan untuk memastikan Anda tidak mengulanginya.
        5.  **Penyebutan Khusus**: Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam".
        
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
