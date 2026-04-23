"""
Prepare CrisisMMD v2.0 dataset for ResQ training.

Reads the TSV annotations, maps image_human labels to our categories,
copies images into ml/data/images/<class>/, and also builds a text CSV
from the tweet_text column.
"""

import os
import csv
import shutil
import glob
import random

# Paths
BASE = os.path.dirname(os.path.abspath(__file__))
CRISIS_DIR = os.path.join(BASE, "data", "CrisisMMD_v2.0")
ANNOTATIONS_DIR = os.path.join(CRISIS_DIR, "annotations")
IMG_OUT = os.path.join(BASE, "data", "images")
TEXT_OUT = os.path.join(BASE, "data", "text", "emergency_train.csv")

# Mapping CrisisMMD image_human labels -> our classes
LABEL_MAP = {
    # Fire
    "affected_individuals": "fire",
    "infrastructure_and_utility_damage": "collapse",
    "vehicle_damage": "accident",
    "injured_or_dead_people": "violence",
    "missing_or_found_people": "safe",
    "rescue_volunteering_or_donation_effort": "safe",
    "other_relevant_information": None,  # skip
    "not_humanitarian": "safe",
}

# Mapping disaster event names -> our primary class
EVENT_MAP = {
    "california_wildfires": "fire",
    "hurricane_harvey": "flood",
    "hurricane_irma": "flood",
    "hurricane_maria": "flood",
    "iraq_iran_earthquake": "collapse",
    "mexico_earthquake": "collapse",
    "srilanka_floods": "flood",
}

# Mapping CrisisMMD image_damage labels -> severity
DAMAGE_MAP = {
    "severe_damage": "high",
    "mild_damage": "medium",
    "little_or_no_damage": "low",
}

# Mapping our class -> response_type
RESPONSE_MAP = {
    "fire": "fire",
    "flood": "fire",
    "collapse": "fire",
    "accident": "ambulance",
    "violence": "police",
    "safe": "none",
}


def main():
    print("=" * 60)
    print("  CrisisMMD v2.0 -> ResQ Dataset Preparation")
    print("=" * 60)

    # Ensure output dirs
    for cls in ["fire", "flood", "collapse", "accident", "violence", "safe"]:
        os.makedirs(os.path.join(IMG_OUT, cls), exist_ok=True)

    # Read all annotation TSVs
    tsv_files = glob.glob(os.path.join(ANNOTATIONS_DIR, "*_final_data.tsv"))
    tsv_files = [f for f in tsv_files if not os.path.basename(f).startswith("._")]

    all_rows = []
    text_rows = []
    img_count = {c: 0 for c in ["fire", "flood", "collapse", "accident", "violence", "safe"]}
    skipped = 0

    for tsv_file in sorted(tsv_files):
        event_name = os.path.basename(tsv_file).replace("_final_data.tsv", "")
        event_class = EVENT_MAP.get(event_name, None)
        print(f"\n  Processing: {event_name} (default class: {event_class})")

        with open(tsv_file, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for row in reader:
                image_path_rel = row.get("image_path", "").strip()
                image_human = row.get("image_human", "").strip().lower()
                image_damage = row.get("image_damage", "").strip().lower()
                tweet_text = row.get("tweet_text", "").strip()

                # Determine class from label, fall back to event
                our_class = LABEL_MAP.get(image_human, event_class)
                if our_class is None:
                    our_class = event_class
                if our_class is None:
                    skipped += 1
                    continue

                # Build source image path
                src = os.path.join(CRISIS_DIR, image_path_rel)
                if not os.path.isfile(src):
                    skipped += 1
                    continue

                # Copy image
                fname = os.path.basename(src)
                # Prefix with event to avoid name collisions
                dest_name = f"{event_name}_{fname}"
                dest = os.path.join(IMG_OUT, our_class, dest_name)
                if not os.path.exists(dest):
                    shutil.copy2(src, dest)

                img_count[our_class] += 1

                # Build text row
                if tweet_text and len(tweet_text) > 10:
                    severity = DAMAGE_MAP.get(image_damage, "medium")
                    response = RESPONSE_MAP.get(our_class, "fire")
                    text_rows.append({
                        "message": tweet_text,
                        "severity": severity,
                        "response_type": response,
                        "alert_type": "social_post",
                    })

    # Write text CSV (merge with existing synthetic if present)
    existing_rows = []
    if os.path.exists(TEXT_OUT):
        with open(TEXT_OUT, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing_rows.append(row)

    combined = existing_rows + text_rows
    random.shuffle(combined)

    with open(TEXT_OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["message", "severity", "response_type", "alert_type"])
        writer.writeheader()
        writer.writerows(combined)

    print("\n" + "=" * 60)
    print("  PREPARATION COMPLETE")
    print("=" * 60)
    print(f"\n  Images sorted into ml/data/images/:")
    for cls, count in sorted(img_count.items(), key=lambda x: -x[1]):
        print(f"    {cls:12s}: {count:5d} images")
    print(f"    {'TOTAL':12s}: {sum(img_count.values()):5d} images")
    print(f"    {'skipped':12s}: {skipped:5d}")
    print(f"\n  Text dataset: {len(combined)} rows -> {TEXT_OUT}")
    print(f"    (synthetic: {len(existing_rows)}, CrisisMMD: {len(text_rows)})")
    print(f"\n  Next: python ml/train_all.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
