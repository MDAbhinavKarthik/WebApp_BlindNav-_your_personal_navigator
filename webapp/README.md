# BlindNav+ Web Application

A web-based navigation assistant for visually impaired users that works with ESP32-CAM for video streaming and uses the mobile phone for all processing.

## Features

- **🧭 Navigation Mode**: Real-time walking guidance with obstacle detection
- **🔍 Object Detection**: Find specific objects in your surroundings
- **🚌 Bus Detection**: Detect buses and read bus numbers using OCR
- **👁️ Scene Description**: Get a description of your environment
- **🤖 Assistant Mode**: General help and information
- **🚨 Emergency Mode**: Quick access to emergency services

## How It Works

1. **ESP32-CAM** captures video and streams it over WiFi
2. **Your mobile phone** receives the stream and processes everything locally
3. **Audio interaction only** - no visual interface needed

## Setup Instructions

### 1. ESP32-CAM Setup

1. Open `esp32-firmware/blindnav_cam_web.ino` in Arduino IDE
2. Install ESP32 board support if not already installed
3. Update WiFi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
4. Select board: **AI Thinker ESP32-CAM**
5. Upload the sketch
6. Open Serial Monitor (115200 baud) to see the IP address

### 2. Web Application Setup

#### Option A: Local Server (Development)

```bash
# Navigate to webapp folder
cd webapp

# Start the server
python server.py

# Or specify a port
python server.py -p 8080 -o  # -o opens browser automatically
```

Access at `http://localhost:8080` or your local IP

#### Option B: Deploy to Web Host

Upload all files from the `webapp` folder to any static web hosting:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting
- Any web server (Apache, Nginx)

### 3. Using the App

1. Open the web app on your mobile phone
2. Enter the ESP32-CAM IP address and connect
3. Select a mode or use voice commands
4. Interact using only voice - tap the microphone button to speak

## Voice Commands

### Global Commands
- "Navigation" - Start navigation mode
- "Find [object]" - Search for an object
- "Bus detection" - Start bus detection
- "Describe" - Describe surroundings
- "Assistant" - Open assistant
- "Emergency" - Emergency mode
- "Stop" / "Exit" - Stop current mode
- "Help" - Get help

### Mode-Specific Commands

**Navigation Mode:**
- "Repeat" - Repeat last guidance
- "Status" - Get current status
- "Brief mode" - Less frequent announcements
- "Detailed mode" - More frequent announcements

**Object Detection:**
- "Find bottle" - Search for a bottle
- "Search again" - Retry last search
- "What did you find" - List visible objects

**Bus Detection:**
- "Watch for 42" - Alert when bus 42 arrives
- "What buses" - List detected buses
- "Clear" - Stop watching for specific bus

## Technical Details

### Processing Pipeline
1. ESP32-CAM streams MJPEG at ~15 FPS
2. TensorFlow.js COCO-SSD model runs in browser
3. Tesseract.js handles OCR for bus numbers
4. Web Speech API for voice input/output

### Supported Browsers
- Chrome (recommended)
- Safari
- Firefox
- Edge

### Requirements
- ESP32-CAM module
- Mobile phone with camera access permission
- WiFi network (phone and ESP32 on same network)
- Microphone permission for voice commands

## File Structure

```
webapp/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── server.py           # Development server
├── css/
│   └── styles.css      # Application styles
├── js/
│   ├── app.js          # Main application
│   ├── speech.js       # Speech recognition & synthesis
│   ├── camera.js       # ESP32-CAM connection
│   ├── detection.js    # Object detection
│   └── modes/
│       ├── navigation.js
│       ├── object-detection.js
│       ├── bus-detection.js
│       ├── scene-describe.js
│       ├── assistant.js
│       └── emergency.js
├── esp32-firmware/
│   └── blindnav_cam_web.ino
└── icons/              # App icons (create these)
```

## Deployment Options

### GitHub Pages
1. Push to GitHub repository
2. Go to Settings > Pages
3. Select branch and folder
4. Access at `https://username.github.io/repo`

### Netlify
1. Connect repository or drag-drop folder
2. Automatic deployment
3. Custom domain optional

### Vercel
1. Import from Git or upload
2. Zero configuration needed
3. Automatic HTTPS

### Self-Hosted
1. Copy files to web server
2. Configure HTTPS (required for microphone)
3. Set up CORS if needed

## Troubleshooting

### Camera won't connect
- Verify ESP32-CAM is on same WiFi network
- Check IP address in Serial Monitor
- Try accessing `http://[IP]/` directly
- Ensure no firewall blocking

### Voice commands not working
- Check microphone permissions
- Use HTTPS for production
- Verify browser support
- Speak clearly and wait for listening indicator

### Detection not working
- Wait for model to load (check console)
- Ensure good lighting
- Camera should be stable
- Objects should be clearly visible

### Poor performance
- Close other apps/tabs
- Use good WiFi connection
- Reduce camera resolution if needed
- Try a different browser

## Privacy

- All processing happens locally on your device
- No data sent to external servers
- Camera stream stays on your network
- Voice recognition uses browser's built-in API

## License

MIT License - Free to use and modify

## Support

For issues and feature requests, please open a GitHub issue.
