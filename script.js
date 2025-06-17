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
    
    // Welcome Board Elements
    const welcomeBoardModal = document.getElementById('welcome-board-modal');
    const welcomeBoardCloseBtn = document.getElementById('welcome-board-close-btn');
    const welcomeVoiceBtn = document.getElementById('welcome-voice-btn');
    const nameModalInput = document.getElementById('name-modal');
    const genderModalInput = document.getElementById('gender-modal');
    const ageModalInput = document.getElementById('age-modal');

    // === APPLICATION STATE ===
    let speechVoices = [];
    let userName = '';
    let userGender = 'Pria';
    let userAge = '';
    let abortController = null;

    // === INITIALIZATION ===
    loadVoices();
    loadUserData();
    checkFirstVisit();
    displayInitialMessage();

    // === EVENT LISTENERS ===
    sendBtn.addEventListener('click', handleSendMessage);
    voiceBtn.addEventListener('click', handleVoiceInput);
    welcomeVoiceBtn.addEventListener('click', handleWelcomeVoiceInput);
    endChatBtn.addEventListener('click', handleCancelResponse);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    welcomeBoardCloseBtn.addEventListener('click', () => {
        saveUserDataFromWelcomeBoard();
        welcomeBoardModal.classList.remove('visible');
    });
    
    welcomeBoardModal.addEventListener('click', (e) => { 
        if (e.target === welcomeBoardModal) {
            saveUserDataFromWelcomeBoard();
            welcomeBoardModal.classList.remove('visible'); 
        }
    });

    // === CORE FUNCTIONS ===

    function saveUserData(name, gender, age) {
        userName = name || userName;
        userGender = gender || userGender;
        userAge = age || userAge;

        localStorage.setItem('rasa_userName', userName);
        localStorage.setItem('rasa_userGender', userGender);
        localStorage.setItem('rasa_userAge', userAge);
        
        nameModalInput.value = userName;
        genderModalInput.value = userGender;
        ageModalInput.value = userAge;
    }

    function saveUserDataFromWelcomeBoard() {
        saveUserData(
            nameModalInput.value.trim(),
            genderModalInput.value,
            ageModalInput.value
        );
    }

    function loadUserData() {
        userName = localStorage.getItem('rasa_userName') || '';
        userGender = localStorage.getItem('rasa_userGender') || 'Pria';
        userAge = localStorage.getItem('rasa_userAge') || '';
        saveUserData(userName, userGender, userAge);
    }
    
    function parseIntroduction(text) {
        const nameRegex = /namaku\s+([a-zA-Z\s]+)/i;
        const genderRegex = /(laki-laki|wanita|pria)/i;
        const ageRegex = /(\d+)\s+tahun/i;

        let nameMatch = text.match(nameRegex);
        let genderMatch = text.match(genderRegex);
        let ageMatch = text.match(ageRegex);
        
        let newName = nameMatch ? nameMatch[1].trim().replace(/,/g, '') : null;
        let newGender = genderMatch ? (genderMatch[1].toLowerCase() === 'pria' ? 'Pria' : 'Wanita') : null;
        let newAge = ageMatch ? ageMatch[1] : null;

        if (newName || newGender || newAge) {
            saveUserData(newName, newGender, newAge);
            statusDiv.textContent = "Informasi perkenalanmu telah disimpan.";
            setTimeout(() => statusDiv.textContent = "", 3000);
        }
    }

    function checkFirstVisit() {
        const hasVisited = localStorage.getItem('hasVisitedRASA_v7'); // Versi baru
        if (!hasVisited) {
            welcomeBoardModal.classList.add('visible');
            playInitialGreeting(); 
            localStorage.setItem('hasVisitedRASA_v7', 'true');
        }
    }

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        displayMessage("Ceritakan apa yang Kamu rasakan..", 'ai');
    }

    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText) return;
        
        parseIntroduction(userText);
        
        displayMessage(userText, 'user');
        userInput.value = '';
        await getAIResponse(userText, userName, userGender, userAge);
    }

    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        statusDiv.textContent = "Proses respon dibatalkan.";
        setTimeout(() => { if (statusDiv.textContent === "Proses respon dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    function handleWelcomeVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        
        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            parseIntroduction(speechResult);
            welcomeBoardModal.classList.remove('visible');
        };

        recognition.onerror = (event) => console.error(`Error pengenalan suara: ${event.error}`);
        recognition.start();
    }

    function handleVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        
        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
        };

        recognition.onerror = (event) => console.error(`Error pengenalan suara: ${event.error}`);
        recognition.start();
    }

    async function getAIResponse(prompt, name, gender, age) {
        abortController = new AbortController();
        statusDiv.textContent = "RASA sedang berpikir...";
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, name, gender, age }),
                signal: abortController.signal
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
                speak(textToSpeak, true);
            } else {
                throw new Error("Respon dari server tidak valid.");
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                displayMessage(`Maaf, terjadi gangguan: ${error.message}`, 'ai');
            }
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
        
        utterance.lang = 'id-ID';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        if (isAIResponse) {
            let indonesianVoices = speechVoices.filter(voice => voice.lang === 'id-ID');
            let maleVoice = indonesianVoices.find(voice => 
                voice.name.toLowerCase().includes('male') || 
                voice.name.toLowerCase().includes('pria') ||
                voice.name.includes('Rizwan') || 
                voice.name.includes('Ardi') ||   
                voice.name.includes('Google')
            );
            if (maleVoice) {
                utterance.voice = maleVoice;
                utterance.pitch = 0.8;
                utterance.rate = 0.85;
            } else if (indonesianVoices.length > 0) {
                utterance.voice = indonesianVoices[0];
            }
        }
        window.speechSynthesis.speak(utterance);
    }
    
    function playInitialGreeting() {
        const greeting = "Namaku RASA, teman curhatmu. Ceritakan yang kamu rasakan. Ini rahasia kita berdua.";
        setTimeout(() => speak(greeting), 500);
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
