# BlindNav+ Web Application - Complete Setup Guide

## 📋 Quick Start

### Option 1: Python Local Server (Recommended for Development)
```bash
cd webapp
python server.py
```
Open http://localhost:8080 on your mobile phone

### Option 2: Direct File (Limited Features)
Simply open `index.html` in a browser (speech features may be limited)

### Option 3: Docker Deployment
```bash
cd webapp
docker-compose up -d
```

---

## 🔧 ESP32-CAM Setup

### Required Hardware
- ESP32-CAM Module (AI Thinker)
- USB-TTL Programmer (for initial upload)
- 5V Power Supply (stable power recommended)

### Firmware Upload Steps

1. **Install Arduino IDE** (or PlatformIO)

2. **Install ESP32 Board Package**
   - Go to: File → Preferences → Additional Board URLs
   - Add: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Go to: Tools → Board → Board Manager
   - Search and install: "esp32"

3. **Open Firmware File**
   - Open `esp32-firmware/blindnav_cam_web.ino`

4. **Configure WiFi Credentials**
   Edit these lines in the firmware:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

5. **Select Board Settings**
   - Board: "AI Thinker ESP32-CAM"
   - Upload Speed: 115200
   - Port: Your USB port

6. **Upload Firmware**
   - Connect GPIO0 to GND (program mode)
   - Press RST button
   - Click Upload
   - After upload, disconnect GPIO0 from GND
   - Press RST again

7. **Get IP Address**
   - Open Serial Monitor (115200 baud)
   - Note the IP address shown (e.g., 192.168.1.100)

---

## 📱 Mobile Browser Setup

### Recommended Browsers
1. **Chrome for Android** (Best compatibility)
2. **Safari for iOS** (Good but limited microphone)
3. **Firefox for Android**

### Required Permissions
When opening the app, grant:
- ✅ Camera access (for device camera fallback)
- ✅ Microphone access (for voice commands)
- ✅ Location access (for emergency mode)

### PWA Installation
1. Open the app in browser
2. Tap the menu (⋮ or Share)
3. Select "Add to Home Screen" or "Install"
4. The app will appear as a native app

---

## 🎯 Feature Testing Guide

### Test 1: ESP32 Connection
1. Enter ESP32-CAM IP address
2. Click "Connect Camera"
3. ✅ Pass: Video stream appears
4. ❌ Fail: Check WiFi, IP address, and ESP32 power

### Test 2: Speech Recognition
1. Click microphone button
2. Say "hello"
3. ✅ Pass: App responds with greeting
4. ❌ Fail: Check browser permissions

### Test 3: Navigation Mode
1. Connect camera
2. Tap "Navigation" or say "navigation"
3. Point camera at objects
4. ✅ Pass: App announces obstacles and positions
5. Say "stop" to exit

### Test 4: Object Detection
1. Tap "Find Objects" or say "find cup"
2. Point camera around room
3. ✅ Pass: App guides you to the object
4. ❌ Fail: Ensure good lighting

### Test 5: Bus Detection
1. Tap "Bus Detection" or say "bus"
2. Point camera at text/numbers
3. ✅ Pass: App reads numbers aloud
4. Say "looking for bus 42" to set target

### Test 6: Scene Description
1. Tap "Describe Scene" or say "describe"
2. ✅ Pass: App describes visible objects
3. Say "auto" for continuous descriptions

### Test 7: Assistant Mode
1. Tap "Assistant" or say "assistant"
2. Ask "what time is it"
3. ✅ Pass: App tells current time
4. Try: "help", "what day is today"

### Test 8: Emergency Mode
1. Tap "Emergency" or say "emergency"
2. ✅ Pass: Alert sounds, location shared
3. ⚠️ Configure contacts in Settings first

---

## 🔊 Voice Commands Reference

### Global Commands
| Command | Action |
|---------|--------|
| "navigation" | Start Navigation Mode |
| "find [object]" | Start Object Detection |
| "bus" | Start Bus Detection |
| "describe" | Start Scene Description |
| "assistant" | Start Assistant Mode |
| "emergency" | Activate Emergency |
| "stop" / "exit" | Stop current mode |
| "help" | Get help |

### Navigation Mode
| Command | Action |
|---------|--------|
| "what's ahead" | Describe obstacles |
| "pause" | Pause guidance |
| "resume" | Resume guidance |

### Object Detection
| Command | Action |
|---------|--------|
| "find phone" | Search for phone |
| "find keys" | Search for keys |
| "found" | Confirm object found |

### Bus Detection
| Command | Action |
|---------|--------|
| "looking for 42" | Set target bus |
| "any bus" | Detect all buses |
| "save this bus" | Save to favorites |

### Assistant Mode
| Command | Action |
|---------|--------|
| "what time" | Get current time |
| "what day" | Get current date |
| "battery" | Get battery status |

---

## 🐛 Troubleshooting

### Camera Not Connecting
1. Verify ESP32 is powered and connected to WiFi
2. Check IP address is correct
3. Ensure phone is on same WiFi network
4. Try accessing `http://[IP]:81/stream` directly in browser

### Speech Not Working
1. Grant microphone permission in browser
2. Use HTTPS connection (required for some browsers)
3. Check browser compatibility (Chrome recommended)
4. Ensure device volume is up

### Detection Slow
1. Close other browser tabs
2. Reduce frame rate in settings
3. Use good lighting conditions
4. Clear browser cache

### App Crashes
1. Refresh the page
2. Clear browser cache and data
3. Reinstall PWA
4. Update browser to latest version

### OCR Not Reading Text
1. Ensure good lighting
2. Hold camera steady
3. Get closer to text
4. Text should be clearly visible

---

## 📁 Project Structure

```
webapp/
├── index.html              # Main HTML file
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── server.py               # Python HTTP server
├── requirements.txt        # Python dependencies
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose
├── nginx.conf              # Nginx configuration
├── README.md               # Project documentation
├── css/
│   └── styles.css          # Application styles
├── js/
│   ├── app.js              # Main application
│   ├── config.js           # Configuration
│   ├── utils.js            # Utility functions
│   ├── speech.js           # Speech I/O
│   ├── camera.js           # Camera management
│   ├── detection.js        # Object detection
│   ├── knowledge-base.js   # Assistant knowledge
│   ├── bus-routes.js       # Bus route data
│   └── modes/
│       ├── navigation.js   # Navigation mode
│       ├── object-detection.js
│       ├── bus-detection.js
│       ├── scene-describe.js
│       ├── assistant.js
│       └── emergency.js
├── esp32-firmware/
│   └── blindnav_cam_web.ino
└── icons/
    ├── icon.svg            # SVG source icon
    └── README.txt          # Icon generation guide
```

---

## 🚀 Deployment Options

### 1. Local Network (Development)
```bash
python server.py
# Access at http://[your-computer-ip]:8080
```

### 2. GitHub Pages (Free Hosting)
1. Push webapp folder to GitHub
2. Enable GitHub Pages in repository settings
3. Access at https://[username].github.io/[repo]

### 3. Netlify/Vercel (Free Hosting)
1. Connect GitHub repository
2. Set build folder to `webapp`
3. Deploy automatically

### 4. Docker (Self-Hosted)
```bash
docker-compose up -d
# Access at http://localhost:80
```

### 5. VPS/Cloud Server
1. Upload files to server
2. Configure Nginx with provided config
3. Set up SSL certificate (Let's Encrypt)

---

## 📝 Customization

### Changing Voice Settings
Edit `js/config.js`:
```javascript
speech: {
    defaultRate: 1.0,      // Speed: 0.5 to 2.0
    defaultPitch: 1.0,     // Pitch: 0.5 to 2.0
    defaultVolume: 1.0,    // Volume: 0 to 1.0
    language: 'en-US'      // Language code
}
```

### Adding Custom Bus Routes
Edit `js/bus-routes.js`:
```javascript
routes: {
    "NEW": {
        name: "Route NEW",
        destinations: ["Stop A", "Stop B", "Stop C"],
        frequency: "Every 10 minutes"
    }
}
```

### Changing Detection Sensitivity
Edit `js/config.js`:
```javascript
detection: {
    minScore: 0.5,         // Lower = more detections
    maxDetections: 20      // Max objects to detect
}
```

---

## 🔐 Security Notes

- ESP32-CAM stream is unencrypted on local network
- Use HTTPS for production deployments
- Store emergency contacts locally only
- Location data is not transmitted to servers
- All processing happens on-device

---

## 📞 Support

For issues or feature requests:
1. Check troubleshooting section above
2. Verify all setup steps completed
3. Test with recommended browsers
4. Check browser console for errors

---

Made with ❤️ for accessibility
