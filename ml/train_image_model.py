"""
ResQ ML -- Image Emergency Classifier

Trains an image classifier to categorize emergency images into:
  fire, flood, collapse, accident, violence, safe

Works WITHOUT GPU using scikit-learn + Pillow (no PyTorch needed).
Uses color histogram + edge features for fast training.

Folder structure required:
    ml/data/images/
        fire/       <- fire/explosion images
        flood/      <- flood/waterlogging images
        collapse/   <- building collapse images
        accident/   <- road/vehicle accident images
        violence/   <- violence/crime scene images
        safe/       <- normal/non-emergency images

Usage:
    python train_image_model.py
"""

import os
import sys
import time
import json
import pickle
import numpy as np
from PIL import Image, ImageFilter
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

IMAGE_SIZE = (128, 128)
DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "images")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Maps image folder -> (severity, response_type)
CLASS_MAPPING = {
    "fire":      {"severity": "high",   "response_type": "fire"},
    "flood":     {"severity": "high",   "response_type": "rescue"},
    "collapse":  {"severity": "high",   "response_type": "rescue"},
    "accident":  {"severity": "high",   "response_type": "ambulance"},
    "violence":  {"severity": "high",   "response_type": "police"},
    "safe":      {"severity": "low",    "response_type": "unknown"},
}


def extract_features(img_path):
    """Extract a feature vector from a single image."""
    try:
        img = Image.open(img_path).convert("RGB").resize(IMAGE_SIZE)
    except Exception:
        return None

    arr = np.array(img, dtype=np.float32) / 255.0
    features = []

    # 1. Color histogram (R, G, B channels, 32 bins each = 96 features)
    for c in range(3):
        hist, _ = np.histogram(arr[:, :, c], bins=32, range=(0, 1))
        hist = hist.astype(np.float32) / hist.sum()  # normalize
        features.extend(hist)

    # 2. Channel means and stds (6 features)
    for c in range(3):
        features.append(float(arr[:, :, c].mean()))
        features.append(float(arr[:, :, c].std()))

    # 3. HSV color features (dominant hue for fire detection etc.)
    hsv = img.convert("HSV")
    hsv_arr = np.array(hsv, dtype=np.float32) / 255.0
    for c in range(3):
        features.append(float(hsv_arr[:, :, c].mean()))
        features.append(float(hsv_arr[:, :, c].std()))

    # 4. Edge density (indicates destruction/debris)
    edges = img.filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(edges.convert("L"), dtype=np.float32) / 255.0
    features.append(float(edge_arr.mean()))
    features.append(float(edge_arr.std()))
    # Edge histogram
    edge_hist, _ = np.histogram(edge_arr, bins=16, range=(0, 1))
    edge_hist = edge_hist.astype(np.float32) / max(edge_hist.sum(), 1)
    features.extend(edge_hist)

    # 5. Texture features (variance in local patches)
    gray = np.array(img.convert("L"), dtype=np.float32) / 255.0
    patch_size = 16
    patch_vars = []
    for i in range(0, gray.shape[0] - patch_size, patch_size):
        for j in range(0, gray.shape[1] - patch_size, patch_size):
            patch = gray[i:i+patch_size, j:j+patch_size]
            patch_vars.append(float(patch.var()))
    features.append(float(np.mean(patch_vars)) if patch_vars else 0.0)
    features.append(float(np.std(patch_vars)) if patch_vars else 0.0)
    features.append(float(np.max(patch_vars)) if patch_vars else 0.0)

    # 6. Red dominance ratio (fire/blood detection)
    red_ratio = arr[:, :, 0] / (arr.sum(axis=2) + 1e-7)
    features.append(float(red_ratio.mean()))
    features.append(float((red_ratio > 0.5).sum() / red_ratio.size))

    # 7. Blue dominance ratio (water/flood detection)
    blue_ratio = arr[:, :, 2] / (arr.sum(axis=2) + 1e-7)
    features.append(float(blue_ratio.mean()))
    features.append(float((blue_ratio > 0.5).sum() / blue_ratio.size))

    # 8. Brightness features
    brightness = gray.mean()
    features.append(float(brightness))
    features.append(float((gray < 0.2).sum() / gray.size))  # dark ratio
    features.append(float((gray > 0.8).sum() / gray.size))  # bright ratio

    return np.array(features, dtype=np.float32)


def load_image_dataset():
    """Load all images from class folders and extract features."""
    print("\nLoading images from:", DATA_DIR)

    X, y = [], []
    class_counts = {}

    for class_name in sorted(os.listdir(DATA_DIR)):
        class_dir = os.path.join(DATA_DIR, class_name)
        if not os.path.isdir(class_dir):
            continue
        if class_name not in CLASS_MAPPING:
            print(f"  Skipping unknown class: {class_name}")
            continue

        images = [f for f in os.listdir(class_dir)
                  if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.bmp'))]

        if not images:
            print(f"  {class_name}: 0 images (EMPTY)")
            continue

        count = 0
        for img_file in images:
            feat = extract_features(os.path.join(class_dir, img_file))
            if feat is not None:
                X.append(feat)
                y.append(class_name)
                count += 1

        class_counts[class_name] = count
        print(f"  {class_name}: {count} images loaded")

    if not X:
        return None, None, class_counts

    return np.array(X), np.array(y), class_counts


def train_image_classifier():
    """Train the image classifier."""
    X, y, counts = load_image_dataset()

    if X is None or len(X) < 10:
        print("\n" + "="*60)
        print("  NOT ENOUGH IMAGES TO TRAIN")
        print("="*60)
        print("\n  Drop images into these folders:")
        for cls in CLASS_MAPPING:
            path = os.path.join(DATA_DIR, cls)
            print(f"    {path}/")
        print("\n  Minimum: 10 images per class (50+ recommended)")
        print("  Formats: .jpg, .jpeg, .png, .webp, .bmp")
        print("\n  Then re-run: python train_image_model.py")
        return

    n_classes = len(set(y))
    print(f"\nTotal: {len(X)} images, {n_classes} classes")
    print(f"Feature vector size: {X.shape[1]}")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Build ensemble
    svc = CalibratedClassifierCV(LinearSVC(max_iter=3000, class_weight="balanced"))
    lr = LogisticRegression(max_iter=2000, class_weight="balanced")
    rf = RandomForestClassifier(n_estimators=200, class_weight="balanced", n_jobs=-1)
    gb = GradientBoostingClassifier(n_estimators=150, max_depth=5, learning_rate=0.1)

    ensemble = VotingClassifier(
        estimators=[("svc", svc), ("lr", lr), ("rf", rf), ("gb", gb)],
        voting="soft", n_jobs=-1,
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", ensemble),
    ])

    print("\nTraining image classifier (SVC + LR + RF + GBM)...")
    start = time.time()
    pipeline.fit(X_train, y_train)
    elapsed = time.time() - start
    print(f"Training complete in {elapsed:.1f}s")

    # Evaluate
    y_pred = pipeline.predict(X_test)
    accuracy = (y_pred == y_test).mean()
    print(f"\nTest Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    # Save
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "image_classifier.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)

    meta = {
        "model_name": "image_classifier",
        "classes": sorted(set(y)),
        "class_mapping": CLASS_MAPPING,
        "accuracy": float(accuracy),
        "total_images": len(X),
        "feature_size": int(X.shape[1]),
        "class_counts": counts,
        "training_time_seconds": round(elapsed, 1),
    }
    with open(os.path.join(MODEL_DIR, "image_classifier_meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    size_mb = os.path.getsize(model_path) / (1024 * 1024)
    print(f"\nSaved: {model_path} ({size_mb:.1f} MB)")
    print(f"Classes: {sorted(set(y))}")


if __name__ == "__main__":
    train_image_classifier()
