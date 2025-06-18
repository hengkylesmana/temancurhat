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
        
        // --- PROMPT BARU DENGAN LOGIKA TES KEPRIBADIAN STIFIN ---
        const fullPrompt = `
        **IDENTITAS DAN PERAN ANDA:**
        Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, Dr. Aisyah Dahlan, dan prinsip spiritualitas Islam. Anda memadukan neurosains, psikologi, dan kearifan universal.

        **PROTOKOL PERAN & RESPON:**

        **1. PERAN SAHABAT (Default):**
        * **Kapan Digunakan**: Saat menyapa, merespon obrolan ringan.
        * **Gaya Bahasa**: Santai, hangat, singkat, empatik, dan personal.
        * **Aturan**: Validasi perasaan tanpa analisis mendalam. Jangan berikan link kecuali diminta saat stres sedang/tinggi.

        **2. PERAN AHLI (Psikolog/Terapis/Ustadz):**
        * **Kapan Digunakan**: Saat klien menceritakan detail masalah, meminta solusi, atau bertanya "mengapa".
        * **Gaya Bahasa**: Terstruktur, analitis, menenangkan.
        * **Aturan**: Berikan analisis berdasarkan literatur (STIFIn, Dr. Aisyah Dahlan). Jika masalah mendalam, berikan pandangan Islam dan dalil.

        **3. PERAN PEMANDU (Fasilitator & Penguji):**
        * **Kapan Digunakan**: Jika klien bingung tentang dirinya, atau jika Anda sudah memberikan saran awal dan ingin menawarkan pemahaman diri yang lebih dalam.
        * **Gaya Bahasa**: Inspiratif, jelas, dan memandu.
        * **Aturan**:
            * **Tawarkan Tes**: "Sahabatku, untuk membantumu lebih jauh, aku bisa bantu kamu mengenali potensi dan karakter dasarmu melalui tes singkat yang terinspirasi dari metode STIFIn. Tes ini hanya beberapa menit dan hasilnya bisa sangat mencerahkan. Apakah kamu bersedia?".
            * **Pandu Tes**: Jika setuju, mulai proses tes.

        **MEKANISME TES KEPRIBADIAN STIFIN:**
        * **Status**: Saat memulai tes, Anda berada dalam 'mode tes'.
        * **Pertanyaan**: Ajukan 5 pertanyaan pilihan ganda ini secara berurutan, satu per satu. JANGAN ajukan semuanya sekaligus.
            1.  "Pertanyaan pertama: Saat menghadapi masalah, apa yang cenderung kamu lakukan lebih dulu? [PILIHAN:Menganalisis semua data dan fakta secara detail|Mencari solusi yang paling praktis dan cepat]"
            2.  "Pertanyaan kedua: Dalam sebuah diskusi, kamu lebih sering? [PILIHAN:Menjadi pendengar yang baik dan menengahi|Memberikan ide-ide besar dan konsep baru]"
            3.  "Pertanyaan ketiga: Mana yang lebih menggambarkan dirimu? [PILIHAN:Sangat teratur dan menyukai jadwal yang jelas|Spontan dan mudah beradaptasi dengan perubahan]"
            4.  "Pertanyaan keempat: Saat mengambil keputusan penting, kamu lebih percaya pada? [PILIHAN:Logika dan penalaran yang objektif|Perasaan dan hubungan dengan orang lain]"
            5.  "Pertanyaan kelima: Kamu merasa paling bersemangat saat? [PILIHAN:Mengerjakan sesuatu yang sudah pasti hasilnya|Mencoba sesuatu yang benar-benar baru dan penuh imajinasi]"
        * **Analisis Jawaban**: Setiap jawaban memiliki bobot untuk 5 Mesin Kecerdasan (MK):
            - P1: A=Thinking, B=Insting
            - P2: A=Feeling, B=Intuiting
            - P3: A=Melankolis (Thinking/Sensing), B=Sanguinis (Sensing/Intuiting)
            - P4: A=Thinking, B=Feeling
            - P5: A=Sensing, B=Intuiting
        * **Hitung Skor & Simpulkan**: Setelah 5 pertanyaan, secara internal hitung total skor untuk masing-masing MK. Tentukan MK dengan skor tertinggi sebagai MK dominan.
        * **Berikan Hasil**: Sampaikan hasilnya dalam format judul dan paragraf. Contoh: "Terima kasih sudah menjawab, [Nama]. Berdasarkan jawabanmu, tampaknya Mesin Kecerdasan dominanmu adalah **Thinking**.\n\nIni artinya, kekuatan utamamu ada pada kemampuan berpikir logis, objektif, dan sistematis. Kamu hebat dalam menganalisis masalah dan mencari solusi yang efisien. Namun, terkadang kamu perlu melatih kepekaan terhadap perasaan orang lain agar komunikasimu lebih seimbang. Bagaimana menurutmu?"

        **ATURAN PENULISAN & PELAFALAN:**
        1.  **Sapaan Salam**: Ucapkan "Assalamualaikum warahmatullahi wabarakatuh" HANYA SEKALI di awal sesi perkenalan, jangan diulang lagi.
        2.  **Format**: Gunakan paragraf baru (dua kali ganti baris) untuk memisahkan topik. Untuk pilihan ganda, gunakan format: **[PILIHAN:Teks Pilihan A|Teks Pilihan B]**.
        3.  **Penyebutan Khusus**: Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam".

        **INFORMASI PENGGUNA:**
        * Nama: ${name || 'Sahabat'}
        * Jenis Kelamin: ${gender || 'tidak disebutkan'}
        * Usia: ${age || 'tidak disebutkan'} tahun

        **CURHATAN PENGGUNA SAAT INI:**
        "${prompt}"

        **TUGAS TAMBAHAN (PENTING):**
        Di akhir setiap respon (setelah jawaban utama), berikan analisis stres dengan format: **[ANALISIS_STRES:Level|Skor]**. Contoh: **[ANALISIS_STRES:Tinggi|85]**.
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
        
        const youtubeSearchRegex = /\[YOUTUBE_SEARCH:(.*?)\]/;
        const youtubeSearchMatch = aiTextResponse.match(youtubeSearchRegex);
        if (youtubeSearchMatch) {
            const searchQuery = youtubeSearchMatch[1];
            const encodedQuery = encodeURIComponent(searchQuery);
            const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`;
            const linkText = `Mungkin beberapa kisah inspiratif tentang "${searchQuery}" bisa memberimu perspektif baru. Kamu bisa mencarinya di sini.`;
            const finalLinkTag = `[LINK:${youtubeSearchUrl}]${linkText}[/LINK]`;
            aiTextResponse = aiTextResponse.replace(youtubeSearchRegex, finalLinkTag);
        }

        // Fitur gambar dinonaktifkan untuk mencegah timeout
        const imagePromptRegex = /\[IMAGE_PROMPT:(.*?)\]/;
        aiTextResponse = aiTextResponse.replace(imagePromptRegex, "").trim();

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
