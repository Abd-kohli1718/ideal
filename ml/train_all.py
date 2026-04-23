"""
ResQ ML -- Master Training Script

Trains ALL models at once:
  1. Text severity classifier
  2. Text response type classifier
  3. Image emergency classifier (if images are present)

Usage:
    python train_all.py
"""

import os
import sys
import time

def main():
    print("="*60)
    print("  ResQ ML - Training All Models")
    print("="*60)

    start = time.time()

    # 1. Generate synthetic text data if not present
    text_data = os.path.join("ml", "data", "text", "emergency_train.csv")
    if not os.path.exists(text_data):
        print("\n[1/3] Generating synthetic text dataset...")
        from ml.generate_dataset import generate_dataset
        generate_dataset(n_per_class=300, output_path=text_data)
    else:
        print(f"\n[1/3] Text dataset found: {text_data}")

    # 2. Train text models
    print("\n[2/3] Training text classifiers...")
    sys.path.insert(0, "ml")
    from train_text_model import load_data, train_model, test_predictions

    df = load_data(text_data)
    sev_model, sev_acc = train_model(df, "severity", "severity_classifier", "ml/models")
    resp_model, resp_acc = train_model(df, "response_type", "response_classifier", "ml/models")
    test_predictions(sev_model, resp_model)

    # 3. Train image model (if images exist)
    print("\n[3/3] Checking for image data...")
    img_dir = os.path.join("ml", "data", "images")
    has_images = False
    for cls_dir in os.listdir(img_dir):
        cls_path = os.path.join(img_dir, cls_dir)
        if os.path.isdir(cls_path):
            imgs = [f for f in os.listdir(cls_path)
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.bmp'))]
            if imgs:
                has_images = True
                break

    if has_images:
        print("  Images found! Training image classifier...")
        from train_image_model import train_image_classifier
        train_image_classifier()
    else:
        print("  No images found. Skipping image classifier.")
        print("  To train: drop images into ml/data/images/<class>/")

    elapsed = time.time() - start

    print("\n" + "="*60)
    print(f"  ALL TRAINING COMPLETE ({elapsed:.0f}s)")
    print("="*60)
    print(f"  Text severity:  {sev_acc*100:.1f}% accuracy")
    print(f"  Text response:  {resp_acc*100:.1f}% accuracy")
    if has_images:
        print(f"  Image model:    trained")
    else:
        print(f"  Image model:    skipped (no data)")
    print(f"\n  Models saved in: ml/models/")
    print(f"  Start inference: python ml/inference_server.py")
    print("="*60)


if __name__ == "__main__":
    main()
