# BlindNav+ Training Guide

This guide explains how to train detection models on multiple datasets for comprehensive object detection.

## Overview

The BlindNav+ system supports training on 160+ datasets across 11 categories:
- General Object Detection
- Street/Outdoor Navigation
- Indoor Navigation
- Egocentric Vision
- Audio + Vision
- Text/OCR
- Depth Estimation
- Blind Navigation Specific
- Drone/Aerial
- SLAM/Mapping
- Human Detection

## Quick Start

### 1. Install Dependencies

```bash
pip install ultralytics torch torchvision
pip install pyyaml
```

### 2. Prepare Datasets

First, download and prepare your datasets. The system uses the dataset registry in `blind_navigation_datasets.csv`.

```python
from utils.dataset_manager import DatasetManager

# Initialize dataset manager
dm = DatasetManager()

# List available datasets
print(dm.list_available_datasets())

# Get high priority datasets
high_priority = dm.get_high_priority_datasets()
for ds in high_priority:
    print(f"{ds.name}: {ds.url}")
```

### 3. Train Models

#### Train Unified Model (Recommended)

Trains a single model on all recommended datasets:

```bash
python train_models.py --unified --epochs 100 --batch-size 16
```

#### Train Category-Specific Models

Train models for specific categories:

```bash
# Street navigation
python train_models.py --category "Street Navigation" --epochs 100

# Indoor navigation
python train_models.py --category "Indoor Navigation" --epochs 100

# All categories
python train_models.py --all
```

#### Train on Specific Datasets

```bash
python train_models.py --datasets "Microsoft COCO" "Cityscapes" "KITTI" --epochs 50
```

## Training Options

- `--unified`: Train unified model on recommended datasets
- `--category CAT`: Train model for specific category
- `--all`: Train all category models
- `--datasets DS1 DS2`: Train on specific datasets
- `--epochs N`: Number of training epochs (default: 100)
- `--batch-size N`: Batch size (default: 16)
- `--img-size N`: Image size (default: 640)
- `--model-size SIZE`: Model size - n/s/m/l/x (default: m)

## Recommended Datasets

The system automatically uses these high-priority datasets for unified training:

**General Detection:**
- Microsoft COCO
- Open Images Dataset V6

**Street Navigation:**
- Cityscapes
- KITTI
- BDD100K
- EuroCity Persons
- JAAD

**Indoor Navigation:**
- SUN RGB-D
- Matterport3D
- ScanNet
- NYU Depth V2

**Egocentric (Critical for Blind Navigation):**
- Ego4D
- EPIC-Kitchens
- ADL Dataset

**Text/OCR:**
- ICDAR 2019
- COCO-Text
- TextOCR

**Depth:**
- MegaDepth
- NYU Depth V2
- KITTI Depth

**Blind Navigation Specific:**
- RNIB Indoor Navigation
- VizWiz
- VizWiz VQA
- NAVI

**Human Detection:**
- COCO-Pose
- CrowdHuman
- WEPDTOF

## Dataset Format

Datasets should be prepared in YOLO format:

```
dataset/
├── train/
│   ├── images/
│   └── labels/
├── val/
│   ├── images/
│   └── labels/
└── dataset.yaml
```

## Model Outputs

Trained models are saved in `models/` directory:

- `models/blindnav_unified/weights/best.pt` - Unified model
- `models/blindnav_Street_Navigation/weights/best.pt` - Street model
- `models/blindnav_Indoor_Navigation/weights/best.pt` - Indoor model
- etc.

## Using Trained Models

The system automatically loads trained models when available. The multi-model detector will:

1. Use category-specific models when appropriate
2. Fall back to unified model
3. Use base YOLOv8n as final fallback

## Performance Tips

1. **GPU Training**: Use CUDA-enabled GPU for faster training
   ```bash
   # Check GPU availability
   python -c "import torch; print(torch.cuda.is_available())"
   ```

2. **Model Size**: 
   - `n` (nano) - Fastest, least accurate
   - `s` (small) - Good balance
   - `m` (medium) - Recommended
   - `l` (large) - Better accuracy, slower
   - `x` (xlarge) - Best accuracy, slowest

3. **Batch Size**: Adjust based on GPU memory
   - 8GB GPU: batch_size=8-16
   - 16GB GPU: batch_size=16-32
   - 24GB+ GPU: batch_size=32-64

4. **Training Time**: 
   - Unified model: ~24-48 hours on GPU
   - Category models: ~6-12 hours each on GPU
   - CPU training: 5-10x slower

## Troubleshooting

### Out of Memory
- Reduce batch size: `--batch-size 8`
- Reduce image size: `--img-size 512`
- Use smaller model: `--model-size s`

### Dataset Not Found
- Check dataset path in CSV
- Ensure dataset is downloaded and prepared
- Verify YOLO format structure

### Slow Training
- Use GPU if available
- Reduce number of datasets
- Use smaller model size
- Reduce image size

## Next Steps

After training:

1. Models are automatically integrated into the detection system
2. Run `python main.py` to use trained models
3. The system will use the best available model for each detection task

## Dataset Sources

All dataset URLs and licenses are listed in `blind_navigation_datasets.csv`. Most datasets require:
- Registration/approval
- License agreement
- Manual download

Check individual dataset websites for download instructions.

