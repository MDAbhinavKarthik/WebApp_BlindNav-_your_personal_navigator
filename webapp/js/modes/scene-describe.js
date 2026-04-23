/**
 * BlindNav+ Scene Description Mode - Enhanced
 * Comprehensive 360° awareness with environment analysis
 * Describes surroundings, landmarks, and provides spatial awareness
 * Features human-like conversational guidance for blind users
 */

class SceneDescribeMode {
    constructor() {
        this.isActive = false;
        this.lastDescription = '';
        this.frameProcessingActive = false;
        this.descriptionInterval = 5000;
        this.lastDescriptionTime = 0;
        this.autoDescribe = false;
        this.userName = 'friend'; // Will be updated from system
        
        // Enhanced description settings
        this.settings = {
            includeDistance: true,
            includeDirection: true,
            includeEnvironment: true,
            includeSafety: true,
            includeNearbyPlaces: true,
            detailLevel: 'comprehensive' // 'brief', 'standard', 'comprehensive'
        };
        
        // Environment state
        this.environmentState = {
            type: 'unknown', // indoor, outdoor, street, park, etc.
            lighting: 'normal',
            crowdLevel: 'low',
            lastAnalysis: null
        };
        
        // Direction capture data for 360° awareness
        this.directionData = {
            front: { objects: [], humans: [], caption: '' },
            left: { objects: [], humans: [], caption: '' },
            right: { objects: [], humans: [], caption: '' },
            back: { objects: [], humans: [], caption: '' }
        };
        
        // Spatial zones for 360° awareness
        this.spatialZones = {
            immediate: 2,  // 0-2 meters
            near: 5,       // 2-5 meters
            medium: 10,    // 5-10 meters
            far: 20        // 10+ meters
        };
        
        // Human-like phrases for conversational flow
        this.phrases = {
            greetings: [
                "Of course, I'm right here with you.",
                "Absolutely, let me be your eyes.",
                "I've got you covered.",
                "Sure thing, let me take a look around for you."
            ],
            turnPrompts: {
                left: [
                    "Now, I need to see what's on your left. Turn your body slowly to the left... that's it, nice and easy...",
                    "Let's check your left side. Gently turn to your left... take your time..."
                ],
                back: [
                    "Wonderful. Now let's see what's behind you. Keep turning left... you're doing great...",
                    "Great job. Continue turning to see behind you... almost there..."
                ],
                right: [
                    "Almost done. Just one more turn to see your right side. Keep turning slowly...",
                    "Nearly finished. Let's see your right now. Continue your turn..."
                ]
            },
            encouragement: [
                "You're doing great!",
                "Perfect, that's exactly right.",
                "Excellent work!",
                "Good job!",
                "That's perfect."
            ],
            stopPrompts: [
                "And stop right there.",
                "Perfect, hold that position.",
                "That's good, stay right there.",
                "Stop there, perfect."
            ]
        };
    }
    
    /**
     * Get a random phrase from a category
     */
    getPhrase(category, subcategory = null) {
        const phrases = subcategory ? this.phrases[category][subcategory] : this.phrases[category];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }
    
    /**
     * Start scene description mode
     */
    async start() {
        if (this.isActive) {
            console.log('[SceneDescribe] Already active');
            return;
        }
        
        this.isActive = true;
        console.log('[SceneDescribe] Mode started');
        
        // Get user name if available
        if (window.blindNavApp && window.blindNavApp.userName) {
            this.userName = window.blindNavApp.userName;
        }
        
        const welcome = `Scene Description Mode activated. ${this.getPhrase('greetings')}
            
            I'll guide you to turn around so I can see everything in all directions.
            
            Voice commands you can use:
            "describe" to get a full 360 degree description
            "quick look" for a brief check
            "what's ahead" to hear what's in front
            "who's around" to know about people nearby
            "exit" to stop
            
            Say describe when you're ready, and I'll guide you through it.`;
        
        speechManager.speak(welcome, true);
        
        this.updateUI(true);
    }
    
    /**
     * Stop scene description mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.autoDescribe = false;
        this.frameProcessingActive = false;
        cameraManager.stopFrameProcessing();
        
        speechManager.speak(`Exiting Scene Description Mode. I'm still here if you need me, ${this.userName}.`);
        
        this.updateUI(false);
        
        console.log('[SceneDescribe] Mode stopped');
    }
    
    /**
     * Generate and speak scene description with 360° guided capture
     * This provides a human-like conversational experience
     */
    async describeScene() {
        if (!cameraManager.isConnected) {
            speechManager.speak('Camera is not connected. Please connect the camera first, and I\\'ll be ready to help.');
            return;
        }
        
        // Warm introduction
        speechManager.speak(`${this.getPhrase('greetings')} I'll guide you to turn around slowly so I can see everything. Don't worry, I'll tell you exactly when to turn and when to stop.`, true);
        
        await this.delay(2000);
        
        // Reset direction data
        this.directionData = {
            front: { objects: [], humans: [], caption: '' },
            left: { objects: [], humans: [], caption: '' },
            right: { objects: [], humans: [], caption: '' },
            back: { objects: [], humans: [], caption: '' }
        };
        
        // ========== CAPTURE FRONT ==========
        speechManager.speak("First, just face forward naturally. Take your time, I'm right here with you.");
        await this.delay(2500);
        speechManager.speak("Perfect. Hold still for just a moment while I take a look.");
        await this.delay(1000);
        
        await this.captureDirection('front');
        
        // Immediate feedback
        const frontFeedback = this.generateImmediateFeedback('front');
        speechManager.speak(frontFeedback);
        await this.delay(1000);
        
        // ========== CAPTURE LEFT ==========
        speechManager.speak(this.getPhrase('turnPrompts', 'left'));
        await this.delay(2000);
        speechManager.speak("Keep turning a little more...");
        await this.delay(2000);
        speechManager.speak(this.getPhrase('stopPrompts') + " " + this.getPhrase('encouragement'));
        await this.delay(1000);
        
        await this.captureDirection('left');
        
        const leftFeedback = this.generateImmediateFeedback('left');
        speechManager.speak(leftFeedback);
        await this.delay(1000);
        
        // ========== CAPTURE BACK ==========
        speechManager.speak(this.getPhrase('turnPrompts', 'back'));
        await this.delay(2000);
        speechManager.speak("A bit more... almost there...");
        await this.delay(2000);
        speechManager.speak(this.getPhrase('stopPrompts'));
        await this.delay(1000);
        
        await this.captureDirection('back');
        
        const backFeedback = this.generateImmediateFeedback('back');
        speechManager.speak(backFeedback);
        await this.delay(1000);
        
        // ========== CAPTURE RIGHT ==========
        speechManager.speak(this.getPhrase('turnPrompts', 'right'));
        await this.delay(2000);
        speechManager.speak("That's it... a little more...");
        await this.delay(2000);
        speechManager.speak(this.getPhrase('stopPrompts') + " " + this.getPhrase('encouragement'));
        await this.delay(1000);
        
        await this.captureDirection('right');
        
        const rightFeedback = this.generateImmediateFeedback('right');
        speechManager.speak(rightFeedback);
        await this.delay(500);
        
        // Return to front
        speechManager.speak(`Great job, ${this.userName}! Now turn back to face forward where we started. Take your time.`);
        await this.delay(3000);
        
        // ========== FULL DESCRIPTION ==========
        speechManager.speak(`Wonderful! I've now got a complete picture of everything around you. Let me tell you what I see.`);
        await this.delay(1000);
        
        const fullDescription = await this.generateFullDescription();
        speechManager.speak(fullDescription, true);
        
        this.lastDescription = fullDescription;
        this.lastDescriptionTime = Date.now();
        
        // Update display
        this.updateDescriptionDisplay(fullDescription, []);
        
        // Interactive follow-up
        await this.delay(1500);
        await this.handleFollowUp();
    }
    
    /**
     * Capture and analyze a single direction
     */
    async captureDirection(direction) {
        const frame = cameraManager.captureFrame();
        if (!frame) {
            console.log(`[SceneDescribe] Could not capture ${direction}`);
            return;
        }
        
        // Run detection
        const detections = await detectionManager.detect(frame);
        
        // Enhance detections
        const enhanced = this.enhanceDetections(detections, frame);
        
        // Extract objects and humans
        const objects = enhanced.map(d => d.class.toLowerCase());
        const humans = enhanced.filter(d => d.class.toLowerCase() === 'person');
        
        // Store
        this.directionData[direction] = {
            objects: objects,
            humans: humans,
            enhanced: enhanced,
            caption: '' // Could add image captioning here
        };
        
        console.log(`[SceneDescribe] Captured ${direction}:`, objects);
    }
    
    /**
     * Generate immediate feedback after capturing a direction
     */
    generateImmediateFeedback(direction) {
        const data = this.directionData[direction];
        const objects = data.objects;
        const humans = data.humans;
        
        const directionNames = {
            front: 'ahead',
            left: 'on your left',
            right: 'on your right',
            back: 'behind you'
        };
        const dirName = directionNames[direction];
        
        // Priority feedback
        if (humans.length > 0) {
            const personWord = humans.length === 1 ? 'someone' : `${humans.length} people`;
            return `I can see ${personWord} ${dirName}.`;
        }
        
        if (objects.includes('door')) {
            return `I see there's a door ${dirName}.`;
        }
        
        if (objects.includes('window')) {
            return `There's a window ${dirName} letting in some light.`;
        }
        
        if (objects.some(o => ['car', 'bus', 'truck', 'motorcycle'].includes(o))) {
            return `I can see vehicles ${dirName}. Good to be aware of that.`;
        }
        
        if (objects.length > 0) {
            return `I can see ${objects.length} things ${dirName}.`;
        }
        
        return `The area ${dirName} looks fairly clear.`;
    }
    
    /**
     * Handle interactive follow-up after description
     */
    async handleFollowUp() {
        const allHumans = Object.values(this.directionData).flatMap(d => d.humans);
        
        if (this.environmentState.type === 'indoor') {
            speechManager.speak("I'm happy to tell you more about anything specific. What would you like to know more about?");
            
            // Use promptAndListen for interactive response
            const response = await speechManager.promptAndListen(
                "You can ask about people nearby, doors, tables, or say 'nothing' if you're all set.",
                null,
                8000
            );
            
            if (response) {
                this.handleFollowUpResponse(response, allHumans);
            } else {
                speechManager.speak("No worries. I'm here whenever you need me.");
            }
        } else {
            // Outdoor follow-up
            speechManager.speak("The area looks good for you to move around. I'm right beside you if you need anything.");
            
            const response = await speechManager.promptAndListen(
                "Would you like directions somewhere, or should I keep watching your surroundings?",
                null,
                8000
            );
            
            if (response) {
                this.handleFollowUpResponse(response, allHumans);
            }
        }
    }
    
    /**
     * Process follow-up response from user
     */
    handleFollowUpResponse(response, allHumans) {
        const lowerResponse = response.toLowerCase();
        
        if (['nothing', 'no', 'fine', 'good', 'okay', 'done', 'that\\'s all', 'im good', 'i\\'m good'].some(w => lowerResponse.includes(w))) {
            speechManager.speak(`Alright! I'm right here whenever you need me, ${this.userName}. Just say 'describe' anytime.`);
        }
        else if (['people', 'person', 'someone', 'who', 'human'].some(w => lowerResponse.includes(w))) {
            if (allHumans.length > 0) {
                const humanDesc = this.describeHumansDetailed(allHumans);
                speechManager.speak(humanDesc);
            } else {
                speechManager.speak("I don't see anyone around you at the moment.");
            }
        }
        else if (['door', 'exit', 'way out'].some(w => lowerResponse.includes(w))) {
            const doorsFound = [];
            for (const [dir, data] of Object.entries(this.directionData)) {
                if (data.objects.includes('door')) {
                    doorsFound.push(dir);
                }
            }
            if (doorsFound.length > 0) {
                speechManager.speak(`I spotted a door on your ${doorsFound[0]}${doorsFound.length > 1 ? `, and another on your ${doorsFound[1]}` : ''}.`);
            } else {
                speechManager.speak("I didn't see any doors in my scan. Would you like me to look again?");
            }
        }
        else if (['table', 'desk'].some(w => lowerResponse.includes(w))) {
            speechManager.speak("Let me focus on the table area for you. I can see objects on and around it.");
        }
        else if (['direction', 'navigate', 'go', 'walk', 'take me', 'guide'].some(w => lowerResponse.includes(w))) {
            speechManager.speak("Sure thing! Just tell me where you'd like to go, and I'll guide you there step by step.");
        }
        else if (['watch', 'monitor', 'keep', 'stay', 'continue'].some(w => lowerResponse.includes(w))) {
            speechManager.speak("I'll keep monitoring your surroundings and let you know if anything changes.");
            this.autoDescribe = true;
        }
        else {
            speechManager.speak(`I heard you say "${response}". Let me see what I can tell you about that.`);
        }
    }
    
    /**
     * Describe humans in detail
     */
    describeHumansDetailed(humans) {
        if (humans.length === 0) return "I don't see anyone around you.";
        
        // Group by direction
        const byDir = { front: [], left: [], right: [], back: [] };
        humans.forEach(h => {
            const dir = h.direction || 'front';
            if (byDir[dir]) byDir[dir].push(h);
        });
        
        const parts = [];
        for (const [dir, people] of Object.entries(byDir)) {
            if (people.length > 0) {
                const dirName = dir === 'front' ? 'in front of you' : `on your ${dir}`;
                parts.push(`${people.length === 1 ? 'Someone is' : `${people.length} people are`} ${dirName}`);
            }
        }
        
        return `About the people around you: ${parts.join('. ')}.`;
    }
    
    /**
     * Generate full 360° description
     */
    async generateFullDescription() {
        const parts = [];
        
        // Environment analysis
        const allObjects = Object.values(this.directionData).flatMap(d => d.objects);
        const envAnalysis = this.analyzeEnvironment(allObjects);
        parts.push(envAnalysis.summary);
        
        // Direction-specific descriptions
        const dirDescriptions = {
            front: 'Directly in front of you',
            left: 'On your left',
            right: 'On your right',
            back: 'Behind you'
        };
        
        for (const [dir, data] of Object.entries(this.directionData)) {
            if (data.objects.length > 0 || data.humans.length > 0) {
                const dirDesc = this.describeDirection(dir, data, dirDescriptions[dir]);
                if (dirDesc) parts.push(dirDesc);
            }
        }
        
        // Safety note
        const safetyNote = this.generateSafetyNote();
        if (safetyNote) parts.push(safetyNote);
        
        return parts.join(' ');
    }
    
    /**
     * Describe a single direction
     */
    describeDirection(direction, data, prefix) {
        const objects = data.objects.filter(o => o !== 'person');
        const uniqueObjects = [...new Set(objects)];
        const humans = data.humans;
        
        const parts = [];
        
        // People first
        if (humans.length > 0) {
            parts.push(`${humans.length === 1 ? 'there\\'s someone' : `there are ${humans.length} people`}`);
        }
        
        // Key objects
        if (uniqueObjects.includes('door')) {
            parts.push('there\\'s a door');
        }
        if (uniqueObjects.includes('window')) {
            parts.push('there\\'s a window');
        }
        
        // Other objects
        const otherObjects = uniqueObjects.filter(o => !['door', 'window'].includes(o));
        if (otherObjects.length > 0) {
            const objList = otherObjects.slice(0, 3).join(', ');
            parts.push(`I can see ${objList}`);
        }
        
        if (parts.length === 0) return null;
        
        return `${prefix}, ${parts.join(', and ')}.`;
    }
    
    /**
     * Generate safety note based on detections
     */
    generateSafetyNote() {
        const allObjects = Object.values(this.directionData).flatMap(d => d.objects);
        
        const vehicles = allObjects.filter(o => ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(o));
        if (vehicles.length > 0) {
            return "Just so you know, there are vehicles nearby. Please be careful.";
        }
        
        return "The area appears safe for you to move around.";
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Enhance detections with depth and direction info
     */
    enhanceDetections(detections, frame) {
        return detections.map(det => {
            const bbox = det.bbox;
            const heightRatio = bbox.height / frame.height;
            const yBottom = (bbox.y + bbox.height) / frame.height;
            
            // Estimate distance
            let estimatedDistance;
            const objSizes = {
                'person': 1.7, 'car': 1.5, 'bicycle': 1.0, 'motorcycle': 1.1,
                'dog': 0.5, 'cat': 0.3, 'chair': 0.8, 'bus': 3.0, 'truck': 2.5
            };
            
            const refHeight = objSizes[det.class.toLowerCase()];
            if (refHeight) {
                const focalLength = Math.min(frame.width, frame.height) * 0.8;
                estimatedDistance = (refHeight * 100 * focalLength) / (bbox.height * 100);
                estimatedDistance = Math.max(0.5, Math.min(estimatedDistance * (1 + (1 - yBottom) * 0.3), 15));
            } else {
                if (heightRatio > 0.6) estimatedDistance = 1;
                else if (heightRatio > 0.4) estimatedDistance = 2;
                else if (heightRatio > 0.25) estimatedDistance = 4;
                else estimatedDistance = 8;
            }
            
            // Direction
            const centerX = det.center.x;
            const zones = ['far-left', 'left', 'center-left', 'center', 'center-right', 'right', 'far-right'];
            const zoneIndex = Math.min(6, Math.floor(centerX / (frame.width / 7)));
            
            return {
                ...det,
                estimatedDistance: Math.round(estimatedDistance * 10) / 10,
                preciseDirection: zones[zoneIndex],
                zone: this.getDistanceZone(estimatedDistance)
            };
        });
    }
    
    /**
     * Get distance zone category
     */
    getDistanceZone(meters) {
        if (meters <= this.spatialZones.immediate) return 'immediate';
        if (meters <= this.spatialZones.near) return 'near';
        if (meters <= this.spatialZones.medium) return 'medium';
        return 'far';
    }
    
    /**
     * Generate comprehensive 360° description
     */
    async generateComprehensiveDescription(detections, frame) {
        const parts = [];
        
        // 1. Environment analysis
        const envAnalysis = this.analyzeEnvironment(detections);
        this.environmentState.lastAnalysis = envAnalysis;
        parts.push(envAnalysis.summary);
        
        // 2. Spatial description by zones
        if (detections.length > 0) {
            const spatialDescription = this.generateSpatialDescription(detections);
            parts.push(spatialDescription);
        } else {
            parts.push('The visible area appears clear with no recognizable objects.');
        }
        
        // 3. Safety assessment
        if (this.settings.includeSafety) {
            const safetyInfo = this.assessSafety(detections);
            if (safetyInfo) {
                parts.push(safetyInfo);
            }
        }
        
        // 4. Nearby places (if GPS available)
        if (this.settings.includeNearbyPlaces && navigationService) {
            const nearbyInfo = await this.getNearbyPlacesInfo();
            if (nearbyInfo) {
                parts.push(nearbyInfo);
            }
        }
        
        return parts.join(' ');
    }
    
    /**
     * Analyze environment type from detections
     */
    analyzeEnvironment(detections) {
        const objects = detections.map(d => d.class.toLowerCase());
        
        // Indoor indicators
        const indoorItems = ['chair', 'couch', 'bed', 'dining table', 'tv', 'laptop', 'book'];
        const indoorCount = objects.filter(o => indoorItems.includes(o)).length;
        
        // Outdoor/street indicators
        const outdoorItems = ['car', 'truck', 'bus', 'traffic light', 'stop sign', 'bicycle', 'motorcycle'];
        const outdoorCount = objects.filter(o => outdoorItems.includes(o)).length;
        
        // People density
        const peopleCount = objects.filter(o => o === 'person').length;
        let crowdLevel = 'empty';
        if (peopleCount >= 5) crowdLevel = 'crowded';
        else if (peopleCount >= 2) crowdLevel = 'moderate';
        else if (peopleCount >= 1) crowdLevel = 'few people';
        
        let type = 'unknown';
        let summary = '';
        
        if (outdoorCount >= 2) {
            type = 'street';
            summary = 'You appear to be on a street or road area.';
            if (peopleCount > 0) {
                summary += ` The area has ${crowdLevel === 'crowded' ? 'many people' : crowdLevel}.`;
            }
        } else if (indoorCount >= 2) {
            type = 'indoor';
            summary = 'You appear to be indoors, possibly in a room or building.';
        } else if (peopleCount > 3) {
            type = 'public-area';
            summary = `You are in a public area with ${crowdLevel}.`;
        } else {
            summary = `I can see ${detections.length} objects around you.`;
        }
        
        this.environmentState.type = type;
        this.environmentState.crowdLevel = crowdLevel;
        
        return { type, crowdLevel, summary };
    }
    
    /**
     * Generate spatial description organized by direction and distance
     */
    generateSpatialDescription(detections) {
        // Group by direction
        const byDirection = {
            left: [],
            center: [],
            right: []
        };
        
        detections.forEach(d => {
            if (d.preciseDirection.includes('left')) {
                byDirection.left.push(d);
            } else if (d.preciseDirection.includes('right')) {
                byDirection.right.push(d);
            } else {
                byDirection.center.push(d);
            }
        });
        
        const descriptions = [];
        
        // Describe each direction
        for (const [dir, items] of Object.entries(byDirection)) {
            if (items.length === 0) continue;
            
            // Sort by distance
            items.sort((a, b) => a.estimatedDistance - b.estimatedDistance);
            
            const dirName = dir === 'center' ? 'Directly ahead' : `To your ${dir}`;
            
            // Group similar items
            const grouped = {};
            items.forEach(item => {
                const key = item.class;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            });
            
            const itemDescriptions = Object.entries(grouped).map(([objClass, objs]) => {
                const closest = objs[0];
                if (objs.length > 1) {
                    return `${objs.length} ${objClass}s, closest at ${closest.estimatedDistance} meters`;
                }
                return `${objClass} at ${closest.estimatedDistance} meters`;
            });
            
            descriptions.push(`${dirName}: ${itemDescriptions.join(', ')}.`);
        }
        
        return descriptions.join(' ');
    }
    
    /**
     * Assess safety from detections
     */
    assessSafety(detections) {
        const hazards = [];
        
        // Check for vehicles
        const vehicles = detections.filter(d => 
            ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(d.class.toLowerCase()) &&
            d.estimatedDistance < 5
        );
        
        if (vehicles.length > 0) {
            const closest = vehicles.sort((a, b) => a.estimatedDistance - b.estimatedDistance)[0];
            hazards.push(`Caution: ${closest.class} detected ${closest.estimatedDistance} meters ${closest.position === 'center' ? 'ahead' : 'on your ' + closest.position}`);
        }
        
        // Check for obstacles in path
        const centerObstacles = detections.filter(d => 
            d.preciseDirection.includes('center') && d.estimatedDistance < 3
        );
        
        if (centerObstacles.length > 0 && vehicles.length === 0) {
            hazards.push('There are obstacles directly in your path.');
        }
        
        // Overall safety
        if (hazards.length === 0) {
            return 'The visible area appears safe for movement.';
        }
        
        return hazards.join(' ');
    }
    
    /**
     * Get nearby places info from GPS
     */
    async getNearbyPlacesInfo() {
        try {
            if (!navigationService || !navigationService.currentLocation) {
                await navigationService?.getCurrentLocation();
            }
            
            if (!navigationService?.currentLocation) return null;
            
            const landmarks = await navigationService.findNearbyLandmarks(100);
            
            if (landmarks && landmarks.length > 0) {
                const closest = landmarks.slice(0, 2);
                const descriptions = closest.map(l => 
                    `${l.name} ${l.distance} meters to your ${l.direction}`
                );
                return `Nearby landmarks: ${descriptions.join(', ')}.`;
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Quick look - brief description
     */
    async quickLook() {
        if (!cameraManager.isConnected) {
            speechManager.speak('Camera not connected.');
            return;
        }
        
        const frame = cameraManager.captureFrame();
        if (!frame) return;
        
        const detections = await detectionManager.detect(frame);
        const enhancedDetections = this.enhanceDetections(detections, frame);
        
        if (enhancedDetections.length === 0) {
            speechManager.speak('Area looks clear.');
            return;
        }
        
        // Just immediate and close objects
        const nearby = enhancedDetections.filter(d => d.estimatedDistance < 5);
        
        if (nearby.length === 0) {
            speechManager.speak('Nothing close. Area appears safe.');
            return;
        }
        
        const objects = [...new Set(nearby.map(d => d.class))];
        speechManager.speak(`Quick look: ${objects.join(', ')} nearby.`);
    }
    
    /**
     * Describe what's directly ahead
     */
    async describeAhead() {
        if (!cameraManager.isConnected) {
            speechManager.speak('Camera not connected.');
            return;
        }
        
        const frame = cameraManager.captureFrame();
        if (!frame) return;
        
        const detections = await detectionManager.detect(frame);
        const enhancedDetections = this.enhanceDetections(detections, frame);
        
        const ahead = enhancedDetections.filter(d => d.preciseDirection.includes('center'));
        
        if (ahead.length === 0) {
            speechManager.speak('The path ahead is clear.');
            return;
        }
        
        ahead.sort((a, b) => a.estimatedDistance - b.estimatedDistance);
        
        const descriptions = ahead.slice(0, 3).map(d => 
            `${d.class} at ${d.estimatedDistance} meters`
        );
        
        speechManager.speak(`Ahead: ${descriptions.join(', ')}.`);
    }
    
    /**
     * Full safety check
     */
    async safetyCheck() {
        if (!cameraManager.isConnected) {
            speechManager.speak('Camera not connected.');
            return;
        }
        
        speechManager.speak('Performing safety check...');
        
        const frame = cameraManager.captureFrame();
        if (!frame) return;
        
        const detections = await detectionManager.detect(frame);
        const enhancedDetections = this.enhanceDetections(detections, frame);
        
        // Check all hazard types
        const hazards = [];
        
        // Vehicles
        const vehicles = enhancedDetections.filter(d => 
            ['car', 'truck', 'bus', 'motorcycle'].includes(d.class.toLowerCase())
        );
        if (vehicles.length > 0) {
            hazards.push(`${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''} detected`);
        }
        
        // Moving things (cyclists, etc.)
        const moving = enhancedDetections.filter(d => 
            ['bicycle', 'skateboard', 'motorcycle'].includes(d.class.toLowerCase()) &&
            d.estimatedDistance < 5
        );
        if (moving.length > 0) {
            hazards.push('moving objects nearby');
        }
        
        // Close obstacles
        const closeObstacles = enhancedDetections.filter(d => d.estimatedDistance < 2);
        if (closeObstacles.length > 0) {
            hazards.push(`${closeObstacles.length} object${closeObstacles.length > 1 ? 's' : ''} within 2 meters`);
        }
        
        if (hazards.length === 0) {
            speechManager.speak('Safety check complete. No immediate hazards detected. The area appears safe.');
        } else {
            speechManager.speak(`Safety check: ${hazards.join(', ')}. Please proceed with caution.`);
        }
    }
    
    /**
     * Group detections by class
     * @param {Array} detections - Detection results
     * @returns {Object} - Grouped detections
     */
    groupDetections(detections) {
        const grouped = {};
        
        detections.forEach(det => {
            const key = det.class;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(det);
        });
        
        // Sort each group by distance (closest first)
        for (const key of Object.keys(grouped)) {
            grouped[key].sort((a, b) => b.heightRatio - a.heightRatio);
        }
        
        return grouped;
    }
    
    /**
     * Generate safety-related information
     * @param {Array} detections - Detection results
     * @returns {string|null} - Safety information or null
     */
    generateSafetyInfo(detections) {
        const dangerousObjects = ['car', 'bus', 'truck', 'motorcycle', 'bicycle'];
        const closeThreshold = 0.4;
        
        const dangers = detections.filter(d => 
            dangerousObjects.includes(d.class.toLowerCase()) &&
            d.heightRatio > closeThreshold
        );
        
        if (dangers.length > 0) {
            const closest = dangers.reduce((a, b) => 
                a.heightRatio > b.heightRatio ? a : b
            );
            return `Caution: ${closest.class} is ${closest.distance} on your ${closest.position}. Please be careful.`;
        }
        
        // Check if path seems clear
        const centerObstacles = detections.filter(d => 
            d.position === 'center' && d.heightRatio > 0.3
        );
        
        if (centerObstacles.length === 0) {
            return 'The path ahead appears to be clear.';
        }
        
        return null;
    }
    
    /**
     * Start automatic description
     */
    startAutoDescribe() {
        this.autoDescribe = true;
        this.frameProcessingActive = true;
        
        speechManager.speak('Automatic description enabled. I will describe changes in your surroundings.');
        
        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive || !this.autoDescribe) return;
            
            const now = Date.now();
            if (now - this.lastDescriptionTime < this.descriptionInterval) return;
            
            // Run detection
            const detections = await detectionManager.detect(frame);
            
            // Draw detections
            if (frame.ctx && detections.length > 0) {
                frame.ctx.clearRect(0, 0, frame.width, frame.height);
                frame.ctx.drawImage(cameraManager.imgElement, 0, 0);
                detectionManager.drawDetections(frame.ctx, detections);
            }
            
            // Generate and speak description if scene changed significantly
            const description = this.generateBriefDescription(detections);
            
            if (description !== this.lastDescription) {
                this.lastDescription = description;
                this.lastDescriptionTime = now;
                speechManager.speak(description);
                this.updateDescriptionDisplay(description, detections);
            }
        });
    }
    
    /**
     * Stop automatic description
     */
    stopAutoDescribe() {
        this.autoDescribe = false;
        this.frameProcessingActive = false;
        cameraManager.stopFrameProcessing();
        speechManager.speak('Automatic description disabled.');
    }
    
    /**
     * Generate brief description for auto mode
     * @param {Array} detections - Detection results
     * @returns {string} - Brief description
     */
    generateBriefDescription(detections) {
        if (!detections || detections.length === 0) {
            return 'Area appears clear.';
        }
        
        const obstacleInfo = detectionManager.checkObstacles(detections);
        
        if (obstacleInfo.hasObstacle && obstacleInfo.closestObstacle.distance !== 'far') {
            return obstacleInfo.recommendation;
        }
        
        // Just mention what's visible
        const objects = [...new Set(detections.map(d => d.class))];
        if (objects.length <= 3) {
            return `Visible: ${objects.join(', ')}.`;
        }
        return `${detections.length} objects visible including ${objects.slice(0, 3).join(', ')}.`;
    }
    
    /**
     * Update UI
     * @param {boolean} active - Whether mode is active
     */
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        if (active) {
            modeContent.innerHTML = `
                <div class="scene-describe-display">
                    <div class="describe-status">
                        <span class="describe-icon">👁️</span>
                        <span class="describe-text">Ready to describe</span>
                    </div>
                    <div class="describe-controls">
                        <button id="describe-now-btn" class="btn btn-primary">
                            Describe Now
                        </button>
                        <button id="auto-describe-btn" class="btn">
                            ${this.autoDescribe ? 'Stop Auto' : 'Auto Describe'}
                        </button>
                    </div>
                    <div class="description-result" id="description-result">
                        <p>Say "describe" or tap the button to get a scene description.</p>
                    </div>
                </div>
            `;
            
            // Attach event listeners
            document.getElementById('describe-now-btn')?.addEventListener('click', () => {
                this.describeScene();
            });
            
            document.getElementById('auto-describe-btn')?.addEventListener('click', () => {
                if (this.autoDescribe) {
                    this.stopAutoDescribe();
                } else {
                    this.startAutoDescribe();
                }
                this.updateUI(true);
            });
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    /**
     * Update description display
     * @param {string} description - Scene description
     * @param {Array} detections - Detection results
     */
    updateDescriptionDisplay(description, detections) {
        const resultEl = document.getElementById('description-result');
        if (resultEl) {
            resultEl.innerHTML = `
                <div class="description-text">
                    <p>${description}</p>
                </div>
                <div class="description-meta">
                    <small>Objects detected: ${detections.length}</small>
                    <small>Time: ${new Date().toLocaleTimeString()}</small>
                </div>
            `;
        }
        
        // Update detection results
        const resultsEl = document.getElementById('detection-results');
        if (resultsEl && detections.length > 0) {
            const items = detections.map(d => 
                `• ${d.class}: ${d.distance} (${d.position}) - ${Math.round(d.score * 100)}%`
            ).join('<br>');
            resultsEl.innerHTML = `<strong>Detected Objects:</strong><br>${items}`;
        }
    }
    
    /**
     * Handle voice command
     * @param {string} command - Voice command
     * @returns {boolean} - Whether command was handled
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('cancel')) {
            this.stop();
            return true;
        }
        
        if (cmd.includes('describe') || cmd.includes('what do you see') || 
            cmd.includes('what\'s around') || cmd.includes('look around') ||
            cmd.includes('full description')) {
            this.describeScene();
            return true;
        }
        
        if (cmd.includes('quick') || cmd.includes('brief')) {
            this.quickLook();
            return true;
        }
        
        if (cmd.includes('ahead') || cmd.includes('in front')) {
            this.describeAhead();
            return true;
        }
        
        if (cmd.includes('safety') || cmd.includes('hazard') || cmd.includes('danger')) {
            this.safetyCheck();
            return true;
        }
        
        if (cmd.includes('environment') || cmd.includes('surrounding')) {
            const analysis = this.environmentState.lastAnalysis;
            if (analysis) {
                speechManager.speak(`Environment: ${analysis.summary} Crowd level: ${this.environmentState.crowdLevel}.`);
            } else {
                speechManager.speak('Say describe first to analyze the environment.');
            }
            return true;
        }
        
        if (cmd.includes('nearby') || cmd.includes('places') || cmd.includes('landmark')) {
            this.announceNearbyPlaces();
            return true;
        }
        
        if (cmd.includes('auto') || cmd.includes('automatic') || cmd.includes('continuous')) {
            if (this.autoDescribe) {
                this.stopAutoDescribe();
            } else {
                this.startAutoDescribe();
            }
            return true;
        }
        
        if (cmd.includes('repeat') || cmd.includes('again')) {
            if (this.lastDescription) {
                speechManager.speak(this.lastDescription);
            } else {
                speechManager.speak('No previous description. Say describe to analyze the scene.');
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * Announce nearby places using GPS
     */
    async announceNearbyPlaces() {
        try {
            speechManager.speak('Finding nearby places...');
            
            if (!navigationService) {
                speechManager.speak('Navigation service not available.');
                return;
            }
            
            await navigationService.getCurrentLocation();
            const landmarks = await navigationService.findNearbyLandmarks(200);
            const busStops = await navigationService.findNearbyBusStops(300);
            
            const parts = [];
            
            if (landmarks && landmarks.length > 0) {
                const closest = landmarks.slice(0, 3);
                const descs = closest.map(l => `${l.name} ${l.distance} meters ${l.direction}`);
                parts.push(`Nearby places: ${descs.join(', ')}.`);
            }
            
            if (busStops && busStops.length > 0) {
                parts.push(`Nearest bus stop: ${busStops[0].name} at ${busStops[0].distance} meters ${busStops[0].direction}.`);
            }
            
            if (parts.length === 0) {
                speechManager.speak('Could not find nearby landmarks. Make sure GPS is enabled.');
            } else {
                speechManager.speak(parts.join(' '));
            }
            
        } catch (e) {
            speechManager.speak('Could not fetch nearby places. Please check GPS and internet.');
        }
    }
}

// Export singleton instance
const sceneDescribeMode = new SceneDescribeMode();
