# ResQ — AI-Powered Emergency Response Platform

> **A smart, real-time emergency distress detection and response system that uses Machine Learning and Deep Learning to automatically triage emergency alerts by severity and response type.**

[![Deploy Status](https://img.shields.io/badge/Backend-Render-blue)](https://render.com)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black)](https://vercel.com)
[![ML](https://img.shields.io/badge/ML-PyTorch%20%2B%20scikit--learn-orange)](https://pytorch.org)

---

## 🚀 What is ResQ?

ResQ is a **Centralized Citizen Distress System (UCDS)** — a platform where citizens can report emergencies (fires, floods, accidents, medical crises) and the system **automatically classifies** them using trained ML models. Emergency responders and administrators see a real-time command center with prioritized, triaged alerts.

### The Core Problem We Solve
> *In urban emergencies, distress signals from citizens often go unnoticed or are misclassified, leading to delayed responses and loss of life. ResQ uses AI to ensure every alert is instantly triaged and routed to the right response team.*

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CITIZEN APP                        │
│  (Next.js on Vercel)                                 │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐ │
│  │   SOS   │  │  Centre  │  │ History │  │Profile │ │
│  │ Button  │  │  (Feed)  │  │  Page   │  │  Page  │ │
│  └────┬────┘  └────┬─────┘  └─────────┘  └────────┘ │
└───────┼────────────┼─────────────────────────────────┘
        │            │
        ▼            ▼
┌──────────────────────────────────────────────────────┐
│              NODE.JS BACKEND (Render)                 │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  Auth    │  │  Alerts  │  │  Triage Service    │  │
│  │  Routes  │  │  Routes  │  │  (ML Integration)  │  │
│  └──────────┘  └──────────┘  └────────┬───────────┘  │
│                                       │              │
│                              ┌────────▼───────────┐  │
│                              │  ML Inference      │  │
│                              │  Server (Python)   │  │
│                              │  - Text Classifier │  │
│                              │  - Image Classifier│  │
│                              │    (ResNet18/GPU)   │  │
│                              └────────────────────┘  │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│              SUPABASE (Database + Auth)               │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  users   │  │  alerts  │  │  triage_results    │  │
│  │  table   │  │  table   │  │  table             │  │
│  └──────────┘  └──────────┘  └────────────────────┘  │
│                                                      │
│  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │  Auth    │  │  Storage (disaster images)       │  │
│  │  (OAuth) │  │                                  │  │
│  └──────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🆘 Citizen Features
| Feature | Description |
|---------|-------------|
| **SOS Button** | Hold-to-activate emergency button with GPS auto-detection. 2-second hold prevents accidental triggers. Sends location + alert instantly. |
| **Community Feed (ResQ Centre)** | Real-time feed of all emergency reports in the area. Filter by severity (Critical/Medium/Low). |
| **Post Emergency Report** | Submit text, photo, or voice-note based emergency reports. Media uploaded to Supabase Storage. |
| **History Tracking** | View your personal SOS and report history with status timeline (Active → Accepted → Resolved). |
| **Simulate** | Generate realistic demo emergency alerts using real disaster data from CrisisMMD dataset. |

### 🛡️ Admin / Responder Features
| Feature | Description |
|---------|-------------|
| **Command Center** | Real-time dashboard with all incidents sorted by severity. Live stat cards for total/active/critical/resolved. |
| **Resource Dispatch** | Assign ambulances, fire trucks, and police units to incidents. One-click deploy to responders. |
| **Community Moderation** | Review and verify community-submitted posts. Escalate or dismiss. |
| **Analytics** | Severity breakdown, response type distribution, and operations status charts. |
| **Simulate Alerts** | Generate test alerts with real CrisisMMD disaster images for demo/training purposes. |

### 🤖 ML/AI Triage Pipeline
| Component | Description |
|-----------|-------------|
| **Text Classification** | scikit-learn TF-IDF + Logistic Regression trained on 3,000+ emergency text samples. Classifies severity (low/medium/high) and response type (fire/ambulance/police/rescue). |
| **Image Classification** | PyTorch ResNet18 transfer learning trained on 33,000+ CrisisMMD disaster images using NVIDIA RTX 3050 GPU. Classifies image severity. |
| **Multimodal Fusion** | When a post contains both text and image, the system fuses predictions — if the image shows higher severity than the text, it escalates automatically. |
| **Gemini AI Fallback** | Optional Google Gemini integration for advanced natural language triage when available. |
| **Keyword Rules** | Deterministic fallback when ML models are unavailable. Pattern-matches emergency keywords. |

**Triage Priority Order:** `ML Inference Server → Gemini AI → Keyword Rules`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React, Framer Motion, react-hot-toast |
| **Backend** | Node.js, Express.js, REST API |
| **Database** | Supabase (PostgreSQL) + Row Level Security |
| **Auth** | Supabase Auth (Email/Password + Google OAuth) |
| **Storage** | Supabase Storage (media uploads, disaster images) |
| **ML - Text** | Python, scikit-learn, TF-IDF Vectorizer |
| **ML - Image** | PyTorch, torchvision, ResNet18 (Transfer Learning) |
| **GPU** | NVIDIA RTX 3050 (CUDA 12.4) for model training |
| **Deployment** | Vercel (frontend), Render (backend) |
| **Dataset** | CrisisMMD v2.0 (33,072 disaster images from 7 real events) |

---

## 📁 Project Structure

```
resq/
├── server.js                    # Express API entry point
├── package.json                 # Node.js dependencies
├── .env                         # Environment variables (not in git)
├── .env.example                 # Template for env vars
│
├── src/                         # Backend source code
│   ├── controllers/
│   │   ├── alertController.js   # CRUD for alerts (create, list, accept, resolve)
│   │   ├── authController.js    # Signup, login, logout, OAuth sync
│   │   └── simulateController.js # Demo alert generation with real disaster images
│   ├── middleware/
│   │   └── auth.js              # JWT verification, role-based access
│   ├── routes/
│   │   ├── alerts.js            # /api/alerts endpoints
│   │   ├── auth.js              # /api/auth endpoints
│   │   ├── simulate.js          # /api/simulate endpoints
│   │   └── responder.js         # /api/responder location tracking
│   └── services/
│       ├── supabase.js          # Supabase client initialization
│       ├── triageService.js     # ML + AI + keyword triage pipeline
│       └── triagePrompt.js      # Gemini system prompt for triage
│
├── frontend/                    # Next.js frontend application
│   ├── src/app/
│   │   ├── login/page.js        # Auth page (email + Google OAuth)
│   │   ├── auth/callback/       # OAuth callback handler
│   │   ├── (citizen)/           # Citizen route group
│   │   │   ├── page.js          # SOS Home (hold-to-activate button)
│   │   │   ├── centre/page.js   # Community emergency feed
│   │   │   ├── history/page.js  # Personal alert history
│   │   │   └── profile/page.js  # User profile
│   │   ├── admin/page.js        # Admin command center dashboard
│   │   ├── responder/page.js    # Responder incident view
│   │   └── portal/page.js       # Admin/Responder login portal
│   ├── src/components/          # Reusable UI components
│   │   ├── PostCard.js          # Emergency post card with media
│   │   ├── CreatePost.js        # Post creation modal
│   │   ├── FilterPills.js       # Severity filter pills
│   │   ├── VoteButton.js        # Upvote mechanism
│   │   └── StatusTimeline.js    # Alert status progress
│   └── src/lib/
│       ├── api.js               # API fetch wrapper with auth
│       ├── auth.js              # Auth context provider
│       └── supabase.js          # Supabase browser client
│
├── ml/                          # Machine Learning pipeline
│   ├── inference_server.py      # Flask inference server (loads all models)
│   ├── train_text_model.py      # Text severity + response classifier
│   ├── train_image_dl.py        # ResNet18 deep learning image classifier
│   ├── train_image_model.py     # Legacy feature-extraction image classifier
│   ├── prepare_crisismmd.py     # CrisisMMD dataset preparation
│   ├── generate_dataset.py      # Synthetic training data generator
│   ├── models/                  # Trained model weights (gitignored)
│   │   ├── severity_model.pkl   # Text severity classifier
│   │   ├── response_model.pkl   # Text response type classifier
│   │   ├── image_dl_model.pth   # PyTorch ResNet18 weights
│   │   └── image_dl_model.pt    # TorchScript model for inference
│   └── data/                    # Training datasets (gitignored)
│       ├── CrisisMMD_v2.0/      # 33K+ real disaster images
│       └── text/                # Emergency text training data
│
└── supabase/                    # Database schema & migrations
```

---

## 🗄️ Database Schema

```sql
-- Users table (synced with Supabase Auth)
CREATE TABLE users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id),
    email       TEXT UNIQUE NOT NULL,
    full_name   TEXT,
    role        TEXT DEFAULT 'citizen',  -- citizen | responder | admin
    latitude    DOUBLE PRECISION,
    longitude   DOUBLE PRECISION,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Emergency alerts
CREATE TABLE alerts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id),
    type           TEXT NOT NULL,  -- sos_button | social_post | manual_form | media_post
    message        TEXT NOT NULL,
    latitude       DOUBLE PRECISION NOT NULL,
    longitude      DOUBLE PRECISION NOT NULL,
    severity       TEXT DEFAULT 'low',      -- low | medium | high
    response_type  TEXT DEFAULT 'unknown',  -- fire | ambulance | police | rescue | unknown
    status         TEXT DEFAULT 'active',   -- active | accepted | resolved
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- ML triage results (one per alert)
CREATE TABLE triage_results (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id           UUID REFERENCES alerts(id),
    severity           TEXT,
    response_type      TEXT,
    extracted_location TEXT,
    is_duplicate       BOOLEAN DEFAULT false,
    raw_ai_output      TEXT,
    created_at         TIMESTAMPTZ DEFAULT now()
);
```

---

## 🤖 ML Model Details

### Text Classifier
- **Algorithm:** TF-IDF (max 5000 features, 1-2 ngrams) + Logistic Regression
- **Training Data:** 3,000+ emergency text samples across 3 severity levels and 5 response types
- **Accuracy:** ~72% on severity classification

### Image Classifier (Deep Learning)
- **Architecture:** ResNet18 (pretrained on ImageNet, fine-tuned)
- **Training Data:** 33,072 images from CrisisMMD v2.0 dataset
  - California Wildfires (2017)
  - Hurricane Harvey, Irma, Maria
  - Iraq-Iran Earthquake
  - Mexico Earthquake
  - Sri Lanka Floods
- **Training Setup:** NVIDIA RTX 3050 GPU, CUDA 12.4, 5 epochs, batch size 64
- **Class Distribution:** Low: 15,701 | Medium: 5,863 | High: 11,508
- **Weighted Loss:** Applied to handle class imbalance
- **Results:**

| Class | Precision | Recall | F1-Score |
|-------|-----------|--------|----------|
| Low | 0.70 | 0.71 | 0.71 |
| Medium | 0.38 | 0.53 | 0.44 |
| High | 0.67 | 0.53 | 0.60 |
| **Overall Accuracy** | | | **61.5%** |

### Inference Pipeline
```
User submits alert (text + optional image)
        │
        ▼
┌─── ML Inference Server (Python) ───┐
│  1. Text → TF-IDF → severity       │
│  2. Text → TF-IDF → response_type  │
│  3. Image URL → download → ResNet  │
│  4. Fuse: max(text_sev, img_sev)   │
│  5. Rules: SOS → force high        │
└─────────────┬───────────────────────┘
              │
              ▼
     Return: { severity, response_type,
               confidence scores }
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Python 3.10+ (for ML inference)
- Supabase project (free tier works)
- (Optional) NVIDIA GPU + CUDA for model training

### 1. Clone & Install
```bash
git clone https://github.com/Abd-kohli1718/ideal.git
cd ideal

# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 2. Environment Variables

Create `.env` in root:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
FRONTEND_URL=http://localhost:3000
PORT=3001
GEMINI_API_KEY=your-gemini-key  # optional
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: ML Inference (optional)
cd ml && python inference_server.py
```

### 4. Train ML Models (Optional)
```bash
cd ml

# Generate text training data
python generate_dataset.py

# Train text classifiers
python train_text_model.py

# Train image classifier (requires GPU + CrisisMMD dataset)
python train_image_dl.py
```

---

## 🌐 Deployment

| Service | URL |
|---------|-----|
| **Frontend** | Deployed on Vercel |
| **Backend** | Deployed on Render |
| **Database** | Supabase Cloud |

The backend auto-deploys on every `git push` to `main`.

---

## 📊 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/signup` | ❌ | Create account |
| `POST` | `/api/auth/login` | ❌ | Email/password login |
| `POST` | `/api/auth/oauth-sync` | ✅ | Sync OAuth user to DB |
| `POST` | `/api/auth/logout` | ✅ | Logout |
| `GET` | `/api/alerts` | ✅ | List all alerts |
| `POST` | `/api/alerts` | ✅ | Create new alert |
| `GET` | `/api/alerts/:id` | ✅ | Get single alert |
| `PATCH` | `/api/alerts/:id/accept` | ✅ 🔒 | Accept alert (responder) |
| `PATCH` | `/api/alerts/:id/resolve` | ✅ 🔒 | Resolve alert (responder) |
| `POST` | `/api/simulate/social` | ✅ | Generate demo alert |
| `POST` | `/api/simulate/sos` | ✅ | Generate demo SOS |
| `GET` | `/health` | ❌ | Health check |

---

## 👥 Team

Built as a college project for **emergency response and disaster management**.

---

## 📜 License

This project is for educational purposes. CrisisMMD dataset is used under academic license from [CrisisNLP](https://crisisnlp.qcri.org/).
