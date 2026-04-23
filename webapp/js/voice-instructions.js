/**
 * BlindNav+ Voice Instructions System
 * Comprehensive voice guidance and interaction system for blind users
 */

const VoiceInstructions = {
    /**
     * Welcome message when app first loads
     */
    welcomeMessage: `
        Welcome to BlindNav Plus, your personal navigator and assistant.
        
        I am designed to help you navigate the world safely and independently.
        
        To get started, you'll need to connect your camera.
        Enter your ESP 32 camera's IP address and tap Connect, or say "connect camera".
        
        Once connected, I will be ready to assist you.
        
        You can interact with me entirely by voice. Just speak naturally, and I will respond.
        
        Say "help" at any time to hear the available commands.
        Say "what can you do" to learn about my features.
        
        I'm listening and ready to help.
    `,
    
    /**
     * Instructions for how to interact with the system
     */
    interactionGuide: `
        Here's how to interact with BlindNav Plus:
        
        Voice Commands: Simply speak your command. The microphone is always listening when the app is active.
        
        Mode Selection: Say the mode name to start it. For example:
        Say "assistant" for general help.
        Say "navigation" for walking guidance.
        Say "find objects" to locate items.
        Say "bus detection" to find your bus.
        Say "walking mode" for step-by-step walking guidance.
        Say "security" to monitor your surroundings.
        Say "medical" for health emergencies.
        Say "fire" if you smell smoke or see fire.
        Say "police" for safety emergencies.
        Say "reading" to read text.
        Say "emergency" for immediate help.
        
        To stop any mode, say "stop" or "exit".
        
        I will confirm each command and guide you through every step.
    `,
    
    /**
     * All mode keywords for voice recognition
     */
    modeKeywords: {
        'assistant': [
            'assistant', 'assistant mode', 'be my assistant', 'help me', 'i need help',
            'talk to me', 'general help', 'questions'
        ],
        'navigation': [
            'navigation', 'navigation mode', 'help me navigate', 'guide me to my destination',
            'navigate', 'directions', 'guide me', 'take me to'
        ],
        'object-detection': [
            'object detection', 'detect objects', 'what\'s around me', 'find objects',
            'what do you see', 'identify objects', 'what is this', 'find my'
        ],
        'walking': [
            'walking', 'walking mode', 'guide me as i walk', 'walk with me',
            'help me walk', 'walking guidance', 'step by step'
        ],
        'emergency': [
            'emergency', 'help me', 'sos', 'call 911', 'i need emergency help',
            'urgent help', 'emergency help'
        ],
        'security': [
            'security', 'guard mode', 'monitor surroundings', 'security mode',
            'watch around me', 'safety mode', 'protect me'
        ],
        'medical': [
            'medical', 'health mode', 'i need medical help', 'medical emergency',
            'health emergency', 'doctor', 'i\'m hurt', 'i\'m sick'
        ],
        'fire': [
            'fire', 'fire detection', 'i smell smoke', 'there\'s a fire',
            'fire emergency', 'smoke', 'burning'
        ],
        'police': [
            'police', 'call police', 'call the cops', 'police mode',
            'i\'m in danger', 'someone is following me', 'crime'
        ],
        'reading': [
            'reading', 'read this', 'ocr mode', 'reading mode',
            'read text', 'what does this say', 'read for me'
        ],
        'bus-detection': [
            'bus', 'bus detection', 'which bus', 'public transport',
            'find my bus', 'bus number', 'waiting for bus'
        ]
    },
    
    /**
     * Descriptions of each mode
     */
    modeDescriptions: {
        'assistant': 'Assistant mode helps you with general questions, tells you the time and date, and can switch you to other modes. It\'s like having a helpful friend always ready to chat.',
        
        'navigation': 'Navigation mode provides real-time guidance while you move. It detects obstacles and tells you about objects in your path with their distance and position.',
        
        'object-detection': 'Object detection mode helps you find specific items. Tell me what you\'re looking for, like your phone or keys, and I\'ll guide you to it.',
        
        'walking': 'Walking mode gives you detailed, step-by-step guidance as you walk. It provides faster updates and more detailed warnings than navigation mode.',
        
        'emergency': 'Emergency mode quickly contacts emergency services and sends your location. Use this when you need immediate help.',
        
        'security': 'Security mode monitors your surroundings for potential threats. It tracks people around you and alerts you if someone gets too close.',
        
        'medical': 'Medical mode provides first aid guidance and helps you contact medical services. Tell me your symptoms and I\'ll guide you.',
        
        'fire': 'Fire mode provides evacuation guidance and helps you escape from fire emergencies safely.',
        
        'police': 'Police mode helps you in safety situations. It can call police and provides guidance if you\'re being followed or feel threatened.',
        
        'reading': 'Reading mode uses your camera to read text aloud. Point at signs, labels, or documents and I\'ll read them for you.',
        
        'bus-detection': 'Bus detection mode helps you identify buses by their numbers. Tell me which bus you\'re waiting for and I\'ll alert you when it arrives.'
    },
    
    /**
     * Common questions a blind user might ask
     */
    commonQuestions: {
        // General questions
        'what time is it': () => {
            const now = new Date();
            return `The time is ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`;
        },
        'what day is it': () => {
            const now = new Date();
            return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`;
        },
        'what can you do': () => VoiceInstructions.capabilitiesMessage,
        'help': () => VoiceInstructions.interactionGuide,
        'how do i use this': () => VoiceInstructions.interactionGuide,
        
        // Mode questions
        'what modes are available': () => VoiceInstructions.listModes(),
        'list all modes': () => VoiceInstructions.listModes(),
        'what is assistant mode': () => VoiceInstructions.modeDescriptions['assistant'],
        'what is navigation mode': () => VoiceInstructions.modeDescriptions['navigation'],
        'what is walking mode': () => VoiceInstructions.modeDescriptions['walking'],
        'what is security mode': () => VoiceInstructions.modeDescriptions['security'],
        
        // Situational questions
        'i\'m lost': () => 'Don\'t worry, I can help. Say "navigation" to start navigation mode. I\'ll help guide you. You can also say "help me" and I\'ll assist you.',
        'i can\'t find something': () => 'I can help you find objects. Say "find" followed by what you\'re looking for. For example, "find my phone" or "find my keys".',
        'how do i get home': () => 'I can provide walking guidance. Say "navigation" or "walking mode" to start. I\'ll help detect obstacles as you walk.',
        'is anyone near me': () => 'To monitor people around you, say "security mode" and I\'ll track anyone nearby.',
        'i feel unsafe': () => 'I\'m here to help. Say "security" to monitor your surroundings, or "police" if you need emergency assistance.',
        
        // System questions
        'is the camera connected': () => cameraManager && cameraManager.isConnected ? 'Yes, the camera is connected and working.' : 'No, the camera is not connected. Please connect your ESP32 camera.',
        'battery level': async () => {
            if (navigator.getBattery) {
                const battery = await navigator.getBattery();
                return `Your battery is at ${Math.round(battery.level * 100)} percent${battery.charging ? ' and charging' : ''}.`;
            }
            return 'Battery information is not available on this device.';
        },
        'repeat that': () => speechManager.lastSpoken || 'There\'s nothing to repeat.',
        'speak slower': () => {
            speechManager.settings.rate = Math.max(0.5, speechManager.settings.rate - 0.2);
            return 'I will speak slower now.';
        },
        'speak faster': () => {
            speechManager.settings.rate = Math.min(2, speechManager.settings.rate + 0.2);
            return 'I will speak faster now.';
        },
        
        // Emergency shortcuts
        'call 911': () => {
            window.location.href = 'tel:911';
            return 'Calling 911 now.';
        },
        'i need help': () => 'I\'m here to help. Tell me what you need, or say "emergency" for urgent assistance.',
    },
    
    /**
     * Capabilities message
     */
    capabilitiesMessage: `
        Here's what I can do for you:
        
        Navigation: Guide you while walking, detect obstacles, and warn you of hazards.
        
        Object Finding: Help you locate items like your phone, keys, cups, or other objects.
        
        Bus Detection: Identify buses by their numbers so you can catch the right one.
        
        Text Reading: Read signs, labels, documents, or any text you point your camera at.
        
        Security Monitoring: Track people around you and alert you if someone gets too close.
        
        Emergency Assistance: Quickly contact emergency services for medical, fire, or police help.
        
        General Assistant: Answer questions, tell time and date, and have conversations.
        
        Say the name of any feature to start using it.
    `,
    
    /**
     * List all modes
     */
    listModes() {
        return `
            There are 11 modes available:
            1. Assistant Mode - for general help and questions.
            2. Navigation Mode - for walking with obstacle detection.
            3. Object Detection Mode - to find specific items.
            4. Walking Mode - for detailed step-by-step walking guidance.
            5. Emergency Mode - for urgent help and 911.
            6. Security Mode - to monitor people around you.
            7. Medical Mode - for health emergencies.
            8. Fire Mode - for fire evacuation help.
            9. Police Mode - for safety emergencies.
            10. Reading Mode - to read text with your camera.
            11. Bus Detection Mode - to find your bus.
            
            Say the mode name to start it.
        `;
    },
    
    /**
     * Get response for a question
     * @param {string} question - User's question
     * @returns {string|null} - Response or null if no match
     */
    getQuestionResponse(question) {
        const q = question.toLowerCase().trim();
        
        // Check exact matches first
        for (const [key, response] of Object.entries(this.commonQuestions)) {
            if (q.includes(key)) {
                return typeof response === 'function' ? response() : response;
            }
        }
        
        // Check for mode description requests
        for (const [mode, description] of Object.entries(this.modeDescriptions)) {
            if (q.includes(mode) && (q.includes('what is') || q.includes('tell me about') || q.includes('explain'))) {
                return description;
            }
        }
        
        return null;
    },
    
    /**
     * Detect mode from speech
     * @param {string} speech - User's speech
     * @returns {string|null} - Mode name or null
     */
    detectMode(speech) {
        const s = speech.toLowerCase().trim();
        
        for (const [mode, keywords] of Object.entries(this.modeKeywords)) {
            for (const keyword of keywords) {
                if (s.includes(keyword)) {
                    return mode;
                }
            }
        }
        
        return null;
    },
    
    /**
     * Get mode activation confirmation
     * @param {string} mode - Mode name
     * @returns {string} - Confirmation message
     */
    getModeActivationMessage(mode) {
        const modeNames = {
            'assistant': 'Assistant',
            'navigation': 'Navigation',
            'object-detection': 'Object Detection',
            'walking': 'Walking',
            'emergency': 'Emergency',
            'security': 'Security',
            'medical': 'Medical',
            'fire': 'Fire',
            'police': 'Police',
            'reading': 'Reading',
            'bus-detection': 'Bus Detection',
            'scene-describe': 'Scene Description'
        };
        
        return `Activating ${modeNames[mode] || mode} Mode.`;
    },
    
    /**
     * Contextual tips based on time
     */
    getContextualTip() {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 12) {
            return 'Good morning! Remember to stay hydrated and take breaks while walking.';
        } else if (hour >= 12 && hour < 17) {
            return 'Good afternoon! If you\'re outside, be aware that traffic may be busier.';
        } else if (hour >= 17 && hour < 21) {
            return 'Good evening! Lighting may be changing. Let me know if you need extra guidance.';
        } else {
            return 'It\'s nighttime. Be extra careful while walking. I\'m here to help guide you safely.';
        }
    },
    
    /**
     * Safety reminders
     */
    safetyReminders: [
        'Remember, I\'m a helpful tool but should not replace a white cane or guide dog.',
        'Always be aware of your surroundings using all your senses.',
        'If you feel unsafe at any time, say "emergency" for immediate help.',
        'Cross streets at designated crossings when possible.',
        'Set up your emergency contacts so I can help you quickly in an emergency.',
        'Keep your phone charged when using this app for navigation.',
        'Tell someone your route when going to new places.',
        'Trust your instincts. If something feels wrong, it might be.'
    ],
    
    /**
     * Get random safety reminder
     */
    getSafetyReminder() {
        return this.safetyReminders[Math.floor(Math.random() * this.safetyReminders.length)];
    },
    
    /**
     * Error messages for common issues
     */
    errorMessages: {
        'camera_not_connected': 'The camera is not connected. Please connect your ESP32 camera first by entering its IP address.',
        'speech_not_supported': 'Speech recognition is not supported in this browser. Please use Chrome for the best experience.',
        'location_unavailable': 'I could not get your location. Make sure location services are enabled.',
        'mode_unavailable': 'That mode is not available right now. Please try again.',
        'network_error': 'There seems to be a network problem. Check your connection.',
        'general_error': 'Something went wrong. Please try again or say "help" for assistance.'
    },
    
    /**
     * Phrases that indicate the user needs help
     */
    helpPhrases: [
        'help', 'help me', 'i need help', 'assist me', 'i\'m stuck',
        'what do i do', 'how does this work', 'i don\'t understand',
        'say that again', 'repeat', 'explain', 'i\'m confused'
    ],
    
    /**
     * Check if user is asking for help
     * @param {string} speech - User's speech
     * @returns {boolean}
     */
    isAskingForHelp(speech) {
        const s = speech.toLowerCase();
        return this.helpPhrases.some(phrase => s.includes(phrase));
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceInstructions;
}
