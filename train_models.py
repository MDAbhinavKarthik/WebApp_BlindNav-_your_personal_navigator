"""
Training Script for BlindNav+ System
Trains models on multiple datasets for comprehensive object detection
"""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from utils.dataset_manager import DatasetManager, get_recommended_datasets_for_blind_nav
from utils.training_manager import TrainingManager
import argparse


def main():
    parser = argparse.ArgumentParser(description='Train BlindNav+ detection models')
    parser.add_argument('--category', type=str, help='Train specific category model')
    parser.add_argument('--unified', action='store_true', help='Train unified model')
    parser.add_argument('--all', action='store_true', help='Train all category models')
    parser.add_argument('--datasets', nargs='+', help='Specific datasets to use')
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Batch size')
    parser.add_argument('--img-size', type=int, default=640, help='Image size')
    parser.add_argument('--model-size', type=str, default='m', choices=['n', 's', 'm', 'l', 'x'],
                       help='Model size (nano, small, medium, large, xlarge)')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("BlindNav+ Model Training System")
    print("=" * 60)
    
    # Initialize managers
    dataset_mgr = DatasetManager()
    training_mgr = TrainingManager(dataset_mgr)
    
    print(f"\nLoaded {len(dataset_mgr.datasets)} datasets from registry")
    
    if args.unified:
        # Train unified model on recommended datasets
        print("\nTraining unified model on recommended datasets...")
        recommended = get_recommended_datasets_for_blind_nav()
        model_path = training_mgr.train_unified_model(
            recommended,
            model_size=args.model_size,
            epochs=args.epochs,
            img_size=args.img_size,
            batch_size=args.batch_size
        )
        print(f"\nUnified model trained: {model_path}")
    
    elif args.category:
        # Train specific category
        print(f"\nTraining {args.category} model...")
        model_path = training_mgr.train_category_specific_model(
            args.category,
            model_size=args.model_size,
            epochs=args.epochs
        )
        if model_path:
            print(f"\n{args.category} model trained: {model_path}")
        else:
            print(f"\nFailed to train {args.category} model")
    
    elif args.all:
        # Train all category models
        print("\nTraining all category models...")
        trained = training_mgr.train_all_category_models()
        print(f"\nTrained {len(trained)} models:")
        for category, path in trained.items():
            print(f"  - {category}: {path}")
    
    elif args.datasets:
        # Train on specific datasets
        print(f"\nTraining on specified datasets: {args.datasets}")
        model_path = training_mgr.train_unified_model(
            args.datasets,
            model_size=args.model_size,
            epochs=args.epochs,
            img_size=args.img_size,
            batch_size=args.batch_size
        )
        print(f"\nModel trained: {model_path}")
    
    else:
        print("\nNo training option specified. Use --help for options.")
        print("\nAvailable options:")
        print("  --unified          Train unified model on recommended datasets")
        print("  --category CAT     Train model for specific category")
        print("  --all              Train all category models")
        print("  --datasets DS1 DS2 Train on specific datasets")
        print("\nExample:")
        print("  python train_models.py --unified")
        print("  python train_models.py --category 'Street Navigation'")
        print("  python train_models.py --all")


if __name__ == "__main__":
    main()

