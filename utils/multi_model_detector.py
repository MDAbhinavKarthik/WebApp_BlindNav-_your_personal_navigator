"""
Multi-Model Detector for BlindNav+ System
Uses multiple trained models for comprehensive object detection
"""
import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple
from pathlib import Path
from ultralytics import YOLO
from collections import Counter
import torch


class MultiModelDetector:
    """Detector that uses multiple trained models for different categories"""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models: Dict[str, YOLO] = {}
        self.model_categories: Dict[str, List[str]] = {}
        self.load_available_models()
    
    def load_available_models(self):
        """Load all available trained models"""
        # Base YOLO model (always available)
        try:
            self.models['base'] = YOLO("yolov8n.pt")
            self.model_categories['base'] = ['General Object Detection']
            print("[MultiModel] Loaded base YOLOv8n model")
        except Exception as e:
            print(f"[MultiModel] Error loading base model: {e}")
        
        # Try to load category-specific models
        category_models = {
            'unified': 'blindnav_unified/weights/best.pt',
            'street': 'blindnav_Street_Navigation/weights/best.pt',
            'indoor': 'blindnav_Indoor_Navigation/weights/best.pt',
            'egocentric': 'blindnav_Egocentric_Vision/weights/best.pt',
            'text': 'blindnav_Text_OCR/weights/best.pt',
            'blind_nav': 'blindnav_Blind_Navigation/weights/best.pt',
        }
        
        for name, path in category_models.items():
            model_path = self.models_dir / path
            if model_path.exists():
                try:
                    self.models[name] = YOLO(str(model_path))
                    print(f"[MultiModel] Loaded {name} model")
                except Exception as e:
                    print(f"[MultiModel] Error loading {name} model: {e}")
    
    def detect_with_all_models(self, frame: np.ndarray, 
                               confidence: float = 0.3) -> Dict:
        """Detect objects using all available models"""
        all_detections = {}
        
        for model_name, model in self.models.items():
            try:
                results = model(frame, verbose=False, conf=confidence)
                if results and len(results) > 0:
                    all_detections[model_name] = results[0]
            except Exception as e:
                print(f"[MultiModel] Error in {model_name} detection: {e}")
        
        return all_detections
    
    def detect_for_category(self, frame: np.ndarray, category: str,
                          confidence: float = 0.3) -> Optional:
        """Detect objects using model specific to category"""
        # Map category to model
        category_to_model = {
            'street': 'street',
            'outdoor': 'street',
            'indoor': 'indoor',
            'egocentric': 'egocentric',
            'text': 'text',
            'ocr': 'text',
            'blind': 'blind_nav',
            'general': 'base',
            'unified': 'unified'
        }
        
        model_key = None
        for cat_key, model_name in category_to_model.items():
            if cat_key in category.lower():
                model_key = model_name
                break
        
        if model_key and model_key in self.models:
            try:
                results = self.models[model_key](frame, verbose=False, conf=confidence)
                return results[0] if results else None
            except Exception as e:
                print(f"[MultiModel] Error in {model_key} detection: {e}")
        
        # Fallback to base model
        if 'base' in self.models:
            try:
                results = self.models['base'](frame, verbose=False, conf=confidence)
                return results[0] if results else None
            except Exception as e:
                print(f"[MultiModel] Error in base detection: {e}")
        
        return None
    
    def merge_detections(self, detections: Dict) -> List[Dict]:
        """Merge detections from multiple models"""
        merged = []
        seen_boxes = set()
        
        for model_name, result in detections.items():
            if result is None or not hasattr(result, 'boxes'):
                continue
            
            boxes = result.boxes
            if boxes is None:
                continue
            
            for box in boxes:
                if box.conf is None or box.cls is None:
                    continue
                
                conf = float(box.conf[0])
                if conf < 0.3:
                    continue
                
                cls_id = int(box.cls[0])
                names = result.names if hasattr(result, 'names') else self.models[model_name].names
                
                if isinstance(names, dict):
                    label = names.get(cls_id, str(cls_id))
                else:
                    label = names[cls_id] if 0 <= cls_id < len(names) else str(cls_id)
                
                coords = box.xyxy[0].tolist()
                box_key = f"{label}_{int(coords[0])}_{int(coords[1])}"
                
                # Avoid duplicates
                if box_key not in seen_boxes:
                    seen_boxes.add(box_key)
                    merged.append({
                        'label': label,
                        'confidence': conf,
                        'bbox': coords,
                        'model': model_name,
                        'class_id': cls_id
                    })
        
        # Sort by confidence
        merged.sort(key=lambda x: x['confidence'], reverse=True)
        return merged
    
    def detect_object_by_name(self, frame: np.ndarray, object_name: str,
                            confidence: float = 0.3) -> Optional[Dict]:
        """Detect a specific object by name using all models"""
        all_detections = self.detect_with_all_models(frame, confidence)
        merged = self.merge_detections(all_detections)
        
        object_name_lower = object_name.lower()
        
        # Find exact or close matches
        for det in merged:
            label_lower = det['label'].lower()
            if (object_name_lower in label_lower or 
                label_lower in object_name_lower or
                object_name_lower == label_lower):
                return det
        
        return None
    
    def get_all_detected_objects(self, frame: np.ndarray,
                                confidence: float = 0.3) -> List[str]:
        """Get list of all detected object names"""
        all_detections = self.detect_with_all_models(frame, confidence)
        merged = self.merge_detections(all_detections)
        
        # Get unique labels
        labels = [det['label'] for det in merged]
        return list(set(labels))


def get_enhanced_detector():
    """Get or create enhanced multi-model detector"""
    global _enhanced_detector
    if '_enhanced_detector' not in globals():
        _enhanced_detector = MultiModelDetector()
    return _enhanced_detector

