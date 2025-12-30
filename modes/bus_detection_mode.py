"""
Bus Detection Mode for BlindNav+
Detects buses in real-time, reads bus numbers using OCR, and announces route information.
"""

import cv2
import numpy as np
import json
import os
import time
from typing import Dict, Optional, Tuple
from ultralytics import YOLO
import easyocr

# Initialize EasyOCR reader (English only for bus numbers)
# Try GPU first, fallback to CPU if GPU not available
ocr_reader = None
EASYOCR_AVAILABLE = False
try:
    ocr_reader = easyocr.Reader(['en'], gpu=True)
    EASYOCR_AVAILABLE = True
    print("[Bus Detection] EasyOCR initialized with GPU support.")
except Exception as e:
    print(f"[Bus Detection] GPU initialization failed, trying CPU: {e}")
    try:
        ocr_reader = easyocr.Reader(['en'], gpu=False)
        EASYOCR_AVAILABLE = True
        print("[Bus Detection] EasyOCR initialized with CPU support.")
    except Exception as e2:
        print(f"[Bus Detection] EasyOCR initialization error: {e2}")
        EASYOCR_AVAILABLE = False
        ocr_reader = None

# Load bus routes database
BUS_ROUTES_FILE = "bus_routes.json"
bus_routes_db = None

def load_bus_routes():
    """Load bus routes from JSON database."""
    global bus_routes_db
    if bus_routes_db is not None:
        return bus_routes_db
    
    try:
        if os.path.exists(BUS_ROUTES_FILE):
            with open(BUS_ROUTES_FILE, 'r', encoding='utf-8') as f:
                bus_routes_db = json.load(f)
            print(f"[Bus Detection] Loaded {len(bus_routes_db.get('routes', {}))} bus routes.")
            return bus_routes_db
        else:
            print(f"[Bus Detection] Warning: {BUS_ROUTES_FILE} not found. Creating default database.")
            # Create default database
            default_db = {
                "routes": {},
                "default_message": "Bus route information not available in database."
            }
            with open(BUS_ROUTES_FILE, 'w', encoding='utf-8') as f:
                json.dump(default_db, f, indent=2)
            bus_routes_db = default_db
            return bus_routes_db
    except Exception as e:
        print(f"[Bus Detection] Error loading bus routes: {e}")
        return {"routes": {}, "default_message": "Bus route information not available."}


def get_bus_route_info(bus_number: str) -> Dict:
    """Get route information for a given bus number."""
    routes_db = load_bus_routes()
    routes = routes_db.get("routes", {})
    
    # Try exact match first
    if bus_number in routes:
        return routes[bus_number]
    
    # Try case-insensitive match
    bus_number_lower = bus_number.lower()
    for route_num, route_info in routes.items():
        if route_num.lower() == bus_number_lower:
            return route_info
    
    # Return default message if not found
    return {
        "number": bus_number,
        "route": routes_db.get("default_message", "Route information not available."),
        "stops": [],
        "frequency": "Unknown",
        "operating_hours": "Unknown"
    }


def extract_bus_number_from_roi(roi: np.ndarray) -> Optional[str]:
    """
    Extract bus number from a region of interest (ROI) containing the bus.
    Uses EasyOCR to read text from the bus number plate area.
    """
    if not EASYOCR_AVAILABLE or ocr_reader is None:
        return None
    
    try:
        # Preprocess ROI for better OCR
        # Convert to grayscale
        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi
        
        # Enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # Apply thresholding
        _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Try OCR on the enhanced image
        results = ocr_reader.readtext(thresh)
        
        # Also try on original enhanced image
        if not results:
            results = ocr_reader.readtext(enhanced)
        
        # Extract numbers from OCR results
        bus_numbers = []
        for (bbox, text, confidence) in results:
            # Filter for text that looks like bus numbers (digits, possibly with letters)
            text_clean = ''.join(c for c in text if c.isalnum())
            if len(text_clean) >= 2 and len(text_clean) <= 5:  # Bus numbers are typically 2-5 characters
                # Check if it contains digits
                if any(c.isdigit() for c in text_clean) and confidence > 0.3:
                    bus_numbers.append((text_clean, confidence))
        
        # Return the most confident result
        if bus_numbers:
            bus_numbers.sort(key=lambda x: x[1], reverse=True)
            return bus_numbers[0][0]
        
        return None
        
    except Exception as e:
        print(f"[Bus Detection] OCR error: {e}")
        return None


def detect_bus_in_frame(frame: np.ndarray, yolo_model: YOLO) -> Tuple[Optional[np.ndarray], Optional[Dict]]:
    """
    Detect bus in frame using YOLO and return the bus ROI and detection info.
    Returns: (bus_roi, detection_info)
    """
    try:
        results = yolo_model(frame, verbose=False)
        
        if not results or len(results) == 0:
            return None, None
        
        result = results[0]
        if not hasattr(result, "boxes") or result.boxes is None:
            return None, None
        
        h, w = frame.shape[:2]
        best_bus = None
        best_conf = 0.0
        best_box = None
        
        # Look for buses in detections
        for box in result.boxes:
            if box.conf is None or box.cls is None:
                continue
            
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            class_name = yolo_model.names[cls_id]
            
            # Check if it's a bus (YOLO class 5 is 'bus')
            if class_name.lower() == 'bus' and conf > 0.4:
                if conf > best_conf:
                    best_conf = conf
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                    best_box = (x1, y1, x2, y2)
                    best_bus = {
                        "confidence": conf,
                        "bbox": (x1, y1, x2, y2),
                        "center": ((x1 + x2) // 2, (y1 + y2) // 2)
                    }
        
        if best_bus is None:
            return None, None
        
        # Extract ROI - focus on upper portion where bus numbers are typically displayed
        x1, y1, x2, y2 = best_box
        # Extract top 30% of bus bounding box (where number plate usually is)
        roi_height = int((y2 - y1) * 0.3)
        roi_y1 = max(0, y1)
        roi_y2 = min(h, y1 + roi_height)
        
        # Also try middle section
        roi_mid_y1 = max(0, y1 + int((y2 - y1) * 0.2))
        roi_mid_y2 = min(h, y1 + int((y2 - y1) * 0.5))
        
        # Extract ROI with some padding
        padding = 10
        roi = frame[max(0, roi_y1 - padding):min(h, roi_y2 + padding),
                    max(0, x1 - padding):min(w, x2 + padding)]
        
        # Also extract middle section ROI
        roi_mid = frame[roi_mid_y1:roi_mid_y2, max(0, x1 - padding):min(w, x2 + padding)]
        
        return (roi, roi_mid), best_bus
        
    except Exception as e:
        print(f"[Bus Detection] Detection error: {e}")
        return None, None


def run_bus_detection_mode(speak_func):
    """
    Main bus detection mode function.
    Continuously scans for buses, reads bus numbers, and announces route information.
    """
    speak_func("Bus Detection Mode activated. I will detect buses and tell you their numbers and routes.")
    speak_func("Point your camera towards approaching buses. Say 'exit' to stop.")
    
    # Load YOLO model
    try:
        yolo_model = YOLO("yolov8n.pt")
        print("[Bus Detection] YOLO model loaded.")
    except Exception as e:
        speak_func("Error loading detection model. Please check your setup.")
        print(f"[Bus Detection] Model load error: {e}")
        return
    
    # Load bus routes
    load_bus_routes()
    
    # Initialize camera
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        speak_func("Camera not available. Please check the connection.")
        return
    
    # State tracking
    last_announced_bus = None
    last_announcement_time = 0
    announcement_cooldown = 5.0  # Don't repeat same bus for 5 seconds
    frame_count = 0
    bus_detection_history = []  # Track recent detections for stability
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                speak_func("Camera feed lost. Exiting bus detection mode.")
                break
            
            frame_count += 1
            
            # Detect bus every 3 frames (to reduce processing load)
            if frame_count % 3 == 0:
                rois, bus_info = detect_bus_in_frame(frame, yolo_model)
                
                if bus_info is not None and rois is not None:
                    # Extract bus number from ROI
                    bus_number = None
                    roi_top, roi_mid = rois
                    
                    # Try top ROI first (where number plate usually is)
                    if roi_top is not None and roi_top.size > 0:
                        bus_number = extract_bus_number_from_roi(roi_top)
                    
                    # If not found, try middle ROI
                    if bus_number is None and roi_mid is not None and roi_mid.size > 0:
                        bus_number = extract_bus_number_from_roi(roi_mid)
                    
                    # If still not found, try full bus region
                    if bus_number is None:
                        x1, y1, x2, y2 = bus_info["bbox"]
                        full_roi = frame[y1:y2, x1:x2]
                        if full_roi.size > 0:
                            bus_number = extract_bus_number_from_roi(full_roi)
                    
                    # Add to detection history
                    if bus_number:
                        bus_detection_history.append({
                            "number": bus_number,
                            "time": time.time(),
                            "confidence": bus_info["confidence"]
                        })
                        # Keep only last 10 detections
                        bus_detection_history = bus_detection_history[-10:]
                        
                        # Check if we should announce (cooldown and new detection)
                        current_time = time.time()
                        should_announce = False
                        
                        if last_announced_bus != bus_number:
                            should_announce = True
                        elif current_time - last_announcement_time > announcement_cooldown:
                            # Check if this bus number appears consistently in recent history
                            recent_detections = [d for d in bus_detection_history 
                                               if current_time - d["time"] < 3.0]
                            if len(recent_detections) >= 2:
                                numbers = [d["number"] for d in recent_detections]
                                if numbers.count(bus_number) >= 2:  # Appeared at least twice
                                    should_announce = True
                        
                        if should_announce:
                            # Get route information
                            route_info = get_bus_route_info(bus_number)
                            
                            # Announce bus detection
                            announcement = f"Bus number {bus_number} detected. "
                            announcement += f"Route: {route_info.get('route', 'Route information not available')}. "
                            
                            if route_info.get('stops'):
                                stops = route_info['stops']
                                if len(stops) > 0:
                                    announcement += f"Main stops include: {', '.join(stops[:3])}. "
                            
                            if route_info.get('frequency'):
                                announcement += f"Frequency: {route_info['frequency']}. "
                            
                            speak_func(announcement)
                            
                            last_announced_bus = bus_number
                            last_announcement_time = current_time
                            print(f"[Bus Detection] Announced: Bus {bus_number} - {route_info.get('route', 'N/A')}")
                    else:
                        # Bus detected but number not readable
                        if time.time() - last_announcement_time > 10.0:
                            speak_func("Bus detected, but I cannot read the bus number. Please move closer or adjust the camera angle.")
                            last_announcement_time = time.time()
            
            # Check for exit command (non-blocking)
            # In a real implementation, you might want to add voice command listening here
            time.sleep(0.1)  # Small delay to prevent excessive CPU usage
            
    except KeyboardInterrupt:
        speak_func("Exiting bus detection mode.")
    except Exception as e:
        speak_func(f"An error occurred in bus detection mode: {str(e)}")
        print(f"[Bus Detection] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cap.release()
        cv2.destroyAllWindows()
        speak_func("Bus detection mode deactivated.")

