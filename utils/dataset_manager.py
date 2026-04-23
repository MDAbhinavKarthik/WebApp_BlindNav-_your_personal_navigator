"""
Dataset Manager for BlindNav+ System
Manages downloading, organizing, and preparing datasets for training
"""
import os
import json
import csv
import requests
import zipfile
import tarfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import hashlib


@dataclass
class DatasetInfo:
    """Information about a dataset"""
    name: str
    category: str
    environment: str
    use_case: str
    priority: str
    size: str
    license: str
    url: str
    local_path: Optional[str] = None
    downloaded: bool = False
    prepared: bool = False


class DatasetManager:
    """Manages datasets for training and detection"""
    
    def __init__(self, datasets_csv_path: str = "blind_navigation_datasets.csv", 
                 data_root: str = "datasets"):
        self.datasets_csv_path = datasets_csv_path
        self.data_root = Path(data_root)
        self.data_root.mkdir(exist_ok=True)
        self.datasets: Dict[str, DatasetInfo] = {}
        self.load_datasets()
    
    def load_datasets(self):
        """Load dataset information from CSV"""
        if not os.path.exists(self.datasets_csv_path):
            print(f"Warning: {self.datasets_csv_path} not found")
            return
        
        with open(self.datasets_csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dataset = DatasetInfo(
                    name=row['Dataset Name'],
                    category=row['Category'],
                    environment=row['Environment'],
                    use_case=row['Use Case'],
                    priority=row.get('Priority', 'Medium'),
                    size=row.get('Size', 'Unknown'),
                    license=row.get('License', 'Unknown'),
                    url=row.get('URL', ''),
                    local_path=str(self.data_root / row['Dataset Name'].replace('/', '_'))
                )
                self.datasets[dataset.name] = dataset
    
    def get_datasets_by_category(self, category: str) -> List[DatasetInfo]:
        """Get all datasets in a category"""
        return [ds for ds in self.datasets.values() if ds.category == category]
    
    def get_high_priority_datasets(self) -> List[DatasetInfo]:
        """Get all high priority datasets"""
        return [ds for ds in self.datasets.values() if ds.priority == 'High']
    
    def get_datasets_for_environment(self, environment: str) -> List[DatasetInfo]:
        """Get datasets suitable for an environment"""
        return [ds for ds in self.datasets.values() if environment in ds.environment]
    
    def list_available_datasets(self) -> List[str]:
        """List all available dataset names"""
        return list(self.datasets.keys())
    
    def get_dataset_info(self, name: str) -> Optional[DatasetInfo]:
        """Get information about a specific dataset"""
        return self.datasets.get(name)
    
    def download_dataset(self, name: str, force: bool = False) -> bool:
        """Download a dataset (placeholder - actual implementation depends on dataset)"""
        dataset = self.datasets.get(name)
        if not dataset:
            print(f"Dataset {name} not found")
            return False
        
        if dataset.downloaded and not force:
            print(f"Dataset {name} already downloaded")
            return True
        
        print(f"Downloading {name}...")
        print(f"URL: {dataset.url}")
        print(f"Size: {dataset.size}")
        print(f"Note: Manual download may be required. Please visit the URL above.")
        
        # Create directory
        Path(dataset.local_path).mkdir(parents=True, exist_ok=True)
        
        # Save download info
        info_file = Path(dataset.local_path) / "dataset_info.json"
        with open(info_file, 'w') as f:
            json.dump({
                'name': dataset.name,
                'url': dataset.url,
                'size': dataset.size,
                'license': dataset.license
            }, f, indent=2)
        
        dataset.downloaded = True
        return True
    
    def prepare_dataset(self, name: str, format: str = 'yolo') -> bool:
        """Prepare dataset for training in specified format"""
        dataset = self.datasets.get(name)
        if not dataset:
            print(f"Dataset {name} not found")
            return False
        
        if not dataset.downloaded:
            print(f"Dataset {name} not downloaded. Please download first.")
            return False
        
        print(f"Preparing {name} in {format} format...")
        # This would convert dataset to training format
        # Implementation depends on specific dataset structure
        
        dataset.prepared = True
        return True
    
    def get_training_config(self, categories: List[str] = None) -> Dict:
        """Get training configuration for specified categories"""
        if categories is None:
            categories = ['General Object Detection', 'Street Navigation', 
                         'Indoor Navigation', 'Blind Navigation']
        
        config = {
            'datasets': [],
            'classes': {},
            'training_params': {
                'batch_size': 16,
                'epochs': 100,
                'img_size': 640,
                'model': 'yolov8m.pt'
            }
        }
        
        for cat in categories:
            datasets = self.get_datasets_by_category(cat)
            for ds in datasets:
                if ds.priority == 'High':
                    config['datasets'].append({
                        'name': ds.name,
                        'path': ds.local_path,
                        'category': ds.category
                    })
        
        return config


def get_recommended_datasets_for_blind_nav() -> List[str]:
    """Get recommended datasets for blind navigation system"""
    return [
        # General detection
        'Microsoft COCO',
        'Open Images Dataset V6',
        
        # Street navigation
        'Cityscapes',
        'KITTI',
        'BDD100K',
        'EuroCity Persons',
        'JAAD',
        
        # Indoor navigation
        'SUN RGB-D',
        'Matterport3D',
        'ScanNet',
        'NYU Depth V2',
        
        # Egocentric (critical for blind navigation)
        'Ego4D',
        'EPIC-Kitchens',
        'ADL Dataset',
        
        # Text/OCR
        'ICDAR 2019',
        'COCO-Text',
        'TextOCR',
        
        # Depth
        'MegaDepth',
        'NYU Depth V2',
        'KITTI Depth',
        
        # Blind navigation specific
        'RNIB Indoor Navigation',
        'VizWiz',
        'VizWiz VQA',
        'NAVI',
        
        # Human detection
        'COCO-Pose',
        'CrowdHuman',
        'WEPDTOF'
    ]


if __name__ == "__main__":
    manager = DatasetManager()
    print(f"Loaded {len(manager.datasets)} datasets")
    
    # Show high priority datasets
    high_priority = manager.get_high_priority_datasets()
    print(f"\nHigh Priority Datasets ({len(high_priority)}):")
    for ds in high_priority[:10]:
        print(f"  - {ds.name} ({ds.category})")

