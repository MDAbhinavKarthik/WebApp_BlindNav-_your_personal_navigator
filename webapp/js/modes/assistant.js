/**
 * BlindNav+ Assistant Mode
 * Voice-first AI assistant for visually impaired users
 * Features: Natural conversation, time/date, alarms, reminders, weather, jokes
 * Supports: English, Kannada, Hindi with auto language detection
 */

class AssistantMode {
    constructor() {
        this.isActive = false;
        this.conversationHistory = [];
        this.lastQuery = '';
        this.currentLanguage = 'en'; // en, kn, hi
        
        // Alarms and Reminders storage
        this.alarms = [];
        this.reminders = [];
        this.alarmCheckInterval = null;
        
        // Speech settings
        this.speechSettings = {
            rate: 0.9, // Slightly slower for clarity
            volume: 1.0,
            voice: null
        };
        
        // Jokes collection
        this.jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "What do you call a fake noodle? An impasta!",
            "Why did the scarecrow win an award? He was outstanding in his field!",
            "What do you call a bear with no teeth? A gummy bear!",
            "Why don't eggs tell jokes? They'd crack each other up!",
            "What did the ocean say to the beach? Nothing, it just waved!",
            "Why did the bicycle fall over? Because it was two-tired!",
            "What do you call a fish without eyes? A fsh!",
            "Why did the math book look so sad? Because it had too many problems!",
            "What do you call a sleeping dinosaur? A dino-snore!"
        ];
        
        // Greetings in multiple languages
        this.greetings = {
            en: {
                morning: "Good morning",
                afternoon: "Good afternoon", 
                evening: "Good evening",
                night: "Good night"
            },
            kn: {
                morning: "ಶುಭೋದಯ", // Shubhodaya
                afternoon: "ಶುಭ ಮಧ್ಯಾಹ್ನ", // Shubha Madhyahna
                evening: "ಶುಭ ಸಂಜೆ", // Shubha Sanje
                night: "ಶುಭ ರಾತ್ರಿ" // Shubha Ratri
            },
            hi: {
                morning: "सुप्रभात", // Suprabhat
                afternoon: "शुभ दोपहर", // Shubh Dopahar
                evening: "शुभ संध्या", // Shubh Sandhya
                night: "शुभ रात्रि" // Shubh Ratri
            }
        };
        
        // Language detection keywords
        this.languageKeywords = {
            kn: ['ಏನು', 'ಹೇಗೆ', 'ಯಾವಾಗ', 'ಎಲ್ಲಿ', 'ನನಗೆ', 'ಸಮಯ', 'ದಿನಾಂಕ', 'ಹವಾಮಾನ', 'ಸಹಾಯ'],
            hi: ['क्या', 'कैसे', 'कब', 'कहाँ', 'मुझे', 'समय', 'तारीख', 'मौसम', 'मदद', 'बताओ']
        };
    }
    
    /**
     * Start assistant mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Assistant mode is already active. How can I help you?');
            return;
        }
        
        this.isActive = true;
        console.log('[Assistant] Mode started');
        
        // Load saved alarms and reminders
        this.loadStoredData();
        
        // Start alarm checking
        this.startAlarmCheck();
        
        // Personalized greeting based on time
        const greeting = this.getPersonalizedGreeting();
        
        speechManager.speak(
            `${greeting}. ` +
            `Assistant mode is now active. I am BlindNav Plus, your personal voice assistant. ` +
            `I can help you with many things. ` +
            `Ask me about the time, date, or weather. ` +
            `I can set alarms and reminders for you. ` +
            `I can tell you jokes to brighten your day. ` +
            `I can check your battery status. ` +
            `Or I can switch to other modes like navigation or object detection. ` +
            `Just speak naturally, and I will assist you. ` +
            `Say "help" to hear all available commands. ` +
            `What would you like to do?`,
            true
        );
        
        this.updateUI(true);
    }
    
    /**
     * Stop assistant mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Stop alarm checking
        if (this.alarmCheckInterval) {
            clearInterval(this.alarmCheckInterval);
            this.alarmCheckInterval = null;
        }
        
        // Save data before exiting
        this.saveStoredData();
        
        const farewell = this.getFarewellMessage();
        speechManager.speak(farewell);
        
        this.updateUI(false);
        
        console.log('[Assistant] Mode stopped');
    }
    
    /**
     * Get personalized greeting based on time and context
     */
    getPersonalizedGreeting() {
        const hour = new Date().getHours();
        const period = this.getTimePeriod(hour);
        const greeting = this.greetings[this.currentLanguage][period];
        
        // Add personalized touch
        const extras = [
            "I hope you're having a wonderful day",
            "It's great to hear from you",
            "I'm here to help you",
            "Let me assist you today"
        ];
        const extra = extras[Math.floor(Math.random() * extras.length)];
        
        return `${greeting}! ${extra}`;
    }
    
    /**
     * Get time period
     */
    getTimePeriod(hour) {
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }
    
    /**
     * Get farewell message
     */
    getFarewellMessage() {
        const hour = new Date().getHours();
        const period = this.getTimePeriod(hour);
        
        const farewells = {
            morning: "Have a productive morning ahead!",
            afternoon: "Enjoy the rest of your afternoon!",
            evening: "Have a pleasant evening!",
            night: "Take care and have a restful night!"
        };
        
        return `Exiting Assistant Mode. ${farewells[period]} I'm always here when you need me.`;
    }
    
    /**
     * Detect language from text
     */
    detectLanguage(text) {
        // Check for Kannada characters
        if (/[\u0C80-\u0CFF]/.test(text)) {
            return 'kn';
        }
        // Check for Hindi/Devanagari characters
        if (/[\u0900-\u097F]/.test(text)) {
            return 'hi';
        }
        // Check for language-specific keywords
        for (const [lang, keywords] of Object.entries(this.languageKeywords)) {
            if (keywords.some(kw => text.includes(kw))) {
                return lang;
            }
        }
        return 'en';
    }
    
    /**
     * Process user query with comprehensive responses
     */
    async processQuery(query) {
        const q = query.toLowerCase().trim();
        this.lastQuery = query;
        
        // Detect language
        const detectedLang = this.detectLanguage(query);
        if (detectedLang !== this.currentLanguage) {
            this.currentLanguage = detectedLang;
            console.log(`[Assistant] Language detected: ${detectedLang}`);
        }
        
        // Add to conversation history
        this.conversationHistory.push({
            type: 'user',
            text: query,
            time: Date.now()
        });
        
        let response = '';
        
        // ===== TIME QUERIES =====
        if (q.includes('time') || q.includes('what time') || q.includes('clock') || 
            q.includes('समय') || q.includes('ಸಮಯ')) {
            response = this.getTimeResponse();
        }
        
        // ===== DATE QUERIES =====
        else if (q.includes('date') || q.includes('today') || q.includes('day is it') ||
                 q.includes('what day') || q.includes('तारीख') || q.includes('ದಿನಾಂಕ')) {
            response = this.getDateResponse();
        }
        
        // ===== PERIOD OF DAY =====
        else if (q.includes('morning') || q.includes('afternoon') || q.includes('evening') || 
                 q.includes('night') || q.includes('what period') || q.includes('part of day')) {
            response = this.getPeriodResponse();
        }
        
        // ===== WEATHER QUERIES =====
        else if (q.includes('weather') || q.includes('temperature') || q.includes('rain') ||
                 q.includes('umbrella') || q.includes('hot') || q.includes('cold') ||
                 q.includes('मौसम') || q.includes('ಹವಾಮಾನ')) {
            response = await this.getWeatherResponse();
        }
        
        // ===== ALARM COMMANDS =====
        else if (q.includes('set alarm') || q.includes('alarm for') || q.includes('wake me')) {
            response = this.handleAlarmCommand(q);
        }
        else if (q.includes('show alarm') || q.includes('my alarm') || q.includes('list alarm')) {
            response = this.showAlarms();
        }
        else if (q.includes('clear alarm') || q.includes('delete alarm') || q.includes('remove alarm') ||
                 q.includes('cancel alarm')) {
            response = this.clearAlarms(q);
        }
        
        // ===== REMINDER COMMANDS =====
        else if (q.includes('remind me') || q.includes('set reminder') || q.includes('reminder for')) {
            response = this.handleReminderCommand(q);
        }
        else if (q.includes('show reminder') || q.includes('my reminder') || q.includes('list reminder')) {
            response = this.showReminders();
        }
        else if (q.includes('clear reminder') || q.includes('delete reminder') || q.includes('remove reminder')) {
            response = this.clearReminders(q);
        }
        
        // ===== BATTERY STATUS =====
        else if (q.includes('battery') || q.includes('charge') || q.includes('power level')) {
            return this.getBatteryStatus();
        }
        
        // ===== JOKES =====
        else if (q.includes('joke') || q.includes('funny') || q.includes('make me laugh') ||
                 q.includes('cheer me up')) {
            response = this.tellJoke();
        }
        
        // ===== SPEECH CONTROL =====
        else if (q.includes('speak slower') || q.includes('slow down') || q.includes('too fast')) {
            response = this.speakSlower();
        }
        else if (q.includes('speak faster') || q.includes('speed up') || q.includes('too slow')) {
            response = this.speakFaster();
        }
        else if (q.includes('stop talking') || q.includes('be quiet') || q.includes('silence') ||
                 q.includes('shut up') || q.includes('stop speaking')) {
            speechManager.stopSpeaking();
            return ''; // Don't speak anything
        }
        else if (q.includes('change voice') || q.includes('different voice')) {
            response = this.changeVoice();
        }
        else if (q.includes('louder') || q.includes('volume up') || q.includes('speak louder')) {
            response = this.adjustVolume(0.2);
        }
        else if (q.includes('quieter') || q.includes('volume down') || q.includes('speak softer')) {
            response = this.adjustVolume(-0.2);
        }
        
        // ===== GREETINGS =====
        else if (q.includes('hello') || q.includes('hi') || q.includes('hey') ||
                 q.includes('नमस्ते') || q.includes('ನಮಸ್ಕಾರ')) {
            response = this.getGreetingResponse();
        }
        
        // ===== HELP =====
        else if (q.includes('help') || q.includes('what can you do') || q.includes('capabilities') ||
                 q.includes('commands') || q.includes('मदद') || q.includes('ಸಹಾಯ')) {
            response = this.getHelpResponse();
        }
        
        // ===== HOW ARE YOU =====
        else if (q.includes('how are you') || q.includes('how do you feel') || q.includes('are you okay')) {
            response = this.getStatusResponse();
        }
        
        // ===== WHO ARE YOU =====
        else if (q.includes('who are you') || q.includes('your name') || q.includes('what are you')) {
            response = this.getIdentityResponse();
        }
        
        // ===== THANK YOU =====
        else if (q.includes('thank') || q.includes('धन्यवाद') || q.includes('ధన్యవాదాలు')) {
            response = this.getThankYouResponse();
        }
        
        // ===== MODE SWITCHING =====
        else if (q.includes('navigate') || q.includes('navigation') || q.includes('guide me')) {
            response = "Switching to Navigation Mode for real-time walking guidance.";
            setTimeout(() => window.blindNavApp?.activateMode('navigation'), 2000);
        }
        else if (q.includes('walking mode') || q.includes('walk with me')) {
            response = "Switching to Walking Mode for step-by-step guidance.";
            setTimeout(() => window.blindNavApp?.activateMode('walking'), 2000);
        }
        else if (q.includes('find') || q.includes('locate') || q.includes('where is my')) {
            response = "Switching to Object Detection Mode to help you find items.";
            setTimeout(() => window.blindNavApp?.activateMode('object-detection'), 2000);
        }
        else if (q.includes('bus') || q.includes('bus number') || q.includes('which bus')) {
            response = "Switching to Bus Detection Mode.";
            setTimeout(() => window.blindNavApp?.activateMode('bus-detection'), 2000);
        }
        else if (q.includes('describe') || q.includes('surroundings') || q.includes('what do you see')) {
            response = "Switching to Scene Description Mode.";
            setTimeout(() => window.blindNavApp?.activateMode('scene-describe'), 2000);
        }
        else if (q.includes('read') || q.includes('text') || q.includes('ocr')) {
            response = "Switching to Reading Mode to read text for you.";
            setTimeout(() => window.blindNavApp?.activateMode('reading'), 2000);
        }
        else if (q.includes('security') || q.includes('watch') || q.includes('monitor')) {
            response = "Switching to Security Mode to monitor your surroundings.";
            setTimeout(() => window.blindNavApp?.activateMode('security'), 2000);
        }
        else if (q.includes('emergency') || q.includes('help me') || q.includes('sos')) {
            response = "Switching to Emergency Mode.";
            setTimeout(() => window.blindNavApp?.activateMode('emergency'), 2000);
        }
        else if (q.includes('medical') || q.includes('health') || q.includes('hurt') || q.includes('sick')) {
            response = "Switching to Medical Mode.";
            setTimeout(() => window.blindNavApp?.activateMode('medical'), 2000);
        }
        
        // ===== REPEAT LAST =====
        else if (q.includes('repeat') || q.includes('say again') || q.includes('what did you say')) {
            if (speechManager.lastSpoken) {
                response = speechManager.lastSpoken;
            } else {
                response = "I haven't said anything yet that I can repeat.";
            }
        }
        
        // ===== DEFAULT RESPONSE =====
        else {
            response = this.getDefaultResponse(query);
        }
        
        // Add response to history
        this.conversationHistory.push({
            type: 'assistant',
            text: response,
            time: Date.now()
        });
        
        this.updateConversationDisplay();
        
        return response;
    }
    
    // ===== TIME AND DATE RESPONSES =====
    
    getTimeResponse() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        
        const periodOfDay = this.getTimePeriod(hours);
        
        return `The current time is ${displayHours}:${displayMinutes} ${period}. ` +
               `It's ${periodOfDay} time.`;
    }
    
    getDateResponse() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateStr = now.toLocaleDateString('en-US', options);
        
        // Add special date info
        const day = now.getDate();
        const suffix = this.getOrdinalSuffix(day);
        
        return `Today is ${dateStr}. It's the ${day}${suffix} day of the month.`;
    }
    
    getOrdinalSuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
    
    getPeriodResponse() {
        const hour = new Date().getHours();
        const period = this.getTimePeriod(hour);
        
        const descriptions = {
            morning: "It's morning time. A great time to start your day with energy!",
            afternoon: "It's afternoon. The day is progressing well.",
            evening: "It's evening time. The day is winding down.",
            night: "It's nighttime. Time to rest and relax."
        };
        
        return descriptions[period];
    }
    
    // ===== WEATHER RESPONSE =====
    
    async getWeatherResponse() {
        // Try to get location and weather
        if (navigator.geolocation) {
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        try {
                            // Use a free weather API (OpenWeatherMap or similar)
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;
                            
                            // Note: This would need a real API key in production
                            // For now, provide helpful offline response
                            resolve(this.getOfflineWeatherResponse());
                        } catch (error) {
                            resolve(this.getOfflineWeatherResponse());
                        }
                    },
                    () => {
                        resolve(this.getOfflineWeatherResponse());
                    },
                    { timeout: 5000 }
                );
            });
        }
        return this.getOfflineWeatherResponse();
    }
    
    getOfflineWeatherResponse() {
        const hour = new Date().getHours();
        const tips = [];
        
        if (hour >= 6 && hour < 10) {
            tips.push("Morning is typically a good time for outdoor activities before it gets too warm.");
        } else if (hour >= 10 && hour < 16) {
            tips.push("Midday can be warm. Stay hydrated and seek shade when possible.");
        } else if (hour >= 16 && hour < 19) {
            tips.push("Evening is often pleasant for a walk.");
        }
        
        return "I don't have access to live weather data right now. " +
               "I recommend checking a weather app or asking someone nearby for current conditions. " +
               tips[0] || "Stay safe and dress appropriately for the weather!";
    }
    
    // ===== ALARM FUNCTIONS =====
    
    handleAlarmCommand(query) {
        // Parse time from query
        const timeMatch = query.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i) ||
                         query.match(/(\d{1,2})\s*(am|pm)/i) ||
                         query.match(/in (\d+)\s*(minute|hour|min|hr)/i);
        
        if (!timeMatch) {
            return "I couldn't understand the time for the alarm. " +
                   "Please say something like 'Set alarm for 7 AM' or 'Set alarm for 6:30 PM' or 'Set alarm in 30 minutes'.";
        }
        
        let alarmTime;
        const now = new Date();
        
        // Check if it's a relative time (in X minutes/hours)
        if (query.includes('in ') && timeMatch[2]) {
            const amount = parseInt(timeMatch[1]);
            const unit = timeMatch[2].toLowerCase();
            
            alarmTime = new Date(now);
            if (unit.startsWith('min')) {
                alarmTime.setMinutes(alarmTime.getMinutes() + amount);
            } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
                alarmTime.setHours(alarmTime.getHours() + amount);
            }
        } else {
            // Absolute time
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            const period = timeMatch[3]?.toLowerCase();
            
            if (period === 'pm' && hours !== 12) hours += 12;
            if (period === 'am' && hours === 12) hours = 0;
            
            alarmTime = new Date(now);
            alarmTime.setHours(hours, minutes, 0, 0);
            
            // If time has passed, set for tomorrow
            if (alarmTime <= now) {
                alarmTime.setDate(alarmTime.getDate() + 1);
            }
        }
        
        // Create alarm object
        const alarm = {
            id: Date.now(),
            time: alarmTime.getTime(),
            label: query.includes('for ') ? query.split('for ').pop() : 'Alarm',
            active: true
        };
        
        this.alarms.push(alarm);
        this.saveStoredData();
        
        const timeStr = alarmTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        return `Alarm set for ${timeStr}. I will alert you when it's time.`;
    }
    
    showAlarms() {
        const activeAlarms = this.alarms.filter(a => a.active && a.time > Date.now());
        
        if (activeAlarms.length === 0) {
            return "You don't have any active alarms set.";
        }
        
        const alarmList = activeAlarms.map((alarm, index) => {
            const time = new Date(alarm.time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `Alarm ${index + 1}: ${time}`;
        }).join('. ');
        
        return `You have ${activeAlarms.length} active alarm${activeAlarms.length > 1 ? 's' : ''}. ${alarmList}`;
    }
    
    clearAlarms(query) {
        if (query.includes('all')) {
            this.alarms = [];
            this.saveStoredData();
            return "All alarms have been cleared.";
        }
        
        // Clear the next upcoming alarm
        const activeAlarms = this.alarms.filter(a => a.active && a.time > Date.now());
        if (activeAlarms.length > 0) {
            activeAlarms.sort((a, b) => a.time - b.time);
            const nextAlarm = activeAlarms[0];
            this.alarms = this.alarms.filter(a => a.id !== nextAlarm.id);
            this.saveStoredData();
            return "The next alarm has been cancelled.";
        }
        
        return "You don't have any alarms to clear.";
    }
    
    // ===== REMINDER FUNCTIONS =====
    
    handleReminderCommand(query) {
        // Extract reminder text
        let reminderText = query;
        let reminderTime = null;
        
        // Parse "remind me to X in Y minutes/hours"
        const inMatch = query.match(/remind me (?:to )?(.+?) in (\d+)\s*(minute|hour|min|hr)/i);
        // Parse "remind me to X at Y time"
        const atMatch = query.match(/remind me (?:to )?(.+?) at (\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        
        const now = new Date();
        
        if (inMatch) {
            reminderText = inMatch[1];
            const amount = parseInt(inMatch[2]);
            const unit = inMatch[3].toLowerCase();
            
            reminderTime = new Date(now);
            if (unit.startsWith('min')) {
                reminderTime.setMinutes(reminderTime.getMinutes() + amount);
            } else {
                reminderTime.setHours(reminderTime.getHours() + amount);
            }
        } else if (atMatch) {
            reminderText = atMatch[1];
            let hours = parseInt(atMatch[2]);
            const minutes = atMatch[3] ? parseInt(atMatch[3]) : 0;
            const period = atMatch[4]?.toLowerCase();
            
            if (period === 'pm' && hours !== 12) hours += 12;
            if (period === 'am' && hours === 12) hours = 0;
            
            reminderTime = new Date(now);
            reminderTime.setHours(hours, minutes, 0, 0);
            
            if (reminderTime <= now) {
                reminderTime.setDate(reminderTime.getDate() + 1);
            }
        } else {
            // Default: remind in 30 minutes
            reminderTime = new Date(now);
            reminderTime.setMinutes(reminderTime.getMinutes() + 30);
            reminderText = query.replace(/remind me (to )?/i, '');
        }
        
        const reminder = {
            id: Date.now(),
            text: reminderText,
            time: reminderTime.getTime(),
            active: true
        };
        
        this.reminders.push(reminder);
        this.saveStoredData();
        
        const timeStr = reminderTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        return `I'll remind you to "${reminderText}" at ${timeStr}.`;
    }
    
    showReminders() {
        const activeReminders = this.reminders.filter(r => r.active && r.time > Date.now());
        
        if (activeReminders.length === 0) {
            return "You don't have any active reminders.";
        }
        
        const reminderList = activeReminders.map((reminder, index) => {
            const time = new Date(reminder.time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            return `${index + 1}: "${reminder.text}" at ${time}`;
        }).join('. ');
        
        return `You have ${activeReminders.length} reminder${activeReminders.length > 1 ? 's' : ''}. ${reminderList}`;
    }
    
    clearReminders(query) {
        if (query.includes('all')) {
            this.reminders = [];
            this.saveStoredData();
            return "All reminders have been cleared.";
        }
        
        const activeReminders = this.reminders.filter(r => r.active && r.time > Date.now());
        if (activeReminders.length > 0) {
            activeReminders.sort((a, b) => a.time - b.time);
            const nextReminder = activeReminders[0];
            this.reminders = this.reminders.filter(r => r.id !== nextReminder.id);
            this.saveStoredData();
            return "The next reminder has been cancelled.";
        }
        
        return "You don't have any reminders to clear.";
    }
    
    // ===== ALARM CHECK SYSTEM =====
    
    startAlarmCheck() {
        this.alarmCheckInterval = setInterval(() => {
            this.checkAlarmsAndReminders();
        }, 30000); // Check every 30 seconds
    }
    
    checkAlarmsAndReminders() {
        const now = Date.now();
        
        // Check alarms
        this.alarms.forEach(alarm => {
            if (alarm.active && alarm.time <= now && alarm.time > now - 60000) {
                alarm.active = false;
                this.triggerAlarm(alarm);
            }
        });
        
        // Check reminders
        this.reminders.forEach(reminder => {
            if (reminder.active && reminder.time <= now && reminder.time > now - 60000) {
                reminder.active = false;
                this.triggerReminder(reminder);
            }
        });
        
        this.saveStoredData();
    }
    
    triggerAlarm(alarm) {
        speechManager.speak(
            `Attention! Your alarm is going off! ` +
            `It's now ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}. ` +
            `${alarm.label !== 'Alarm' ? `Alarm for: ${alarm.label}` : ''}`,
            true
        );
        
        // Vibrate if available
        if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500, 200, 500]);
        }
    }
    
    triggerReminder(reminder) {
        speechManager.speak(
            `Reminder! ${reminder.text}. ` +
            `This is your scheduled reminder.`,
            true
        );
        
        if (navigator.vibrate) {
            navigator.vibrate([300, 100, 300]);
        }
    }
    
    // ===== STORAGE =====
    
    loadStoredData() {
        try {
            const stored = localStorage.getItem('blindnav_assistant_data');
            if (stored) {
                const data = JSON.parse(stored);
                this.alarms = data.alarms || [];
                this.reminders = data.reminders || [];
            }
        } catch (e) {
            console.error('[Assistant] Error loading stored data:', e);
        }
    }
    
    saveStoredData() {
        try {
            const data = {
                alarms: this.alarms,
                reminders: this.reminders
            };
            localStorage.setItem('blindnav_assistant_data', JSON.stringify(data));
        } catch (e) {
            console.error('[Assistant] Error saving data:', e);
        }
    }
    
    // ===== BATTERY STATUS =====
    
    getBatteryStatus() {
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                const level = Math.round(battery.level * 100);
                const charging = battery.charging;
                
                let status = `Your battery is at ${level} percent`;
                
                if (charging) {
                    status += ` and is currently charging`;
                }
                
                if (level <= 20 && !charging) {
                    status += `. Warning: Battery is low. Please consider charging your device soon.`;
                } else if (level >= 80) {
                    status += `. Battery level is good.`;
                }
                
                speechManager.speak(status);
            });
            return "Checking battery status...";
        }
        return "Battery information is not available on this device.";
    }
    
    // ===== JOKES =====
    
    tellJoke() {
        const joke = this.jokes[Math.floor(Math.random() * this.jokes.length)];
        return `Here's a joke for you: ${joke}`;
    }
    
    // ===== SPEECH CONTROL =====
    
    speakSlower() {
        speechManager.settings.rate = Math.max(0.5, speechManager.settings.rate - 0.2);
        return "I will speak slower now. Is this speed better for you?";
    }
    
    speakFaster() {
        speechManager.settings.rate = Math.min(1.5, speechManager.settings.rate + 0.2);
        return "I will speak faster now. Is this speed better?";
    }
    
    changeVoice() {
        const voices = window.speechSynthesis.getVoices();
        const englishVoices = voices.filter(v => v.lang.startsWith('en'));
        
        if (englishVoices.length > 1) {
            const currentIndex = englishVoices.findIndex(v => v === speechManager.settings.voice);
            const nextIndex = (currentIndex + 1) % englishVoices.length;
            speechManager.settings.voice = englishVoices[nextIndex];
            return `Voice changed to ${englishVoices[nextIndex].name}. How does this sound?`;
        }
        return "No alternative voices are available on this device.";
    }
    
    adjustVolume(change) {
        speechManager.settings.volume = Math.max(0.3, Math.min(1.0, speechManager.settings.volume + change));
        const level = Math.round(speechManager.settings.volume * 100);
        return `Volume adjusted to ${level} percent.`;
    }
    
    // ===== RESPONSE GENERATORS =====
    
    getGreetingResponse() {
        const responses = [
            "Hello! I'm here to help. What can I do for you?",
            "Hi there! How may I assist you today?",
            "Hey! Good to hear from you. What do you need?",
            "Greetings! I'm ready to help. Just ask!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    getHelpResponse() {
        return "Here's what I can help you with: " +
               "Ask me the time or date. " +
               "Ask about the weather. " +
               "Set alarms by saying 'set alarm for 7 AM'. " +
               "Set reminders by saying 'remind me to take medicine in 30 minutes'. " +
               "Show your alarms or reminders. " +
               "Clear alarms or reminders. " +
               "Check battery status. " +
               "Tell me a joke. " +
               "Say 'speak slower' or 'speak faster' to adjust my speed. " +
               "Say 'stop talking' to silence me. " +
               "Switch to navigation, walking, object detection, bus detection, reading, security, or emergency modes. " +
               "Just speak naturally, and I'll do my best to help!";
    }
    
    getStatusResponse() {
        const responses = [
            "I'm functioning perfectly and ready to help you!",
            "I'm doing great, thank you for asking! How can I assist you?",
            "I'm here and working well. What do you need?",
            "All systems are running smoothly. I'm ready to help!"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    getIdentityResponse() {
        return "I am BlindNav Plus, your personal voice assistant. " +
               "I'm designed specifically to help visually impaired users navigate the world safely and independently. " +
               "I can assist with navigation, finding objects, reading text, detecting buses, and much more. " +
               "I'm always here to help you!";
    }
    
    getThankYouResponse() {
        const responses = [
            "You're welcome! Happy to help anytime.",
            "Glad I could assist! Let me know if you need anything else.",
            "My pleasure! I'm always here for you.",
            "Anytime! That's what I'm here for.",
            "You're most welcome! Don't hesitate to ask again."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    getDefaultResponse(query) {
        return `I heard you say "${query}". ` +
               `I'm not sure how to help with that specifically, but I can assist with: ` +
               `time and date, alarms and reminders, weather information, battery status, jokes, ` +
               `or switching to other modes like navigation or object detection. ` +
               `Say "help" for a full list of commands.`;
    }
    
    // ===== UI =====
    
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        if (active) {
            modeContent.innerHTML = `
                <div class="assistant-display">
                    <div class="assistant-status">
                        <span class="assistant-icon">🤖</span>
                        <span class="assistant-text">BlindNav+ Assistant - Always Listening</span>
                    </div>
                    <div class="conversation-history" id="conversation-history">
                        <p class="hint">Speak naturally! Try: "What time is it?", "Set alarm for 7 AM", "Tell me a joke"</p>
                    </div>
                    <div class="quick-actions">
                        <button class="quick-btn" data-action="time">🕐 Time</button>
                        <button class="quick-btn" data-action="date">📅 Date</button>
                        <button class="quick-btn" data-action="battery">🔋 Battery</button>
                        <button class="quick-btn" data-action="joke">😄 Joke</button>
                        <button class="quick-btn" data-action="help">❓ Help</button>
                    </div>
                </div>
            `;
            
            // Attach event listeners
            document.querySelectorAll('.quick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    let response = '';
                    
                    switch(action) {
                        case 'time':
                            response = this.getTimeResponse();
                            break;
                        case 'date':
                            response = this.getDateResponse();
                            break;
                        case 'battery':
                            response = this.getBatteryStatus();
                            break;
                        case 'joke':
                            response = this.tellJoke();
                            break;
                        case 'help':
                            response = this.getHelpResponse();
                            break;
                    }
                    
                    if (response) {
                        speechManager.speak(response);
                        this.conversationHistory.push({ type: 'user', text: action, time: Date.now() });
                        this.conversationHistory.push({ type: 'assistant', text: response, time: Date.now() });
                        this.updateConversationDisplay();
                    }
                });
            });
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    updateConversationDisplay() {
        const historyEl = document.getElementById('conversation-history');
        if (!historyEl) return;
        
        const recent = this.conversationHistory.slice(-10);
        
        if (recent.length === 0) {
            historyEl.innerHTML = '<p class="hint">Speak naturally! I\'m listening...</p>';
            return;
        }
        
        historyEl.innerHTML = recent.map(item => `
            <div class="conversation-item ${item.type}">
                <span class="item-icon">${item.type === 'user' ? '👤' : '🤖'}</span>
                <span class="item-text">${item.text}</span>
            </div>
        `).join('');
        
        historyEl.scrollTop = historyEl.scrollHeight;
    }
    
    /**
     * Handle voice command (called from app.js)
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();
        
        // Check for exit commands
        if (cmd.includes('exit assistant') || cmd.includes('close assistant') || 
            cmd.includes('quit assistant') || cmd.includes('leave assistant')) {
            this.stop();
            return true;
        }
        
        // Process as query
        const response = this.processQuery(command);
        if (response) {
            speechManager.speak(response);
        }
        
        return true; // Assistant handles all commands
    }
}

// Export singleton instance
const assistantMode = new AssistantMode();
