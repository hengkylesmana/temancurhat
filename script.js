document.addEventListener('DOMContentLoaded', () => {
    // ... (kode dari awal hingga sebelum fungsi speakAsync tetap sama) ...

    function loadVoices() {
        if (!('speechSynthesis' in window)) return;
        speechVoices = window.speechSynthesis.getVoices();
        if (speechVoices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => { speechVoices = window.speechSynthesis.getVoices(); };
        }
    }
    
    // --- FUNGSI SPEAK ASYNC DIPERBARUI ---
    function speakAsync(text, isAIResponse = false) {
        return new Promise((resolve, reject) => {
            if (!('speechSynthesis' in window)) { reject("Not supported"); return; }
            
            // Membersihkan semua tag HTML dari teks sebelum diucapkan
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            const cleanedText = tempDiv.textContent || tempDiv.innerText || "";

            voiceBtn.style.display = 'none';
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
            const onSpeechEnd = () => {
                updateButtonVisibility();
                resolve();
            };
            utterance.onend = onSpeechEnd;
            utterance.onerror = (e) => {
                console.error("Speech synthesis error:", e);
                onSpeechEnd();
                reject(e);
            };
            window.speechSynthesis.speak(utterance);
        });
    }
    
    // ... (sisa kode setelah speakAsync tetap sama) ...
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
        conversationHistory.push({ role: sender === 'ai' ? 'RASA' : 'User', text: message });
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', `${sender}-message`);
        if (sender === 'user') {
            messageContainer.textContent = message;
        } else {
            let processedHTML = message.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
            const choiceRegex = /\[PILIHAN:(.*?)\]/g;
            processedHTML = processedHTML.replace(choiceRegex, (match, optionsString) => {
                const options = optionsString.split('|');
                let buttonsHTML = '<div class="choice-container">';
                options.forEach(option => {
                    const trimmedOption = option.trim();
                    buttonsHTML += `<button class="choice-button" data-choice="${trimmedOption}">${trimmedOption}</button>`;
                });
                buttonsHTML += '</div>';
                return buttonsHTML;
            });
            const linkRegex = /\[LINK:(.*?)\](.*?)\[\/LINK\]/g;
            processedHTML = processedHTML.replace(linkRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$2</a>');
            messageContainer.innerHTML = processedHTML;
            messageContainer.querySelectorAll('.choice-button').forEach(button => {
                button.addEventListener('click', () => {
                    const choiceText = button.dataset.choice;
                    button.parentElement.querySelectorAll('.choice-button').forEach(btn => {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                    });
                    button.classList.add('selected');
                    handleSendMessageWithChoice(choiceText);
                });
            });
        }
        chatContainer.appendChild(messageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
});
