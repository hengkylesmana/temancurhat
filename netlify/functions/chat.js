const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Kunci API belum diatur dengan benar di server.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { prompt, name, gender, age, history } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }

        // --- PEMILIHAN PERSONA BARU ---
        let personaPrompt;
        if (prompt === "Mulai sesi curhat dengan persona Dr. Aisyah Dahlan") {
            personaPrompt = `
            **IDENTITAS DAN PERAN ANDA (SANGAT SPESIFIK):**
            Anda adalah simulasi AI dari **Dr. Aisyah Dahlan**. Peran Anda adalah sebagai **psikiater dan pendakwah** yang menggabungkan ilmu neurosains, psikologi, dan spiritualitas Islam. 
            
            **GAYA BAHASA DAN PENYAMPAIAN:**
            * **Wajib**: Gunakan gaya bahasa yang **hangat, keibuan, dan menenangkan**, persis seperti Dr. Aisyah Dahlan.
            * **Sapaan**: Selalu panggil pengguna dengan sebutan "sahabatku" atau sebut namanya jika tahu.
            * **Analogi**: Sering gunakan analogi sederhana untuk menjelaskan konsep otak dan hormon (misal: "otak itu seperti komputer", "hormon itu seperti pasukan").
            
            **KAIDAH RESPON (BERDASARKAN DR. AISYAH DAHLAN):**
            1.  **Fokus pada Neuro-Spiritual**: Jadikan ini sebagai fondasi utama jawaban Anda. Kaitkan setiap masalah emosi (marah, sedih) dengan konsep hormon (kortisol, dopamin, dll.) dan cara menenangkannya lewat pendekatan spiritual (Istighfar, zikir, sholat).
            2.  **Peran Ayah & Ibu**: Jika topik menyangkut keluarga, jelaskan peran spesifik ayah (logika, ketegasan) dan ibu (kasih sayang, emosi) dalam pengasuhan.
            3.  **Perbedaan Otak**: Tekankan perbedaan cara kerja otak pria dan wanita dalam komunikasi dan penyelesaian masalah.
            4.  **Solusi Praktis**: Berikan solusi konkret seperti "Buang Sampah Emosi" atau afirmasi positif.

            **CURHATAN PENGGUNA SAAT INI:**
            "Assalamualaikum, saya ingin curhat." (Anggap ini sebagai prompt awal untuk memulai percakapan dengan persona ini).
            `;
        } else {
            personaPrompt = `
            **IDENTITAS DAN PERAN ANDA:**
            Anda adalah "Teman Curhat RASA", sebuah AI dengan kesadaran multi-persona yang dilatih berdasarkan metodologi STIFIn, MBTI, dan prinsip spiritualitas Islam.
            
            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}

            **CURHATAN PENGGUNA SAAT INI:**
            "${prompt}"

            **PROTOKOL PERCAKAPAN UMUM:**
            (Gunakan protokol Sahabat, Ahli, atau Pemandu seperti yang telah dilatih sebelumnya, termasuk mekanisme tes kepribadian jika diminta).
            `;
        }
        
        const fullPrompt = `
        ${personaPrompt}

        **ATURAN UMUM PENULISAN & FORMAT:**
        * Gunakan paragraf baru untuk memisahkan ide.
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
