/**
 * BlindNav+ Enhanced Reading Mode
 * Advanced OCR-based text reading with document understanding
 * Features: Multi-engine OCR, heading navigation, document scene description
 */

class ReadingMode {
    constructor() {
        this.isActive = false;
        this.isProcessing = false;
        this.isOCRReady = false;
        
        // Reading state
        this.lastReadText = '';
        this.lastOCRResult = null;
        this.readingHistory = [];
        this.continuousMode = false;
        this.frameProcessingActive = false;
        
        // Document navigation
        this.currentHeadingIndex = -1;
        this.currentParagraphIndex = 0;
        
        // Settings
        this.settings = {
            preprocessEnabled: true,
            speakConfidence: true,
            autoQualityCheck: true,
            combinedOCR: false, // Use multiple passes
            readingSpeed: 1.0
        };
        
        // Bound methods
        this.processFrame = this.processFrame.bind(this);
    }
    
    /**
     * Start reading mode
     */
    async start() {
        if (this.isActive) {
            speechManager.speak('Reading mode is already active.', true);
            return;
        }
        
        this.isActive = true;
        console.log('[Reading] Enhanced mode started');
        
        const welcome = `Reading mode activated. Point your camera at text and say "read this" when ready.`;
        
        speechManager.speak(welcome, true);
        
        // Initialize OCR service
        await this.initOCR();
        
        this.updateUI(true);
    }
    
    /**
     * Stop reading mode
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.continuousMode = false;
        this.frameProcessingActive = false;
        
        cameraManager.stopFrameProcessing();
        
        speechManager.speak('Reading mode ended.', true);
        
        this.updateUI(false);
        console.log('[Reading] Mode stopped');
    }
    
    /**
     * Initialize OCR
     */
    async initOCR() {
        if (this.isOCRReady) return;
        
        try {
            speechManager.speak('Loading advanced text recognition. Please wait.', false);
            
            await ocrService.initialize();
            
            this.isOCRReady = true;
            console.log('[Reading] OCR initialized');
            
            speechManager.speak('Text recognition ready. Point your camera at text and say "read this".', false);
            
        } catch (error) {
            console.error('[Reading] OCR init error:', error);
            speechManager.speak(
                'There was a problem loading text recognition. Please try refreshing the page.',
                true
            );
        }
    }
    
    /**
     * Handle voice command
     * @param {string} command - Voice command
     * @returns {boolean} - Whether command was handled
     */
    handleVoiceCommand(command) {
        const cmd = command.toLowerCase();
        
        // Read commands
        if (cmd.includes('read this') || cmd.includes('read it') || 
            cmd.includes('what does this say') || cmd.includes('read text')) {
            this.captureAndRead();
            return true;
        }
        
        // Quality check
        if (cmd.includes('check quality') || cmd.includes('quality check') ||
            cmd.includes('is it readable') || cmd.includes('image quality')) {
            this.checkQuality();
            return true;
        }
        
        // Combined OCR (multiple passes)
        if (cmd.includes('combined') || cmd.includes('thorough') || 
            cmd.includes('deep read') || cmd.includes('accurate')) {
            this.captureAndReadCombined();
            return true;
        }
        
        // Document description
        if (cmd.includes('describe document') || cmd.includes('document scene') ||
            cmd.includes('what type') || cmd.includes('analyze')) {
            this.describeDocument();
            return true;
        }
        
        // Heading navigation
        if (cmd.includes('next heading') || cmd.includes('next section')) {
            this.navigateHeading('next');
            return true;
        }
        
        if (cmd.includes('previous heading') || cmd.includes('previous section') ||
            cmd.includes('last heading')) {
            this.navigateHeading('previous');
            return true;
        }
        
        if (cmd.includes('all headings') || cmd.includes('list headings') ||
            cmd.includes('show headings')) {
            this.listHeadings();
            return true;
        }
        
        // Paragraph navigation
        const paraMatch = cmd.match(/paragraph\s*(\d+)/);
        if (paraMatch) {
            this.readParagraph(parseInt(paraMatch[1]));
            return true;
        }
        
        if (cmd.includes('next paragraph')) {
            this.readNextParagraph();
            return true;
        }
        
        // Repeat and spell
        if (cmd.includes('repeat') || cmd.includes('read again') || cmd.includes('say again')) {
            this.repeatLastReading();
            return true;
        }
        
        if (cmd.includes('spell') || cmd.includes('spell it')) {
            this.spellLastText();
            return true;
        }
        
        // Continuous mode
        if (cmd.includes('continuous') || cmd.includes('keep reading') || cmd.includes('auto')) {
            this.toggleContinuousMode();
            return true;
        }
        
        // Speech controls
        if (cmd.includes('louder') || cmd.includes('volume up')) {
            speechManager.settings.volume = Math.min(1, speechManager.settings.volume + 0.2);
            speechManager.speak('Volume increased.', true);
            return true;
        }
        
        if (cmd.includes('quieter') || cmd.includes('volume down')) {
            speechManager.settings.volume = Math.max(0.2, speechManager.settings.volume - 0.2);
            speechManager.speak('Volume decreased.', true);
            return true;
        }
        
        if (cmd.includes('slower') || cmd.includes('slow down')) {
            speechManager.settings.rate = Math.max(0.5, speechManager.settings.rate - 0.2);
            speechManager.speak('Speaking slower now.', true);
            return true;
        }
        
        if (cmd.includes('faster') || cmd.includes('speed up')) {
            speechManager.settings.rate = Math.min(2, speechManager.settings.rate + 0.2);
            speechManager.speak('Speaking faster now.', true);
            return true;
        }
        
        // History
        if (cmd.includes('history') || cmd.includes('what did i read')) {
            this.readHistory();
            return true;
        }
        
        // Settings
        if (cmd.includes('enable preprocessing') || cmd.includes('enhance on')) {
            this.settings.preprocessEnabled = true;
            speechManager.speak('Image enhancement enabled.', true);
            return true;
        }
        
        if (cmd.includes('disable preprocessing') || cmd.includes('enhance off')) {
            this.settings.preprocessEnabled = false;
            speechManager.speak('Image enhancement disabled.', true);
            return true;
        }
        
        // Help
        if (cmd.includes('help') || cmd.includes('commands')) {
            this.speakHelp();
            return true;
        }
        
        // Stop
        if (cmd.includes('stop') || cmd.includes('exit') || cmd.includes('quit')) {
            this.stop();
            return true;
        }
        
        // Default
        speechManager.speak('Point your camera at text and say "read this" when ready.', true);
        return true;
    }
    
    /**
     * Check image quality before reading
     */
    async checkQuality() {
        if (!cameraManager.isConnected) {
            speechManager.speak('Camera is not connected. Please connect your camera first.', true);
            return;
        }
        
        speechManager.speak('Checking image quality.', true);
        
        const frame = cameraManager.captureFrame();
        if (!frame) {
            speechManager.speak('Could not capture image.', true);
            return;
        }
        
        const quality = ocrService.assessImageQuality(frame.canvas);
        
        let message = quality.recommendation;
        
        if (quality.isGood) {
            message += ' Say "read this" to read the text.';
        } else {
            message += ' Please adjust and say "check quality" again.';
        }
        
        speechManager.speak(message, true);
        
        this.displayQualityAssessment(quality);
    }
    
    /**
     * Main capture and read function
     */
    async captureAndRead() {
        if (!this.isOCRReady) {
            speechManager.speak('Text recognition is not ready yet. Please wait.', true);
            return;
        }
        
        if (this.isProcessing) {
            speechManager.speak('Still processing. Please wait.', true);
            return;
        }
        
        if (!cameraManager.isConnected) {
            speechManager.speak('Camera is not connected. Please connect your camera first.', true);
            return;
        }
        
        this.isProcessing = true;
        speechManager.speak('Capturing image. Hold steady.', true);
        
        try {
            const frame = cameraManager.captureFrame();
            if (!frame) {
                throw new Error('Could not capture frame');
            }
            
            // Auto quality check
            if (this.settings.autoQualityCheck) {
                const quality = ocrService.assessImageQuality(frame.canvas);
                if (!quality.isGood) {
                    speechManager.speak(quality.recommendation, false);
                }
            }
            
            speechManager.speak('Processing text. This may take a few seconds.', false);
            
            // Perform OCR
            const result = await ocrService.captureAndReadText(frame.canvas, {
                skipPreprocess: !this.settings.preprocessEnabled
            });
            
            this.lastOCRResult = result;
            
            if (result.success && result.text.length > 0) {
                this.lastReadText = result.text;
                this.addToHistory(result.text);
                
                // Clean and speak text
                const cleanText = ocrService.cleanTextForSpeech(result.text);
                
                let announcement = `I found text. `;
                
                if (this.settings.speakConfidence) {
                    const confLevel = result.confidence > 80 ? 'high' : 
                                      result.confidence > 60 ? 'good' : 'moderate';
                    announcement += `Confidence is ${confLevel}. `;
                }
                
                announcement += `It says: ${cleanText}`;
                
                speechManager.speak(announcement, true);
                
                this.displayReadText(result);
                
            } else {
                this.speakReadingTips();
            }
            
        } catch (error) {
            console.error('[Reading] OCR error:', error);
            speechManager.speak('There was a problem reading the text. Please try again.', true);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Capture and read with combined OCR (multiple passes)
     */
    async captureAndReadCombined() {
        if (!this.isOCRReady) {
            speechManager.speak('Text recognition is not ready yet. Please wait.', true);
            return;
        }
        
        if (this.isProcessing) {
            speechManager.speak('Still processing. Please wait.', true);
            return;
        }
        
        if (!cameraManager.isConnected) {
            speechManager.speak('Camera is not connected.', true);
            return;
        }
        
        this.isProcessing = true;
        speechManager.speak('Starting thorough text analysis with multiple passes. This will take longer.', true);
        
        try {
            const frame = cameraManager.captureFrame();
            if (!frame) {
                throw new Error('Could not capture frame');
            }
            
            const result = await ocrService.performCombinedOCR(frame.canvas);
            
            this.lastOCRResult = result.best;
            
            if (result.best.success && result.best.text.length > 0) {
                this.lastReadText = result.best.text;
                this.addToHistory(result.best.text);
                
                const cleanText = ocrService.cleanTextForSpeech(result.best.text);
                
                speechManager.speak(
                    `Combined analysis complete. Average confidence: ${Math.round(result.combinedConfidence)}%. ` +
                    `Best result says: ${cleanText}`,
                    true
                );
                
                this.displayReadText(result.best);
                
            } else {
                this.speakReadingTips();
            }
            
        } catch (error) {
            console.error('[Reading] Combined OCR error:', error);
            speechManager.speak('There was a problem with the combined analysis.', true);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Describe the document scene
     */
    async describeDocument() {
        if (!this.lastOCRResult) {
            speechManager.speak('Please read some text first. Say "read this" to capture text.', true);
            return;
        }
        
        const description = ocrService.describeDocumentScene(this.lastOCRResult);
        speechManager.speak(description, true);
    }
    
    /**
     * Navigate headings
     * @param {string} direction - 'next' or 'previous'
     */
    navigateHeading(direction) {
        if (!this.lastOCRResult || !this.lastOCRResult.structure) {
            speechManager.speak('Please read a document first to navigate headings.', true);
            return;
        }
        
        const headings = this.lastOCRResult.structure.headings;
        
        if (headings.length === 0) {
            speechManager.speak('No headings found in this document.', true);
            return;
        }
        
        let heading;
        if (direction === 'next') {
            heading = ocrService.navigateNextHeading();
        } else {
            heading = ocrService.navigatePreviousHeading();
        }
        
        if (heading) {
            const position = ocrService.currentHeadingIndex + 1;
            const total = headings.length;
            speechManager.speak(
                `Heading ${position} of ${total}: ${heading.text}`,
                true
            );
        }
    }
    
    /**
     * List all headings
     */
    listHeadings() {
        if (!this.lastOCRResult || !this.lastOCRResult.structure) {
            speechManager.speak('Please read a document first.', true);
            return;
        }
        
        const headings = this.lastOCRResult.structure.headings;
        
        if (headings.length === 0) {
            speechManager.speak('No headings found in this document.', true);
            return;
        }
        
        let message = `Found ${headings.length} headings. `;
        headings.forEach((h, i) => {
            message += `${i + 1}: ${h.text}. `;
        });
        
        speechManager.speak(message, true);
    }
    
    /**
     * Read specific paragraph
     * @param {number} index - 1-based paragraph index
     */
    readParagraph(index) {
        if (!this.lastOCRResult || !this.lastOCRResult.structure) {
            speechManager.speak('Please read a document first.', true);
            return;
        }
        
        const paragraphs = this.lastOCRResult.structure.paragraphs;
        
        if (index < 1 || index > paragraphs.length) {
            speechManager.speak(`Invalid paragraph number. There are ${paragraphs.length} paragraphs.`, true);
            return;
        }
        
        const para = paragraphs[index - 1];
        this.currentParagraphIndex = index - 1;
        
        const cleanText = ocrService.cleanTextForSpeech(para.text);
        speechManager.speak(`Paragraph ${index}: ${cleanText}`, true);
    }
    
    /**
     * Read next paragraph
     */
    readNextParagraph() {
        if (!this.lastOCRResult || !this.lastOCRResult.structure) {
            speechManager.speak('Please read a document first.', true);
            return;
        }
        
        const paragraphs = this.lastOCRResult.structure.paragraphs;
        
        if (paragraphs.length === 0) {
            speechManager.speak('No paragraphs found.', true);
            return;
        }
        
        this.currentParagraphIndex = (this.currentParagraphIndex + 1) % paragraphs.length;
        this.readParagraph(this.currentParagraphIndex + 1);
    }
    
    /**
     * Speak tips when reading fails
     */
    speakReadingTips() {
        speechManager.speak(
            'I could not find readable text. Try these tips: ' +
            'Move closer to the text, about 6 to 12 inches. ' +
            'Make sure there is good lighting. ' +
            'Hold the camera steady. ' +
            'Avoid glare and reflections. ' +
            'Say "check quality" to assess the image before reading.',
            true
        );
    }
    
    /**
     * Repeat last reading
     */
    repeatLastReading() {
        if (this.lastReadText && this.lastReadText.length > 0) {
            const cleanText = ocrService.cleanTextForSpeech(this.lastReadText);
            speechManager.speak(`Repeating: ${cleanText}`, true);
        } else {
            speechManager.speak('Nothing to repeat. Point your camera at text and say "read this".', true);
        }
    }
    
    /**
     * Toggle continuous reading mode
     */
    toggleContinuousMode() {
        this.continuousMode = !this.continuousMode;
        
        if (this.continuousMode) {
            speechManager.speak(
                'Continuous reading enabled. I will automatically read text when detected. ' +
                'Say "continuous" again to disable.',
                true
            );
            this.startContinuousReading();
        } else {
            speechManager.speak('Continuous reading disabled.', true);
            this.frameProcessingActive = false;
            cameraManager.stopFrameProcessing();
        }
    }
    
    /**
     * Start continuous reading
     */
    startContinuousReading() {
        this.frameProcessingActive = true;
        let frameCount = 0;
        
        cameraManager.startFrameProcessing(this.processFrame);
    }
    
    /**
     * Process frame in continuous mode
     */
    async processFrame(frame) {
        if (!this.isActive || !this.continuousMode || !this.frameProcessingActive) return;
        if (this.isProcessing) return;
        
        // Only process every 30 frames
        this._frameCount = (this._frameCount || 0) + 1;
        if (this._frameCount % 30 !== 0) return;
        
        this.isProcessing = true;
        
        try {
            // Quick quality check
            const quality = ocrService.assessImageQuality(frame.canvas);
            if (!quality.isGood) {
                this.isProcessing = false;
                return;
            }
            
            const result = await ocrService.captureAndReadText(frame.canvas);
            
            if (result.success && result.text.length > 10 && result.text !== this.lastReadText) {
                this.lastReadText = result.text;
                this.lastOCRResult = result;
                const cleanText = ocrService.cleanTextForSpeech(result.text);
                speechManager.speak(`Text detected: ${cleanText}`, false);
            }
            
        } catch (error) {
            console.error('[Reading] Continuous OCR error:', error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Spell the last text
     */
    spellLastText() {
        if (!this.lastReadText || this.lastReadText.length === 0) {
            speechManager.speak('Nothing to spell. Read some text first.', true);
            return;
        }
        
        const words = this.lastReadText.trim().split(/\s+/);
        const lastWord = words[words.length - 1].replace(/[^\w]/g, '');
        
        if (lastWord.length > 0) {
            const spelled = lastWord.toUpperCase().split('').join(', ');
            speechManager.speak(`Spelling "${lastWord}": ${spelled}`, true);
        } else {
            speechManager.speak('Could not find a word to spell.', true);
        }
    }
    
    /**
     * Add to reading history
     */
    addToHistory(text) {
        this.readingHistory.push({
            text: text,
            time: Date.now()
        });
        
        // Limit history size
        if (this.readingHistory.length > 50) {
            this.readingHistory.shift();
        }
    }
    
    /**
     * Read history
     */
    readHistory() {
        if (this.readingHistory.length === 0) {
            speechManager.speak('No reading history yet.', true);
            return;
        }
        
        const count = this.readingHistory.length;
        const latest = this.readingHistory[count - 1];
        const preview = ocrService.cleanTextForSpeech(latest.text).substring(0, 100);
        
        speechManager.speak(
            `You have read ${count} items. The most recent was: ${preview}`,
            true
        );
    }
    
    /**
     * Speak help
     */
    speakHelp() {
        speechManager.speak(
            'Reading mode commands: ' +
            '"read this" to capture and read text. ' +
            '"check quality" to assess image quality. ' +
            '"combined reading" for thorough analysis. ' +
            '"describe document" to understand layout. ' +
            '"next heading" or "previous heading" to navigate. ' +
            '"repeat" to hear again. ' +
            '"spell it" to spell the last word. ' +
            '"continuous" for automatic reading. ' +
            '"stop" to exit reading mode.',
            true
        );
    }
    
    /**
     * Display quality assessment
     */
    displayQualityAssessment(quality) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        const scoreClass = quality.isGood ? 'good' : quality.score >= 40 ? 'fair' : 'poor';
        
        modeContent.innerHTML = `
            <div class="reading-mode-display">
                <div class="reading-header">
                    <span class="reading-icon">📖</span>
                    <span class="reading-title">Reading Mode</span>
                </div>
                
                <div class="quality-assessment">
                    <h4>Image Quality Assessment</h4>
                    <div class="quality-score ${scoreClass}">
                        <span class="score-value">${quality.score}%</span>
                        <span class="score-label">${quality.isGood ? 'Good' : 'Needs Improvement'}</span>
                    </div>
                    
                    <div class="quality-metrics">
                        <div class="metric">
                            <span class="label">Brightness</span>
                            <div class="bar">
                                <div class="fill" style="width: ${Math.min(100, quality.brightness / 2.55)}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="label">Contrast</span>
                            <div class="bar">
                                <div class="fill" style="width: ${Math.min(100, quality.contrast / 2.55)}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <span class="label">Sharpness</span>
                            <div class="bar">
                                <div class="fill" style="width: ${Math.min(100, quality.sharpness / 5)}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    ${quality.issues.length > 0 ? `
                        <div class="quality-issues">
                            ${quality.issues.map(i => `<p>⚠️ ${i}</p>`).join('')}
                        </div>
                    ` : ''}
                    
                    <p class="recommendation">${quality.recommendation}</p>
                </div>
                
                <div class="reading-actions">
                    <button class="reading-btn" onclick="readingMode.captureAndRead()">📷 Read Text</button>
                    <button class="reading-btn" onclick="readingMode.checkQuality()">🔍 Check Quality</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Display read text result
     */
    displayReadText(result) {
        const modeContent = document.getElementById('mode-content');
        if (!modeContent) return;
        
        const structure = result.structure || {};
        const headings = structure.headings || [];
        
        modeContent.innerHTML = `
            <div class="reading-mode-display">
                <div class="reading-header">
                    <span class="reading-icon">📖</span>
                    <span class="reading-title">Reading Mode</span>
                </div>
                
                <div class="ocr-result">
                    <div class="result-header">
                        <span class="confidence ${result.confidence > 80 ? 'high' : result.confidence > 60 ? 'medium' : 'low'}">
                            ${Math.round(result.confidence)}% confidence
                        </span>
                        ${structure.type ? `<span class="doc-type">${structure.type}</span>` : ''}
                    </div>
                    
                    ${headings.length > 0 ? `
                        <div class="headings-nav">
                            <h4>📑 Headings (${headings.length})</h4>
                            <div class="headings-list">
                                ${headings.map((h, i) => `
                                    <button class="heading-btn" onclick="readingMode.navigateToHeading(${i})">
                                        ${h.text.substring(0, 40)}${h.text.length > 40 ? '...' : ''}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="read-text-display">
                        <h4>📝 Text Content</h4>
                        <div class="text-content">
                            ${this.formatTextForDisplay(result.text)}
                        </div>
                    </div>
                </div>
                
                <div class="reading-actions">
                    <button class="reading-btn" onclick="readingMode.captureAndRead()">📷 Read New</button>
                    <button class="reading-btn" onclick="readingMode.repeatLastReading()">🔄 Repeat</button>
                    <button class="reading-btn" onclick="readingMode.describeDocument()">📄 Describe</button>
                </div>
            </div>
        `;
    }
    
    /**
     * Navigate to specific heading
     */
    navigateToHeading(index) {
        if (!this.lastOCRResult || !this.lastOCRResult.structure) return;
        
        const headings = this.lastOCRResult.structure.headings;
        if (index >= 0 && index < headings.length) {
            ocrService.currentHeadingIndex = index;
            const heading = headings[index];
            speechManager.speak(`Heading ${index + 1}: ${heading.text}`, true);
        }
    }
    
    /**
     * Format text for display
     */
    formatTextForDisplay(text) {
        if (!text) return '';
        
        // Escape HTML
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        
        // Convert newlines to breaks
        return escaped.replace(/\n/g, '<br>');
    }
    
    /**
     * Update UI
     */
    updateUI(active) {
        const modeDisplay = document.getElementById('current-mode');
        const modeContent = document.getElementById('mode-content');
        
        if (active) {
            if (modeDisplay) modeDisplay.textContent = '📖 Reading Mode';
            if (modeContent) {
                modeContent.innerHTML = `
                    <div class="reading-mode-display">
                        <div class="reading-header">
                            <span class="reading-icon">📖</span>
                            <span class="reading-title">Enhanced Reading Mode</span>
                        </div>
                        
                        <div class="reading-status">
                            <p>📷 Point camera at text</p>
                            <p>🗣️ Say "read this" to read</p>
                            <p>🔍 Say "check quality" first</p>
                        </div>
                        
                        <div class="reading-features">
                            <h4>Features</h4>
                            <ul>
                                <li>✨ Image enhancement</li>
                                <li>📑 Heading navigation</li>
                                <li>📄 Document analysis</li>
                                <li>🔄 Continuous reading</li>
                            </ul>
                        </div>
                        
                        <div class="reading-actions">
                            <button class="reading-btn primary" onclick="readingMode.captureAndRead()">
                                📷 Read Text
                            </button>
                            <button class="reading-btn" onclick="readingMode.checkQuality()">
                                🔍 Check Quality
                            </button>
                            <button class="reading-btn" onclick="readingMode.captureAndReadCombined()">
                                🎯 Thorough Read
                            </button>
                        </div>
                    </div>
                `;
            }
        } else {
            if (modeDisplay) modeDisplay.textContent = 'No Mode Active';
            if (modeContent) modeContent.innerHTML = '';
        }
    }
}

// Create global instance
const readingMode = new ReadingMode();
