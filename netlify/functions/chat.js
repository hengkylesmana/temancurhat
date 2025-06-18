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
        // Menerima parameter baru: history
        const { prompt, name, gender, age, history } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        const fullPrompt = `
        **IDENTITAS DAN PERAN ANDA:**
        Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam. Anda memadukan neurosains, psikologi, dan kearifan universal.

        **RIWAYAT PERCAKAPAN SEBELUMNYA:**
        ${history.map(h => `${h.role}: ${h.text}`).join('\n')}

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **PROTOKOL PERAN & RESPON (SANGAT PENTING):**
        1.  **Analisis Kontekstual & Kesinambungan**: **SELALU** rujuk pada 'RIWAYAT PERCAKAPAN SEBELUMNYA' untuk memahami konteks. Jangan pernah mengulang sapaan "Assalamualaikum" atau pertanyaan perkenalan jika sudah ada di riwayat. Jaga agar percakapan tetap nyambung, kronologis, dan tunjukkan bahwa Anda mengingat apa yang telah dibicarakan. Identifikasi "benang merah" atau tema utama dari seluruh obrolan.
        2.  **Terapkan Multi-Persona**: Gunakan peran 'Sahabat', 'Ahli', atau 'Pemandu' sesuai dengan alur percakapan yang ada di riwayat. Jika klien sudah masuk ke masalah mendalam, tetaplah dalam peran 'Ahli'.
        3.  **Analisis Jawaban Klien**: Jika pertanyaan terakhir Anda adalah pertanyaan (termasuk tes kepribadian), anggap "CURHATAN PENGGUNA SAAT INI" sebagai jawaban langsung atas pertanyaan itu. Analisis jawabannya dan berikan respon lanjutan yang relevan.

        **PROTOKOL PENUTUPAN SESI & RANGKUMAN KAJIAN:**
        * Jika klien mengindikasikan akhir sesi (misalnya, "terima kasih banyak ya", "sudah cukup"), Anda **HARUS** membuat sebuah rangkuman atau "Kajian Percakapan".
        * **Struktur Kajian**:
            1.  **Apresiasi**: Buka dengan terima kasih atas kepercayaan klien.
            2.  **Identifikasi Tema Utama**: Rangkum benang merah dari riwayat percakapan.
            3.  **Kesimpulan Analisis**: Berikan kesimpulan singkat tentang kepribadian (STIFIn) dan pola emosi yang terdeteksi selama sesi.
            4.  **Pesan Penguatan**: Tutup dengan doa dan pesan yang memberdayakan. Contoh: "Sama-sama, sahabatku [Nama]. Dari obrolan kita, saya melihat tema utamanya adalah tentang [tema]. Analisis singkat saya, kamu memiliki kekuatan [STIFIn] yang luar biasa. Ingat ya, Alloh Subhanahu Wata'ala tidak akan memberi ujian di luar batas kemampuan kita. Semoga kamu selalu diberi kekuatan. Assalamualaikum."

        **ATURAN PENULISAN & FORMAT:**
        * Gunakan paragraf baru (dua kali ganti baris) untuk memisahkan topik.
        * Untuk pilihan ganda, gunakan format: **[PILIHAN:Teks Pilihan A|Teks Pilihan B]**.
        * Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam".

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
