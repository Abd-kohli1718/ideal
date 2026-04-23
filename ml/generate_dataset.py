"""
ResQ ML — Synthetic emergency dataset generator.

Generates labeled emergency text data for training the severity + response_type classifiers.
This is a BOOTSTRAP dataset. For production accuracy, replace/augment with real datasets:

  ╔══════════════════════════════════════════════════════════════════════╗
  ║  RECOMMENDED DATASETS                                              ║
  ╠══════════════════════════════════════════════════════════════════════╣
  ║                                                                    ║
  ║  TEXT DATASETS (place CSVs in ml/data/text/)                       ║
  ║  ─────────────────────────────────────────────                     ║
  ║  1. CrisisNLP (crisisnlp.qcri.org)                                ║
  ║     - 50K+ crisis tweets labeled by informativeness & type         ║
  ║     - Download: crisisnlp.qcri.org/lrec2016/lrec2016.html         ║
  ║                                                                    ║
  ║  2. CrisisMMD — Text annotations                                  ║
  ║     - 18K tweets with humanitarian labels                          ║
  ║     - Download: crisisnlp.qcri.org/crisismmd                      ║
  ║                                                                    ║
  ║  3. CrisisLex T26 (crisislex.org)                                 ║
  ║     - 28K tweets from 26 crisis events                             ║
  ║     - Labels: on-topic, off-topic, related                         ║
  ║                                                                    ║
  ║  4. ASONAM'17 Crisis Benchmark                                     ║
  ║     - Multi-label crisis classification                            ║
  ║     - Paper: "Crisis Detection from Social Media"                  ║
  ║                                                                    ║
  ║  5. HumAID (humaid.qcri.org)                                      ║
  ║     - 77K tweets, 19 disaster events, 11 categories               ║
  ║     - Best for humanitarian response classification                ║
  ║                                                                    ║
  ║  IMAGE DATASETS (place in ml/data/images/<class>/)                 ║
  ║  ────────────────────────────────────────────────                   ║
  ║  1. CrisisMMD — Images (crisisnlp.qcri.org/crisismmd)             ║
  ║     - 18K images labeled: damage severity, humanitarian            ║
  ║     - Classes: severe, mild, none                                  ║
  ║                                                                    ║
  ║  2. ASONAM Disaster Image Dataset                                  ║
  ║     - Flood, fire, earthquake, hurricane images                    ║
  ║     - ~10K labeled images                                          ║
  ║                                                                    ║
  ║  3. AIDER (Aerial Image Dataset for Emergency Response)            ║
  ║     - Drone/aerial images of disasters                             ║
  ║     - Classes: fire, flood, collapse, traffic                      ║
  ║                                                                    ║
  ║  4. Kaggle: "Disaster Images from Social Media"                    ║
  ║     - kaggle.com/datasets/disasters-from-social-media              ║
  ║     - Pre-labeled for severity                                     ║
  ║                                                                    ║
  ║  5. xView2 Building Damage Assessment                              ║
  ║     - Pre/post disaster satellite imagery                          ║
  ║     - xview2.org — competition dataset                             ║
  ║                                                                    ║
  ╚══════════════════════════════════════════════════════════════════════╝

Usage:
    python generate_dataset.py
    → Outputs ml/data/text/emergency_train.csv
"""

import csv
import random
import os

# === Templates organized by (severity, response_type) ===
TEMPLATES = {
    # HIGH SEVERITY
    ("high", "ambulance"): [
        "Person collapsed on the road, not breathing, need ambulance immediately",
        "Major accident on highway, multiple casualties, blood everywhere",
        "Heart attack victim at {loc}, unconscious, not responding",
        "Child hit by car near {loc}, severe head injury, bleeding heavily",
        "Woman fell from building, multiple fractures, needs emergency medical help",
        "Man stabbed near {loc}, heavy bleeding, losing consciousness",
        "Elderly person having seizure at {loc}, please send ambulance fast",
        "Pregnant woman in labor with complications at {loc}",
        "Person electrocuted at construction site, not breathing",
        "Serious road accident near {loc}, victims trapped in vehicle",
        "Someone collapsed in metro station, appears to have had cardiac arrest",
        "Multiple people injured in bus crash on {loc}",
        "Person found unconscious on street, possible drug overdose",
        "Child drowning at {loc} swimming pool, pulled out but not breathing",
        "Factory worker crushed by machinery at {loc}, critical condition",
    ],
    ("high", "fire"): [
        "Building on fire at {loc}, people trapped on upper floors",
        "Massive fire in residential complex, smoke everywhere, can hear screaming",
        "Gas cylinder exploded at {loc}, fire spreading to nearby buildings",
        "Factory fire with chemicals, toxic smoke, workers trapped inside",
        "Forest fire approaching residential area at {loc}, evacuate immediately",
        "School building caught fire at {loc}, children may be inside",
        "Fuel tanker explosion on highway near {loc}, huge fire",
        "Electrical fire in apartment building, multiple floors burning",
        "Fire broke out in hospital ward at {loc}, patients need evacuation",
        "Shopping mall fire at {loc}, heavy smoke, people panicking",
    ],
    ("high", "police"): [
        "Armed robbery in progress at {loc}, shots fired",
        "Active shooter situation at {loc}, people running",
        "Kidnapping witnessed near {loc}, child taken into white van",
        "Violent mob attacking shops at {loc}, people in danger",
        "Domestic violence emergency, woman screaming for help at {loc}",
        "Terrorist threat reported at {loc}, suspicious package found",
        "Gang violence broke out at {loc}, multiple weapons visible",
        "Hit and run near {loc}, driver fled, victim on road",
        "Armed men threatening people at {loc}, hostage situation developing",
        "Murder scene discovered at {loc}, need police immediately",
    ],
    ("high", "rescue"): [
        "Building collapsed at {loc}, people trapped under debris",
        "Flash flood swept away car with family inside near {loc}",
        "Earthquake damage severe at {loc}, multiple buildings down, people trapped",
        "Landslide blocked road at {loc}, vehicles buried",
        "Bridge collapsed near {loc}, cars fell into river",
        "Person stuck in elevator during power failure at {loc}, panicking",
        "Child fell into open manhole at {loc}, need rescue team",
        "Workers trapped in collapsed mine shaft at {loc}",
        "Flood water rising rapidly at {loc}, families stranded on rooftops",
        "Tree fell on house during storm at {loc}, people trapped inside",
    ],

    # MEDIUM SEVERITY
    ("medium", "ambulance"): [
        "Minor road accident at {loc}, one person injured, conscious but in pain",
        "Elderly person fell down stairs at {loc}, possible broken arm",
        "Person having allergic reaction at {loc}, swelling but breathing",
        "Kid injured while playing at park near {loc}, possible fracture",
        "Food poisoning at restaurant in {loc}, several people sick",
        "Man cut his hand badly at workplace, heavy bleeding but stable",
        "Motorbike skid at {loc}, rider has road rash and bruising",
        "Person bitten by stray dog at {loc}, wound needs treatment",
        "Fainting episode at school near {loc}, student is now awake",
        "Diabetic emergency at {loc}, person disoriented but conscious",
    ],
    ("medium", "fire"): [
        "Small fire in kitchen at {loc}, spreading slowly, no one hurt yet",
        "Smoke coming from empty warehouse near {loc}",
        "Grass fire near residential area at {loc}, not yet threatening homes",
        "Car engine caught fire at {loc}, passengers evacuated safely",
        "Burning smell and sparks from electrical panel at {loc}",
        "Dumpster fire behind building at {loc}, could spread",
        "AC unit on fire in office building at {loc}, floor evacuated",
        "Small fire at construction site at {loc}, workers moving away",
    ],
    ("medium", "police"): [
        "Suspicious person loitering near school at {loc}",
        "Loud argument and sounds of fighting at {loc}",
        "Theft in progress at {loc}, shopkeeper calling for help",
        "Road rage incident at {loc}, two drivers fighting",
        "Drunk person causing disturbance at {loc}, threatening people",
        "Vandalism happening at {loc}, group breaking windows",
        "Chain snatching reported near {loc}, suspect fled on bike",
        "Eve teasing and harassment of woman at {loc}",
        "Noise complaint at {loc}, sounds like furniture being thrown",
        "Unauthorized protest blocking traffic at {loc}",
    ],
    ("medium", "rescue"): [
        "Car stuck in waterlogged road at {loc}, water rising slowly",
        "Person stuck on tree branch after flood at {loc}",
        "Minor structural damage to building at {loc}, cracks appearing",
        "Power lines down at {loc}, sparking, area not safe",
        "Animal stuck in drain at {loc}, blocking water flow",
        "Large tree fell across road at {loc}, blocking traffic",
        "Minor landslide at {loc}, road partially blocked",
        "Person trapped in bathroom, door jammed at {loc}",
    ],

    # LOW SEVERITY
    ("low", "ambulance"): [
        "Minor cut from broken glass at {loc}, needs first aid",
        "Person feeling dizzy at {loc}, sitting down, conscious",
        "Mild fever and vomiting, requesting ambulance for transport",
        "Sprained ankle at sports ground near {loc}",
        "Insect sting causing mild swelling at {loc}",
        "Nosebleed that won't stop at {loc}, person is stable",
    ],
    ("low", "fire"): [
        "Smoke detector went off at {loc}, no visible fire, might be false alarm",
        "Small campfire left unattended near {loc} park",
        "Burning leaves creating smoke nuisance at {loc}",
        "Overheated appliance at {loc}, unplugged, no flames",
    ],
    ("low", "police"): [
        "Noise complaint at {loc}, loud music late at night",
        "Parked car blocking driveway at {loc}",
        "Found suspicious unattended bag at {loc}",
        "Stray dogs being aggressive at {loc}",
        "Illegal parking blocking footpath at {loc}",
        "Lost wallet at {loc}, need to file report",
    ],
    ("low", "rescue"): [
        "Cat stuck on tree at {loc}, been there for hours",
        "Minor pothole causing traffic issues at {loc}",
        "Broken traffic signal at {loc} intersection",
        "Water pipe burst at {loc}, minor flooding on road",
        "Street light pole leaning dangerously at {loc}",
    ],
    ("low", "unknown"): [
        "Something happened near {loc}, not sure what",
        "Heard a loud noise at {loc}, might be nothing",
        "Unusual crowd gathering at {loc}",
        "Saw flashing lights near {loc}",
        "General concern about safety at {loc}",
        "Need help at {loc}",
        "Emergency at {loc}",
        "SOS Emergency — Immediate help needed",
        "Please send help to {loc} urgently",
    ],
}

LOCATIONS = [
    "MG Road", "Connaught Place", "Marine Drive", "Brigade Road",
    "Park Street", "Anna Nagar", "Banjara Hills", "Sector 17",
    "Koramangala", "Andheri West", "Jubilee Hills", "Salt Lake",
    "Indiranagar", "Powai", "Madhapur", "New Market",
    "Electronic City", "Dadar", "Gachibowli", "Alipore",
    "Whitefield", "Bandra", "Kukatpally", "Dum Dum",
    "HSR Layout", "Juhu", "Ameerpet", "Park Circus",
    "Jayanagar", "Versova", "Dilsukhnagar", "Gariahat",
    "Malleshwaram", "Colaba", "Secunderabad", "Behala",
]

def generate_dataset(n_per_class=200, output_path="ml/data/text/emergency_train.csv"):
    rows = []
    for (severity, response_type), templates in TEMPLATES.items():
        for i in range(n_per_class):
            template = random.choice(templates)
            loc = random.choice(LOCATIONS)
            message = template.format(loc=loc)

            # Add noise variations
            if random.random() < 0.2:
                message = message.upper()
            if random.random() < 0.15:
                message = message + "!!!"
            if random.random() < 0.1:
                message = "URGENT: " + message
            if random.random() < 0.1:
                message = "Help! " + message

            rows.append({
                "message": message,
                "severity": severity,
                "response_type": response_type,
                "alert_type": random.choice(["sos_button", "social_post", "manual_form"]),
            })

    random.shuffle(rows)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["message", "severity", "response_type", "alert_type"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} samples -> {output_path}")
    print(f"  Severity distribution:")
    from collections import Counter
    sev_counts = Counter(r["severity"] for r in rows)
    for k, v in sorted(sev_counts.items()):
        print(f"    {k}: {v}")
    resp_counts = Counter(r["response_type"] for r in rows)
    print(f"  Response type distribution:")
    for k, v in sorted(resp_counts.items()):
        print(f"    {k}: {v}")

if __name__ == "__main__":
    generate_dataset()
