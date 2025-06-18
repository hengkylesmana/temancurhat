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
    const startOverlay = document.getElementById('start-overlay');
    const startBtn = document.getElementById('start-btn');
    
    // === APPLICATION STATE (Selalu dimulai kosong) ===
    let speechVoices = [];
    let userName = '';
    let userGender = 'Pria';
    let userAge = '';
    let abortController = null;
    let recognition = null;
    let isOnboarding = false;
    let isRecording = false;
    let audioContext = null;

    // === INITIALIZATION ===
    loadVoices();
    displayInitialMessage();
    updateButtonVisibility();

    // === EVENT LISTENERS ===
    startBtn.addEventListener('click', initializeApp);

    function initializeApp() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch(e) { console.error("Web Audio API not supported."); }
        }
        startOverlay.classList.add('hidden');
        startOnboardingIfNeeded();
    }
    
    sendBtn.addEventListener('click', handleSendMessage);
    voiceBtn.addEventListener('click', toggleMainRecording);
    endChatBtn.addEventListener('click', handleCancelResponse);
    
    userInput.addEventListener('input', updateButtonVisibility);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // === CORE FUNCTIONS ===

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        if (isRecording) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
        } else if (isTyping) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'flex';
        }
    }

    function saveUserData(name, gender, age) {
        userName = name || userName;
        userGender = gender || userGender;
        userAge = age || userAge;
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
        isOnboarding = true;
        statusDiv.textContent = "Sesi perkenalan...";
        try {
            const nameAnswer = await askAndListen("Assalamualaikum, namaku RASA, teman curhatmu. Boleh kutahu siapa namamu?");
            if (nameAnswer) {
                saveUserData(nameAnswer, null, null);
                await speakAsync(`Terima kasih ${userName}.`, true);
            }
            const genderAnswer = await askAndListen("Boleh konfirmasi, apakah kamu seorang laki-laki atau wanita?");
            if (genderAnswer) {
                parseIntroduction(genderAnswer);
                await speakAsync(`Baik, terima kasih.`, true);
            }
            const ageAnswer = await askAndListen("Kalau usiamu berapa?");
            if (ageAnswer) {
                parseIntroduction(`${ageAnswer} tahun`);
                await speakAsync(`Oke, terima kasih.`, true);
            }
        } catch (error) {
            console.log("Onboarding diabaikan:", error);
        } finally {
            isOnboarding = false;
            statusDiv.textContent = "";
            playPersonalGreeting(true);
        }
    }

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        displayMessage("Ceritakan apa yang Kamu rasakan..", 'ai');
    }

    async function handleSendMessage() {
        if (isRecording || isOnboarding) return;
        const userText = userInput.value.trim();
        if (!userText) return;
        const isIntro = parseIntroduction(userText);
        displayMessage(userText, 'user');
        userInput.value = '';
        updateButtonVisibility();
        if (isIntro) {
            playPersonalGreeting();
        } else {
            await getAIResponse(userText, userName, userGender, userAge);
        }
    }

    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        if (recognition) recognition.abort();
        isRecording = false;
        voiceBtn.classList.remove('recording');
        updateButtonVisibility();
        statusDiv.textContent = "Proses dibatalkan.";
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    function toggleMainRecording() {
        if (isOnboarding) return;
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
        updateButtonVisibility();
        
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
        updateButtonVisibility();
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
                displayMessage(rawText, 'ai');
                const textToSpeak = rawText.replace(/\[LINK:.*?\](.*?)\[\/LINK\]/g, "$1");
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
            voiceBtn.style.display = 'none';
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
            const onSpeechEnd = () => {
                updateButtonVisibility();
                resolve();
            };
            utterance.onend = onSpeechEnd;
            utterance.onerror = (e) => { console.error("Speech synthesis error:", e); onSpeechEnd(); reject(e); };
            window.speechSynthesis.speak(utterance);
        });
    }
    
    function playPersonalGreeting(isFinalGreeting = false) {
        let greeting = `Assalamualaikum, temanku ${userName || ''}, senang bertemu denganmu.`;
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
        await speakAsync(question, true);
        try {
            return await listenOnce();
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
        const stressLevelSpan = document.getElementById('stress-level');
        const stressBar = document.getElementById('stress-bar');
        if (!stressLevelSpan || !stressBar) return;
        
        stressLevelSpan.textContent = level;
        let widthPercentage = 0;
        let color = '#4caf50'; // Default Hijau

        if (level.toLowerCase().includes('rendah')) {
            widthPercentage = 25;
            color = '#4caf50';
        } else if (level.toLowerCase().includes('sedang')) {
            widthPercentage = 50;
            color = '#ffc107';
        } else if (level.toLowerCase().includes('tinggi')) {
            widthPercentage = 85;
            color = '#f44336';
        }
        stressBar.style.width = `${widthPercentage}%`;
        stressBar.style.backgroundColor = color;
    }
});
