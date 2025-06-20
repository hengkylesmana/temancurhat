document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENT SELECTION ===
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    
    // Welcome Board Elements (jika ada)
    const welcomeBoardModal = document.getElementById('welcome-board-modal');
    const welcomeBoardCloseBtn = document.getElementById('welcome-board-close-btn');
    const nameModalInput = document.getElementById('name-modal');
    const genderModalInput = document.getElementById('gender-modal');
    const ageModalInput = document.getElementById('age-modal');
    
    // Start Overlay Elements
    const startOverlay = document.getElementById('start-overlay');
    const startBtn = document.getElementById('start-btn');

    // === APPLICATION STATE (Selalu dimulai kosong) ===
    let speechVoices = [];
    let userName = '';
    let userGender = 'Pria';
    let userAge = '';
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;

    // === INITIALIZATION ===
    loadVoices();
    displayInitialMessage();

    // === EVENT LISTENERS ===
    
    // Event listener untuk tombol Start di awal
    if(startBtn) {
        startBtn.addEventListener('click', initializeApp);
    }

    // Event listener untuk Papan Board (jika ada)
    if(welcomeBoardCloseBtn) {
        welcomeBoardCloseBtn.addEventListener('click', closeWelcomeBoard);
    }
    if(welcomeBoardModal) {
        welcomeBoardModal.addEventListener('click', (e) => { 
            if (e.target === welcomeBoardModal) {
                closeWelcomeBoard();
            }
        });
    }

    sendBtn.addEventListener('click', handleSendMessage);
    voiceBtn.addEventListener('click', toggleMainRecording);
    endChatBtn.addEventListener('click', handleCancelResponse);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // === CORE FUNCTIONS ===

    function initializeApp() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch(e) { console.error("Web Audio API is not supported."); }
        }
        if(startOverlay) {
            startOverlay.classList.add('hidden');
        }
        startOnboardingIfNeeded(); // Memulai perkenalan setelah klik "Mulai"
    }
    
    function closeWelcomeBoard() {
        if(nameModalInput) saveUserData(nameModalInput.value.trim(), genderModalInput.value, ageModalInput.value);
        if(welcomeBoardModal) welcomeBoardModal.classList.remove('visible');
        playPersonalGreeting();
    }

    function saveUserData(name, gender, age) {
        userName = name || "";
        userGender = gender || "Pria";
        userAge = age || "";
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
            return true;
        }
        return false;
    }

    async function startOnboardingIfNeeded() {
        // Alur perkenalan suara otomatis
        await speakAsync("Assalamualaikum, namaku RASA, teman curhatmu.", true);
        const nameAnswer = await askAndListen("Boleh kutahu siapa namamu?");
        if (nameAnswer) {
            saveUserData(nameAnswer, null, null);
            await speakAsync(`Terima kasih ${userName}.`, true);
        }
        // ... (lanjutkan untuk gender dan usia jika perlu)
        playPersonalGreeting(true);
    }
    
    function displayInitialMessage() {
        chatContainer.innerHTML = '';
    }

    async function handleSendMessage() {
        if (isRecording) return;
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
        if (recognition) recognition.abort();
        isRecording = false;
        voiceBtn.classList.remove('recording');
        statusDiv.textContent = "Proses dibatalkan.";
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    function toggleMainRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function startRecording() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition || isRecording) return;
        
        playSound('start');
        isRecording = true;
        voiceBtn.classList.add('recording');
        
        recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
        };
        recognition.onerror = (event) => {
            console.error(`Error: ${event.error}`);
            stopRecording();
        };
        recognition.onstart = () => statusDiv.textContent = "Mendengarkan...";
        recognition.onend = () => {
            if (isRecording) {
                stopRecording();
                handleSendMessage();
            }
        };
        recognition.start();
    }

    function stopRecording() {
        if (!isRecording) return;
        playSound('stop');
        isRecording = false;
        voiceBtn.classList.remove('recording');
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
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
                displayMessage(result.aiText, 'ai');
                const textToSpeak = result.aiText.replace(/<[^>]*>?/gm, '');
                await speakAsync(textToSpeak, true);
            } else { throw new Error("Respon tidak valid."); }
        } catch (error) {
            if (error.name !== 'AbortError') displayMessage(`Maaf, terjadi gangguan: ${error.message}`, 'ai');
        } finally {
            statusDiv.textContent = "";
        }
    }

    function loadVoices() {
        if (!('speechSynthesis' in window)) return;
        speechVoices = window.speechSynthesis.getVoices();
        if (speechVoices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => { speechVoices = window.speechSynthesis.getVoices(); };
        }
    }
    
    function speakAsync(text, isAIResponse = false) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) { reject("Not supported"); return; }
            
            const cleanedText = text.replace(/<[^>]*>?/gm, '');
            const utterance = new SpeechSynthesisUtterance(cleanedText);
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
            utterance.onend = resolve;
            utterance.onerror = (e) => {
                console.error("Speech synthesis error:", e);
                resolve(); // Tetap resolve agar tidak macet
            };
            window.speechSynthesis.speak(utterance);
        });
    }
    
    function playPersonalGreeting(isFinalGreeting = false) {
        let greeting = `Assalamualaikum, temanku ${userName || ''}, senang bertemu denganmu. Saya siap mendengarkan.`;
        if (isFinalGreeting) {
            greeting = `Baik, ${userName || 'temanku'}, terima kasih sudah berkenalan. Sekarang, saya siap mendengarkan. Silakan ceritakan apa yang kamu rasakan.`
        }
        setTimeout(() => speakAsync(greeting, true), 500);
    }
    
    function listenOnce() {
        return new Promise((resolve, reject) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) { reject("Not supported"); return; }
            const rec = new SpeechRecognition();
            rec.lang = 'id-ID';
            rec.onresult = (event) => resolve(event.results[0][0].transcript);
            rec.onerror = (event) => reject(event.error);
            rec.onstart = () => statusDiv.textContent = "Mendengarkan...";
            rec.onend = () => { if (statusDiv.textContent === "Mendengarkan...") statusDiv.textContent = ""; };
            rec.start();
        });
    }
    
    async function askAndListen(question) {
        displayMessage(question, 'ai');
        await speakAsync(question, true);
        try {
            const answer = await listenOnce();
            displayMessage(answer, 'user');
            return answer;
        } catch (e) {
            return "";
        }
    }

    function playSound(type) {
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
        if (type === 'start') { beep(now, 1000, 0.1); } 
        else if (type === 'stop') { beep(now, 800, 0.08); beep(now + 0.12, 800, 0.08); }
    }

    function displayMessage(message, sender) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', `${sender}-message`);
        if (sender === 'user') {
            messageContainer.textContent = message;
        } else {
            messageContainer.innerHTML = message;
        }
        chatContainer.appendChild(messageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
