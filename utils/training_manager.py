"""
Training Manager for BlindNav+ System
Handles training models on multiple datasets
"""
import os
import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional
from ultralytics import YOLO
import torch


class TrainingManager:
    """Manages training of detection models on multiple datasets"""
    
    def __init__(self, dataset_manager, models_dir: str = "models"):
        self.dataset_manager = dataset_manager
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.trained_models: Dict[str, str] = {}
    
    def create_yolo_dataset_config(self, dataset_names: List[str], 
                                   output_path: str = "datasets_config.yaml") -> str:
        """Create YOLO dataset configuration file"""
        config = {
            'path': str(self.dataset_manager.data_root),
            'train': [],
            'val': [],
            'test': [],
            'nc': 0,  # Number of classes
            'names': []
        }
        
        all_classes = set()
        for name in dataset_names:
            dataset = self.dataset_manager.get_dataset_info(name)
            if dataset and dataset.prepared:
                # Add dataset paths (assuming YOLO format)
                train_path = Path(dataset.local_path) / "train"
                val_path = Path(dataset.local_path) / "val"
                
                if train_path.exists():
                    config['train'].append(str(train_path))
                if val_path.exists():
                    config['val'].append(str(val_path))
        
        config['nc'] = len(all_classes)
        config['names'] = sorted(list(all_classes))
        
        with open(output_path, 'w') as f:
            yaml.dump(config, f)
        
        return output_path
    
    def train_unified_model(self, dataset_names: List[str], 
                           model_size: str = 'm',
                           epochs: int = 100,
                           img_size: int = 640,
                           batch_size: int = 16) -> str:
        """Train a unified model on multiple datasets"""
        print(f"Training unified model on {len(dataset_names)} datasets...")
        
        # Create dataset config
        config_path = self.create_yolo_dataset_config(dataset_names)
        
        # Initialize model
        model_name = f"yolov8{model_size}.pt"
        model = YOLO(model_name)
        
        # Train
        results = model.train(
            data=config_path,
            epochs=epochs,
            imgsz=img_size,
            batch=batch_size,
            name='blindnav_unified',
            project=str(self.models_dir),
            device='cuda' if torch.cuda.is_available() else 'cpu'
        )
        
        # Save model path
        model_path = self.models_dir / 'blindnav_unified' / 'weights' / 'best.pt'
        self.trained_models['unified'] = str(model_path)
        
        return str(model_path)
    
    def train_category_specific_model(self, category: str,
                                     model_size: str = 'm',
                                     epochs: int = 100) -> str:
        """Train a model for a specific category"""
        datasets = self.dataset_manager.get_datasets_by_category(category)
        dataset_names = [ds.name for ds in datasets if ds.priority == 'High']
        
        if not dataset_names:
            print(f"No high-priority datasets found for category: {category}")
            return None
        
        print(f"Training {category} model on {len(dataset_names)} datasets...")
        
        config_path = self.create_yolo_dataset_config(dataset_names)
        
        model_name = f"yolov8{model_size}.pt"
        model = YOLO(model_name)
        
        category_safe = category.replace(' ', '_').replace('/', '_')
        results = model.train(
            data=config_path,
            epochs=epochs,
            imgsz=640,
            batch=16,
            name=f'blindnav_{category_safe}',
            project=str(self.models_dir),
            device='cuda' if torch.cuda.is_available() else 'cpu'
        )
        
        model_path = self.models_dir / f'blindnav_{category_safe}' / 'weights' / 'best.pt'
        self.trained_models[category] = str(model_path)
        
        return str(model_path)
    
    def train_all_category_models(self):
        """Train models for all major categories"""
        categories = [
            'General Object Detection',
            'Street Navigation',
            'Indoor Navigation',
            'Egocentric Vision',
            'Text/OCR',
            'Blind Navigation'
        ]
        
        trained = {}
        for category in categories:
            try:
                model_path = self.train_category_specific_model(category)
                if model_path:
                    trained[category] = model_path
            except Exception as e:
                print(f"Error training {category}: {e}")
        
        return trained
    
    def get_model_for_category(self, category: str) -> Optional[str]:
        """Get trained model path for a category"""
        return self.trained_models.get(category)
    
    def list_trained_models(self) -> Dict[str, str]:
        """List all trained models"""
        return self.trained_models.copy()


class MultiModelDetector:
    """Detector that uses multiple trained models"""
    
    def __init__(self, training_manager: TrainingManager):
        self.training_manager = training_manager
        self.models: Dict[str, YOLO] = {}
        self.load_models()
    
    def load_models(self):
        """Load all trained models"""
        for category, model_path in self.training_manager.trained_models.items():
            if os.path.exists(model_path):
                try:
                    self.models[category] = YOLO(model_path)
                    print(f"Loaded model for {category}")
                except Exception as e:
                    print(f"Error loading {category} model: {e}")
    
    def detect(self, frame, categories: List[str] = None) -> Dict:
        """Detect objects using appropriate models"""
        if categories is None:
            categories = list(self.models.keys())
        
        all_detections = {}
        
        for category in categories:
            if category in self.models:
                try:
                    results = self.models[category](frame, verbose=False)
                    all_detections[category] = results
                except Exception as e:
                    print(f"Error detecting with {category} model: {e}")
        
        return all_detections
    
    def detect_unified(self, frame) -> Dict:
        """Detect using unified model if available"""
        if 'unified' in self.models:
            results = self.models['unified'](frame, verbose=False)
            return results
        return None


if __name__ == "__main__":
    from dataset_manager import DatasetManager
    
    dataset_mgr = DatasetManager()
    training_mgr = TrainingManager(dataset_mgr)
    
    print("Training Manager initialized")
    print("Use training_mgr.train_category_specific_model() to train models")

