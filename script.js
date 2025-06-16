document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENT SELECTION ===
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    const stressLevelSpan = document.getElementById('stress-level');
    const stressBar = document.getElementById('stress-bar');
    
    // Modal Elements
    const userInfoBtn = document.getElementById('user-info-btn');
    const userInfoModal = document.getElementById('user-info-modal');
    const saveUserInfoBtn = document.getElementById('save-user-info-btn');
    const genderModalInput = document.getElementById('gender-modal');
    const ageModalInput = document.getElementById('age-modal');
    
    const alertModal = document.getElementById('alert-modal');
    const alertModalTitle = document.getElementById('alert-modal-title');
    const alertModalMessage = document.getElementById('alert-modal-message');
    const alertModalCloseBtn = document.getElementById('alert-modal-close-btn');

    // === APPLICATION STATE ===
    let speechVoices = [];
    let userGender = 'Pria';
    let userAge = '';

    // === INITIALIZATION ===
    loadVoices();
    displayInitialMessage();
    playInitialGreeting();

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
    
    // Modal Listeners
    userInfoBtn.addEventListener('click', () => { userInfoModal.style.display = 'flex'; });
    saveUserInfoBtn.addEventListener('click', () => {
        userGender = genderModalInput.value;
        userAge = ageModalInput.value;
        userInfoModal.style.display = 'none';
    });
    alertModalCloseBtn.addEventListener('click', () => { alertModal.style.display = 'none'; });

    // === CORE FUNCTIONS ===

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        displayMessage("Ceritakan apa yang Kamu rasakan..", 'ai');
    }

    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText) return;
        displayMessage(userText, 'user');
        userInput.value = '';
        await getAIResponse(userText, userGender, userAge);
    }

    function handleEndChat() {
        window.speechSynthesis.cancel();
        displayInitialMessage();
        statusDiv.textContent = "Sesi telah diakhiri.";
        setTimeout(() => statusDiv.textContent = "", 3000);
    }
    
    function showAlert(title, message) {
        alertModalTitle.textContent = title;
        alertModalMessage.textContent = message;
        alertModal.style.display = 'flex';
    }

    function handleVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showAlert("Fitur Tidak Didukung", "Maaf, browser Anda tidak mendukung fitur pengenalan suara.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => statusDiv.textContent = "RASA sedang mendengarkan...";
        recognition.onresult = (event) => userInput.value = event.results[0][0].transcript;
        recognition.onspeechend = () => {
            recognition.stop();
            statusDiv.textContent = "";
        };
        recognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                showAlert("Mikrofon Diblokir", "Untuk Mulai Bicara, pastikan setelan browser penggunaan Microphone di-izinkan/tidak diblokir.");
            }
            statusDiv.textContent = "";
        };
        recognition.start();
    }

    async function getAIResponse(prompt, gender, age) {
        statusDiv.textContent = "RASA sedang berpikir...";
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, gender, age })
            });
            if (!response.ok) throw new Error(`Server merespon dengan status ${response.status}`);
            
            const result = await response.json();
            if (result.aiText) {
                let rawText = result.aiText;
                
                const stressRegex = /\[ANALISIS_STRES:(.*?)\]/;
                const stressMatch = rawText.match(stressRegex);
                if (stressMatch) {
                    updateStressAnalysis(stressMatch[1]);
                    rawText = rawText.replace(stressRegex, "").trim();
                }

                displayMessage(rawText, 'ai', result.imageBase64);
                
                const textToSpeak = rawText.replace(/\[LINK:.*?\](.*?)\[\/LINK\]/g, "$1");
                speak(textToSpeak, true); // true menandakan ini adalah respon AI
            } else {
                throw new Error("Respon dari server tidak valid.");
            }
        } catch (error) {
            displayMessage(`Maaf, terjadi gangguan: ${error.message}`, 'ai');
        } finally {
            statusDiv.textContent = "";
        }
    }

    function loadVoices() {
        speechVoices = window.speechSynthesis.getVoices();
        if (speechVoices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                speechVoices = window.speechSynthesis.getVoices();
            };
        }
    }

    function speak(text, isAIResponse = false) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Cari suara pria Indonesia
        const maleIndonesianVoice = speechVoices.find(voice => voice.lang === 'id-ID' && voice.name.includes('Google')); // 'Google' seringkali suara pria
        
        if (isAIResponse && maleIndonesianVoice) {
            utterance.voice = maleIndonesianVoice;
            utterance.pitch = 0.8; // Suara lebih dalam
            utterance.rate = 0.85; // Bicara lebih lambat
        } else {
            // Suara default untuk sapaan awal
            utterance.lang = 'id-ID';
            utterance.rate = 0.95;
        }

        window.speechSynthesis.speak(utterance);
    }
    
    function playInitialGreeting() {
        const greeting = "Namaku RASA, teman curhatmu. Ceritakan yang kamu rasakan. Ini rahasia kita berdua. Tekan tombol 'Mulai Bicara' atau kamu bisa tulis disini.";
        // Memberi jeda agar suara sempat di-load
        setTimeout(() => speak(greeting), 1000);
    }

    function displayMessage(message, sender, imageBase64 = null) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', `${sender}-message`);

        if (sender === 'user') {
            messageContainer.textContent = message;
        } else {
            const textElement = document.createElement('div');
            const linkRegex = /\[LINK:(.*?)\](.*?)\[\/LINK\]/g;
            const processedHTML = message.replace(linkRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$2</a>');
            textElement.innerHTML = processedHTML;
            messageContainer.appendChild(textElement);

            if (imageBase64) {
                const imageElement = document.createElement('img');
                imageElement.src = `data:image/png;base64,${imageBase64}`;
                imageElement.alt = "Ilustrasi AI";
                imageElement.classList.add('chat-image');
                messageContainer.appendChild(imageElement);
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
});
