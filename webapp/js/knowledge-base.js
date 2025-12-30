/**
 * BlindNav+ Knowledge Base
 * Contains contextual information for the assistant mode
 * Enhanced with comprehensive indoor/outdoor scene understanding
 * Updated with advanced navigation safety features
 */

const knowledgeBase = {
    // Common questions about BlindNav+
    app: {
        what: "BlindNav Plus is a navigation assistant application designed for visually impaired users. It uses camera-based object detection trained on millions of images to help you navigate safely, find objects, and identify buses.",
        modes: "BlindNav Plus has fourteen modes: Navigation for walking guidance, Object Detection to find items, Bus Detection for buses, Scene Description for surroundings, Traffic Analysis for safe crossing, Environment Analysis for weather, Walking mode for step-by-step guidance, Assistant for general help, and Emergency modes for urgent situations.",
        navigation: "Navigation mode provides real-time guidance while walking. It detects over 200 types of obstacles including furniture, vehicles, people, poles, and floor hazards with distance and position information. It can also detect walls, clear pathways, steps going up or down, and potential holes or drop-offs.",
        objectDetection: "Object Detection mode helps you find specific items like your phone, keys, cup, or any common object. Trained on millions of images, I can identify household items, electronics, food, clothing, and much more.",
        busDetection: "Bus Detection mode uses advanced OCR to read bus numbers and route information. Tell me your bus number and I'll alert you when it arrives.",
        sceneDescribe: "Scene Description mode analyzes your entire surroundings, telling you about the environment type (indoor/outdoor), objects present, their positions, distances, and potential hazards.",
        emergency: "Emergency mode can alert your emergency contacts, call emergency services, and provide location information. Set up your emergency contacts in settings.",
        assistant: "Assistant mode allows you to ask questions, get help with the app, know the time, date, weather, or have a conversation.",
        trafficAnalysis: "Traffic Analysis mode helps you cross roads safely by detecting traffic lights, vehicles, crosswalks, and estimating when it's safe to cross.",
        environmentAnalysis: "Environment Analysis checks lighting conditions, weather indicators like clouds and sky color, and tells you about outdoor conditions.",
        walkingMode: "Walking mode provides continuous step-by-step guidance. It detects stairs (both up and down), walls, clear pathways, ground surface types like concrete, grass, or asphalt, and warns you about potential hazards like holes or drop-offs."
    },
    
    // Voice commands - expanded
    commands: {
        general: [
            "say 'navigation' to start navigation mode",
            "say 'walking' for continuous walking guidance",
            "say 'find' followed by an object name to search for it",
            "say 'bus' to start bus detection mode",
            "say 'describe' to hear about your surroundings",
            "say 'is it safe to cross' for traffic analysis",
            "say 'weather' or 'environment' for conditions",
            "say 'stop' to stop the current mode",
            "say 'help' for assistance",
            "say 'emergency' if you need urgent help"
        ],
        navigation: [
            "say 'pause' to pause navigation",
            "say 'resume' to continue",
            "say 'what's ahead' to hear about obstacles",
            "say 'find stairs' or 'find door' for indoor guidance",
            "say 'check path' to analyze clear pathways",
            "say 'stop' to exit navigation mode"
        ],
        walking: [
            "say 'pause' to pause walking guidance",
            "say 'resume' to continue",
            "say 'what's ahead' to hear about obstacles and path",
            "say 'describe environment' to analyze surroundings",
            "say 'check orientation' to verify camera position",
            "say 'stop' to exit walking mode"
        ],
        objectDetection: [
            "say 'find phone' or 'find keys' to locate objects",
            "say 'what's around me' for all detected objects",
            "say 'found' when you've located the object",
            "say 'try again' to restart search",
            "say 'stop' to exit"
        ],
        busDetection: [
            "say 'looking for bus 42' to set your target",
            "say 'any bus' to see all buses",
            "say 'change bus' to set a new number",
            "say 'stop' to exit"
        ],
        sceneDescribe: [
            "say 'describe' for full scene description",
            "say 'what's on my left' for directional info",
            "say 'how crowded' for people count",
            "say 'any obstacles' for hazard check"
        ]
    },
    
    // Safety information - greatly expanded
    safety: {
        walking: "Always be aware of your surroundings. The app detects obstacles but should complement, not replace, a white cane or guide dog. I now analyze the entire scene including walls, floors, and pathways.",
        traffic: "When crossing streets, listen for traffic and wait for audio signals if available. I can detect vehicles but cannot judge exact traffic speed.",
        publicPlaces: "In crowded areas, I'll alert you to people nearby. Walk at a comfortable pace and keep your phone camera facing forward.",
        obstacles: "Common obstacles include furniture, stairs, doors, poles, vehicles, and other people. I describe their position as left, right, center, and their approximate distance.",
        indoor: "Indoor environments may have furniture, rugs, cables, wet floors, and stairs. I'll warn you about each hazard detected. I can now differentiate walls from open pathways.",
        outdoor: "Outdoor areas have vehicles, curbs, poles, benches, fire hydrants, and uneven surfaces. Stay on sidewalks when possible. I can detect clear sky versus obstacles.",
        stairs: "When approaching stairs, I'll tell you if they go up or down and estimate the number of steps. Hold the handrail when available. I detect step patterns automatically.",
        stepsUp: "When stairs going UP are detected, I'll warn you in advance with the approximate step count. Prepare to lift your feet higher.",
        stepsDown: "When stairs going DOWN are detected, this is critical for safety. I'll warn you immediately. Stop and feel for the edge before proceeding.",
        crossings: "At crossings, wait for my confirmation that traffic is clear. Even then, listen carefully for any approaching vehicles.",
        walls: "I can detect walls and solid obstacles ahead. When a wall is detected, I'll suggest you change direction.",
        pathways: "I analyze the ground ahead to find clear walking paths. If your center path is blocked, I'll suggest moving left or right.",
        holes: "Dark areas on the ground may indicate holes, drop-offs, or shadows. I'll warn you about potential hazards.",
        groundTypes: "I can identify different ground surfaces including concrete, asphalt, grass, tiles, and more. This helps you know what you're walking on.",
        streetLights: "Street lamps and poles are common outdoor obstacles. I'll warn you when they're in your path.",
        tips: [
            "Hold your phone with the camera facing forward at chest height",
            "Use headphones for better audio in noisy environments",
            "Keep your phone charged for reliable assistance",
            "Set up emergency contacts before going out",
            "Practice with the app in familiar environments first",
            "In dim lighting, detection may be less accurate",
            "For best results, move slowly and scan your surroundings",
            "I can detect objects from about 0.5 to 20 meters away"
        ]
    },
    
    // COMPREHENSIVE DETECTABLE OBJECTS - Greatly expanded
    detectableObjects: {
        // People and crowds
        people: "person, people, pedestrian, crowd, group, child, cyclist, jogger, wheelchair user",
        
        // Vehicles (indoor/outdoor)
        vehicles: "car, motorcycle, bicycle, bus, truck, train, airplane, boat, scooter, van, taxi, auto rickshaw, ambulance, fire truck, police car",
        
        // Animals
        animals: "bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, giraffe, monkey, squirrel, pigeon, crow",
        
        // Indoor furniture
        furniture: "chair, couch, sofa, bed, dining table, desk, coffee table, nightstand, dresser, bookshelf, cabinet, stool, bench, armchair, ottoman",
        
        // Kitchen and dining
        kitchen: "refrigerator, microwave, oven, toaster, sink, dishwasher, cup, mug, glass, bottle, plate, bowl, fork, knife, spoon, pot, pan, kettle",
        
        // Electronics
        electronics: "tv, television, laptop, computer, monitor, keyboard, mouse, remote, cell phone, smartphone, tablet, charger, headphones, speaker, camera",
        
        // Personal items
        personal: "backpack, handbag, purse, wallet, umbrella, suitcase, glasses, sunglasses, watch, hat, cap, tie, scarf, keys, keychain",
        
        // Household items
        household: "book, newspaper, magazine, clock, vase, lamp, mirror, picture frame, pillow, blanket, towel, tissue box, trash can, plant pot",
        
        // Bathroom items
        bathroom: "toilet, sink, shower, bathtub, towel rack, soap dispenser, mirror, toothbrush, hair dryer",
        
        // Food items
        food: "banana, apple, orange, sandwich, pizza, hot dog, cake, donut, bread, fruit, vegetable, snack, candy, ice cream",
        
        // Outdoor elements
        outdoor: "tree, bush, flower, grass, bench, fountain, pole, post, fire hydrant, parking meter, mailbox, trash bin, street lamp",
        
        // Traffic elements
        traffic: "traffic light, stop sign, yield sign, crosswalk, road sign, speed bump, cone, barrier, parking sign",
        
        // Indoor navigation
        indoor_nav: "door, stairs, staircase, escalator, elevator, ramp, handrail, exit sign, entrance, hallway, corridor",
        
        // Sports and recreation
        sports: "sports ball, frisbee, tennis racket, skateboard, surfboard, skis, snowboard, baseball bat, baseball glove, kite"
    },
    
    // SCENE DESCRIPTIONS - New comprehensive section
    sceneDescriptions: {
        indoor: {
            livingRoom: "This appears to be a living room with seating furniture, possibly a TV, and decorative items.",
            bedroom: "This looks like a bedroom with a bed, possibly nightstands, and personal belongings.",
            kitchen: "This appears to be a kitchen area with appliances and cooking surfaces.",
            bathroom: "This looks like a bathroom with fixtures like a sink or toilet.",
            office: "This appears to be an office or workspace with desks and electronic equipment.",
            hallway: "This looks like a hallway or corridor connecting different areas.",
            store: "This appears to be a store or shop with shelves and merchandise.",
            restaurant: "This looks like a restaurant or cafe with tables and seating."
        },
        outdoor: {
            street: "You appear to be on a street with vehicles, sidewalks, and buildings nearby.",
            park: "This looks like a park or green space with trees and open areas.",
            parking: "You appear to be in a parking area with vehicles around.",
            busStop: "This looks like a bus stop or transit area.",
            crossing: "You appear to be near a road crossing or intersection.",
            sidewalk: "You're on a sidewalk with potential obstacles and pedestrian traffic."
        }
    },
    
    // OBSTACLE WARNINGS - New section
    obstacleWarnings: {
        immediate: "Warning! Obstacle directly ahead, very close. Stop or change direction.",
        veryClose: "Caution: Something is very close to you, about one step away.",
        close: "Heads up: Object detected close on your {position}.",
        moderate: "Be aware: {object} is a few steps ahead on your {position}.",
        stairs: "Stairs detected {direction}, approximately {count} steps.",
        curb: "Curb or step detected ahead. Watch your footing.",
        vehicle: "Vehicle detected! {type} on your {position}, {distance}.",
        crowd: "Crowded area ahead with multiple people.",
        wetFloor: "Caution: Wet or slippery surface detected.",
        construction: "Construction or blocked path ahead. Look for alternative route."
    },
    
    // Contextual responses
    responses: {
        greeting: [
            "Hello! How can I help you today?",
            "Hi there! What would you like to do?",
            "Welcome! I'm here to assist you.",
            "Hey! Ready to help you navigate."
        ],
        affirmative: [
            "Okay, I'll do that.",
            "Sure thing.",
            "Right away.",
            "Got it.",
            "On it."
        ],
        negative: [
            "I understand.",
            "No problem.",
            "Alright, let me know if you need anything else.",
            "Okay, I'm here when you need me."
        ],
        unclear: [
            "I didn't quite catch that. Could you repeat?",
            "Sorry, I didn't understand. Can you say that again?",
            "Could you please rephrase that?",
            "I'm not sure what you mean. Try saying it differently."
        ],
        error: [
            "Something went wrong. Please try again.",
            "I encountered an error. Let's try that again.",
            "There was a problem. Please try once more.",
            "Sorry, that didn't work. Want to try again?"
        ],
        encouragement: [
            "You're doing great!",
            "Keep going, I'm here to help.",
            "Take your time, no rush.",
            "I've got your back."
        ]
    },
    
    // Time and context awareness
    contextual: {
        morning: "Good morning! Ready to help you start your day.",
        afternoon: "Good afternoon! How can I assist you?",
        evening: "Good evening! What can I help you with?",
        night: "It's getting late. Be extra careful when walking at night. I'll watch for any hazards."
    },
    
    // FAQ - Expanded
    faq: {
        "how do I connect": "Enter your ESP32-CAM's IP address in the connection box and tap Connect, or say 'use device camera' to use your phone's camera.",
        "camera not working": "Check that your camera has permission. For ESP32, ensure it's powered and on the same WiFi network.",
        "speech not working": "Make sure your browser has microphone permission. The system is always listening once started.",
        "detection slow": "Detection speed depends on your device and lighting. For best results, ensure good lighting and reduce background apps.",
        "battery saving": "Lower the detection frequency in settings. Keep your phone plugged in for extended use.",
        "offline use": "Basic detection works offline once loaded. Text reading and some features need internet.",
        "accuracy": "Detection accuracy varies by lighting, distance, and object size. Best results are in good lighting with objects 1-10 meters away.",
        "how far": "I can detect objects from about half a meter to 20 meters away. Closer objects are more accurately identified.",
        "what objects": "I'm trained on over 200 object types including furniture, vehicles, people, animals, food, electronics, and household items.",
        "indoor outdoor": "I work both indoors and outdoors. Indoor detection includes furniture, doors, stairs. Outdoor includes vehicles, traffic signs, and obstacles.",
        "dark places": "In low light, detection may be less accurate. I'll let you know when visibility is poor.",
        "crowds": "I can estimate crowd density and warn you about crowded areas to help you navigate safely."
    },
    
    // Training datasets info (for transparency)
    trainingInfo: {
        summary: "BlindNav+ detection is trained on multiple world-class datasets totaling millions of images.",
        datasets: [
            "COCO Dataset: 330,000 images with 80 object categories",
            "Open Images: 9 million images with 600+ categories",
            "Cityscapes: 25,000 street scene images for outdoor navigation",
            "SUN RGB-D: 10,000 indoor scenes with depth information",
            "VizWiz: 31,000 images captured by visually impaired users",
            "Traffic Sign datasets: Recognition of road signs and signals"
        ],
        objectCount: "Over 200 detectable object types",
        sceneTypes: "Indoor environments (homes, offices, stores) and outdoor (streets, parks, transit)"
    }
};

// Helper functions
const KnowledgeHelper = {
    /**
     * Get a response based on user intent
     * @param {string} text - User input
     * @returns {string} - Response
     */
    getResponse(text) {
        const input = text.toLowerCase();
        
        // Check for app-related questions
        if (input.includes('what is') || input.includes('what\'s this')) {
            return knowledgeBase.app.what;
        }
        
        if (input.includes('mode') || input.includes('modes')) {
            return knowledgeBase.app.modes;
        }
        
        if (input.includes('navigation')) {
            return knowledgeBase.app.navigation;
        }
        
        if (input.includes('object') || input.includes('find')) {
            return knowledgeBase.app.objectDetection;
        }
        
        if (input.includes('bus')) {
            return knowledgeBase.app.busDetection;
        }
        
        if (input.includes('describe') || input.includes('scene')) {
            return knowledgeBase.app.sceneDescribe;
        }
        
        if (input.includes('emergency')) {
            return knowledgeBase.app.emergency;
        }
        
        // Check for FAQ
        for (const [key, value] of Object.entries(knowledgeBase.faq)) {
            if (input.includes(key.split(' ')[0])) {
                return value;
            }
        }
        
        // Check for safety questions
        if (input.includes('safe') || input.includes('tip')) {
            return knowledgeBase.safety.tips.join('. ');
        }
        
        // Check for commands
        if (input.includes('command') || input.includes('what can i say')) {
            return 'Here are the main commands: ' + knowledgeBase.commands.general.join('. ');
        }
        
        // Check for detectable objects question
        if (input.includes('detect') && input.includes('what')) {
            return 'I can detect: ' + Object.values(knowledgeBase.detectableObjects).join(', ');
        }
        
        // Greeting
        if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
            return this.getRandomResponse('greeting');
        }
        
        // Time-based greeting
        const hour = new Date().getHours();
        if (input.includes('good')) {
            if (hour < 12) return knowledgeBase.contextual.morning;
            if (hour < 17) return knowledgeBase.contextual.afternoon;
            if (hour < 21) return knowledgeBase.contextual.evening;
            return knowledgeBase.contextual.night;
        }
        
        // Default response
        return null;
    },
    
    /**
     * Get random response from category
     * @param {string} category - Response category
     * @returns {string} - Random response
     */
    getRandomResponse(category) {
        const responses = knowledgeBase.responses[category];
        if (!responses) return null;
        return responses[Math.floor(Math.random() * responses.length)];
    },
    
    /**
     * Get voice commands for a mode
     * @param {string} mode - Mode name
     * @returns {Array} - List of commands
     */
    getCommands(mode) {
        return knowledgeBase.commands[mode] || knowledgeBase.commands.general;
    },
    
    /**
     * Check if object is detectable
     * @param {string} objectName - Object to check
     * @returns {boolean} - Whether object can be detected
     */
    isDetectable(objectName) {
        const allObjects = Object.values(knowledgeBase.detectableObjects).join(', ').toLowerCase();
        return allObjects.includes(objectName.toLowerCase());
    },
    
    /**
     * Get safety tip
     * @param {string} context - Context (walking, traffic, etc.)
     * @returns {string} - Safety tip
     */
    getSafetyTip(context) {
        return knowledgeBase.safety[context] || knowledgeBase.safety.tips[0];
    },

    /**
     * Get navigation safety guidance based on detected hazards
     * @param {Object} safetyData - Safety analysis data from NavigationSafetyAnalyzer
     * @returns {string} - Safety guidance message
     */
    getNavigationGuidance(safetyData) {
        const guidance = [];
        
        if (safetyData.steps && safetyData.steps.detected) {
            const stepInfo = safetyData.steps;
            if (stepInfo.direction === 'up') {
                guidance.push(knowledgeBase.safety.stepsUp);
            } else if (stepInfo.direction === 'down') {
                guidance.push(knowledgeBase.safety.stepsDown);
            }
        }
        
        if (safetyData.walls && safetyData.walls.detected) {
            guidance.push(knowledgeBase.safety.walls);
        }
        
        if (safetyData.hazards && safetyData.hazards.length > 0) {
            guidance.push(knowledgeBase.safety.holes);
        }
        
        if (safetyData.pathway) {
            if (safetyData.pathway.centerClear) {
                guidance.push("Path ahead is clear.");
            } else {
                guidance.push(knowledgeBase.safety.pathways);
            }
        }
        
        return guidance.join(' ');
    },

    /**
     * Get warning for specific obstacle type
     * @param {string} obstacleType - Type of obstacle
     * @param {Object} details - Additional details (position, distance, etc.)
     * @returns {string} - Warning message
     */
    getObstacleWarning(obstacleType, details = {}) {
        let warning = knowledgeBase.obstacleWarnings[obstacleType] || knowledgeBase.obstacleWarnings.moderate;
        
        // Replace placeholders
        if (details.position) {
            warning = warning.replace('{position}', details.position);
        }
        if (details.object) {
            warning = warning.replace('{object}', details.object);
        }
        if (details.distance) {
            warning = warning.replace('{distance}', details.distance);
        }
        if (details.type) {
            warning = warning.replace('{type}', details.type);
        }
        if (details.direction) {
            warning = warning.replace('{direction}', details.direction);
        }
        if (details.count) {
            warning = warning.replace('{count}', details.count.toString());
        }
        
        return warning;
    },

    /**
     * Get scene description based on detected environment
     * @param {string} environment - indoor or outdoor
     * @param {string} sceneType - Specific scene type
     * @returns {string} - Scene description
     */
    getSceneDescription(environment, sceneType) {
        if (environment === 'indoor' && knowledgeBase.sceneDescriptions.indoor[sceneType]) {
            return knowledgeBase.sceneDescriptions.indoor[sceneType];
        }
        if (environment === 'outdoor' && knowledgeBase.sceneDescriptions.outdoor[sceneType]) {
            return knowledgeBase.sceneDescriptions.outdoor[sceneType];
        }
        return "I'm analyzing your surroundings.";
    },

    /**
     * Get walking mode specific guidance
     * @returns {string} - Walking mode tips
     */
    getWalkingGuidance() {
        return knowledgeBase.app.walkingMode;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { knowledgeBase, KnowledgeHelper };
}
