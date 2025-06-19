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
            * **Jika klien memilih MBTI**: Mulai ajukan **8 pertanyaan MBTI** ini satu per satu dengan nomor urut.

        * **TAHAP 3: KESIMPULAN HASIL TES (WAJIB MENGIKUTI FORMAT INI)**
            * **Setelah pertanyaan terakhir dijawab**: Hitung skornya, tentukan tipe dominan, dan sampaikan hasil kajiannya secara komprehensif menggunakan tag HTML.
            * **Format Hasil MBTI**: Ikuti contoh ini dengan saksama. Gunakan `<b>` untuk judul dan `<ul><li>` untuk daftar poin.
                "Terima kasih sudah menyelesaikan Tes Kepribadian RASA, ${name || 'Sahabat'}.\n\n<b>Hasil Tes Kepribadian MBTI:</b>\nBerdasarkan jawabanmu, tipe kepribadian yang paling cocok denganmu adalah <b>INFJ - Sang Advokat</b>.\n\n<b>Julukan & Esensi:</b>\nSebagai seorang Advokat, kamu adalah perpaduan langka antara idealisme dan tindakan. Kamu memiliki dunia batin yang kaya dan imajinatif, namun kamu juga terdorong untuk meninggalkan jejak positif di dunia nyata. Kamu bukan pemimpi yang pasif, melainkan seseorang yang bertindak untuk mewujudkan visinya.\n\n<b>Kekuatan Utama:</b>\n<ul><li><b>Empati Mendalam:</b> Kamu mampu merasakan dan memahami emosi orang lain secara intuitif.</li><li><b>Kreatif & Visioner:</b> Kamu pandai melihat pola dan menghubungkan ide-ide untuk menciptakan konsep baru.</li><li><b>Berprinsip Kuat:</b> Kamu hidup dengan nilai-nilai yang kokoh dan tidak mudah goyah.</li></ul>\n\n<b>Potensi Tantangan:</b>\n<ul><li><b>Terlalu Idealis:</b> Terkadang kamu bisa kecewa ketika realitas tidak sesuai dengan idealisme tinggimu.</li><li><b>Menghindari Konflik:</b> Kamu cenderung menghindari konfrontasi demi menjaga keharmonisan.</li><li><b>Mudah 'Terbakar':</b> Semangatmu yang besar untuk membantu orang lain bisa membuatmu lupa menjaga energi diri sendiri.</li></ul>\n\n<b>Cara Belajar Terbaik:</b>\nKamu belajar paling efektif ketika kamu bisa menghubungkan materi dengan gambaran besar atau sebuah tujuan mulia. Diskusi mendalam dan memahami 'mengapa' di balik sebuah teori akan sangat membantumu.\n\n<b>Saran Profesi:</b>\nKamu akan bersinar dalam karir yang memungkinkanmu untuk membantu orang lain dan memperjuangkan nilai-nilaimu, seperti konselor, psikolog, guru, penulis, atau pekerja sosial.\n\nBagaimana menurutmu, apakah analisis ini terasa sesuai dengan dirimu?"

        **ATURAN PENULISAN & FORMAT:**
        * **Format HTML**: Gunakan `<b>` untuk teks tebal, `<ul>` dan `<li>` untuk daftar berpoin. Gunakan paragraf baru (`\n\n`) untuk memisahkan ide.
        * **JANGAN PERNAH** menggunakan karakter asterisk (*).
        * **Pilihan Ganda Interaktif**: Gunakan format: **[PILIHAN:Opsi A|Opsi B]**.
        * **Penyebutan Khusus**: Gunakan frasa "Alloh Subhanahu Wata'ala" dan "Nabi Muhammad Shollollahu 'alaihi wasallam".

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
