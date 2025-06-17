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
    let isOnboarding = false;

    // === INITIALIZATION ===
    loadVoices();
    welcomeBoardModal.classList.add('visible'); 
    playInitialGreeting();
    displayInitialMessage();

    // === EVENT LISTENERS ===
    sendBtn.addEventListener('click', handleSendMessage);
    endChatBtn.addEventListener('click', handleCancelResponse);

    // Press and Hold Voice Logic
    voiceBtn.addEventListener('mousedown', () => toggleRecording(true));
    voiceBtn.addEventListener('mouseup', () => toggleRecording(false));
    voiceBtn.addEventListener('mouseleave', () => toggleRecording(false)); // Jika mouse keluar area tombol
    voiceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); toggleRecording(true); });
    voiceBtn.addEventListener('touchend', (e) => { e.preventDefault(); toggleRecording(false); });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    welcomeBoardCloseBtn.addEventListener('click', () => {
        saveUserDataFromWelcomeBoard();
        welcomeBoardModal.classList.remove('visible');
        startOnboardingProcess(); 
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
            return true;
        }
        return false;
    }

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        displayMessage("Ceritakan apa yang Kamu rasakan..", 'ai');
    }

    async function handleSendMessage() {
        if (isOnboarding) return;
        const userText = userInput.value.trim();
        if (!userText) return;
        
        const isIntro = parseIntroduction(userText);
        
        displayMessage(userText, 'user');
        userInput.value = '';
        
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
        statusDiv.textContent = "Proses dibatalkan.";
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    // --- ONBOARDING & VOICE LOGIC ---
    async function startOnboardingProcess() {
        if (userName) {
            playPersonalGreeting();
            return;
        }
        isOnboarding = true;
        try {
            const nameAnswer = await askAndListen("Boleh kutahu siapa namamu?");
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
            console.log("Onboarding diabaikan atau error:", error);
        } finally {
            isOnboarding = false;
            playPersonalGreeting(true); // Memaksa sapaan akhir setelah onboarding
        }
    }
    
    function toggleRecording(start) {
        if (isOnboarding) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (start) {
            if (recognition) return;
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
            recognition.onstart = () => {
                statusDiv.textContent = "Mendengarkan...";
                voiceBtn.classList.add('recording');
            };
            recognition.onend = () => {
                statusDiv.textContent = "";
                voiceBtn.classList.remove('recording');
                recognition = null;
                handleSendMessage(); // Otomatis kirim setelah selesai
            };
            recognition.start();
        } else {
            if (recognition) recognition.stop();
        }
    }

    // --- HELPER FUNCTIONS ---
    function speakAsync(text, isAIResponse = false) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) { resolve(); return; }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            utterance.rate = 0.9;
            if (isAIResponse) {
                let maleVoice = speechVoices.find(v => v.lang === 'id-ID' && (v.name.includes('Google') || v.name.includes('Rizwan')));
                if (maleVoice) {
                    utterance.voice = maleVoice;
                    utterance.pitch = 0.8;
                    utterance.rate = 0.85;
                }
            }
            utterance.onend = resolve;
            utterance.onerror = resolve;
            window.speechSynthesis.speak(utterance);
        });
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
            return ""; // Kembalikan string kosong jika pengguna tidak menjawab
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
                let rawText = result.aiText;
                const stressRegex = /\[ANALISIS_STRES:(.*?)\]/;
                const stressMatch = rawText.match(stressRegex);
                if (stressMatch) {
                    updateStressAnalysis(stressMatch[1]);
                    rawText = rawText.replace(stressRegex, "").trim();
                }
                displayMessage(rawText, 'ai', result.imageBase64);
                const textToSpeak = rawText.replace(/\[LINK:.*?\](.*?)\[\/LINK\]/g, "$1");
                speakAsync(textToSpeak, true);
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
    
    function playInitialGreeting() {
        const greeting = "Namaku RASA, teman curhatmu. Ceritakan yang kamu rasakan. Ini rahasia kita berdua.";
        setTimeout(() => speakAsync(greeting), 500);
    }
    
    function playPersonalGreeting(isFinalGreeting = false) {
        let greeting = `Assalamualaikum, temanku ${userName || ''}, senang bertemu denganmu.`;
        if (isFinalGreeting) {
            greeting += " Saya siap mendengarkan. Silakan ceritakan apa yang kamu rasakan."
        }
        setTimeout(() => speakAsync(greeting, true), 500);
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
