# ResQ ML — Emergency Classification Models

## Quick Start
```bash
# 1. Drop your data (see below)
# 2. Train everything:
python ml/train_all.py

# 3. Start inference server:
python ml/inference_server.py
```

---

## Folder Structure
```
ml/
├── data/
│   ├── text/
│   │   └── emergency_train.csv      ← text training data (auto-generated if missing)
│   └── images/
│       ├── fire/                     ← fire/explosion images
│       ├── flood/                    ← flood/water images
│       ├── collapse/                 ← building collapse images
│       ├── accident/                 ← vehicle/road accidents
│       ├── violence/                 ← crime/violence scenes
│       └── safe/                     ← normal non-emergency images
├── models/                           ← trained models saved here
├── generate_dataset.py               ← synthetic text data generator
├── train_text_model.py               ← text classifier training
├── train_image_model.py              ← image classifier training
├── train_all.py                      ← train everything at once
└── inference_server.py               ← HTTP server for predictions
```

---

## Where to Get Datasets

### Text Datasets
Download any of these and convert to CSV with columns: `message,severity,response_type`

| Dataset | Size | Download |
|---------|------|----------|
| **HumAID** | 77K tweets, 19 disasters | [humaid.qcri.org](https://crisisnlp.qcri.org/humaid_dataset) |
| **CrisisNLP** | 50K+ crisis tweets | [crisisnlp.qcri.org](https://crisisnlp.qcri.org/lrec2016/lrec2016.html) |
| **CrisisMMD Text** | 18K tweets | [crisisnlp.qcri.org/crisismmd](https://crisisnlp.qcri.org/crisismmd) |
| **CrisisLex T26** | 28K tweets | [crisislex.org](http://crisislex.org/data-collections.html) |
| **Kaggle NLP Disasters** | 10K tweets | [kaggle.com](https://www.kaggle.com/c/nlp-getting-started) |

### Image Datasets
Download and drop images into the matching `ml/data/images/<class>/` folder.

| Dataset | Size | Download |
|---------|------|----------|
| **CrisisMMD Images** | 18K images, severity labels | [crisisnlp.qcri.org/crisismmd](https://crisisnlp.qcri.org/crisismmd) |
| **AIDER** | Drone disaster images | [github.com/ckyrkou/AIDER](https://github.com/ckyrkou/AIDER) |
| **Kaggle Disaster Images** | Fire, flood, earthquake | [kaggle.com/datasets](https://www.kaggle.com/datasets/mikolajbabula/disaster-images-dataset-cnn-model) |
| **xView2** | Satellite damage assessment | [xview2.org](https://xview2.org/) |
| **ASONAM** | Social media disaster images | Search: "ASONAM disaster image dataset" |

### Minimum Requirements
- **Text**: 500+ messages (auto-generates 2600 synthetic if none provided)
- **Images**: 10+ images per class (50+ per class recommended)
- **Formats**: .jpg, .jpeg, .png, .webp, .bmp

---

## How to Add Your Own Data

### Adding Text Data
Place a CSV file at `ml/data/text/emergency_train.csv`:
```csv
message,severity,response_type,alert_type
"Building on fire, people trapped",high,fire,sos_button
"Minor accident, small bruise",low,ambulance,social_post
```

### Adding Image Data
Just drop images into the correct class folder:
```
ml/data/images/fire/image001.jpg
ml/data/images/fire/image002.png
ml/data/images/flood/photo1.jpg
...
```

Then run:
```bash
python ml/train_all.py
```
