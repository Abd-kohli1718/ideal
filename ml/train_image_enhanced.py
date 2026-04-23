"""
ResQ ML -- Enhanced Image Classifier Training
Uses Kaggle CrisisMMD balanced image dataset (~15K images).
3 classes: severe_damage, mild_damage, little_or_no_damage
Maps to ResQ severity: high, medium, low

Uses richer features: color histograms, edge features, texture (LBP-like),
spatial color distribution, and aspect ratio.

Usage:
    python train_image_enhanced.py
"""

import os
import sys
import time
import json
import pickle
import numpy as np
from PIL import Image, ImageFilter, ImageStat
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
    ExtraTreesClassifier,
)
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import warnings
warnings.filterwarnings("ignore")

IMAGE_SIZE = (128, 128)
KAGGLE_IMG_DIR = os.path.join(os.path.dirname(__file__), "data", "kaggle", "working", "label_wise_images_of_balanced_data")
ORIG_IMG_DIR = os.path.join(os.path.dirname(__file__), "data", "images")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Map Kaggle folder names to ResQ severity
KAGGLE_CLASS_MAP = {
    "severe_damage": "high",
    "mild_damage": "medium",
    "little_or_no_damage": "low",
}

# Map original folder names to severity
ORIG_CLASS_MAP = {
    "fire": "high",
    "flood": "high",
    "collapse": "high",
    "accident": "high",
    "violence": "high",
    "safe": "low",
}


def extract_features(img_path):
    """Extract a rich feature vector from a single image."""
    try:
        img = Image.open(img_path).convert("RGB").resize(IMAGE_SIZE)
    except Exception:
        return None

    features = []
    arr = np.array(img, dtype=np.float32) / 255.0

    # 1. Color histogram per channel (64 bins each = 192)
    for ch in range(3):
        hist, _ = np.histogram(arr[:, :, ch], bins=64, range=(0, 1))
        hist = hist.astype(np.float32)
        hist /= (hist.sum() + 1e-7)
        features.extend(hist)

    # 2. Color statistics per channel (mean, std, skew = 9)
    for ch in range(3):
        channel = arr[:, :, ch].ravel()
        features.append(channel.mean())
        features.append(channel.std())
        features.append(float(np.median(channel)))

    # 3. HSV statistics (6)
    hsv = img.convert("HSV")
    hsv_arr = np.array(hsv, dtype=np.float32) / 255.0
    for ch in range(3):
        features.append(hsv_arr[:, :, ch].mean())
        features.append(hsv_arr[:, :, ch].std())

    # 4. Edge features (32)
    gray = img.convert("L")
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(edges, dtype=np.float32) / 255.0
    edge_hist, _ = np.histogram(edge_arr, bins=32, range=(0, 1))
    edge_hist = edge_hist.astype(np.float32)
    edge_hist /= (edge_hist.sum() + 1e-7)
    features.extend(edge_hist)

    # 5. Edge intensity stats (3)
    features.append(edge_arr.mean())
    features.append(edge_arr.std())
    features.append(float(np.percentile(edge_arr, 95)))

    # 6. Spatial color distribution (4x4 grid mean per channel = 48)
    h, w = arr.shape[:2]
    gh, gw = h // 4, w // 4
    for gi in range(4):
        for gj in range(4):
            patch = arr[gi * gh:(gi + 1) * gh, gj * gw:(gj + 1) * gw]
            for ch in range(3):
                features.append(patch[:, :, ch].mean())

    # 7. Texture: variance in local patches (16)
    gray_arr = np.array(gray, dtype=np.float32) / 255.0
    for gi in range(4):
        for gj in range(4):
            patch = gray_arr[gi * gh:(gi + 1) * gh, gj * gw:(gj + 1) * gw]
            features.append(patch.var())

    # 8. Red/warm color ratio (useful for fire detection) (2)
    red_ratio = arr[:, :, 0].mean() / (arr.mean() + 1e-7)
    blue_ratio = arr[:, :, 2].mean() / (arr.mean() + 1e-7)
    features.append(red_ratio)
    features.append(blue_ratio)

    return np.array(features, dtype=np.float32)


def load_images(img_dir, class_map, max_per_class=2000):
    """Load images from directory structure."""
    X, y = [], []
    for folder_name, severity in class_map.items():
        folder_path = os.path.join(img_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue

        files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp'))]
        if max_per_class:
            import random
            random.seed(42)
            random.shuffle(files)
            files = files[:max_per_class]

        loaded = 0
        t0 = time.time()
        for fname in files:
            fpath = os.path.join(folder_path, fname)
            feat = extract_features(fpath)
            if feat is not None:
                X.append(feat)
                y.append(severity)
                loaded += 1

            if loaded % 200 == 0 and loaded > 0:
                elapsed = time.time() - t0
                rate = loaded / elapsed
                remaining = (len(files) - loaded) / rate if rate > 0 else 0
                print(f"    {folder_name}: {loaded}/{len(files)} ({rate:.0f} img/s, ~{remaining:.0f}s left)", flush=True)

        print(f"    {folder_name} -> {severity}: {loaded} images loaded", flush=True)

    return np.array(X), np.array(y)


def build_pipeline():
    """Build a strong but fast ensemble pipeline for image classification."""
    svc = CalibratedClassifierCV(LinearSVC(max_iter=5000, class_weight="balanced"))
    lr = LogisticRegression(max_iter=2000, C=5.0, class_weight="balanced")
    rf = RandomForestClassifier(n_estimators=300, max_depth=None, class_weight="balanced", n_jobs=-1)
    et = ExtraTreesClassifier(n_estimators=300, class_weight="balanced", n_jobs=-1)

    ensemble = VotingClassifier(
        estimators=[("svc", svc), ("lr", lr), ("rf", rf), ("et", et)],
        voting="soft",
        weights=[2, 2, 3, 3],
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", ensemble),
    ])
    return pipeline


def main():
    print("\n" + "=" * 60)
    print("  ResQ Enhanced Image Model Training")
    print("  Using Kaggle CrisisMMD + Original Images")
    print("=" * 60)

    # Load Kaggle images
    print("\n  [1/4] Loading Kaggle images...")
    X_kaggle, y_kaggle = [], []
    if os.path.isdir(KAGGLE_IMG_DIR):
        X_kaggle, y_kaggle = load_images(KAGGLE_IMG_DIR, KAGGLE_CLASS_MAP, max_per_class=2000)
        print(f"  Kaggle: {len(X_kaggle)} images loaded")
    else:
        print(f"  [!] Kaggle image dir not found: {KAGGLE_IMG_DIR}")

    # Load original images (if any)
    print("\n  [2/4] Loading original images...")
    X_orig, y_orig = [], []
    if os.path.isdir(ORIG_IMG_DIR) and os.listdir(ORIG_IMG_DIR):
        X_orig, y_orig = load_images(ORIG_IMG_DIR, ORIG_CLASS_MAP, max_per_class=2000)
        print(f"  Original: {len(X_orig)} images loaded")
    else:
        print("  [!] No original images found, using Kaggle only")

    # Combine datasets
    datasets = []
    if len(X_kaggle) > 0:
        datasets.append((X_kaggle, y_kaggle))
    if len(X_orig) > 0:
        datasets.append((X_orig, y_orig))

    if not datasets:
        print("\n[ERROR] No image data found!")
        sys.exit(1)

    X = np.vstack([d[0] for d in datasets])
    y = np.concatenate([d[1] for d in datasets])

    print(f"\n  Combined: {len(X)} images, {X.shape[1]} features each")
    unique, counts = np.unique(y, return_counts=True)
    for u, c in zip(unique, counts):
        print(f"    {u}: {c} images")

    # Split
    print("\n  [3/4] Training classifier...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    pipeline = build_pipeline()

    # Cross-validation
    print("  Running 3-fold cross-validation...", flush=True)
    t0 = time.time()
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="accuracy", n_jobs=-1)
    print(f"  CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})", flush=True)

    # Full train
    print("  Training on full training set...")
    pipeline.fit(X_train, y_train)
    t1 = time.time()

    # Evaluate
    y_pred = pipeline.predict(X_test)
    acc = np.mean(y_pred == y_test)
    print(f"\n  Test Accuracy: {acc:.4f}")
    print(f"  Training time: {t1 - t0:.1f}s")
    print("\n" + classification_report(y_test, y_pred))

    # Save
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "image_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"  Saved: {model_path}")

    # Save metadata
    meta = {
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_images": int(len(X)),
        "kaggle_images": int(len(X_kaggle)),
        "original_images": int(len(X_orig)),
        "feature_dim": int(X.shape[1]),
        "test_accuracy": round(float(acc), 4),
        "cv_accuracy_mean": round(float(cv_scores.mean()), 4),
        "cv_accuracy_std": round(float(cv_scores.std()), 4),
        "classes": sorted(list(unique)),
    }
    meta_path = os.path.join(MODEL_DIR, "image_training_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"  Metadata saved: {meta_path}")

    print("\n" + "=" * 60)
    print(f"  DONE - Image Accuracy: {acc:.1%}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
