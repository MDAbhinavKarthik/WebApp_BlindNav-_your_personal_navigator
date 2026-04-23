/**
 * BlindNav+ Conversation Flow Manager
 * Handles multi-turn, natural conversation flows
 * Manages conversation state, context, and flow patterns
 */

class ConversationFlowManager {
    constructor() {
        // Conversation state
        this.currentFlow = null;
        this.flowState = {};
        this.conversationHistory = [];
        this.pendingConfirmation = null;
        this.lastIntent = null;
        this.contextStack = [];
        
        // Flow definitions
        this.flows = {};
        
        // Timing configuration
        this.config = {
            confirmationTimeout: 10000,    // Time to wait for yes/no response
            clarificationTimeout: 15000,   // Time to wait for clarification
            maxHistoryLength: 20,          // Max conversation turns to remember
            repeatThreshold: 2,            // Repeats before suggesting UI fallback
            misunderstandingThreshold: 3,  // Misunderstandings before UI fallback
            silenceTimeout: 8000           // Silence before prompting
        };
        
        // Tracking
        this.repeatCount = 0;
        this.misunderstandingCount = 0;
        this.lastResponseTime = 0;
        this.silenceTimer = null;
        
        // Callbacks
        this.onFlowComplete = null;
        this.onNeedsClarification = null;
        this.onSuggestUIFallback = null;
        this.onSpeak = null;
        
        // Initialize default flows
        this.initializeFlows();
        
        console.log('[ConversationFlow] Manager initialized');
    }
    
    /**
     * Initialize default conversation flows
     */
    initializeFlows() {
        // Navigation flow
        this.registerFlow('navigation', {
            name: 'Navigation',
            steps: [
                {
                    id: 'get_destination',
                    prompt: 'Where would you like to go?',
                    expectedType: 'destination',
                    onResponse: (response, context) => this.handleNavigationDestination(response, context)
                },
                {
                    id: 'confirm_destination',
                    prompt: null, // Set dynamically
                    expectedType: 'confirmation',
                    onResponse: (response, context) => this.handleNavigationConfirmation(response, context)
                },
                {
                    id: 'start_navigation',
                    prompt: 'Navigation started.',
                    isTerminal: true,
                    action: (context) => this.startNavigationAction(context)
                }
            ],
            onCancel: () => this.speak('Navigation cancelled.')
        });
        
        // Reading flow
        this.registerFlow('reading', {
            name: 'Reading',
            steps: [
                {
                    id: 'prepare_camera',
                    prompt: 'Hold the camera steady and point it at the text.',
                    expectedType: 'ready',
                    autoAdvance: true,
                    autoAdvanceDelay: 2000
                },
                {
                    id: 'check_conditions',
                    prompt: null, // Dynamic based on conditions
                    conditional: true,
                    onCheck: (context) => this.checkReadingConditions(context)
                },
                {
                    id: 'read_text',
                    prompt: 'Reading started.',
                    isTerminal: true,
                    action: (context) => this.startReadingAction(context)
                }
            ],
            onCancel: () => this.speak('Reading cancelled.')
        });
        
        // Walking flow
        this.registerFlow('walking', {
            name: 'Walking',
            steps: [
                {
                    id: 'motion_detected',
                    prompt: null, // Silent start
                    autoStart: true,
                    onStart: (context) => this.initWalkingMode(context)
                },
                {
                    id: 'continuous_guidance',
                    isLoop: true,
                    onLoop: (context) => this.walkingGuidanceLoop(context)
                }
            ],
            speakOnlyWhen: ['obstacle', 'direction_change', 'user_request'],
            onCancel: () => this.speak('Walking guidance stopped.')
        });
        
        // Emergency flow
        this.registerFlow('emergency', {
            name: 'Emergency',
            priority: 'highest',
            interruptAll: true,
            steps: [
                {
                    id: 'acknowledge',
                    prompt: null, // Dynamic based on trigger
                    speechStyle: 'slow_calm',
                    onStart: (context) => this.handleEmergencyStart(context),
                    expectedType: 'emergency_type'
                },
                {
                    id: 'assess',
                    prompt: null, // Dynamic based on emergency type
                    speechStyle: 'slow_calm',
                    onResponse: (response, context) => this.assessEmergency(response, context)
                },
                {
                    id: 'confirm_safe',
                    prompt: 'Are you safe to speak?',
                    speechStyle: 'slow_calm',
                    expectedType: 'confirmation',
                    onResponse: (response, context) => this.handleSafetyCheck(response, context)
                },
                {
                    id: 'provide_help',
                    isLoop: true,
                    speechStyle: 'slow_calm',
                    onLoop: (context) => this.emergencyHelpLoop(context)
                }
            ],
            triggers: ['help', 'scream', 'panic_tone', 'fall'],
            onTrigger: (trigger) => this.handleEmergencyTrigger(trigger),
            onCancel: () => {
                this.speak('Emergency assistance cancelled. Call 911 if you need help.', 'slow_calm');
            }
        });
        
        // Bus detection flow
        this.registerFlow('bus_detection', {
            name: 'Bus Detection',
            steps: [
                {
                    id: 'ask_bus',
                    prompt: 'Which bus number are you waiting for?',
                    expectedType: 'bus_number',
                    onResponse: (response, context) => this.handleBusNumber(response, context)
                },
                {
                    id: 'confirm_bus',
                    prompt: null, // Set dynamically
                    expectedType: 'confirmation',
                    onResponse: (response, context) => this.handleBusConfirmation(response, context)
                },
                {
                    id: 'watch_for_bus',
                    prompt: 'Watching for your bus. I will alert you when I see it.',
                    isLoop: true,
                    onLoop: (context) => this.busWatchLoop(context)
                }
            ],
            onCancel: () => this.speak('Bus detection stopped.')
        });
        
        // Scene description flow
        this.registerFlow('scene_describe', {
            name: 'Scene Description',
            steps: [
                {
                    id: 'capture',
                    prompt: 'Looking around you now.',
                    autoAdvance: true,
                    autoAdvanceDelay: 1500
                },
                {
                    id: 'describe',
                    prompt: null, // Dynamic description
                    action: (context) => this.describeScene(context),
                    isTerminal: true
                }
            ],
            onCancel: () => this.speak('Description cancelled.')
        });
    }
    
    /**
     * Register a new conversation flow
     */
    registerFlow(flowId, flowDefinition) {
        this.flows[flowId] = {
            id: flowId,
            ...flowDefinition,
            currentStep: 0
        };
        console.log(`[ConversationFlow] Registered flow: ${flowId}`);
    }
    
    /**
     * Start a conversation flow
     */
    startFlow(flowId, initialContext = {}) {
        const flow = this.flows[flowId];
        if (!flow) {
            console.error(`[ConversationFlow] Unknown flow: ${flowId}`);
            return false;
        }
        
        // Check if we need to interrupt current flow
        if (this.currentFlow) {
            if (flow.priority === 'highest' || flow.interruptAll) {
                this.cancelCurrentFlow(false);
            } else {
                // Stack the current flow
                this.contextStack.push({
                    flowId: this.currentFlow,
                    state: { ...this.flowState }
                });
            }
        }
        
        // Initialize new flow
        this.currentFlow = flowId;
        this.flowState = {
            ...initialContext,
            startTime: Date.now(),
            stepIndex: 0
        };
        
        console.log(`[ConversationFlow] Starting flow: ${flowId}`);
        
        // Execute first step
        this.executeCurrentStep();
        
        return true;
    }
    
    /**
     * Execute the current step in the active flow
     */
    executeCurrentStep() {
        if (!this.currentFlow) return;
        
        const flow = this.flows[this.currentFlow];
        const step = flow.steps[this.flowState.stepIndex];
        
        if (!step) {
            this.completeFlow();
            return;
        }
        
        console.log(`[ConversationFlow] Executing step: ${step.id}`);
        
        // Handle conditional steps
        if (step.conditional && step.onCheck) {
            const result = step.onCheck(this.flowState);
            if (result.skip) {
                this.advanceFlow();
                return;
            }
            if (result.prompt) {
                this.speak(result.prompt, step.speechStyle);
            }
        }
        
        // Handle auto-start steps
        if (step.autoStart && step.onStart) {
            step.onStart(this.flowState);
        }
        
        // Speak prompt if exists
        if (step.prompt) {
            this.speak(step.prompt, step.speechStyle);
        }
        
        // Handle terminal steps
        if (step.isTerminal) {
            if (step.action) {
                step.action(this.flowState);
            }
            this.completeFlow();
            return;
        }
        
        // Handle loop steps
        if (step.isLoop && step.onLoop) {
            this.startLoopStep(step);
            return;
        }
        
        // Handle auto-advance steps
        if (step.autoAdvance) {
            setTimeout(() => {
                this.advanceFlow();
            }, step.autoAdvanceDelay || 2000);
            return;
        }
        
        // Start silence timer for steps expecting response
        if (step.expectedType) {
            this.startSilenceTimer();
        }
    }
    
    /**
     * Process user response in current flow
     */
    processResponse(transcript) {
        this.lastResponseTime = Date.now();
        this.clearSilenceTimer();
        
        // Add to history
        this.conversationHistory.push({
            role: 'user',
            text: transcript,
            timestamp: Date.now()
        });
        this.trimHistory();
        
        // Check for universal commands
        if (this.handleUniversalCommands(transcript)) {
            return true;
        }
        
        // If no active flow, try to infer intent
        if (!this.currentFlow) {
            return this.inferIntent(transcript);
        }
        
        const flow = this.flows[this.currentFlow];
        const step = flow.steps[this.flowState.stepIndex];
        
        if (!step) return false;
        
        // Handle response based on expected type
        if (step.expectedType) {
            const parsed = this.parseResponse(transcript, step.expectedType);
            
            if (parsed.understood) {
                this.repeatCount = 0;
                this.misunderstandingCount = 0;
                
                if (step.onResponse) {
                    const result = step.onResponse(parsed.value, this.flowState);
                    if (result === 'advance') {
                        this.advanceFlow();
                    } else if (result === 'repeat') {
                        this.repeatCurrentStep();
                    } else if (result === 'cancel') {
                        this.cancelCurrentFlow();
                    }
                } else {
                    this.flowState[step.expectedType] = parsed.value;
                    this.advanceFlow();
                }
            } else {
                this.handleMisunderstanding(transcript, step);
            }
        }
        
        return true;
    }
    
    /**
     * Parse response based on expected type
     */
    parseResponse(transcript, expectedType) {
        const text = transcript.toLowerCase().trim();
        
        switch (expectedType) {
            case 'confirmation':
                return this.parseConfirmation(text);
                
            case 'destination':
                return this.parseDestination(text);
                
            case 'bus_number':
                return this.parseBusNumber(text);
                
            case 'emergency_type':
                return this.parseEmergencyType(text);
                
            case 'ready':
                return { understood: true, value: 'ready' };
                
            default:
                return { understood: true, value: transcript };
        }
    }
    
    /**
     * Parse yes/no confirmation
     */
    parseConfirmation(text) {
        const yesPatterns = ['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'correct', 'right', 'affirmative', 'start', 'go', 'do it'];
        const noPatterns = ['no', 'nope', 'cancel', 'stop', 'wrong', 'not', 'negative', 'don\'t'];
        
        for (const pattern of yesPatterns) {
            if (text.includes(pattern)) {
                return { understood: true, value: true };
            }
        }
        
        for (const pattern of noPatterns) {
            if (text.includes(pattern)) {
                return { understood: true, value: false };
            }
        }
        
        return { understood: false, value: null };
    }
    
    /**
     * Parse destination from speech
     */
    parseDestination(text) {
        // Common destination patterns
        const patterns = [
            /(?:take me to|go to|navigate to|find)\s+(?:the\s+)?(.+)/,
            /(?:i want to go to|i need to reach)\s+(?:the\s+)?(.+)/,
            /(.+?)(?:\s+please)?$/
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return { understood: true, value: match[1].trim() };
            }
        }
        
        // If no pattern matched but text exists, use full text
        if (text.length > 2) {
            return { understood: true, value: text };
        }
        
        return { understood: false, value: null };
    }
    
    /**
     * Parse bus number from speech
     */
    parseBusNumber(text) {
        // Look for numbers
        const numberMatch = text.match(/(\d+[a-z]?)/i);
        if (numberMatch) {
            return { understood: true, value: numberMatch[1].toUpperCase() };
        }
        
        // Word numbers
        const wordNumbers = {
            'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
            'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
            'eleven': '11', 'twelve': '12', 'twenty': '20', 'thirty': '30'
        };
        
        for (const [word, num] of Object.entries(wordNumbers)) {
            if (text.includes(word)) {
                return { understood: true, value: num };
            }
        }
        
        return { understood: false, value: null };
    }
    
    /**
     * Parse emergency type from speech
     */
    parseEmergencyType(text) {
        const emergencyTypes = {
            'fire': ['fire', 'smoke', 'burning', 'flames'],
            'medical': ['medical', 'hurt', 'injured', 'sick', 'pain', 'heart', 'breathing', 'blood', 'fell', 'fall'],
            'police': ['police', 'attack', 'crime', 'robbery', 'someone', 'following', 'danger', 'threat'],
            'general': ['help', 'emergency', 'sos']
        };
        
        for (const [type, keywords] of Object.entries(emergencyTypes)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    return { understood: true, value: type };
                }
            }
        }
        
        return { understood: true, value: 'general' };
    }
    
    /**
     * Handle universal commands that work in any flow
     */
    handleUniversalCommands(transcript) {
        const text = transcript.toLowerCase().trim();
        
        // Cancel/Stop
        if (text.includes('cancel') || text.includes('stop') || text.includes('quit') || text.includes('exit')) {
            if (this.currentFlow) {
                this.cancelCurrentFlow();
                return true;
            }
        }
        
        // Repeat
        if (text.includes('repeat') || text.includes('say again') || text.includes('what')) {
            this.repeatCurrentStep();
            return true;
        }
        
        // Help
        if (text === 'help' || text === 'what can i say') {
            this.provideContextualHelp();
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle misunderstanding
     */
    handleMisunderstanding(transcript, step) {
        this.misunderstandingCount++;
        
        if (this.misunderstandingCount >= this.config.misunderstandingThreshold) {
            // Suggest UI fallback
            this.suggestUIFallback('repeated_misunderstanding');
            return;
        }
        
        // Provide clarification
        let clarification = "I didn't quite understand. ";
        
        switch (step.expectedType) {
            case 'confirmation':
                clarification += "Please say yes or no.";
                break;
            case 'destination':
                clarification += "Please say the name of the place you want to go.";
                break;
            case 'bus_number':
                clarification += "Please say the bus number, like bus 42 or route 15.";
                break;
            default:
                clarification += "Could you please repeat that?";
        }
        
        this.speak(clarification);
    }
    
    /**
     * Infer intent from transcript when no flow is active
     */
    inferIntent(transcript) {
        const text = transcript.toLowerCase().trim();
        
        // Navigation intent
        if (text.includes('take me') || text.includes('navigate') || text.includes('go to') ||
            text.includes('directions') || text.includes('find my way')) {
            this.startFlow('navigation', { initialTranscript: transcript });
            return true;
        }
        
        // Reading intent
        if (text.includes('read') || text.includes('what does') || text.includes('text')) {
            this.startFlow('reading');
            return true;
        }
        
        // Bus intent
        if (text.includes('bus') || text.includes('which bus') || text.includes('waiting for')) {
            this.startFlow('bus_detection', { initialTranscript: transcript });
            return true;
        }
        
        // Scene description intent
        if (text.includes('describe') || text.includes('what\'s around') || text.includes('surroundings') ||
            text.includes('look around')) {
            this.startFlow('scene_describe');
            return true;
        }
        
        // Emergency intent
        if (text.includes('emergency') || text.includes('help me') || text.includes('danger')) {
            this.startFlow('emergency', { trigger: 'voice' });
            return true;
        }
        
        return false;
    }
    
    /**
     * Advance to next step in flow
     */
    advanceFlow() {
        if (!this.currentFlow) return;
        
        this.flowState.stepIndex++;
        this.executeCurrentStep();
    }
    
    /**
     * Repeat current step
     */
    repeatCurrentStep() {
        this.repeatCount++;
        
        if (this.repeatCount >= this.config.repeatThreshold) {
            this.suggestUIFallback('repeated_request');
            return;
        }
        
        if (!this.currentFlow) {
            this.speak("I'm listening. What would you like to do?");
            return;
        }
        
        const flow = this.flows[this.currentFlow];
        const step = flow.steps[this.flowState.stepIndex];
        
        if (step && step.prompt) {
            this.speak(step.prompt, step.speechStyle);
        }
    }
    
    /**
     * Complete the current flow
     */
    completeFlow() {
        const flowId = this.currentFlow;
        const state = { ...this.flowState };
        
        console.log(`[ConversationFlow] Flow completed: ${flowId}`);
        
        this.currentFlow = null;
        this.flowState = {};
        
        // Check for stacked flows
        if (this.contextStack.length > 0) {
            const previous = this.contextStack.pop();
            this.currentFlow = previous.flowId;
            this.flowState = previous.state;
            this.speak(`Returning to ${this.flows[this.currentFlow].name}.`);
            this.executeCurrentStep();
        }
        
        if (this.onFlowComplete) {
            this.onFlowComplete(flowId, state);
        }
    }
    
    /**
     * Cancel the current flow
     */
    cancelCurrentFlow(announce = true) {
        if (!this.currentFlow) return;
        
        const flow = this.flows[this.currentFlow];
        
        if (announce && flow.onCancel) {
            flow.onCancel();
        }
        
        console.log(`[ConversationFlow] Flow cancelled: ${this.currentFlow}`);
        
        this.currentFlow = null;
        this.flowState = {};
        this.contextStack = [];
    }
    
    /**
     * Start a loop step
     */
    startLoopStep(step) {
        this.flowState.isLooping = true;
        this.flowState.loopStep = step;
        
        const runLoop = () => {
            if (!this.flowState.isLooping || !this.currentFlow) return;
            
            if (step.onLoop) {
                step.onLoop(this.flowState);
            }
            
            // Continue loop
            if (this.flowState.isLooping) {
                setTimeout(runLoop, step.loopInterval || 1500);
            }
        };
        
        runLoop();
    }
    
    /**
     * Stop loop step
     */
    stopLoop() {
        this.flowState.isLooping = false;
    }
    
    /**
     * Start silence timer
     */
    startSilenceTimer() {
        this.clearSilenceTimer();
        
        this.silenceTimer = setTimeout(() => {
            this.handleSilence();
        }, this.config.silenceTimeout);
    }
    
    /**
     * Clear silence timer
     */
    clearSilenceTimer() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
    
    /**
     * Handle prolonged silence
     */
    handleSilence() {
        if (!this.currentFlow) return;
        
        const flow = this.flows[this.currentFlow];
        const step = flow.steps[this.flowState.stepIndex];
        
        if (step && step.prompt) {
            this.speak("I'm still listening. " + step.prompt);
            this.startSilenceTimer();
        }
    }
    
    /**
     * Suggest UI fallback
     */
    suggestUIFallback(reason) {
        console.log(`[ConversationFlow] Suggesting UI fallback: ${reason}`);
        
        this.speak(
            "I'm having trouble hearing you. Please take help from someone nearby or use the screen controls.",
            'slow_calm'
        );
        
        if (this.onSuggestUIFallback) {
            this.onSuggestUIFallback(reason, this.currentFlow);
        }
        
        this.resetCounters();
    }
    
    /**
     * Provide contextual help
     */
    provideContextualHelp() {
        if (!this.currentFlow) {
            this.speak(
                "You can say: Navigation to go somewhere. Reading to read text. " +
                "Bus detection to find your bus. Describe to understand surroundings. " +
                "Or say emergency for help."
            );
            return;
        }
        
        const flow = this.flows[this.currentFlow];
        const step = flow.steps[this.flowState.stepIndex];
        
        let help = `You are in ${flow.name} mode. `;
        
        switch (step?.expectedType) {
            case 'confirmation':
                help += "Say yes to continue or no to cancel.";
                break;
            case 'destination':
                help += "Say the name of where you want to go.";
                break;
            case 'bus_number':
                help += "Say the number of the bus you're waiting for.";
                break;
            default:
                help += "Say cancel to stop, or repeat to hear again.";
        }
        
        this.speak(help);
    }
    
    /**
     * Reset tracking counters
     */
    resetCounters() {
        this.repeatCount = 0;
        this.misunderstandingCount = 0;
    }
    
    /**
     * Trim conversation history
     */
    trimHistory() {
        while (this.conversationHistory.length > this.config.maxHistoryLength) {
            this.conversationHistory.shift();
        }
    }
    
    /**
     * Speak with optional style
     */
    speak(text, style = 'normal') {
        // Add to history
        this.conversationHistory.push({
            role: 'assistant',
            text: text,
            timestamp: Date.now()
        });
        this.trimHistory();
        
        if (this.onSpeak) {
            this.onSpeak(text, style);
        } else if (typeof speechManager !== 'undefined') {
            // Adjust speech based on style
            let rate = 1.0;
            if (style === 'slow_calm') {
                rate = 0.85;
            } else if (style === 'urgent') {
                rate = 1.2;
            }
            
            const originalRate = speechManager.settings.rate;
            speechManager.settings.rate = rate;
            speechManager.speak(text, true);
            speechManager.settings.rate = originalRate;
        }
    }
    
    // ===== FLOW HANDLERS =====
    
    /**
     * Handle navigation destination response
     */
    handleNavigationDestination(destination, context) {
        context.destination = destination;
        
        // Look up destination info (would integrate with navigation service)
        context.destinationInfo = {
            name: destination,
            distance: '120 meters', // Would be real data
            direction: 'ahead'
        };
        
        // Update next step's prompt dynamically
        const flow = this.flows['navigation'];
        flow.steps[1].prompt = `Nearest ${destination} is ${context.destinationInfo.distance} ${context.destinationInfo.direction}. Should I start navigation?`;
        
        return 'advance';
    }
    
    /**
     * Handle navigation confirmation
     */
    handleNavigationConfirmation(confirmed, context) {
        if (confirmed) {
            return 'advance';
        } else {
            return 'cancel';
        }
    }
    
    /**
     * Start navigation action
     */
    startNavigationAction(context) {
        console.log('[ConversationFlow] Starting navigation to:', context.destination);
        
        // Integrate with navigation mode
        if (typeof navigationMode !== 'undefined') {
            navigationMode.startNavigationTo(context.destination);
        }
    }
    
    /**
     * Check reading conditions
     */
    checkReadingConditions(context) {
        // Would check actual camera/lighting conditions
        const conditions = {
            lighting: 'good', // 'good', 'low', 'poor'
            stability: 'stable', // 'stable', 'unstable'
            textVisible: true
        };
        
        context.conditions = conditions;
        
        if (conditions.lighting === 'low') {
            return { skip: false, prompt: 'Lighting is low. Move closer or find better light.' };
        }
        
        if (conditions.lighting === 'poor') {
            return { 
                skip: false, 
                prompt: 'Text is unclear. Would you like help from someone nearby or use the screen view?' 
            };
        }
        
        return { skip: true };
    }
    
    /**
     * Start reading action
     */
    startReadingAction(context) {
        console.log('[ConversationFlow] Starting reading mode');
        
        if (typeof readingMode !== 'undefined') {
            readingMode.captureAndRead();
        }
    }
    
    /**
     * Initialize walking mode
     */
    initWalkingMode(context) {
        console.log('[ConversationFlow] Initializing walking mode');
        context.walkingActive = true;
    }
    
    /**
     * Walking guidance loop
     */
    walkingGuidanceLoop(context) {
        // Would integrate with actual walking mode detection
        // Only speak when needed
    }
    
    /**
     * Assess emergency
     */
    assessEmergency(emergencyType, context) {
        context.emergencyType = emergencyType;
        
        const flow = this.flows['emergency'];
        
        switch (emergencyType) {
            case 'fire':
                flow.steps[1].prompt = 'Fire emergency. I am calling emergency services. ' +
                    'Stay low to avoid smoke. Can you exit the building safely?';
                break;
            case 'medical':
                flow.steps[1].prompt = 'Medical emergency. Are you injured or is someone else hurt?';
                break;
            case 'police':
                flow.steps[1].prompt = 'I understand you may be in danger. Are you safe to speak?';
                break;
            default:
                flow.steps[1].prompt = 'I am here to help. Tell me more about what is happening.';
        }
        
        return 'advance';
    }
    
    /**
     * Emergency help loop
     */
    emergencyHelpLoop(context) {
        // Provide ongoing emergency support based on type
        const type = context.emergencyType || 'general';
        
        // Don't repeat too frequently
        if (context.lastHelpTime && Date.now() - context.lastHelpTime < 30000) {
            return;
        }
        context.lastHelpTime = Date.now();
        
        if (context.silentMode) {
            // In silent mode, just maintain connection
            return;
        }
        
        let guidance = '';
        
        switch (type) {
            case 'fire':
                guidance = 'Stay low to avoid smoke. ' +
                    'Feel doors before opening. If hot, find another exit. ' +
                    'Call out your location if trapped. ' +
                    'Say "I\'m trapped" or "I\'m safe" to update me.';
                break;
                
            case 'medical':
                guidance = 'Try to stay calm and breathe slowly. ' +
                    'If you can, sit or lie down safely. ' +
                    'Help is on the way. ' +
                    'Tell me if your condition changes.';
                break;
                
            case 'police':
                guidance = 'Try to get to a safe location if possible. ' +
                    'Stay on the line. ' +
                    'If someone approaches, I can alert authorities. ' +
                    'Say "someone is here" if you see anyone.';
                break;
                
            default:
                guidance = 'I am here with you. ' +
                    'Help is being coordinated. ' +
                    'Stay as calm as you can. ' +
                    'Talk to me if anything changes.';
        }
        
        this.speak(guidance, 'slow_calm');
    }
    
    /**
     * Handle emergency trigger
     */
    handleEmergencyTrigger(trigger) {
        // Interrupt all other speech
        if (typeof speechManager !== 'undefined') {
            speechManager.stopSpeaking();
        }
        
        let prompt = '';
        
        switch (trigger) {
            case 'scream':
                prompt = 'I detected a distress sound. Are you okay? Say "help" if you need assistance.';
                break;
            case 'panic_tone':
                prompt = 'I sense you may be in distress. How can I help you?';
                break;
            case 'fall':
                prompt = 'I detected a possible fall. Are you hurt? Say "help" or "I\'m okay".';
                break;
            default:
                prompt = 'I hear you. Stay calm. What kind of emergency?';
        }
        
        this.speak(prompt, 'slow_calm');
    }
    
    /**
     * Handle emergency flow start
     */
    handleEmergencyStart(context) {
        // Log emergency trigger
        context.triggerTime = Date.now();
        context.trigger = context.trigger || 'voice';
        
        // Activate emergency mode in background
        if (typeof emergencyMode !== 'undefined' && !emergencyMode.isActive) {
            emergencyMode.start();
        }
        
        // Set initial prompt based on trigger
        const flow = this.flows['emergency'];
        if (context.trigger === 'scream') {
            flow.steps[0].prompt = 'I detected a distress sound. Are you okay? Say "help" if you need assistance.';
        } else if (context.trigger === 'fall') {
            flow.steps[0].prompt = 'I detected a possible fall. Are you hurt?';
        } else {
            flow.steps[0].prompt = 'I hear you. Stay calm. What kind of emergency is this?';
        }
    }
    
    /**
     * Handle safety check response
     */
    handleSafetyCheck(isSafe, context) {
        context.isSafeToSpeak = isSafe;
        
        if (isSafe) {
            return 'advance';
        } else {
            // User not safe to speak - provide silent options
            this.speak(
                'I understand. I will speak quietly. Tap the screen twice for help, or stay on the line. ' +
                'I am tracking your location.',
                'slow_calm'
            );
            
            // Enable silent mode
            context.silentMode = true;
            
            // Automatically alert emergency services after delay
            setTimeout(() => {
                if (this.currentFlow === 'emergency' && context.silentMode) {
                    this.speak('Alerting emergency services with your location.', 'slow_calm');
                    if (typeof emergencyMode !== 'undefined') {
                        emergencyMode.alertEmergencyServices?.();
                    }
                }
            }, 10000);
            
            return 'advance';
        }
    }
    
    /**
     * Handle bus number response
     */
    handleBusNumber(busNumber, context) {
        context.busNumber = busNumber;
        
        const flow = this.flows['bus_detection'];
        flow.steps[1].prompt = `You're waiting for bus ${busNumber}. Is that correct?`;
        
        return 'advance';
    }
    
    /**
     * Handle bus confirmation
     */
    handleBusConfirmation(confirmed, context) {
        if (confirmed) {
            return 'advance';
        } else {
            // Go back to ask for bus number
            this.flowState.stepIndex = 0;
            return 'repeat';
        }
    }
    
    /**
     * Bus watch loop
     */
    busWatchLoop(context) {
        // Would integrate with bus detection mode
    }
    
    /**
     * Describe scene
     */
    describeScene(context) {
        console.log('[ConversationFlow] Describing scene');
        
        if (typeof sceneDescribeMode !== 'undefined') {
            sceneDescribeMode.describeNow();
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return {
            currentFlow: this.currentFlow,
            flowState: { ...this.flowState },
            conversationHistory: [...this.conversationHistory],
            repeatCount: this.repeatCount,
            misunderstandingCount: this.misunderstandingCount
        };
    }
}

// Export singleton instance
const conversationFlowManager = new ConversationFlowManager();
