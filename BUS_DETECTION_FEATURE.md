# Bus Detection Feature - Implementation Guide

## Overview
The Bus Detection feature has been successfully integrated into BlindNav+ to help visually impaired users identify buses and get route information in real-time.

## Features Implemented

### 1. Real-Time Bus Detection
- Uses YOLOv8 model to detect buses in live video stream
- Continuously monitors camera feed for approaching buses
- Confidence threshold set to 40% to minimize false positives

### 2. Bus Number Recognition
- Uses EasyOCR (Optical Character Recognition) to read bus numbers
- Extracts text from bus number plate regions
- Handles both GPU and CPU processing (automatic fallback)
- Preprocesses images with contrast enhancement and thresholding for better accuracy

### 3. Route Information Database
- JSON-based database (`bus_routes.json`) containing:
  - Bus numbers
  - Route descriptions
  - Main stops
  - Frequency of service
  - Operating hours
- Easy to update and extend with new routes

### 4. Voice Announcements
- Text-to-Speech (TTS) announcements include:
  - Bus number detected
  - Route information
  - Main stops along the route
  - Service frequency
- Smart cooldown system prevents repetitive announcements

## How to Use

### Activating Bus Detection Mode
Say any of the following commands:
- "Bus detection"
- "Bus mode"
- "Detect bus"
- "Find bus"
- "Which bus is this"
- "Read bus number"
- "I need a bus"
- "Public transport"

### During Operation
1. Point your camera towards approaching buses
2. The system will automatically detect buses
3. When a bus is detected, it will:
   - Read the bus number using OCR
   - Look up route information in the database
   - Announce the bus number and route details

### Exiting the Mode
Say "exit" to return to the main menu.

## Technical Details

### Files Created/Modified

1. **`modes/bus_detection_mode.py`** (New)
   - Main bus detection module
   - Contains all detection and OCR logic
   - Handles route database queries

2. **`bus_routes.json`** (New)
   - Bus route database
   - Contains 10 sample routes
   - Easy to extend with local bus routes

3. **`main.py`** (Modified)
   - Added bus detection mode import
   - Integrated into command router
   - Added to available modes list

### Algorithms Used

1. **YOLOv8-nano** - Object Detection
   - Detects "bus" class in video frames
   - Fast inference suitable for real-time processing

2. **EasyOCR** - Text Recognition
   - Reads bus numbers from detected bus regions
   - Supports both GPU and CPU processing
   - Handles various text orientations and lighting conditions

3. **Image Preprocessing**
   - CLAHE (Contrast Limited Adaptive Histogram Equalization)
   - Otsu thresholding
   - Region of Interest (ROI) extraction

### Performance Optimizations

- Processes every 3rd frame to reduce CPU/GPU load
- Detection history tracking to avoid false positives
- Cooldown period (5 seconds) between announcements
- Multiple ROI extraction (top and middle sections) for better number plate detection

## Customizing Bus Routes

### Adding New Routes

Edit `bus_routes.json` and add new entries:

```json
{
  "routes": {
    "YOUR_BUS_NUMBER": {
      "number": "YOUR_BUS_NUMBER",
      "route": "Route description",
      "stops": ["Stop 1", "Stop 2", "Stop 3"],
      "frequency": "Every X minutes",
      "operating_hours": "Start time - End time"
    }
  }
}
```

### Updating Existing Routes

Simply modify the JSON entries in `bus_routes.json`. The system will automatically load the updated routes on next startup.

## Troubleshooting

### Bus Not Detected
- Ensure good lighting conditions
- Point camera directly at the bus
- Move closer if bus is too far away
- Check camera is working properly

### Bus Number Not Read
- Bus number may be too small or blurry
- Try moving closer to the bus
- Ensure bus number is clearly visible
- Check if EasyOCR is properly initialized (check console output)

### Route Information Not Available
- Bus number may not be in the database
- Add the route to `bus_routes.json`
- Check JSON file format is correct

## Future Enhancements

Potential improvements:
1. Integration with real-time bus tracking APIs
2. GPS-based route suggestions
3. Bus arrival time predictions
4. Multi-language support for bus numbers
5. Offline route database expansion
6. Voice command to search for specific bus numbers

## Dependencies

All required dependencies are already in `requirements.txt`:
- `ultralytics>=8.0.0` (YOLOv8)
- `easyocr>=1.7.0` (OCR)
- `opencv-python>=4.5.0` (Image processing)
- `numpy>=1.19.0` (Array operations)

## Testing

To test the feature:
1. Run the main application: `python main.py`
2. Activate bus detection mode by saying "bus detection"
3. Point camera at a bus (or bus image/video)
4. Listen for announcements

## Notes

- First-time EasyOCR initialization may take 30-60 seconds as it downloads models
- GPU acceleration recommended for better performance but not required
- Bus detection works best when bus fills at least 20% of the frame
- Optimal distance: 5-15 meters from the bus


