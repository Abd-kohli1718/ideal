"""
ResQ ML -- Enhanced Text Classifier Training
Combines original synthetic data + Kaggle CrisisMMD balanced dataset.
Maps Kaggle severity labels to ResQ severity levels.

Usage:
    python train_text_enhanced.py
"""

import os
import sys
import time
import pickle
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import (
    RandomForestClassifier,
    GradientBoostingClassifier,
    VotingClassifier,
    ExtraTreesClassifier,
)
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.calibration import CalibratedClassifierCV

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
KAGGLE_CSV = os.path.join(os.path.dirname(__file__), "data", "kaggle", "working", "balanced_crisismmd_dataset.csv")
SYNTH_CSV = os.path.join(os.path.dirname(__file__), "data", "text", "training_data.csv")

# Map Kaggle labels to ResQ severity
KAGGLE_SEVERITY_MAP = {
    "severe_damage": "high",
    "mild_damage": "medium",
    "little_or_no_damage": "low",
}

# Response type keywords for auto-labeling Kaggle tweets
RESPONSE_KEYWORDS = {
    "fire": ["fire", "burn", "blaze", "flame", "smoke", "wildfire", "arson"],
    "ambulance": ["injur", "hurt", "hospital", "ambulance", "bleed", "casualt", "dead", "death", "victim", "wound"],
    "rescue": ["flood", "water", "drown", "trap", "collaps", "earthquake", "tsunami", "hurrican", "storm", "landslide", "rescue"],
    "police": ["shoot", "attack", "violen", "crime", "rob", "assault", "gun", "weapon", "bomb", "terror"],
}


def classify_response_type(text):
    """Heuristic response type classification based on keywords."""
    text_lower = str(text).lower()
    scores = {}
    for rtype, keywords in RESPONSE_KEYWORDS.items():
        scores[rtype] = sum(1 for kw in keywords if kw in text_lower)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "unknown"


def load_kaggle_data():
    """Load Kaggle CrisisMMD balanced dataset."""
    if not os.path.exists(KAGGLE_CSV):
        print(f"  [!] Kaggle CSV not found at {KAGGLE_CSV}")
        return pd.DataFrame()

    print(f"  Loading Kaggle data: {KAGGLE_CSV}")
    df = pd.read_csv(KAGGLE_CSV)

    # Map columns
    df = df.rename(columns={"tweet_text": "message", "label": "severity_raw"})
    df["message"] = df["message"].astype(str).str.strip()
    df = df[df["message"].str.len() > 10]

    # Clean tweets: remove RT prefix, URLs, @mentions
    df["message"] = df["message"].str.replace(r"^RT @\w+:\s*", "", regex=True)
    df["message"] = df["message"].str.replace(r"https?://\S+", "", regex=True)
    df["message"] = df["message"].str.replace(r"@\w+", "", regex=True)
    df["message"] = df["message"].str.strip()
    df = df[df["message"].str.len() > 10]

    # Map severity
    df["severity"] = df["severity_raw"].map(KAGGLE_SEVERITY_MAP)
    df = df.dropna(subset=["severity"])

    # Auto-classify response type
    df["response_type"] = df["message"].apply(classify_response_type)

    print(f"  Loaded {len(df)} Kaggle samples")
    print(f"    Severity: {dict(df['severity'].value_counts())}")
    print(f"    Response: {dict(df['response_type'].value_counts())}")
    return df[["message", "severity", "response_type"]]


def load_synthetic_data():
    """Load original synthetic training data if it exists."""
    if not os.path.exists(SYNTH_CSV):
        print(f"  [!] Synthetic CSV not found at {SYNTH_CSV}, skipping")
        return pd.DataFrame()

    print(f"  Loading synthetic data: {SYNTH_CSV}")
    df = pd.read_csv(SYNTH_CSV)
    df = df.dropna(subset=["message", "severity", "response_type"])
    df["message"] = df["message"].astype(str).str.strip()
    df = df[df["message"].str.len() > 5]
    print(f"  Loaded {len(df)} synthetic samples")
    return df[["message", "severity", "response_type"]]


def build_severity_pipeline():
    """Build enhanced severity classifier with stronger ensemble."""
    svc = CalibratedClassifierCV(LinearSVC(max_iter=8000, class_weight="balanced"))
    lr = LogisticRegression(max_iter=3000, C=5.0, class_weight="balanced", solver="saga")
    gb = GradientBoostingClassifier(n_estimators=300, max_depth=5, learning_rate=0.08, subsample=0.85)
    rf = RandomForestClassifier(n_estimators=400, max_depth=None, class_weight="balanced", n_jobs=-1)
    et = ExtraTreesClassifier(n_estimators=300, class_weight="balanced", n_jobs=-1)
    sgd = CalibratedClassifierCV(SGDClassifier(loss="modified_huber", max_iter=3000, class_weight="balanced"))

    ensemble = VotingClassifier(
        estimators=[
            ("svc", svc), ("lr", lr), ("gb", gb), ("rf", rf), ("et", et), ("sgd", sgd),
        ],
        voting="soft",
        weights=[2, 2, 3, 2, 2, 1],  # Give GB higher weight
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=20000, ngram_range=(1, 3),
            min_df=2, max_df=0.95,
            sublinear_tf=True, strip_accents="unicode",
        )),
        ("clf", ensemble),
    ])
    return pipeline


def build_response_pipeline():
    """Build response type classifier."""
    svc = CalibratedClassifierCV(LinearSVC(max_iter=8000, class_weight="balanced"))
    lr = LogisticRegression(max_iter=3000, C=5.0, class_weight="balanced", solver="saga")
    gb = GradientBoostingClassifier(n_estimators=300, max_depth=5, learning_rate=0.08, subsample=0.85)
    rf = RandomForestClassifier(n_estimators=400, class_weight="balanced", n_jobs=-1)

    ensemble = VotingClassifier(
        estimators=[("svc", svc), ("lr", lr), ("gb", gb), ("rf", rf)],
        voting="soft",
        weights=[2, 2, 3, 2],
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=15000, ngram_range=(1, 3),
            min_df=2, max_df=0.95,
            sublinear_tf=True, strip_accents="unicode",
        )),
        ("clf", ensemble),
    ])
    return pipeline


def main():
    print("\n" + "=" * 60)
    print("  ResQ Enhanced Text Model Training")
    print("  Combining Kaggle + Synthetic Data")
    print("=" * 60)

    # Load data from both sources
    kaggle_df = load_kaggle_data()
    synth_df = load_synthetic_data()

    # Combine
    dfs = [d for d in [kaggle_df, synth_df] if len(d) > 0]
    if not dfs:
        print("\n[ERROR] No training data found!")
        sys.exit(1)

    df = pd.concat(dfs, ignore_index=True)
    df = df.drop_duplicates(subset=["message"])
    print(f"\n  Combined dataset: {len(df)} samples")
    print(f"  Severity distribution: {dict(df['severity'].value_counts())}")
    print(f"  Response distribution: {dict(df['response_type'].value_counts())}")

    os.makedirs(MODEL_DIR, exist_ok=True)

    # --- Train severity model ---
    print("\n" + "-" * 50)
    print("  Training SEVERITY classifier...")
    print("-" * 50)

    X_sev = df["message"].values
    y_sev = df["severity"].values

    X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
        X_sev, y_sev, test_size=0.2, random_state=42, stratify=y_sev
    )

    sev_pipeline = build_severity_pipeline()

    # Cross-validation
    print("  Running 5-fold cross-validation...")
    t0 = time.time()
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(sev_pipeline, X_train_s, y_train_s, cv=cv, scoring="accuracy", n_jobs=-1)
    print(f"  CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    # Full train
    print("  Training on full training set...")
    sev_pipeline.fit(X_train_s, y_train_s)
    t1 = time.time()

    # Evaluate
    y_pred_s = sev_pipeline.predict(X_test_s)
    sev_acc = np.mean(y_pred_s == y_test_s)
    print(f"\n  Test Accuracy: {sev_acc:.4f}")
    print(f"  Training time: {t1 - t0:.1f}s")
    print("\n" + classification_report(y_test_s, y_pred_s))

    # Save
    sev_path = os.path.join(MODEL_DIR, "severity_model.pkl")
    with open(sev_path, "wb") as f:
        pickle.dump(sev_pipeline, f)
    print(f"  Saved: {sev_path}")

    # --- Train response type model ---
    print("\n" + "-" * 50)
    print("  Training RESPONSE TYPE classifier...")
    print("-" * 50)

    X_resp = df["message"].values
    y_resp = df["response_type"].values

    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
        X_resp, y_resp, test_size=0.2, random_state=42, stratify=y_resp
    )

    resp_pipeline = build_response_pipeline()

    print("  Running 5-fold cross-validation...")
    t0 = time.time()
    cv_scores_r = cross_val_score(resp_pipeline, X_train_r, y_train_r, cv=cv, scoring="accuracy", n_jobs=-1)
    print(f"  CV Accuracy: {cv_scores_r.mean():.4f} (+/- {cv_scores_r.std():.4f})")

    print("  Training on full training set...")
    resp_pipeline.fit(X_train_r, y_train_r)
    t1 = time.time()

    y_pred_r = resp_pipeline.predict(X_test_r)
    resp_acc = np.mean(y_pred_r == y_test_r)
    print(f"\n  Test Accuracy: {resp_acc:.4f}")
    print(f"  Training time: {t1 - t0:.1f}s")
    print("\n" + classification_report(y_test_r, y_pred_r))

    resp_path = os.path.join(MODEL_DIR, "response_model.pkl")
    with open(resp_path, "wb") as f:
        pickle.dump(resp_pipeline, f)
    print(f"  Saved: {resp_path}")

    # --- Save metadata ---
    meta = {
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_samples": len(df),
        "kaggle_samples": len(kaggle_df),
        "synthetic_samples": len(synth_df),
        "severity_accuracy": round(float(sev_acc), 4),
        "severity_cv_mean": round(float(cv_scores.mean()), 4),
        "response_accuracy": round(float(resp_acc), 4),
        "response_cv_mean": round(float(cv_scores_r.mean()), 4),
        "severity_classes": sorted(df["severity"].unique().tolist()),
        "response_classes": sorted(df["response_type"].unique().tolist()),
    }
    meta_path = os.path.join(MODEL_DIR, "training_meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\n  Metadata saved: {meta_path}")

    print("\n" + "=" * 60)
    print(f"  DONE - Severity: {sev_acc:.1%} | Response: {resp_acc:.1%}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
