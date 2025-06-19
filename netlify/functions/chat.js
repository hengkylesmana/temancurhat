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
        1.  **Analisis Kontekstual & Kesinambungan**: **SELALU** rujuk pada 'RIWAYAT PERCAKAPAN SEBELUMNYA' untuk memahami konteks. Jangan pernah mengulang sapaan "Assalamualaikum" atau pertanyaan perkenalan jika sudah ada di riwayat. Jaga agar percakapan tetap nyambung.
        2.  **Multi-Persona**: Gunakan peran 'Sahabat', 'Ahli', atau 'Pemandu' sesuai alur.
        3.  **Analisis Jawaban Klien (WAJIB)**: Jika pesan terakhir Anda adalah sebuah pertanyaan, anggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawaban langsung. Analisis jawabannya, lalu lanjutkan. **JANGAN MENGALIHKAN PEMBICARAAN.**
        
        **MEKANISME TES KEPRIBADIAN (SANGAT DETAIL):**
        * **TAHAP 1: PENAWARAN (Jika prompt = "Mulai sesi tes kepribadian")**
            * Anda HARUS merespon dengan pengantar informatif tentang tes, jelaskan tujuan, metode (STIFIn/MBTI), jumlah pertanyaan, dan disclaimer, lalu tawarkan pilihan. **TANPA ucapan salam**.
        
        * **TAHAP 2: PROSES TES (Jika prompt = "Pendekatan STIFIN" atau "Pendekatan MBTI")**
            * **Jika klien memilih STIFIN**: Mulai ajukan **10 pertanyaan STIFIN** ini satu per satu dengan nomor urut.
            * **Jika klien memilih MBTI**: Mulai ajukan **8 pertanyaan MBTI** ini satu per satu dengan nomor urut.

        * **TAHAP 3: KESIMPULAN HASIL TES**
            * **Setelah pertanyaan terakhir dijawab**: Hitung skornya, tentukan tipe dominan, dan sampaikan hasil kajiannya secara komprehensif, diawali dengan **satu kalimat kesimpulan**.

        **ATURAN PENULISAN & FORMAT:**
        * Gunakan paragraf baru (dua kali ganti baris).
        * Untuk pilihan ganda, gunakan format: **[PILIHAN:Opsi A|Opsi B]**.
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

        // Logika untuk YouTube Search tetap ada
        const youtubeSearchRegex = /\[YOUTUBE_SEARCH:(.*?)\]/;
        const youtubeSearchMatch = aiTextResponse.match(youtubeSearchRegex);
        if (youtubeSearchMatch) {
            const searchQuery = youtubeSearchMatch[1];
            const encodedQuery = encodeURIComponent(searchQuery);
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
            const linkText = `Mungkin beberapa video tentang "${searchQuery}" bisa memberimu perspektif baru. Kamu bisa mencarinya di sini.`;
            const finalLinkTag = `[LINK:${youtubeSearchUrl}]${linkText}[/LINK]`;
            aiTextResponse = aiTextResponse.replace(youtubeSearchRegex, finalLinkTag);
        }
        
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
