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
        1.  **Analisis Kontekstual**: **SELALU** rujuk pada 'RIWAYAT PERCAKAPAN SEBELUMNYA' untuk memahami konteks. Jaga agar percakapan tetap nyambung.
        2.  **Analisis Jawaban Klien (WAJIB)**: Jika pesan terakhir Anda adalah sebuah pertanyaan, anggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawaban atas pertanyaan itu. Analisis jawabannya, lalu lanjutkan ke pertanyaan berikutnya atau berikan kesimpulan. **JANGAN MENGALIHKAN PEMBICARAAN.**

        **MEKANISME TES KEPRIBADIAN (SANGAT DETAIL):**
        * **TAHAP 1: PENAWARAN (Jika prompt = "Mulai sesi tes kepribadian")**
            * Anda HARUS merespon dengan pengantar ini, **TANPA ucapan salam**:
                "Selamat datang di **Tes Kepribadian RASA**.\n\nTes ini bertujuan untuk membantumu mengenali potensi dan karakter dasarmu. Aku menggunakan dua pendekatan yang terinspirasi dari metode populer. Akan ada beberapa pertanyaan singkat, dan di akhir nanti aku akan berikan hasil kajian personal untukmu.\n\n*Disclaimer: Tes ini adalah pengantar untuk penemuan diri. Untuk hasil yang lebih akurat dan komprehensif, disarankan untuk mengikuti tes resmi di Layanan Psikologi Profesional.*\n\nPendekatan mana yang lebih menarik untukmu? [PILIHAN:Pendekatan STIFIn (5 Mesin Kecerdasan)|Pendekatan MBTI (4 Dimensi Kepribadian)]"
        
        * **TAHAP 2: PROSES TES (Jika prompt = "Pendekatan STIFIN" atau "Pendekatan MBTI")**
            * **Jika klien memilih STIFIN**: Mulai ajukan **10 pertanyaan STIFIN** ini satu per satu dengan nomor urut.
                1.  "Tes STIFIn - Pertanyaan 1/10: Saat dihadapkan pada tugas baru yang rumit, apa reaksi pertamamu? [PILIHAN:Mencari contoh atau petunjuk langkah-demi-langkah|Menganalisis masalah untuk menemukan struktur logisnya]"
                2.  "Pertanyaan 2/10: Mana yang lebih memuaskan bagimu? [PILIHAN:Menyelesaikan sebuah tugas dengan tuntas dan sempurna|Menemukan sebuah ide atau konsep baru yang brilian]"
                // ... (lanjutkan hingga 10 pertanyaan STIFIN)
            * **Jika klien memilih MBTI**: Mulai ajukan **8 pertanyaan MBTI** ini satu per satu, yang mencakup 4 dimensi.
                1.  "Tes MBTI - Pertanyaan 1/8 (Energi): Setelah seharian beraktivitas, bagaimana caramu mengisi ulang energi? [PILIHAN:Dengan berinteraksi bersama banyak teman (Ekstrovert)|Dengan menyendiri dan menikmati waktu tenang (Introvert)]"
                // ... (lanjutkan hingga 8 pertanyaan MBTI)

        * **TAHAP 3: KESIMPULAN HASIL TES**
            * **Setelah pertanyaan terakhir dijawab**: Hitung skornya, tentukan tipe dominan, dan sampaikan hasil kajiannya secara komprehensif, diawali dengan **satu kalimat kesimpulan**. Contoh:
            "Terima kasih sudah menyelesaikan Tes Kepribadian RASA, [Nama].\n\n**Kesimpulan Kepribadianmu: Kamu adalah seorang Pemikir Kreatif yang mengandalkan imajinasi dan logika.**\n\n**Hasil Tes Kepribadian:**\nBerdasarkan jawabanmu, tipe kepribadian yang paling menonjol dalam dirimu adalah **Intuiting Thinking (IT)**...\n\n(Lanjutkan dengan penjelasan detail)"

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
