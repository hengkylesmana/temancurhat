document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENT SELECTION ===
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const genderSelect = document.getElementById('gender');
    const ageInput = document.getElementById('age');
    const statusDiv = document.getElementById('status');
    const stressLevelSpan = document.getElementById('stress-level');
    const stressBar = document.getElementById('stress-bar');

    // === EVENT LISTENERS ===
    sendBtn.addEventListener('click', handleSendMessage);
    voiceBtn.addEventListener('click', handleVoiceInput);
    endChatBtn.addEventListener('click', handleEndChat);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // === CORE FUNCTIONS ===

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        const welcomeMessage = "Assalamualaikum, selamat datang di Ruang Asuh Sadar Asa. Silakan ceritakan apa yang sedang Anda rasakan.";
        displayMessage(welcomeMessage, 'ai');
    }

    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText) return;
        
        const userAge = ageInput.value || 'tidak disebutkan';
        const userGender = genderSelect.value || 'tidak disebutkan';

        displayMessage(userText, 'user');
        userInput.value = '';
        await getAIResponse(userText, userGender, age);
    }

    function handleEndChat() {
        window.speechSynthesis.cancel();
        displayInitialMessage();
        statusDiv.textContent = "Sesi telah diakhiri.";
        setTimeout(() => statusDiv.textContent = "", 3000);
    }
    
    function handleVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
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
        };
        recognition.onspeechend = () => {
            recognition.stop();
            voiceBtn.style.backgroundColor = '#00695c';
            statusDiv.textContent = "Transkrip berhasil. Klik kirim.";
        };
        recognition.onerror = (event) => {
            statusDiv.textContent = `Error pengenalan suara: ${event.error}`;
            voiceBtn.style.backgroundColor = '#00695c';
        };
        recognition.start();
    }

    async function getAIResponse(prompt, gender, age) {
        const backendApiUrl = '/api/chat';
        statusDiv.textContent = "RASA sedang berpikir...";
        
        const payload = { prompt, gender, age };

        try {
            const response = await fetch(backendApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ error: `Server merespon dengan status ${response.status}` }));
                throw new Error(errorBody.error || 'Failed to fetch');
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                let rawText = result.candidates[0].content.parts[0].text;
                
                // Analisis stres level (tidak ditampilkan di chat)
                const stressRegex = /\[ANALISIS_STRES:(Rendah|Sedang|Tinggi)\]/;
                const stressMatch = rawText.match(stressRegex);
                if (stressMatch) {
                    updateStressAnalysis(stressMatch[1]);
                    rawText = rawText.replace(stressRegex, "").trim(); // Hapus dari teks utama
                }

                // Tampilkan pesan dengan semua elemennya
                displayMessage(rawText, 'ai');
                
                // Ucapkan hanya bagian teks utama
                const textToSpeak = rawText.replace(/\[GAMBAR:.*?\]/g, "").replace(/\[LINK:.*?\]/g, "");
                speak(textToSpeak); 
            } else {
                throw new Error("Respon dari server tidak valid atau kosong.");
            }
        } catch (error) {
            displayMessage("Maaf, terjadi gangguan saat menyambungkan ke layanan kami. Silakan coba lagi nanti.", 'ai');
        } finally {
            statusDiv.textContent = "";
        }
    }

    function speak(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }

    function displayMessage(message, sender) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', `${sender}-message`);

        if (sender === 'user') {
            messageContainer.textContent = message;
        } else {
            // --- LOGIKA BARU UNTUK MEMPROSES JAWABAN AI ---
            let processedMessage = message;

            // 1. Cari dan proses tag GAMBAR
            const imageRegex = /\[GAMBAR:(.*?)\]/;
            const imageMatch = processedMessage.match(imageRegex);
            if (imageMatch) {
                const imageUrl = imageMatch[1];
                const imageElement = document.createElement('img');
                imageElement.src = imageUrl;
                imageElement.alt = "Gambar Motivasi";
                imageElement.classList.add('chat-image');
                messageContainer.appendChild(imageElement);
                processedMessage = processedMessage.replace(imageRegex, "").trim();
            }

            // 2. Buat elemen untuk teks utama
            const textElement = document.createElement('p');
            textElement.textContent = processedMessage;
            messageContainer.appendChild(textElement);

            // 3. Cari dan proses tag LINK (tidak digunakan lagi, tapi jaga-jaga)
            const linkRegex = /\[LINK:(.*?)\]/;
            const linkMatch = processedMessage.match(linkRegex);
            if (linkMatch) {
                // Logika untuk link bisa ditambahkan di sini jika perlu
            }
        }

        chatContainer.appendChild(messageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function updateStressAnalysis(level) {
        stressLevelSpan.textContent = level;
        let width = '0%', color = '#4caf50';
        switch(level.toLowerCase()) {
            case 'rendah': width = '33%'; color = '#4caf50'; break;
            case 'sedang': width = '66%'; color = '#ffc107'; break;
            case 'tinggi': width = '100%'; color = '#f44336'; break;
        }
        stressBar.style.width = width;
        stressBar.style.backgroundColor = color;
    }

    displayInitialMessage(); // Memulai sesi
});
