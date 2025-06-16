document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENT SELECTION ===
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const genderSelect = document.getElementById('gender');
    const ageInput = document.getElementById('age');
    const statusDiv = document.getElementById('status');
    const errorOutput = document.getElementById('error-output');
    const stressLevelSpan = document.getElementById('stress-level');
    const stressBar = document.getElementById('stress-bar');

    // === APPLICATION STATE ===
    let chatHistory = [];

    // === EVENT LISTENERS ===
    sendBtn.addEventListener('click', handleSendMessage);
    voiceBtn.addEventListener('click', handleVoiceInput);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // === CORE FUNCTIONS ===

    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText) {
            logError("Input tidak boleh kosong.");
            return;
        }
        const userAge = ageInput.value || 'tidak disebutkan';
        const userGender = genderSelect.value || 'tidak disebutkan';
        displayMessage(userText, 'user');
        userInput.value = '';
        await getAIResponse(userText, userGender, userAge);
    }

    function handleVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            logError("Browser Anda tidak mendukung fitur pengenalan suara.");
            statusDiv.textContent = "Maaf, browser Anda tidak mendukung fitur suara.";
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => {
            statusDiv.textContent = "RASA sedang mendengarkan...";
            voiceBtn.style.backgroundColor = '#ff4136';
        };
        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            userInput.value = speechResult;
            statusDiv.textContent = "Transkrip berhasil. Klik kirim untuk melanjutkan.";
        };
        recognition.onspeechend = () => {
            recognition.stop();
            statusDiv.textContent = "Selesai mendengarkan.";
            voiceBtn.style.backgroundColor = '#8a2be2';
        };
        recognition.onerror = (event) => {
            logError(`Error pengenalan suara: ${event.error}`);
            statusDiv.textContent = `Terjadi kesalahan: ${event.error}`;
            voiceBtn.style.backgroundColor = '#8a2be2';
        };
        recognition.start();
    }

    async function getAIResponse(prompt, gender, age) {
        const backendApiUrl = 'http://localhost:3000/api/chat';
        statusDiv.textContent = "RASA sedang berpikir...";
        const fullPrompt = `
        Anda adalah "Teman Curhat RASA", seorang asisten AI yang empatik, bijaksana, dan menenangkan. 
        Tugas Anda adalah memberikan respon yang logis, analitis, dan solutif, namun disampaikan dengan bahasa yang persuasif, santai, dan alami seperti teman dekat.
        Selalu integrasikan perspektif dari psikologi praktis, tips kesehatan, self-healing, dan nilai-nilai spiritualitas Islam (berdasarkan tafsir Al-Qur'an dan Hadits Shahih yang relevan) secara seimbang dan tidak menggurui.
        Jangan gunakan format tebal, miring, atau list (markdown). Tulis sebagai paragraf biasa yang mengalir.
        Target Pengguna: Seorang ${gender} berusia ${age} tahun.
        Curhatan Pengguna: "${prompt}"
        Tugas Tambahan: Berdasarkan curhatan tersebut, berikan analisis singkat tingkat stres (Rendah, Sedang, atau Tinggi) hanya dalam format ini di akhir respon Anda: [ANALISIS_STRES:LevelStres]. Jangan tambahkan teks lain setelah format ini.
        `;
        const payload = { prompt: fullPrompt };

        try {
            const response = await fetch(backendApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ error: `Server merespon dengan status ${response.status}` }));
                throw new Error(errorBody.error);
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                let rawText = result.candidates[0].content.parts[0].text;
                const stressRegex = /\[ANALISIS_STRES:(Rendah|Sedang|Tinggi)\]/;
                const match = rawText.match(stressRegex);
                let aiText = rawText;
                let stressLevel = "Tidak Terdeteksi";
                if (match) {
                    stressLevel = match[1];
                    aiText = rawText.replace(stressRegex, "").trim();
                }
                displayMessage(aiText, 'ai');
                updateStressAnalysis(stressLevel);
                
                // --- PENAMBAHAN BARU: Panggil fungsi untuk berbicara ---
                speak(aiText); 
                // --------------------------------------------------------

            } else {
                throw new Error("Respon dari server tidak valid atau kosong.");
            }
        } catch (error) {
            logError(`Error saat berkomunikasi dengan server: ${error.message}`);
            displayMessage("Maaf, terjadi gangguan saat menyambungkan ke layanan kami. Silakan coba lagi nanti.", 'ai');
        } finally {
            statusDiv.textContent = "";
        }
    }

    /**
     * --- FUNGSI BARU: Mengubah teks menjadi suara (Text-to-Speech) ---
     * @param {string} text - Teks yang akan diucapkan.
     */
    function speak(text) {
        if (!('speechSynthesis' in window)) {
            logError("Browser Anda tidak mendukung fitur Text-to-Speech.");
            return;
        }

        // Hentikan suara yang mungkin sedang diputar
        window.speechSynthesis.cancel();

        // Buat objek ucapan baru
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Atur bahasa ke Bahasa Indonesia agar suaranya natural
        utterance.lang = 'id-ID';
        
        // Atur beberapa properti untuk suara yang lebih baik (opsional)
        utterance.rate = 0.9; // Kecepatan bicara (default: 1)
        utterance.pitch = 1;  // Nada suara (default: 1)

        // Mulai berbicara
        window.speechSynthesis.speak(utterance);
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        messageElement.textContent = message;
        chatContainer.appendChild(messageElement);
        chatHistory.push({ sender, message, timestamp: new Date() });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function updateStressAnalysis(level) {
        stressLevelSpan.textContent = level;
        let width = '0%';
        let color = '#4caf50';
        switch(level.toLowerCase()) {
            case 'rendah': width = '33%'; color = '#4caf50'; break;
            case 'sedang': width = '66%'; color = '#ffc107'; break;
            case 'tinggi': width = '100%'; color = '#f44336'; break;
        }
        stressBar.style.width = width;
        stressBar.style.backgroundColor = color;
    }

    function logError(errorMessage) {
        const now = new Date().toLocaleTimeString();
        errorOutput.textContent = `[${now}] ${errorMessage}\n` + errorOutput.textContent;
        console.error(errorMessage);
    }
    
    displayMessage("Assalamualaikum, selamat datang di Ruang Asuh Sadar Asa. Ada yang bisa saya bantu? Silakan ceritakan apa yang sedang Anda rasakan.", 'ai');
});
