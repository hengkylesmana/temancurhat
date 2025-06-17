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
    let recognition = null;
    let isRecording = false; // State untuk toggle tombol suara utama
    let recordingTimeout = null; // Timer untuk mematikan mic otomatis

    // === INITIALIZATION ===
    loadVoices();
    welcomeBoardModal.classList.add('visible'); 
    playInitialGreeting();
    displayInitialMessage();

    // === EVENT LISTENERS ===
    sendBtn.addEventListener('click', handleSendMessage);
    voiceBtn.addEventListener('click', toggleMainRecording); // Event listener baru
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
        playPersonalGreeting(); 
    });
    
    welcomeBoardModal.addEventListener('click', (e) => { 
        if (e.target === welcomeBoardModal) {
            saveUserDataFromWelcomeBoard();
            welcomeBoardModal.classList.remove('visible'); 
            playPersonalGreeting();
        }
    });

    // === CORE FUNCTIONS ===

    function saveUserData(name, gender, age) {
        userName = name || userName;
        userGender = gender || userGender;
        userAge = age || userAge;
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
            return true;
        }
        return false;
    }

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        displayMessage("Ceritakan apa yang Kamu rasakan..", 'ai');
    }

    async function handleSendMessage() {
        const userText = userInput.value.trim();
        if (!userText) return;
        
        const isIntro = parseIntroduction(userText);
        
        displayMessage(userText, 'user');
        userInput.value = '';
        
        if (isIntro && !userName) { // Hanya sapa jika perkenalan berhasil
             playPersonalGreeting();
        } else {
            await getAIResponse(userText, userName, userGender, userAge);
        }
    }

    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        if (recognition) recognition.abort();
        statusDiv.textContent = "Proses dibatalkan.";
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    // --- ONBOARDING & VOICE LOGIC ---
    
    function playSound(type) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (!audioContext) return;
        
        function beep(startTime, freq, duration) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = freq;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
            oscillator.start(startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
            oscillator.stop(startTime + duration);
        }

        const now = audioContext.currentTime;
        if (type === 'start') {
            beep(now, 1000, 0.1); // Single "Tut"
        } else if (type === 'stop') {
            beep(now, 800, 0.08); // First "tut"
            beep(now + 0.12, 800, 0.08); // Second "tut"
        }
    }

    function toggleMainRecording() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (isRecording) {
            // Stop recording
            if (recognition) recognition.stop();
        } else {
            // Start recording
            playSound('start');
            isRecording = true;
            voiceBtn.classList.add('recording');
            
            recognition = new SpeechRecognition();
            recognition.lang = 'id-ID';
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    interimTranscript += event.results[i][0].transcript;
                }
                userInput.value = interimTranscript;
            };

            recognition.onerror = (event) => console.error(`Error: ${event.error}`);
            recognition.onstart = () => statusDiv.textContent = "Mendengarkan...";
            
            recognition.onend = () => {
                playSound('stop');
                isRecording = false;
                statusDiv.textContent = "";
                voiceBtn.classList.remove('recording');
                clearTimeout(recordingTimeout);
                recognition = null;
                if (userInput.value) handleSendMessage(); // Kirim hasil jika ada
            };

            recognition.start();
            recordingTimeout = setTimeout(() => {
                if (recognition) recognition.stop();
            }, 60000); // 60 detik timeout
        }
    }

    function handleWelcomeVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;
        const rec = new SpeechRecognition();
        rec.lang = 'id-ID';
        rec.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            parseIntroduction(speechResult);
            welcomeBoardModal.classList.remove('visible');
            playPersonalGreeting();
        };
        rec.onerror = (event) => console.error(`Error: ${event.error}`);
        rec.start();
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
            } else { throw new Error("Respon tidak valid."); }
        } catch (error) {
            if (error.name !== 'AbortError') displayMessage(`Maaf, terjadi gangguan: ${error.message}`, 'ai');
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
            let maleVoice = speechVoices.find(v => v.lang === 'id-ID' && (v.name.includes('Google') || v.name.includes('Rizwan') || v.name.toLowerCase().includes('male')));
            if (maleVoice) {
                utterance.voice = maleVoice;
                utterance.pitch = 0.8;
                utterance.rate = 0.85;
            }
        }
        window.speechSynthesis.speak(utterance);
    }
    
    function playInitialGreeting() {
        const greeting = "Namaku RASA, teman curhatmu. Ceritakan yang kamu rasakan. Ini rahasia kita berdua.";
        setTimeout(() => speak(greeting), 500);
    }
    
    function playPersonalGreeting() {
        let greeting = `Assalamualaikum, temanku ${userName || ''}, senang bertemu denganmu. Ceritakan apa yang kamu rasakan. Saya siap mendengarkan.`;
        setTimeout(() => speak(greeting, true), 500);
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
