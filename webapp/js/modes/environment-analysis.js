/**
 * BlindNav+ Environment Analysis Mode
 * Cloud detection, rain prediction, lighting analysis via camera
 */

class EnvironmentAnalysisMode {
    constructor() {
        this.isActive = false;
        this.frameProcessingActive = false;
        this.lastAnalysis = null;
        this.analysisHistory = [];
        this.lastAnnouncementTime = 0;
        this.announcementCooldown = 5000;
        
        // Weather tracking
        this.weatherTrend = [];
        this.rainAlertThreshold = 0.6;
        this.lastRainAlert = 0;
        
        // Environment state
        this.currentEnvironment = {
            type: 'unknown', // indoor, outdoor, transitional
            lighting: 'unknown',
            weather: null,
            lastUpdate: 0
        };
        
        // Analysis settings
        this.settings = {
            analysisInterval: 3000, // Full analysis every 3 seconds
            quickCheckInterval: 1000,
            weatherHistoryLength: 30,
            alertOnSignificantChange: true
        };
        
        // Color analysis for sky
        this.skyColorRanges = {
            clearBlue: { h: [200, 240], s: [40, 100], l: [40, 70] },
            cloudyWhite: { h: [0, 360], s: [0, 20], l: [70, 100] },
            overcastGray: { h: [0, 360], s: [0, 20], l: [40, 70] },
            stormDark: { h: [200, 280], s: [10, 50], l: [20, 40] },
            sunset: { h: [0, 50], s: [50, 100], l: [40, 70] },
            sunrise: { h: [20, 60], s: [50, 100], l: [50, 80] }
        };
    }
    
    /**
     * Start environment analysis mode
     */
    async start() {
        if (this.isActive) {
            console.log('[Environment] Already active');
            return;
        }
        
        this.isActive = true;
        console.log('[Environment] Mode started');
        
        // Initialize vision service if available
        if (typeof visionService !== 'undefined' && !visionService.isInitialized) {
            await visionService.initialize();
        }
        
        speechManager.speak(
            'Environment Analysis Mode activated. ' +
            'I will analyze weather conditions, lighting, and surroundings. ' +
            'Say "weather" for current conditions, ' +
            '"environment" for detailed analysis.',
            true
        );
        
        this.updateUI(true);
        this.startContinuousAnalysis();
    }
    
    /**
     * Stop environment analysis mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.frameProcessingActive = false;
        cameraManager.stopFrameProcessing();
        
        speechManager.speak('Exiting Environment Analysis Mode.');
        
        this.updateUI(false);
        
        console.log('[Environment] Mode stopped');
    }
    
    /**
     * Start continuous environment analysis
     */
    startContinuousAnalysis() {
        this.frameProcessingActive = true;
        let frameCount = 0;
        let lastFullAnalysis = 0;
        
        cameraManager.startFrameProcessing(async (frame) => {
            if (!this.isActive || !this.frameProcessingActive) return;
            
            frameCount++;
            const now = Date.now();
            
            // Quick check every frame
            if (frameCount % 3 === 0) {
                this.quickLightingCheck(frame);
            }
            
            // Full analysis at intervals
            if (now - lastFullAnalysis >= this.settings.analysisInterval) {
                lastFullAnalysis = now;
                const analysis = await this.analyzeEnvironment(frame);
                this.lastAnalysis = analysis;
                
                // Update weather trend
                this.updateWeatherTrend(analysis);
                
                // Check for alerts
                this.checkForAlerts(analysis);
                
                // Update display
                this.updateResultsDisplay(analysis);
                
                // Draw visualization
                if (frame.ctx) {
                    this.drawEnvironmentVisualization(frame.ctx, analysis, frame);
                }
            }
        });
    }
    
    /**
     * Perform comprehensive environment analysis
     */
    async analyzeEnvironment(frame) {
        // Use vision service if available
        if (typeof visionService !== 'undefined') {
            return await visionService.analyzeWeatherFromCamera(frame);
        }
        
        // Manual analysis fallback
        const skyAnalysis = this.analyzeSky(frame);
        const lightingAnalysis = this.analyzeLighting(frame);
        const environmentType = this.determineEnvironmentType(frame, skyAnalysis);
        const cloudAnalysis = this.analyzeCloudCoverage(skyAnalysis);
        const rainPrediction = this.predictRain(skyAnalysis, lightingAnalysis, cloudAnalysis);
        
        return {
            timestamp: Date.now(),
            isIndoor: environmentType === 'indoor',
            environmentType,
            timeOfDay: lightingAnalysis.timeOfDay,
            brightness: lightingAnalysis.brightnessLevel,
            sky: {
                visible: skyAnalysis.isVisible,
                cloudCoverage: cloudAnalysis.percentage,
                cloudType: cloudAnalysis.type,
                color: skyAnalysis.dominantColor
            },
            weather: {
                rainProbability: rainPrediction.probability,
                condition: this.getWeatherCondition(cloudAnalysis, rainPrediction, lightingAnalysis),
                advisory: this.getWeatherAdvisory(cloudAnalysis, rainPrediction)
            },
            lighting: lightingAnalysis,
            guidance: this.generateEnvironmentGuidance(
                environmentType, cloudAnalysis, rainPrediction, lightingAnalysis
            )
        };
    }
    
    /**
     * Quick lighting check for immediate changes
     */
    quickLightingCheck(frame) {
        const ctx = frame.ctx;
        
        // Sample center region for quick brightness check
        const centerX = Math.floor(frame.width * 0.4);
        const centerY = Math.floor(frame.height * 0.3);
        const sampleWidth = Math.floor(frame.width * 0.2);
        const sampleHeight = Math.floor(frame.height * 0.2);
        
        try {
            const imageData = ctx.getImageData(centerX, centerY, sampleWidth, sampleHeight);
            const data = imageData.data;
            
            let totalBrightness = 0;
            let samples = 0;
            
            for (let i = 0; i < data.length; i += 16) {
                totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
                samples++;
            }
            
            const avgBrightness = totalBrightness / samples;
            
            // Check for sudden darkness (might indicate rain cloud)
            if (this.currentEnvironment.lighting !== 'unknown') {
                const prevBrightness = this.currentEnvironment.brightness || 128;
                const change = avgBrightness - prevBrightness;
                
                if (Math.abs(change) > 50) {
                    // Significant change
                    if (change < -50) {
                        this.quickAlert('Lighting suddenly dimmed - possible cloud cover');
                    } else if (change > 50) {
                        this.quickAlert('Lighting brightened - clouds may be clearing');
                    }
                }
            }
            
            this.currentEnvironment.brightness = avgBrightness;
            
        } catch (e) {
            // Ignore quick check errors
        }
    }
    
    /**
     * Quick alert for immediate changes
     */
    quickAlert(message) {
        const now = Date.now();
        if (now - this.lastAnnouncementTime > this.announcementCooldown) {
            speechManager.speak(message);
            this.lastAnnouncementTime = now;
        }
    }
    
    /**
     * Analyze sky region
     */
    analyzeSky(frame) {
        const ctx = frame.ctx;
        const skyHeight = Math.floor(frame.height * 0.4);
        
        try {
            const imageData = ctx.getImageData(0, 0, frame.width, skyHeight);
            const data = imageData.data;
            
            let colorCounts = {
                blue: 0,
                white: 0,
                gray: 0,
                dark: 0,
                warm: 0
            };
            
            let totalR = 0, totalG = 0, totalB = 0;
            let samples = 0;
            
            for (let i = 0; i < data.length; i += 16) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                totalR += r;
                totalG += g;
                totalB += b;
                samples++;
                
                // Classify pixel color
                if (b > r * 1.2 && b > g * 1.1 && brightness > 100) {
                    colorCounts.blue++;
                } else if (brightness > 200 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
                    colorCounts.white++;
                } else if (brightness > 80 && brightness < 180 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) {
                    colorCounts.gray++;
                } else if (brightness < 80) {
                    colorCounts.dark++;
                } else if (r > g && r > b && brightness > 100) {
                    colorCounts.warm++;
                }
            }
            
            const total = samples;
            const avgR = totalR / samples;
            const avgG = totalG / samples;
            const avgB = totalB / samples;
            
            // Determine dominant characteristic
            let dominantColor = 'unknown';
            let maxCount = 0;
            
            for (const [color, count] of Object.entries(colorCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantColor = color;
                }
            }
            
            return {
                isVisible: (colorCounts.blue + colorCounts.white + colorCounts.gray + colorCounts.warm) / total > 0.3,
                dominantColor,
                bluePercentage: colorCounts.blue / total,
                whitePercentage: colorCounts.white / total,
                grayPercentage: colorCounts.gray / total,
                darkPercentage: colorCounts.dark / total,
                warmPercentage: colorCounts.warm / total,
                avgColor: { r: avgR, g: avgG, b: avgB },
                brightness: (avgR + avgG + avgB) / 3
            };
            
        } catch (error) {
            return {
                isVisible: false,
                dominantColor: 'unknown',
                brightness: 0
            };
        }
    }
    
    /**
     * Analyze overall lighting conditions
     */
    analyzeLighting(frame) {
        const ctx = frame.ctx;
        
        try {
            const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
            const data = imageData.data;
            
            let totalBrightness = 0;
            let brightnessValues = [];
            let samples = 0;
            
            // Color temperature analysis
            let totalR = 0, totalG = 0, totalB = 0;
            
            for (let i = 0; i < data.length; i += 32) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                
                totalBrightness += brightness;
                brightnessValues.push(brightness);
                totalR += r;
                totalG += g;
                totalB += b;
                samples++;
            }
            
            const avgBrightness = totalBrightness / samples;
            
            // Calculate contrast (standard deviation)
            let variance = 0;
            brightnessValues.forEach(b => {
                variance += Math.pow(b - avgBrightness, 2);
            });
            const contrast = Math.sqrt(variance / samples);
            
            // Color temperature
            const avgR = totalR / samples;
            const avgG = totalG / samples;
            const avgB = totalB / samples;
            
            let colorTemperature = 'neutral';
            if (avgR > avgB * 1.2) {
                colorTemperature = 'warm';
            } else if (avgB > avgR * 1.2) {
                colorTemperature = 'cool';
            }
            
            // Determine time of day
            let timeOfDay;
            if (avgBrightness < 30) {
                timeOfDay = 'night';
            } else if (avgBrightness < 60) {
                timeOfDay = colorTemperature === 'warm' ? 'sunset/sunrise' : 'dusk/dawn';
            } else if (avgBrightness < 100) {
                timeOfDay = 'overcast/cloudy';
            } else if (avgBrightness < 180) {
                timeOfDay = 'day';
            } else {
                timeOfDay = 'bright day';
            }
            
            // Brightness level
            let brightnessLevel;
            if (avgBrightness < 30) {
                brightnessLevel = 'very dark';
            } else if (avgBrightness < 60) {
                brightnessLevel = 'dark';
            } else if (avgBrightness < 100) {
                brightnessLevel = 'dim';
            } else if (avgBrightness < 150) {
                brightnessLevel = 'moderate';
            } else if (avgBrightness < 200) {
                brightnessLevel = 'bright';
            } else {
                brightnessLevel = 'very bright';
            }
            
            return {
                avgBrightness,
                contrast,
                timeOfDay,
                brightnessLevel,
                colorTemperature,
                isLowLight: avgBrightness < 60,
                isBright: avgBrightness > 180,
                visibility: avgBrightness > 50 ? 'good' : avgBrightness > 25 ? 'reduced' : 'poor'
            };
            
        } catch (error) {
            return {
                avgBrightness: 128,
                timeOfDay: 'unknown',
                brightnessLevel: 'unknown',
                visibility: 'unknown'
            };
        }
    }
    
    /**
     * Determine environment type
     */
    determineEnvironmentType(frame, skyAnalysis) {
        // Check if sky is visible and looks natural
        if (skyAnalysis.isVisible && 
            (skyAnalysis.bluePercentage > 0.2 || 
             skyAnalysis.whitePercentage > 0.3 ||
             skyAnalysis.grayPercentage > 0.3)) {
            return 'outdoor';
        }
        
        // Check for artificial lighting characteristics
        if (skyAnalysis.brightness > 50 && !skyAnalysis.isVisible) {
            return 'indoor';
        }
        
        // Mixed/uncertain
        if (skyAnalysis.brightness > 30) {
            return 'transitional';
        }
        
        return 'unknown';
    }
    
    /**
     * Analyze cloud coverage
     */
    analyzeCloudCoverage(skyAnalysis) {
        if (!skyAnalysis.isVisible) {
            return {
                percentage: 0,
                type: 'not visible',
                density: 'unknown'
            };
        }
        
        // Calculate cloud coverage from sky colors
        const cloudRatio = (skyAnalysis.whitePercentage + skyAnalysis.grayPercentage * 0.8);
        const clearRatio = skyAnalysis.bluePercentage;
        
        let percentage = 0;
        if (clearRatio + cloudRatio > 0) {
            percentage = (cloudRatio / (clearRatio + cloudRatio)) * 100;
        }
        
        // Determine cloud type
        let type;
        if (skyAnalysis.darkPercentage > 0.3) {
            type = 'storm clouds (cumulonimbus)';
        } else if (skyAnalysis.grayPercentage > 0.5) {
            type = 'overcast (stratus)';
        } else if (skyAnalysis.whitePercentage > 0.3 && skyAnalysis.bluePercentage > 0.2) {
            type = 'fair weather (cumulus)';
        } else if (skyAnalysis.bluePercentage > 0.5) {
            type = 'clear sky';
        } else if (skyAnalysis.whitePercentage > 0.4) {
            type = 'high thin clouds (cirrus)';
        } else {
            type = 'mixed clouds';
        }
        
        // Density description
        let density;
        if (percentage < 20) {
            density = 'clear';
        } else if (percentage < 40) {
            density = 'partly cloudy';
        } else if (percentage < 70) {
            density = 'mostly cloudy';
        } else {
            density = 'overcast';
        }
        
        return {
            percentage: Math.round(percentage),
            type,
            density
        };
    }
    
    /**
     * Predict rain probability
     */
    predictRain(skyAnalysis, lightingAnalysis, cloudAnalysis) {
        if (!skyAnalysis.isVisible) {
            return {
                probability: 0,
                confidence: 'low',
                timeframe: 'unknown'
            };
        }
        
        let probability = 0;
        const factors = [];
        
        // Dark clouds are strong indicator
        if (skyAnalysis.darkPercentage > 0.25) {
            probability += 0.35;
            factors.push('dark clouds present');
        }
        
        // Heavy gray coverage
        if (skyAnalysis.grayPercentage > 0.5) {
            probability += 0.25;
            factors.push('heavy gray cloud cover');
        }
        
        // Low brightness during daytime
        if (lightingAnalysis.avgBrightness < 80 && lightingAnalysis.timeOfDay !== 'night') {
            probability += 0.2;
            factors.push('unusually dark for time of day');
        }
        
        // High cloud coverage
        if (cloudAnalysis.percentage > 80) {
            probability += 0.15;
            factors.push('very high cloud coverage');
        }
        
        // Storm cloud type
        if (cloudAnalysis.type.includes('storm') || cloudAnalysis.type.includes('cumulonimbus')) {
            probability += 0.3;
            factors.push('storm cloud formation');
        }
        
        // Cool color temperature with clouds
        if (lightingAnalysis.colorTemperature === 'cool' && cloudAnalysis.percentage > 50) {
            probability += 0.1;
            factors.push('cool light with clouds');
        }
        
        // Cap probability
        probability = Math.min(1, probability);
        
        // Determine confidence
        let confidence;
        if (factors.length >= 3) {
            confidence = 'high';
        } else if (factors.length >= 2) {
            confidence = 'medium';
        } else {
            confidence = 'low';
        }
        
        // Estimate timeframe
        let timeframe;
        if (probability > 0.7 && skyAnalysis.darkPercentage > 0.3) {
            timeframe = 'very soon (within 30 minutes)';
        } else if (probability > 0.5) {
            timeframe = 'within 1-2 hours';
        } else if (probability > 0.3) {
            timeframe = 'possible later today';
        } else {
            timeframe = 'unlikely soon';
        }
        
        return {
            probability: Math.round(probability * 100),
            confidence,
            timeframe,
            factors
        };
    }
    
    /**
     * Get weather condition description
     */
    getWeatherCondition(cloudAnalysis, rainPrediction, lighting) {
        if (rainPrediction.probability > 70) {
            return 'rain likely';
        }
        if (rainPrediction.probability > 40) {
            return 'possible rain';
        }
        if (cloudAnalysis.density === 'overcast') {
            return 'overcast';
        }
        if (cloudAnalysis.density === 'mostly cloudy') {
            return 'mostly cloudy';
        }
        if (cloudAnalysis.density === 'partly cloudy') {
            return 'partly cloudy';
        }
        if (lighting.isBright && cloudAnalysis.density === 'clear') {
            return 'clear and sunny';
        }
        return 'fair';
    }
    
    /**
     * Get weather advisory
     */
    getWeatherAdvisory(cloudAnalysis, rainPrediction) {
        if (rainPrediction.probability > 70) {
            return 'Rain appears likely. Carry an umbrella or seek shelter if outdoors.';
        }
        if (rainPrediction.probability > 40) {
            return 'There is a chance of rain. Consider carrying rain protection.';
        }
        if (cloudAnalysis.density === 'overcast') {
            return 'Overcast skies. Good visibility but no direct sun.';
        }
        if (cloudAnalysis.type.includes('storm')) {
            return 'Storm clouds visible. Monitor conditions and be prepared to seek shelter.';
        }
        return 'Weather conditions appear favorable for outdoor activity.';
    }
    
    /**
     * Generate comprehensive environment guidance
     */
    generateEnvironmentGuidance(environmentType, cloudAnalysis, rainPrediction, lighting) {
        const parts = [];
        
        // Environment type
        if (environmentType === 'outdoor') {
            parts.push('You appear to be outdoors.');
        } else if (environmentType === 'indoor') {
            parts.push('You appear to be indoors.');
        } else {
            parts.push('Environment type is mixed or transitional.');
        }
        
        // Time/lighting
        parts.push(`Lighting: ${lighting.brightnessLevel} (${lighting.timeOfDay}).`);
        
        // Weather (if outdoor)
        if (environmentType === 'outdoor' || environmentType === 'transitional') {
            parts.push(`Sky: ${cloudAnalysis.density}.`);
            
            if (rainPrediction.probability > 30) {
                parts.push(`Rain probability: ${rainPrediction.probability}%.`);
            }
        }
        
        // Visibility
        parts.push(`Visibility: ${lighting.visibility}.`);
        
        return parts.join(' ');
    }
    
    /**
     * Update weather trend tracking
     */
    updateWeatherTrend(analysis) {
        this.weatherTrend.push({
            time: analysis.timestamp,
            cloudCoverage: analysis.sky.cloudCoverage,
            rainProb: analysis.weather.rainProbability,
            brightness: analysis.lighting.avgBrightness
        });
        
        // Keep limited history
        if (this.weatherTrend.length > this.settings.weatherHistoryLength) {
            this.weatherTrend.shift();
        }
        
        this.analysisHistory.push(analysis);
        if (this.analysisHistory.length > 20) {
            this.analysisHistory.shift();
        }
    }
    
    /**
     * Check for weather alerts
     */
    checkForAlerts(analysis) {
        const now = Date.now();
        
        // Rain alert
        if (analysis.weather.rainProbability >= this.rainAlertThreshold * 100) {
            if (now - this.lastRainAlert > 60000) { // Max once per minute
                speechManager.speak(
                    `Weather alert: ${analysis.weather.rainProbability}% chance of rain. ` +
                    `${analysis.weather.advisory}`,
                    true
                );
                this.lastRainAlert = now;
            }
        }
        
        // Significant weather change
        if (this.weatherTrend.length >= 5) {
            const recent = this.weatherTrend.slice(-5);
            const oldAvg = (recent[0].cloudCoverage + recent[1].cloudCoverage) / 2;
            const newAvg = (recent[3].cloudCoverage + recent[4].cloudCoverage) / 2;
            
            if (Math.abs(newAvg - oldAvg) > 30 && 
                now - this.lastAnnouncementTime > this.announcementCooldown) {
                
                if (newAvg > oldAvg) {
                    speechManager.speak('Cloud coverage is increasing significantly.');
                } else {
                    speechManager.speak('Clouds appear to be clearing.');
                }
                this.lastAnnouncementTime = now;
            }
        }
    }
    
    /**
     * Get current weather report
     */
    getCurrentWeather() {
        if (!this.lastAnalysis) {
            speechManager.speak('Analyzing weather conditions. Please wait.');
            return;
        }
        
        const a = this.lastAnalysis;
        let message = 'Current weather analysis: ';
        
        message += `${a.weather.condition}. `;
        message += `${a.lighting.brightnessLevel} lighting. `;
        
        if (a.sky.visible) {
            message += `Cloud coverage: ${a.sky.cloudCoverage}%. `;
            message += `Cloud type: ${a.sky.cloudType}. `;
        }
        
        message += `Rain probability: ${a.weather.rainProbability}%. `;
        message += a.weather.advisory;
        
        speechManager.speak(message);
    }
    
    /**
     * Get detailed environment analysis
     */
    getDetailedAnalysis() {
        if (!this.lastAnalysis) {
            speechManager.speak('Analyzing environment. Please wait.');
            return;
        }
        
        const a = this.lastAnalysis;
        let message = 'Detailed environment analysis: ';
        
        // Environment type
        message += `You are ${a.isIndoor ? 'indoors' : 'outdoors'}. `;
        
        // Lighting
        message += `Time of day appears to be ${a.lighting.timeOfDay}. `;
        message += `Brightness level: ${a.lighting.brightnessLevel}. `;
        message += `Visibility is ${a.lighting.visibility}. `;
        
        // Weather if outdoor
        if (!a.isIndoor) {
            if (a.sky.visible) {
                message += `Sky condition: ${a.sky.cloudType}. `;
                message += `Weather: ${a.weather.condition}. `;
                
                if (a.weather.rainProbability > 20) {
                    message += `Rain probability: ${a.weather.rainProbability}%. `;
                }
            }
        }
        
        // Advisory
        message += a.weather.advisory;
        
        speechManager.speak(message);
    }
    
    /**
     * Get weather trend
     */
    getWeatherTrend() {
        if (this.weatherTrend.length < 5) {
            speechManager.speak('Not enough data yet for trend analysis. Please wait.');
            return;
        }
        
        const early = this.weatherTrend.slice(0, 5);
        const recent = this.weatherTrend.slice(-5);
        
        const earlyCloud = early.reduce((a, b) => a + b.cloudCoverage, 0) / 5;
        const recentCloud = recent.reduce((a, b) => a + b.cloudCoverage, 0) / 5;
        
        const earlyRain = early.reduce((a, b) => a + b.rainProb, 0) / 5;
        const recentRain = recent.reduce((a, b) => a + b.rainProb, 0) / 5;
        
        let message = 'Weather trend: ';
        
        const cloudChange = recentCloud - earlyCloud;
        if (cloudChange > 15) {
            message += 'Cloud coverage increasing. ';
        } else if (cloudChange < -15) {
            message += 'Cloud coverage decreasing. ';
        } else {
            message += 'Cloud coverage stable. ';
        }
        
        const rainChange = recentRain - earlyRain;
        if (rainChange > 20) {
            message += 'Rain probability trending higher. ';
        } else if (rainChange < -20) {
            message += 'Rain probability decreasing. ';
        } else {
            message += 'Rain probability stable. ';
        }
        
        if (recentCloud < 30 && recentRain < 20) {
            message += 'Conditions appear to be improving.';
        } else if (recentCloud > 70 || recentRain > 50) {
            message += 'Conditions may be deteriorating.';
        } else {
            message += 'Conditions relatively unchanged.';
        }
        
        speechManager.speak(message);
    }
    
    /**
     * Draw environment visualization
     */
    drawEnvironmentVisualization(ctx, analysis, frame) {
        ctx.clearRect(0, 0, frame.width, frame.height);
        ctx.drawImage(cameraManager.imgElement, 0, 0);
        
        ctx.save();
        
        // Sky region overlay
        const skyHeight = frame.height * 0.4;
        
        // Cloud coverage visualization
        if (analysis.sky.visible) {
            ctx.fillStyle = `rgba(255, 255, 255, ${analysis.sky.cloudCoverage / 300})`;
            ctx.fillRect(0, 0, frame.width, skyHeight);
        }
        
        // Weather indicator panel
        const panelX = 10;
        const panelY = 10;
        const panelWidth = 200;
        const panelHeight = 100;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Inter';
        ctx.fillText('Environment', panelX + 10, panelY + 20);
        
        ctx.font = '12px Inter';
        ctx.fillText(`☁️ Clouds: ${analysis.sky.cloudCoverage}%`, panelX + 10, panelY + 40);
        ctx.fillText(`🌧️ Rain: ${analysis.weather.rainProbability}%`, panelX + 10, panelY + 58);
        ctx.fillText(`💡 Light: ${analysis.brightness}`, panelX + 10, panelY + 76);
        ctx.fillText(`📍 ${analysis.isIndoor ? 'Indoor' : 'Outdoor'}`, panelX + 10, panelY + 94);
        
        // Weather icon
        let weatherIcon;
        if (analysis.weather.rainProbability > 70) {
            weatherIcon = '🌧️';
        } else if (analysis.weather.rainProbability > 40) {
            weatherIcon = '🌦️';
        } else if (analysis.sky.cloudCoverage > 70) {
            weatherIcon = '☁️';
        } else if (analysis.sky.cloudCoverage > 30) {
            weatherIcon = '⛅';
        } else {
            weatherIcon = '☀️';
        }
        
        ctx.font = '40px Arial';
        ctx.fillText(weatherIcon, panelX + 140, panelY + 60);
        
        // Rain probability indicator
        if (analysis.weather.rainProbability > 30) {
            const barWidth = 180;
            const barHeight = 8;
            const barX = panelX + 10;
            const barY = frame.height - 30;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX - 5, barY - 15, barWidth + 10, 35);
            
            ctx.fillStyle = '#444';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            const rainColor = analysis.weather.rainProbability > 70 ? '#e74c3c' :
                analysis.weather.rainProbability > 50 ? '#f39c12' : '#3498db';
            
            ctx.fillStyle = rainColor;
            ctx.fillRect(barX, barY, barWidth * (analysis.weather.rainProbability / 100), barHeight);
            
            ctx.fillStyle = '#fff';
            ctx.font = '11px Inter';
            ctx.fillText(`Rain: ${analysis.weather.rainProbability}%`, barX, barY + 20);
        }
        
        ctx.restore();
    }
    
    /**
     * Update UI
     */
    updateUI(active) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        if (active) {
            modeContent.innerHTML = `
                <div class="environment-analysis-display">
                    <div class="env-header">
                        <span class="env-icon">🌤️</span>
                        <span class="env-title">Environment Analysis</span>
                    </div>
                    
                    <div class="weather-summary" id="weather-summary">
                        <div class="weather-icon" id="weather-icon">⏳</div>
                        <div class="weather-condition" id="weather-condition">Analyzing...</div>
                    </div>
                    
                    <div class="env-metrics">
                        <div class="metric">
                            <span class="metric-label">☁️ Clouds</span>
                            <div class="metric-bar">
                                <div class="metric-fill cloud-fill" id="cloud-fill"></div>
                            </div>
                            <span class="metric-value" id="cloud-value">--</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">🌧️ Rain</span>
                            <div class="metric-bar">
                                <div class="metric-fill rain-fill" id="rain-fill"></div>
                            </div>
                            <span class="metric-value" id="rain-value">--</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">💡 Light</span>
                            <div class="metric-bar">
                                <div class="metric-fill light-fill" id="light-fill"></div>
                            </div>
                            <span class="metric-value" id="light-value">--</span>
                        </div>
                    </div>
                    
                    <div class="env-details" id="env-details">
                        <div class="detail-item">
                            <span class="detail-label">Environment:</span>
                            <span class="detail-value" id="env-type">--</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Time of Day:</span>
                            <span class="detail-value" id="time-of-day">--</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Cloud Type:</span>
                            <span class="detail-value" id="cloud-type">--</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Visibility:</span>
                            <span class="detail-value" id="visibility">--</span>
                        </div>
                    </div>
                    
                    <div class="weather-advisory" id="weather-advisory">
                        <span class="advisory-icon">ℹ️</span>
                        <span class="advisory-text">Analyzing conditions...</span>
                    </div>
                    
                    <div class="env-actions">
                        <button class="env-btn" onclick="environmentAnalysisMode.getCurrentWeather()">
                            🌤️ Weather Report
                        </button>
                        <button class="env-btn" onclick="environmentAnalysisMode.getWeatherTrend()">
                            📈 Weather Trend
                        </button>
                        <button class="env-btn" onclick="environmentAnalysisMode.getDetailedAnalysis()">
                            🔍 Detailed Analysis
                        </button>
                    </div>
                </div>
            `;
        } else {
            modeContent.innerHTML = '';
        }
    }
    
    /**
     * Update results display
     */
    updateResultsDisplay(analysis) {
        // Weather icon
        const iconEl = document.getElementById('weather-icon');
        if (iconEl) {
            let icon;
            if (analysis.weather.rainProbability > 70) {
                icon = '🌧️';
            } else if (analysis.weather.rainProbability > 40) {
                icon = '🌦️';
            } else if (analysis.sky.cloudCoverage > 70) {
                icon = '☁️';
            } else if (analysis.sky.cloudCoverage > 30) {
                icon = '⛅';
            } else if (analysis.isIndoor) {
                icon = '🏠';
            } else {
                icon = '☀️';
            }
            iconEl.textContent = icon;
        }
        
        // Weather condition
        const conditionEl = document.getElementById('weather-condition');
        if (conditionEl) {
            conditionEl.textContent = analysis.weather.condition;
        }
        
        // Metrics
        const cloudFill = document.getElementById('cloud-fill');
        const cloudValue = document.getElementById('cloud-value');
        if (cloudFill && cloudValue) {
            cloudFill.style.width = `${analysis.sky.cloudCoverage}%`;
            cloudValue.textContent = `${analysis.sky.cloudCoverage}%`;
        }
        
        const rainFill = document.getElementById('rain-fill');
        const rainValue = document.getElementById('rain-value');
        if (rainFill && rainValue) {
            rainFill.style.width = `${analysis.weather.rainProbability}%`;
            rainFill.style.backgroundColor = analysis.weather.rainProbability > 70 ? '#e74c3c' :
                analysis.weather.rainProbability > 40 ? '#f39c12' : '#3498db';
            rainValue.textContent = `${analysis.weather.rainProbability}%`;
        }
        
        const lightFill = document.getElementById('light-fill');
        const lightValue = document.getElementById('light-value');
        if (lightFill && lightValue) {
            const lightPct = Math.min(100, (analysis.lighting.avgBrightness / 255) * 100);
            lightFill.style.width = `${lightPct}%`;
            lightValue.textContent = analysis.brightness;
        }
        
        // Details
        const envType = document.getElementById('env-type');
        if (envType) envType.textContent = analysis.isIndoor ? 'Indoor' : 'Outdoor';
        
        const timeOfDay = document.getElementById('time-of-day');
        if (timeOfDay) timeOfDay.textContent = analysis.timeOfDay;
        
        const cloudType = document.getElementById('cloud-type');
        if (cloudType) cloudType.textContent = analysis.sky.cloudType || 'N/A';
        
        const visibility = document.getElementById('visibility');
        if (visibility) visibility.textContent = analysis.lighting.visibility;
        
        // Advisory
        const advisoryEl = document.getElementById('weather-advisory');
        if (advisoryEl) {
            const icon = analysis.weather.rainProbability > 50 ? '⚠️' : 'ℹ️';
            advisoryEl.innerHTML = `
                <span class="advisory-icon">${icon}</span>
                <span class="advisory-text">${analysis.weather.advisory}</span>
            `;
            advisoryEl.className = `weather-advisory ${analysis.weather.rainProbability > 50 ? 'warning' : ''}`;
        }
    }
    
    /**
     * Handle voice command
     */
    handleCommand(command) {
        const cmd = command.toLowerCase();
        
        // Exit
        if (cmd.includes('stop') || cmd.includes('exit')) {
            this.stop();
            return true;
        }
        
        // Weather report
        if (cmd.includes('weather') || cmd.includes('forecast') || cmd.includes('rain')) {
            this.getCurrentWeather();
            return true;
        }
        
        // Detailed analysis
        if (cmd.includes('environment') || cmd.includes('surroundings') || 
            cmd.includes('analysis') || cmd.includes('detail')) {
            this.getDetailedAnalysis();
            return true;
        }
        
        // Weather trend
        if (cmd.includes('trend') || cmd.includes('changing') || cmd.includes('getting')) {
            this.getWeatherTrend();
            return true;
        }
        
        // Cloud status
        if (cmd.includes('cloud') || cmd.includes('sky')) {
            if (this.lastAnalysis) {
                speechManager.speak(
                    `Cloud coverage is ${this.lastAnalysis.sky.cloudCoverage}%. ` +
                    `Sky condition: ${this.lastAnalysis.sky.cloudType}.`
                );
            } else {
                speechManager.speak('Analyzing sky conditions...');
            }
            return true;
        }
        
        // Lighting
        if (cmd.includes('light') || cmd.includes('bright') || cmd.includes('dark')) {
            if (this.lastAnalysis) {
                speechManager.speak(
                    `Lighting level: ${this.lastAnalysis.brightness}. ` +
                    `Visibility: ${this.lastAnalysis.lighting.visibility}. ` +
                    `Time of day: ${this.lastAnalysis.timeOfDay}.`
                );
            } else {
                speechManager.speak('Analyzing lighting conditions...');
            }
            return true;
        }
        
        // Indoor/outdoor
        if (cmd.includes('indoor') || cmd.includes('outdoor') || cmd.includes('inside') || cmd.includes('outside')) {
            if (this.lastAnalysis) {
                speechManager.speak(
                    `You appear to be ${this.lastAnalysis.isIndoor ? 'indoors' : 'outdoors'}.`
                );
            } else {
                speechManager.speak('Analyzing environment type...');
            }
            return true;
        }
        
        return false;
    }
}

// Export singleton instance
const environmentAnalysisMode = new EnvironmentAnalysisMode();
