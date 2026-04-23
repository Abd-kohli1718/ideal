"""
ResQ ML — Emergency Text Classifier Training Pipeline

Trains two models:
  1. Severity classifier (high / medium / low)
  2. Response type classifier (ambulance / fire / police / rescue / unknown)

Uses TF-IDF + ensemble classifiers. Exports models as pickle files
that the Node.js backend can call via a Python inference server.

Usage:
    python train_text_model.py                      # Train on synthetic data
    python train_text_model.py --data custom.csv    # Train on your own CSV

CSV format required:
    message,severity,response_type,alert_type
    "Building on fire...",high,fire,sos_button
"""

import argparse
import os
import sys
import time
import pickle
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.calibration import CalibratedClassifierCV


def load_data(csv_path):
    """Load and validate training data."""
    print(f"\n📂 Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)

    required = ["message", "severity", "response_type"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"❌ Missing columns: {missing}")
        sys.exit(1)

    df = df.dropna(subset=["message", "severity", "response_type"])
    df["message"] = df["message"].astype(str).str.strip()
    df = df[df["message"].str.len() > 5]

    print(f"   Loaded {len(df)} samples")
    print(f"   Severity: {dict(df['severity'].value_counts())}")
    print(f"   Response: {dict(df['response_type'].value_counts())}")
    return df


def build_pipeline(task_name, n_classes):
    """Build a voting ensemble pipeline for robust classification."""
    # Calibrated LinearSVC (needs calibration for predict_proba)
    svc = CalibratedClassifierCV(LinearSVC(max_iter=5000, class_weight="balanced"))

    # Logistic Regression
    lr = LogisticRegression(max_iter=2000, class_weight="balanced", multi_class="multinomial")

    # Gradient Boosting
    gb = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
    )

    # Random Forest
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        class_weight="balanced",
        n_jobs=-1,
    )

    # Voting ensemble for best accuracy
    ensemble = VotingClassifier(
        estimators=[("svc", svc), ("lr", lr), ("gb", gb), ("rf", rf)],
        voting="soft",
        n_jobs=-1,
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=15000,
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,
            strip_accents="unicode",
            analyzer="word",
        )),
        ("clf", ensemble),
    ])

    return pipeline


def train_model(df, target_col, model_name, output_dir):
    """Train, evaluate, and save a classifier."""
    print(f"\n{'='*60}")
    print(f"🧠 Training: {model_name} ({target_col})")
    print(f"{'='*60}")

    X = df["message"].values
    y = df[target_col].values
    classes = sorted(set(y))
    print(f"   Classes: {classes}")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)}, Test: {len(X_test)}")

    # Build and train
    pipeline = build_pipeline(model_name, len(classes))

    print(f"   Training ensemble (SVC + LR + GBM + RF)...")
    start = time.time()
    pipeline.fit(X_train, y_train)
    elapsed = time.time() - start
    print(f"   ✅ Training complete in {elapsed:.1f}s")

    # Evaluate
    y_pred = pipeline.predict(X_test)
    accuracy = (y_pred == y_test).mean()
    print(f"\n   📊 Test Accuracy: {accuracy:.4f} ({accuracy*100:.1f}%)")

    print(f"\n   Classification Report:")
    report = classification_report(y_test, y_pred, zero_division=0)
    print("   " + report.replace("\n", "\n   "))

    # Cross-validation
    print(f"   Running 5-fold cross-validation...")
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="accuracy", n_jobs=-1)
    print(f"   CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save model
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, f"{model_name}.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(pipeline, f)
    size_mb = os.path.getsize(model_path) / (1024 * 1024)
    print(f"\n   💾 Saved: {model_path} ({size_mb:.1f} MB)")

    # Save metadata
    meta = {
        "model_name": model_name,
        "target": target_col,
        "classes": classes,
        "accuracy": float(accuracy),
        "cv_mean": float(cv_scores.mean()),
        "cv_std": float(cv_scores.std()),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "training_time_seconds": round(elapsed, 1),
    }
    meta_path = os.path.join(output_dir, f"{model_name}_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    return pipeline, accuracy


def test_predictions(severity_model, response_model):
    """Run interactive test predictions."""
    print(f"\n{'='*60}")
    print(f"🔍 Test Predictions")
    print(f"{'='*60}")

    test_messages = [
        "Building on fire, people trapped, need help immediately!",
        "Minor road accident, small bruise, person is walking",
        "Armed robbery at bank, shots fired, hostages taken",
        "Cat stuck on tree near park, been there all day",
        "Person collapsed, not breathing, cardiac arrest suspected",
        "Flood water rising in my area, we are on the roof",
        "Loud music from neighbor, very annoying",
        "SOS Emergency — Immediate help needed",
        "Gas leak in apartment, strong smell, evacuating",
        "Lost my phone somewhere in the market",
    ]

    print(f"\n   {'Message':<55} {'Severity':<10} {'Response':<12} {'Conf'}")
    print(f"   {'─'*55} {'─'*10} {'─'*12} {'─'*6}")

    for msg in test_messages:
        sev = severity_model.predict([msg])[0]
        sev_proba = severity_model.predict_proba([msg])[0]
        sev_conf = max(sev_proba)

        resp = response_model.predict([msg])[0]

        short_msg = msg[:52] + "..." if len(msg) > 55 else msg
        print(f"   {short_msg:<55} {sev:<10} {resp:<12} {sev_conf:.0%}")


def main():
    parser = argparse.ArgumentParser(description="Train ResQ emergency classifiers")
    parser.add_argument("--data", default="ml/data/text/emergency_train.csv",
                        help="Path to training CSV")
    parser.add_argument("--output", default="ml/models",
                        help="Output directory for trained models")
    args = parser.parse_args()

    # Generate synthetic data if no CSV exists
    if not os.path.exists(args.data):
        print("📝 No training data found. Generating synthetic dataset...")
        from generate_dataset import generate_dataset
        generate_dataset(n_per_class=300, output_path=args.data)

    df = load_data(args.data)

    # Train both models
    sev_model, sev_acc = train_model(df, "severity", "severity_classifier", args.output)
    resp_model, resp_acc = train_model(df, "response_type", "response_classifier", args.output)

    # Test predictions
    test_predictions(sev_model, resp_model)

    # Summary
    print(f"\n{'='*60}")
    print(f"✅ TRAINING COMPLETE")
    print(f"{'='*60}")
    print(f"   Severity model:  {sev_acc*100:.1f}% accuracy")
    print(f"   Response model:  {resp_acc*100:.1f}% accuracy")
    print(f"   Models saved to: {args.output}/")
    print(f"\n   To use in production:")
    print(f"   → python inference_server.py")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
