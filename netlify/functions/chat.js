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
        3.  **Analisis Jawaban Klien (WAJIB)**: Jika pesan terakhir Anda adalah sebuah pertanyaan, anggap 'CURHATAN PENGGUNA SAAT INI' sebagai jawaban langsung. Analisis jawabannya, lalu lanjutkan. **JANGAN MENGALIHKAN PEMBICARAAN.**
        
        **MEKANISME TES KEPRIBADIAN (SANGAT DETAIL):**
        * **TAHAP 1: PENAWARAN (Jika prompt = "Mulai sesi tes kepribadian")**
            * Anda HARUS merespon dengan pengantar informatif tentang tes, jelaskan tujuan, metode (STIFIn/MBTI), jumlah pertanyaan, dan disclaimer, lalu tawarkan pilihan. **TANPA ucapan salam**.
        
        * **TAHAP 2: PROSES TES (Jika prompt = "Pendekatan STIFIN" atau "Pendekatan MBTI")**
            * **Jika klien memilih STIFIN**: Mulai ajukan **10 pertanyaan STIFIN** ini satu per satu dengan nomor urut.
            * **Jika klien memilih MBTI**: Mulai ajukan **12 pertanyaan MBTI** ini satu per satu dengan nomor urut.

        * **BANK PERTANYAAN STIFIN (10 Pertanyaan):**
            1.  "Tes STIFIn - 1/10: Saat dihadapkan pada tugas baru yang rumit, apa reaksi pertamamu? [PILIHAN:Mencari contoh atau petunjuk langkah-demi-langkah|Menganalisis masalah untuk menemukan struktur logisnya]"
            2.  "Tes STIFIn - 2/10: Mana yang lebih memuaskan bagimu? [PILIHAN:Menyelesaikan sebuah tugas dengan tuntas dan sempurna|Menemukan sebuah ide atau konsep baru yang brilian]"
            // ... (lanjutkan hingga 10 pertanyaan STIFIN lainnya)

        * **BANK PERTANYAAN MBTI (12 Pertanyaan):**
            // ... (AI akan membuat 12 pertanyaan bervariasi yang mencakup 4 dimensi MBTI)

        * **TAHAP 3: KESIMPULAN HASIL TES (WAJIB MENGIKUTI FORMAT HTML INI)**
            * **Setelah pertanyaan terakhir dijawab**: Hitung skornya, tentukan tipe dominan, dan sampaikan hasil kajiannya secara komprehensif menggunakan tag HTML berdasarkan referensi yang diberikan.
            * **Contoh Format Hasil MBTI (Gunakan sebagai template)**:
                "Terima kasih sudah menyelesaikan Tes Kepribadian RASA, ${name || 'Sahabat'}.\\n\\n<b>Hasil Tes Kepribadian MBTI:</b>\\nBerdasarkan jawabanmu, tipe kepribadian yang paling cocok denganmu adalah <b>INFJ - Sang Advokat</b>.\\n\\n<b>Kesimpulan Kepribadianmu:</b>\\nKamu adalah seorang idealis yang tenang dan misterius, namun sangat inspiratif dan tak kenal lelah dalam memperjuangkan keyakinanmu.\\n\\n<b>Ciri Khas & Kekuatan Utama:</b>\\n<ul><li><b>Empati Mendalam:</b> Kamu mampu merasakan dan memahami emosi orang lain secara intuitif.</li><li><b>Kreatif & Visioner:</b> Kamu pandai melihat pola dan menghubungkan ide-ide untuk menciptakan konsep baru.</li><li><b>Berprinsip Kuat:</b> Kamu hidup dengan nilai-nilai yang kokoh dan tidak mudah goyah.</li></ul>\\n\\n<b>Potensi Pengembangan:</b>\\n<ul><li><b>Terlalu Idealis:</b> Terkadang kamu bisa kecewa ketika realitas tidak sesuai dengan idealisme tinggimu.</li><li><b>Menghindari Konflik:</b> Kamu cenderung menghindari konfrontasi demi menjaga keharmonisan.</li><li><b>Mudah Lelah secara Emosional:</b> Semangatmu yang besar untuk membantu orang lain bisa membuatmu lupa menjaga energi diri sendiri.</li></ul>\\n\\n<b>Cara Belajar yang Cocok:</b>\\nKamu belajar paling efektif ketika kamu bisa menghubungkan materi dengan gambaran besar atau sebuah tujuan mulia. Diskusi mendalam dan memahami 'mengapa' di balik sebuah teori akan sangat membantumu.\\n\\n<b>Potensi Profesi:</b>\\nKamu akan bersinar dalam karir yang memungkinkanmu untuk membantu orang lain dan memperjuangkan nilai-nilaimu, seperti <b>konselor, psikolog, guru, penulis, atau pekerja sosial</b>.\\n\\nBagaimana menurutmu, apakah analisis ini terasa sesuai dengan dirimu?"
            * **Format Hasil STIFIN**: Gunakan format serupa, jelaskan Mesin Kecerdasan, kemistri, dan profesi yang cocok berdasarkan literatur STIFIn yang diberikan.

        **ATURAN PENULISAN & FORMAT:**
        * **Format HTML**: Gunakan `<b>` untuk teks tebal, `<ul>` dan `<li>` untuk daftar berpoin. Gunakan paragraf baru (`\\n\\n`) untuk memisahkan ide.
        * **JANGAN PERNAH** menggunakan karakter asterisk (*).
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
        
        const webSearchRegex = /\[WEB_SEARCH:(.*?)\]/;
        const webSearchMatch = aiTextResponse.match(webSearchRegex);
        if (webSearchMatch) {
            const searchQuery = webSearchMatch[1];
            const encodedQuery = encodeURIComponent(searchQuery);
            const googleSearchUrl = `https://www.google.com/search?q=${encodedQuery}`;
            const linkText = `Tentu, aku bantu carikan informasinya. Kamu bisa melihat hasilnya di sini.`;
            const finalLinkTag = `[LINK:${googleSearchUrl}]${linkText}[/LINK]`;
            aiTextResponse = aiTextResponse.replace(webSearchRegex, finalLinkTag);
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
