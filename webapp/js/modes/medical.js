/**
 * BlindNav+ Enhanced Medical Mode
 * Comprehensive medical emergency assistance with guided response,
 * symptom assessment, medication help, and emergency coordination
 */

class MedicalMode {
    constructor() {
        this.isActive = false;
        this.emergencyLevel = 'normal'; // normal, urgent, critical
        this.sessionStartTime = null;
        
        // Current medical situation
        this.currentSituation = {
            type: null,
            symptoms: [],
            severity: 'unknown',
            timeReported: null,
            guidanceProvided: []
        };
        
        // Medical contacts
        this.medicalContacts = {
            doctor: null,
            hospital: null,
            pharmacy: null,
            caregiver: null
        };
        
        // User medical info (stored locally)
        this.userMedicalInfo = {
            conditions: [],
            medications: [],
            allergies: [],
            bloodType: null,
            emergencyNotes: null
        };
        
        // Load saved medical info
        this.loadMedicalInfo();
        
        // Emergency types with keywords
        this.emergencyTypes = {
            cardiac: {
                keywords: ['chest', 'heart', 'chest pain', 'heart attack', 'cardiac'],
                severity: 'critical',
                handler: 'handleCardiacEmergency'
            },
            respiratory: {
                keywords: ['breathe', 'breathing', 'can\'t breathe', 'asthma', 'choking', 'suffocating'],
                severity: 'critical',
                handler: 'handleRespiratoryEmergency'
            },
            stroke: {
                keywords: ['stroke', 'face drooping', 'arm weak', 'speech', 'slurred'],
                severity: 'critical',
                handler: 'handleStrokeEmergency'
            },
            fall: {
                keywords: ['fell', 'fallen', 'fall', 'tripped', 'slipped'],
                severity: 'urgent',
                handler: 'handleFallEmergency'
            },
            bleeding: {
                keywords: ['bleeding', 'blood', 'cut', 'wound', 'laceration'],
                severity: 'urgent',
                handler: 'handleBleedingEmergency'
            },
            allergic: {
                keywords: ['allergic', 'allergy', 'reaction', 'anaphylaxis', 'hives', 'swelling'],
                severity: 'critical',
                handler: 'handleAllergicEmergency'
            },
            diabetic: {
                keywords: ['diabetes', 'diabetic', 'blood sugar', 'insulin', 'glucose', 'hypoglycemia', 'hyperglycemia'],
                severity: 'urgent',
                handler: 'handleDiabeticEmergency'
            },
            seizure: {
                keywords: ['seizure', 'convulsion', 'epilepsy', 'shaking', 'fitting'],
                severity: 'critical',
                handler: 'handleSeizureEmergency'
            },
            overdose: {
                keywords: ['overdose', 'too much', 'took too many', 'poisoning', 'poison'],
                severity: 'critical',
                handler: 'handleOverdoseEmergency'
            },
            dizziness: {
                keywords: ['dizzy', 'faint', 'lightheaded', 'vertigo', 'passing out'],
                severity: 'moderate',
                handler: 'handleDizzinessEmergency'
            },
            headache: {
                keywords: ['headache', 'migraine', 'head hurts', 'severe headache'],
                severity: 'moderate',
                handler: 'handleHeadacheEmergency'
            },
            burn: {
                keywords: ['burn', 'burned', 'scalded', 'hot'],
                severity: 'urgent',
                handler: 'handleBurnEmergency'
            }
        };

        // Vital signs check prompts
        this.vitalChecks = {
            consciousness: 'Are you alert and aware? Can you tell me your name?',
            breathing: 'Are you breathing normally? Is your breathing fast, slow, or labored?',
            pain: 'On a scale of 1 to 10, how severe is your pain?',
            mobility: 'Can you move all your limbs? Is there any numbness?'
        };

        // First aid instructions database
        this.firstAidInstructions = {
            cpr_adult: [
                'Place the person on their back on a firm surface.',
                'Kneel beside them at chest level.',
                'Place the heel of one hand on the center of the chest, between the nipples.',
                'Place your other hand on top, interlocking fingers.',
                'Keep arms straight and push hard and fast, about 2 inches deep.',
                'Push at a rate of 100 to 120 compressions per minute.',
                'If trained, give 2 rescue breaths after every 30 compressions.',
                'Continue until help arrives or the person responds.'
            ],
            recovery_position: [
                'Kneel beside the person.',
                'Place their arm nearest to you at a right angle to their body.',
                'Bring their far arm across their chest and hold their hand against their cheek.',
                'With your other hand, pull their far knee up so their foot is flat on the ground.',
                'Pull on the raised knee to roll them toward you.',
                'Tilt their head back to keep the airway open.',
                'Adjust the hand under their cheek if needed.'
            ],
            choking_adult: [
                'Stand behind the person and wrap your arms around their waist.',
                'Make a fist with one hand.',
                'Place the thumb side of your fist just above their belly button.',
                'Grab your fist with your other hand.',
                'Give quick, upward thrusts into the abdomen.',
                'Repeat until the object is expelled or the person can breathe.'
            ]
        };
    }

    /**
     * Start medical mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Medical mode is already active.', true);
            return;
        }

        this.isActive = true;
        this.sessionStartTime = Date.now();
        this.currentSituation = {
            type: null,
            symptoms: [],
            severity: 'unknown',
            timeReported: null,
            guidanceProvided: []
        };

        console.log('[Medical] Mode started');

        const welcome = `Medical Mode activated. I am here to help you with medical situations.
            
            If you are having a life-threatening emergency, say "call 911" immediately.
            
            Tell me what's happening. For example, say:
            "I have chest pain"
            "I can't breathe"
            "I fell down"
            "I'm bleeding"
            "I'm having an allergic reaction"
            "I feel dizzy"
            "I need help with my medication"
            
            Other commands:
            Say "call 911" or "call emergency" to dial emergency services.
            Say "call my doctor" to call your saved doctor number.
            Say "my medications" to hear your medication list.
            Say "my allergies" to hear your allergy list.
            Say "I'm feeling better" when your situation improves.
            Say "stop" or "exit" to end medical mode.
            
            What medical situation can I help you with?`;

        speechManager.speak(welcome, true, 2);
        
        this.updateUI(true);

        // Start system check for emergency readiness
        this.checkEmergencyReadiness();

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('warning');
        }
    }

    /**
     * Stop medical mode
     */
    stop() {
        if (!this.isActive) return;

        // Warn if in critical situation
        if (this.emergencyLevel === 'critical') {
            speechManager.speak(
                'Warning: You are in a critical medical situation. ' +
                'Are you sure you want to exit? Say "yes exit" to confirm.',
                true
            );
            return;
        }

        this.isActive = false;
        this.emergencyLevel = 'normal';
        
        const duration = Math.round((Date.now() - this.sessionStartTime) / 1000 / 60);
        
        speechManager.speak(
            `Medical mode ended. Session lasted ${duration > 0 ? duration + ' minutes' : 'less than a minute'}. ` +
            `If you need medical help again, say "medical" or "I need medical help". ` +
            `Take care and feel better soon.`,
            true
        );

        this.updateUI(false);
        console.log('[Medical] Mode stopped');
    }

    /**
     * Force stop (for critical exit)
     */
    forceStop() {
        this.isActive = false;
        this.emergencyLevel = 'normal';
        speechManager.speak('Medical mode ended.', true);
        this.updateUI(false);
    }

    /**
     * Check emergency readiness
     */
    checkEmergencyReadiness() {
        if (typeof systemDiagnostics !== 'undefined') {
            const ready = systemDiagnostics.isEmergencyReady();
            if (ready.issues.length > 0) {
                console.log('[Medical] Emergency readiness issues:', ready.issues);
            }
        }
    }

    /**
     * Handle voice command
     */
    handleVoiceCommand(command) {
        const cmd = command.toLowerCase();

        // Emergency calls - highest priority
        if (cmd.includes('call 911') || cmd.includes('call emergency') || 
            cmd.includes('dial 911') || cmd.includes('ambulance')) {
            this.initiateEmergencyCall();
            return true;
        }

        // Call doctor
        if (cmd.includes('call doctor') || cmd.includes('call my doctor')) {
            this.callDoctor();
            return true;
        }

        // Feeling better
        if (cmd.includes('feeling better') || cmd.includes('i\'m better') || 
            cmd.includes('i am better') || cmd.includes('i\'m okay')) {
            this.handleFeelingBetter();
            return true;
        }

        // Check medical info
        if (cmd.includes('my medication') || cmd.includes('my medicine')) {
            this.readMedications();
            return true;
        }
        if (cmd.includes('my allerg')) {
            this.readAllergies();
            return true;
        }
        if (cmd.includes('my condition')) {
            this.readConditions();
            return true;
        }

        // First aid instructions
        if (cmd.includes('how to') || cmd.includes('show me') || cmd.includes('teach me')) {
            if (cmd.includes('cpr')) {
                this.provideFirstAidInstructions('cpr_adult');
                return true;
            }
            if (cmd.includes('recovery position')) {
                this.provideFirstAidInstructions('recovery_position');
                return true;
            }
            if (cmd.includes('choking')) {
                this.provideFirstAidInstructions('choking_adult');
                return true;
            }
        }

        // Pain scale
        if (cmd.includes('pain') && (cmd.includes('scale') || /\d/.test(cmd))) {
            const painLevel = cmd.match(/\d+/);
            if (painLevel) {
                this.recordPainLevel(parseInt(painLevel[0]));
                return true;
            }
        }

        // Force exit
        if (cmd.includes('yes exit') || cmd.includes('force exit')) {
            this.forceStop();
            return true;
        }

        // Normal exit
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('quit')) {
            this.stop();
            return true;
        }

        // Check for emergency type keywords
        for (const [type, config] of Object.entries(this.emergencyTypes)) {
            for (const keyword of config.keywords) {
                if (cmd.includes(keyword)) {
                    this.currentSituation.type = type;
                    this.currentSituation.timeReported = Date.now();
                    this.emergencyLevel = config.severity;
                    
                    // Call the appropriate handler
                    if (this[config.handler]) {
                        this[config.handler]();
                        return true;
                    }
                }
            }
        }

        // General help request
        if (cmd.includes('help') || cmd.includes('what should i do')) {
            this.provideGeneralGuidance();
            return true;
        }

        // Default response
        speechManager.speak(
            'I understand you need help. Can you tell me more specifically what\'s happening? ' +
            'For example, are you in pain? Having trouble breathing? Did you fall? ' +
            'If this is an emergency, say "call 911".',
            true
        );
        return true;
    }

    /**
     * Handle cardiac emergency (chest pain, heart attack)
     */
    handleCardiacEmergency() {
        this.emergencyLevel = 'critical';
        this.currentSituation.symptoms.push('chest_pain');

        const guidance = `This could be a heart attack. This is serious. Follow these steps immediately:

            STEP 1: Stop all activity right now. Sit down or lie down.
            
            STEP 2: Try to stay calm. Take slow, deep breaths.
            
            STEP 3: If you have aspirin and are NOT allergic to it, chew one regular aspirin. 
            This can help if it's a heart attack.
            
            STEP 4: Loosen any tight clothing around your chest and neck.
            
            STEP 5: If you have nitroglycerin prescribed for heart problems, take it now.
            
            DO NOT IGNORE CHEST PAIN.
            
            I strongly recommend calling 911 immediately. Say "call 911" and I will help you.
            
            Symptoms of a heart attack include: pressure or squeezing in the chest,
            pain spreading to the arm, jaw, or back, shortness of breath, 
            cold sweat, nausea, or lightheadedness.
            
            Are you experiencing any of these? Should I call 911 for you?`;

        speechManager.speak(guidance, true, 3);
        this.currentSituation.guidanceProvided.push('cardiac_guidance');

        // Haptic alert
        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Handle respiratory emergency (breathing difficulty)
     */
    handleRespiratoryEmergency() {
        this.emergencyLevel = 'critical';
        this.currentSituation.symptoms.push('breathing_difficulty');

        const guidance = `Breathing problems need immediate attention. Listen carefully:

            STEP 1: Stay as calm as possible. Panic makes breathing harder.
            
            STEP 2: Sit upright. Do NOT lie flat - sitting helps you breathe better.
            
            STEP 3: Try pursed lip breathing: Breathe in slowly through your nose for 2 seconds.
            Then purse your lips like you're whistling, and breathe out slowly for 4 seconds.
            
            STEP 4: If you have an inhaler or nebulizer, use it now.
            
            STEP 5: Loosen any tight clothing around your neck and chest.
            
            STEP 6: Open a window or door if possible to get fresh air.
            
            If you're choking on something, say "choking" and I'll give you specific instructions.
            
            If breathing doesn't improve in the next minute or gets worse,
            say "call 911" immediately.
            
            I'm here with you. Try to breathe slowly. In through the nose, out through the mouth.`;

        speechManager.speak(guidance, true, 3);
        this.currentSituation.guidanceProvided.push('respiratory_guidance');

        // Follow up after 30 seconds
        setTimeout(() => {
            if (this.isActive && this.currentSituation.type === 'respiratory') {
                speechManager.speak(
                    'How is your breathing now? Is it better, the same, or worse? ' +
                    'Say "better", "same", or "worse". If it\'s worse, say "call 911".',
                    true
                );
            }
        }, 30000);
    }

    /**
     * Handle stroke emergency
     */
    handleStrokeEmergency() {
        this.emergencyLevel = 'critical';
        this.currentSituation.symptoms.push('stroke_symptoms');

        const guidance = `Stroke is a medical emergency. Every minute counts! 
            Remember the word FAST:

            F - FACE: Is one side of the face drooping? Try to smile.
            A - ARMS: Can you raise both arms? Does one drift down?
            S - SPEECH: Is speech slurred or strange?
            T - TIME: If ANY of these are present, call 911 IMMEDIATELY!

            While waiting for help:
            
            STEP 1: Note the time when symptoms started. Tell the paramedics.
            
            STEP 2: Lie down with your head slightly elevated.
            
            STEP 3: Do NOT eat or drink anything - you might have trouble swallowing.
            
            STEP 4: Loosen any restrictive clothing.
            
            STEP 5: If you're vomiting, turn on your side to prevent choking.
            
            STEP 6: Stay as calm and still as possible.
            
            Time is critical with strokes. The faster you get treatment, 
            the better your chances of recovery.
            
            Say "call 911" now. This is an emergency.`;

        speechManager.speak(guidance, true, 3);
        this.currentSituation.guidanceProvided.push('stroke_guidance');

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Handle fall emergency
     */
    handleFallEmergency() {
        this.emergencyLevel = 'urgent';
        this.currentSituation.symptoms.push('fall');

        const guidance = `I'm sorry you've fallen. Let me help you assess the situation.

            STEP 1: Don't try to get up immediately. Take a moment to assess.
            
            STEP 2: Check for injuries. Can you move your arms? Your legs?
            
            STEP 3: Do you feel severe pain anywhere, especially your head, neck, or back?
            
            IMPORTANT: If you hit your head, feel severe pain in your neck or back,
            or cannot move a limb, DO NOT MOVE. Say "call 911" for help.
            
            If you feel okay to move:
            
            STEP 4: Roll slowly onto your side.
            
            STEP 5: Rest for a moment in that position.
            
            STEP 6: Get onto your hands and knees.
            
            STEP 7: Crawl to a sturdy piece of furniture like a chair.
            
            STEP 8: Put your hands on the furniture and slowly rise to a kneeling position.
            
            STEP 9: Put your stronger leg forward and push up to standing.
            
            Take your time. There's no rush.
            
            Are you injured? Tell me where it hurts, or say "I'm okay" if you're not hurt.`;

        speechManager.speak(guidance, true, 2);
        this.currentSituation.guidanceProvided.push('fall_guidance');
    }

    /**
     * Handle bleeding emergency
     */
    handleBleedingEmergency() {
        this.emergencyLevel = 'urgent';
        this.currentSituation.symptoms.push('bleeding');

        const guidance = `For bleeding, here's what to do:

            STEP 1: Apply firm, direct pressure to the wound.
            Use a clean cloth, towel, bandage, or even clothing.
            
            STEP 2: Keep pressing firmly for at least 10 to 15 minutes.
            Do not lift to check - this disrupts clotting.
            
            STEP 3: If possible, elevate the injured area above your heart level.
            This slows blood flow to the wound.
            
            STEP 4: If blood soaks through, add more cloth on TOP.
            Do NOT remove the first layer.
            
            STEP 5: Once bleeding slows, wrap the wound with a bandage.
            Not too tight - you should be able to slip a finger underneath.
            
            For SEVERE bleeding with spurting blood or a deep wound:
            Call 911 immediately. Say "call 911".
            Apply a tourniquet above the wound if you know how.
            Keep pressure on the wound until help arrives.
            
            Where are you bleeding from? Is it a small cut or a larger wound?`;

        speechManager.speak(guidance, true, 2);
        this.currentSituation.guidanceProvided.push('bleeding_guidance');
    }

    /**
     * Handle allergic reaction emergency
     */
    handleAllergicEmergency() {
        this.emergencyLevel = 'critical';
        this.currentSituation.symptoms.push('allergic_reaction');

        const guidance = `Allergic reactions can become dangerous quickly. Pay attention to these warning signs:

            SEVERE (Call 911 immediately if you have ANY of these):
            - Swelling of face, lips, tongue, or throat
            - Difficulty breathing or swallowing
            - Feeling like your throat is closing
            - Dizziness or fainting
            - Rapid heartbeat
            
            If you have an EpiPen or epinephrine auto-injector:
            
            STEP 1: Remove the safety cap.
            STEP 2: Hold it firmly with the orange tip pointing down.
            STEP 3: Press firmly against your outer thigh - through clothing is okay.
            STEP 4: Hold for 10 seconds.
            STEP 5: Even after using the EpiPen, call 911. You still need medical care.
            
            For MILD reactions (hives, itching, minor swelling):
            
            STEP 1: Take an antihistamine if you have one, like Benadryl.
            STEP 2: Apply cool compresses to itchy areas.
            STEP 3: Avoid the allergen.
            STEP 4: Watch carefully for any worsening symptoms.
            
            Do you have an EpiPen? Are you having trouble breathing?`;

        speechManager.speak(guidance, true, 3);
        this.currentSituation.guidanceProvided.push('allergic_guidance');

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Handle diabetic emergency
     */
    handleDiabeticEmergency() {
        this.emergencyLevel = 'urgent';
        this.currentSituation.symptoms.push('diabetic_issue');

        const guidance = `For a diabetic emergency, first try to determine if blood sugar is HIGH or LOW.

            LOW BLOOD SUGAR symptoms (hypoglycemia):
            - Shakiness, trembling
            - Sweating
            - Hunger
            - Confusion
            - Fast heartbeat
            - Irritability
            
            If LOW blood sugar, follow the 15-15 rule:
            STEP 1: Eat or drink 15 grams of fast-acting sugar:
            - 4 glucose tablets
            - Half cup (4 oz) of fruit juice or regular soda
            - 1 tablespoon of sugar or honey
            - 5-6 hard candies
            
            STEP 2: Wait 15 minutes.
            STEP 3: Check blood sugar if possible.
            STEP 4: Repeat if still low.
            
            HIGH BLOOD SUGAR symptoms (hyperglycemia):
            - Excessive thirst
            - Frequent urination
            - Blurred vision
            - Fatigue
            - Fruity-smelling breath
            
            If HIGH blood sugar:
            STEP 1: Drink water to stay hydrated.
            STEP 2: Take your insulin if prescribed.
            STEP 3: Check ketones if possible.
            
            If you're confused, losing consciousness, or have fruity breath,
            this could be diabetic ketoacidosis - call 911 immediately.
            
            Do you think your blood sugar is high or low?`;

        speechManager.speak(guidance, true, 2);
        this.currentSituation.guidanceProvided.push('diabetic_guidance');
    }

    /**
     * Handle seizure emergency
     */
    handleSeizureEmergency() {
        this.emergencyLevel = 'critical';
        this.currentSituation.symptoms.push('seizure');

        const guidance = `Seizures require careful response. Here's what to do:

            If YOU are having warning signs of a seizure:
            STEP 1: Sit or lie down immediately in a safe place.
            STEP 2: Move away from hard or sharp objects.
            STEP 3: If possible, put something soft under your head.
            STEP 4: Alert someone nearby if you can.
            
            If you're HELPING someone having a seizure:
            STEP 1: Stay calm. Most seizures end on their own.
            STEP 2: Clear the area of dangerous objects.
            STEP 3: Gently guide them to the ground if they're standing.
            STEP 4: Put something soft under their head.
            STEP 5: Turn them on their side to prevent choking.
            STEP 6: Time the seizure.
            
            DO NOT:
            - Put anything in their mouth
            - Hold them down or try to stop movements
            - Give food or water until fully recovered
            
            Call 911 if:
            - Seizure lasts more than 5 minutes
            - Person doesn't regain consciousness
            - Another seizure follows
            - Person is injured
            - It's their first seizure
            - Person has difficulty breathing
            
            Are you having a seizure now, or helping someone?`;

        speechManager.speak(guidance, true, 3);
        this.currentSituation.guidanceProvided.push('seizure_guidance');
    }

    /**
     * Handle overdose emergency
     */
    handleOverdoseEmergency() {
        this.emergencyLevel = 'critical';
        this.currentSituation.symptoms.push('overdose');

        const guidance = `Overdose or poisoning is a medical emergency. Call 911 immediately.

            If conscious and alert:
            STEP 1: Do NOT induce vomiting unless told to by poison control.
            STEP 2: Try to identify what was taken, how much, and when.
            STEP 3: Call Poison Control at 1-800-222-1222.
            
            Signs of overdose to watch for:
            - Extreme drowsiness or unconsciousness
            - Slow, shallow, or stopped breathing
            - Small, pinpoint pupils (opioids)
            - Blue lips or fingertips
            - Cold, clammy skin
            - Vomiting
            - Seizures
            
            If someone is unconscious:
            STEP 1: Call 911 immediately.
            STEP 2: Check if they're breathing.
            STEP 3: If not breathing, begin CPR if trained.
            STEP 4: Put them in the recovery position if breathing.
            STEP 5: If you have Narcan (naloxone) and suspect opioids, use it.
            
            Stay with the person until help arrives.
            
            What substance was involved? When was it taken?
            Say "call 911" to call emergency services now.`;

        speechManager.speak(guidance, true, 3);
        this.currentSituation.guidanceProvided.push('overdose_guidance');

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Handle dizziness/fainting
     */
    handleDizzinessEmergency() {
        this.emergencyLevel = 'moderate';
        this.currentSituation.symptoms.push('dizziness');

        const guidance = `Dizziness can have many causes. Let's help you feel better:

            STEP 1: Sit or lie down immediately to prevent falling.
            
            STEP 2: If sitting, put your head between your knees.
            
            STEP 3: Take slow, deep breaths.
            
            STEP 4: Drink some water if you have it nearby.
            Dehydration is a common cause of dizziness.
            
            STEP 5: Avoid sudden movements when you start to feel better.
            
            Common causes of dizziness:
            - Dehydration
            - Low blood sugar (have you eaten recently?)
            - Standing up too quickly
            - Inner ear problems
            - Medication side effects
            - Anxiety or stress
            
            Warning signs that need immediate medical attention:
            - Chest pain along with dizziness
            - Difficulty speaking or confusion
            - Weakness on one side of your body
            - Severe headache
            - High fever
            
            If you experience any of these, say "call 911".
            
            How long have you been feeling dizzy? Have you eaten or had water today?`;

        speechManager.speak(guidance, true, 2);
        this.currentSituation.guidanceProvided.push('dizziness_guidance');
    }

    /**
     * Handle headache emergency
     */
    handleHeadacheEmergency() {
        this.emergencyLevel = 'moderate';
        this.currentSituation.symptoms.push('headache');

        const guidance = `For your headache, let's first rule out anything serious.

            CALL 911 IMMEDIATELY if your headache:
            - Is the worst headache of your life
            - Came on suddenly and severely (thunderclap headache)
            - Is accompanied by fever, stiff neck, confusion, or seizure
            - Follows a head injury
            - Is accompanied by weakness, numbness, or vision problems
            
            For a typical headache or migraine:
            
            STEP 1: Rest in a quiet, dark room if possible.
            
            STEP 2: Apply a cold pack to your forehead or temples.
            
            STEP 3: Take over-the-counter pain relievers if you have them:
            acetaminophen, ibuprofen, or aspirin.
            
            STEP 4: Drink water - dehydration causes headaches.
            
            STEP 5: Try to relax - stress and tension cause headaches.
            
            For migraines:
            - Avoid bright lights and loud sounds
            - Caffeine may help (coffee or tea)
            - Use any prescribed migraine medication
            
            Is this a typical headache for you, or is it different from usual?
            How severe is the pain on a scale of 1 to 10?`;

        speechManager.speak(guidance, true, 2);
        this.currentSituation.guidanceProvided.push('headache_guidance');
    }

    /**
     * Handle burn emergency
     */
    handleBurnEmergency() {
        this.emergencyLevel = 'urgent';
        this.currentSituation.symptoms.push('burn');

        const guidance = `For a burn, here's what to do:

            STEP 1: Remove from the heat source immediately.
            
            STEP 2: Cool the burn under cool (not cold) running water for at least 10 minutes.
            This is the most important step!
            
            STEP 3: Remove any jewelry or tight clothing near the burn 
            before swelling starts.
            
            STEP 4: Do NOT apply ice, butter, or toothpaste to burns.
            These can make it worse.
            
            STEP 5: After cooling, cover loosely with a clean, dry bandage 
            or cling wrap.
            
            STEP 6: Take an over-the-counter pain reliever if needed.
            
            Seek emergency care (call 911) for:
            - Burns larger than 3 inches
            - Burns on the face, hands, feet, or genitals
            - Burns that go all around a limb
            - Burns that appear deep (white or charred)
            - Electrical or chemical burns
            - Burns with difficulty breathing (smoke inhalation)
            
            How large is the burn? What caused it?`;

        speechManager.speak(guidance, true, 2);
        this.currentSituation.guidanceProvided.push('burn_guidance');
    }

    /**
     * Initiate emergency call
     */
    initiateEmergencyCall() {
        this.emergencyLevel = 'critical';

        speechManager.speak(
            'Calling 911 emergency services. When connected, clearly state: ' +
            '"I need medical help" and describe your situation. ' +
            'Give your location if possible. Opening phone dialer now.',
            true, 2
        );

        // Get location to share
        this.getLocationForEmergency();

        setTimeout(() => {
            window.location.href = 'tel:911';
        }, 3000);

        if (Utils && Utils.hapticFeedback) {
            Utils.hapticFeedback('error');
        }
    }

    /**
     * Get location for emergency services
     */
    async getLocationForEmergency() {
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const { latitude, longitude } = position.coords;
                    speechManager.speak(
                        `Your location: Latitude ${latitude.toFixed(4)}, Longitude ${longitude.toFixed(4)}. ` +
                        `Tell this to the emergency operator.`,
                        false
                    );
                }, (error) => {
                    console.error('[Medical] Location error:', error);
                });
            }
        } catch (error) {
            console.error('[Medical] Location error:', error);
        }
    }

    /**
     * Call doctor
     */
    callDoctor() {
        if (this.medicalContacts.doctor) {
            speechManager.speak(`Calling your doctor at ${this.medicalContacts.doctor}.`, true);
            window.location.href = `tel:${this.medicalContacts.doctor}`;
        } else {
            speechManager.speak(
                'Your doctor\'s number is not saved. ' +
                'Say "call 911" for emergency services, or add your doctor\'s number in settings.',
                true
            );
        }
    }

    /**
     * Handle user feeling better
     */
    handleFeelingBetter() {
        this.emergencyLevel = 'normal';
        
        speechManager.speak(
            'I\'m glad you\'re feeling better. Continue to rest and monitor how you feel. ' +
            'If symptoms return or worsen, don\'t hesitate to ask for help. ' +
            'Would you like to exit medical mode? Say "stop" to return to normal.',
            true
        );
    }

    /**
     * Record pain level
     */
    recordPainLevel(level) {
        this.currentSituation.symptoms.push(`pain_level_${level}`);
        
        if (level >= 8) {
            this.emergencyLevel = 'critical';
            speechManager.speak(
                `Pain level ${level} is very severe. I strongly recommend calling emergency services. ` +
                `Say "call 911" to get help immediately.`,
                true
            );
        } else if (level >= 5) {
            this.emergencyLevel = 'urgent';
            speechManager.speak(
                `Pain level ${level} noted. This is significant pain. ` +
                `If it's getting worse or you have other concerning symptoms, consider calling for help.`,
                true
            );
        } else {
            speechManager.speak(
                `Pain level ${level} noted. Try to rest and monitor your symptoms. ` +
                `Let me know if the pain increases.`,
                true
            );
        }
    }

    /**
     * Provide first aid instructions
     */
    provideFirstAidInstructions(type) {
        const instructions = this.firstAidInstructions[type];
        if (!instructions) {
            speechManager.speak('I don\'t have instructions for that procedure.', true);
            return;
        }

        let speech = `Here are the steps for ${type.replace(/_/g, ' ')}:\n\n`;
        instructions.forEach((step, index) => {
            speech += `Step ${index + 1}: ${step}\n`;
        });

        speechManager.speak(speech, true, 2);
        this.currentSituation.guidanceProvided.push(`first_aid_${type}`);
    }

    /**
     * Read user medications
     */
    readMedications() {
        if (this.userMedicalInfo.medications.length === 0) {
            speechManager.speak(
                'You have no medications saved. To add medications, use the settings menu.',
                true
            );
        } else {
            const meds = this.userMedicalInfo.medications.join(', ');
            speechManager.speak(`Your saved medications are: ${meds}`, true);
        }
    }

    /**
     * Read user allergies
     */
    readAllergies() {
        if (this.userMedicalInfo.allergies.length === 0) {
            speechManager.speak(
                'You have no allergies saved. To add allergies, use the settings menu.',
                true
            );
        } else {
            const allergies = this.userMedicalInfo.allergies.join(', ');
            speechManager.speak(`Your known allergies are: ${allergies}`, true);
        }
    }

    /**
     * Read user conditions
     */
    readConditions() {
        if (this.userMedicalInfo.conditions.length === 0) {
            speechManager.speak(
                'You have no medical conditions saved. To add conditions, use the settings menu.',
                true
            );
        } else {
            const conditions = this.userMedicalInfo.conditions.join(', ');
            speechManager.speak(`Your medical conditions are: ${conditions}`, true);
        }
    }

    /**
     * Provide general guidance
     */
    provideGeneralGuidance() {
        speechManager.speak(
            'I\'m here to help. Tell me what symptoms you\'re experiencing. ' +
            'For example: "I have chest pain", "I can\'t breathe", "I fell", or "I\'m bleeding". ' +
            'If this is a life-threatening emergency, say "call 911" immediately. ' +
            'The more specific you can be, the better I can help you.',
            true
        );
    }

    /**
     * Load medical info from storage
     */
    loadMedicalInfo() {
        try {
            const saved = localStorage.getItem('blindnav_medical_info');
            if (saved) {
                this.userMedicalInfo = { ...this.userMedicalInfo, ...JSON.parse(saved) };
            }
            const contacts = localStorage.getItem('blindnav_medical_contacts');
            if (contacts) {
                this.medicalContacts = { ...this.medicalContacts, ...JSON.parse(contacts) };
            }
        } catch (e) {
            console.error('[Medical] Could not load medical info:', e);
        }
    }

    /**
     * Save medical info to storage
     */
    saveMedicalInfo() {
        try {
            localStorage.setItem('blindnav_medical_info', JSON.stringify(this.userMedicalInfo));
            localStorage.setItem('blindnav_medical_contacts', JSON.stringify(this.medicalContacts));
        } catch (e) {
            console.error('[Medical] Could not save medical info:', e);
        }
    }

    /**
     * Update UI
     */
    updateUI(active) {
        const modeDisplay = document.getElementById('current-mode');
        const modeInfo = document.getElementById('mode-info');
        const modeContent = document.getElementById('mode-content');

        if (active) {
            if (modeDisplay) modeDisplay.textContent = '🏥 Medical Mode';
            if (modeInfo) {
                modeInfo.innerHTML = `
                    <p><strong>Medical Mode Active</strong></p>
                    <p class="${this.emergencyLevel === 'critical' ? 'danger' : ''}">
                        Level: ${this.emergencyLevel.toUpperCase()}
                    </p>
                    <p>Tell me your medical situation</p>
                `;
            }
            if (modeContent) {
                modeContent.innerHTML = `
                    <div class="medical-display">
                        <div class="medical-status ${this.emergencyLevel}">
                            <span class="medical-icon">🏥</span>
                            <span class="medical-level">${this.emergencyLevel.toUpperCase()}</span>
                        </div>
                        
                        <div class="medical-actions">
                            <button id="call-911-medical" class="btn btn-danger">📞 Call 911</button>
                            <button id="call-doctor" class="btn btn-primary">🩺 Call Doctor</button>
                        </div>
                        
                        <div class="medical-info">
                            <h4>Voice Commands:</h4>
                            <ul>
                                <li>"Call 911" - Emergency services</li>
                                <li>"I have [symptom]" - Get guidance</li>
                                <li>"My medications" - Hear your meds</li>
                                <li>"I'm feeling better" - Update status</li>
                            </ul>
                        </div>
                    </div>
                `;
                
                document.getElementById('call-911-medical')?.addEventListener('click', () => {
                    this.initiateEmergencyCall();
                });
                document.getElementById('call-doctor')?.addEventListener('click', () => {
                    this.callDoctor();
                });
            }
        } else {
            if (modeDisplay) modeDisplay.textContent = 'No Mode Active';
            if (modeInfo) modeInfo.innerHTML = '';
            if (modeContent) modeContent.innerHTML = '';
        }
    }
}

// Create global instance
const medicalMode = new MedicalMode();
