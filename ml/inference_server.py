"""
ResQ ML — Inference Server
Lightweight Flask/HTTP server that loads trained models and serves predictions.
The Node.js backend calls this instead of keyword matching.

Usage:
    python inference_server.py              # Start on port 5000
    python inference_server.py --port 5001  # Custom port
"""

import os
import sys
import json
import pickle
import argparse
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
from io import BytesIO

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Load models at startup
sev_model = None
resp_model = None
image_model = None
device = None

def load_models():
    global sev_model, resp_model, image_model, device

    # 1. Load Text Models
    sev_path = os.path.join(MODEL_DIR, "severity_model.pkl")
    resp_path = os.path.join(MODEL_DIR, "response_model.pkl")

    if not os.path.exists(sev_path):
        sev_path = os.path.join(MODEL_DIR, "severity_classifier.pkl")
    if not os.path.exists(resp_path):
        resp_path = os.path.join(MODEL_DIR, "response_classifier.pkl")

    if os.path.exists(sev_path) and os.path.exists(resp_path):
        print("  Loading text severity model...")
        with open(sev_path, "rb") as f:
            sev_model = pickle.load(f)
        print("  Loading text response type model...")
        with open(resp_path, "rb") as f:
            resp_model = pickle.load(f)
        print("  [OK] Text Models loaded successfully")
    else:
        print("  [WARNING] Text Models not found. Text inference will fail.")

    # 2. Load PyTorch Image Model
    dl_path = os.path.join(MODEL_DIR, "image_dl_model.pth")
    if os.path.exists(dl_path):
        try:
            import torch
            import torch.nn as nn
            from torchvision import models, transforms
            from PIL import Image

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            print(f"  Loading PyTorch Deep Learning Image Model on {device}...")
            
            image_model = models.resnet18(weights=None)
            num_ftrs = image_model.fc.in_features
            image_model.fc = nn.Linear(num_ftrs, 3)
            image_model.load_state_dict(torch.load(dl_path, map_location=device, weights_only=True))
            image_model = image_model.to(device)
            image_model.eval()
            print("  [OK] PyTorch Image Model loaded successfully")
        except Exception as e:
            print(f"  [ERROR] Failed to load PyTorch Image Model: {e}")
    else:
        print("  [WARNING] PyTorch Image Model not found. Image inference will fail.")


def extract_media_urls(message):
    media_regex = r"\[MEDIA:(https?://[^\]]+)\]"
    urls = re.findall(media_regex, message)
    clean_msg = re.sub(media_regex, "", message).strip()
    return clean_msg, urls

def infer_image(url):
    import torch
    from torchvision import transforms
    from PIL import Image
    
    val_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        img_data = response.read()
    img = Image.open(BytesIO(img_data)).convert('RGB')
    
    input_tensor = val_transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = image_model(input_tensor)
        probs = torch.nn.functional.softmax(outputs, dim=1)[0]
        conf, pred_idx = torch.max(probs, 0)
        
    idx_to_class = {0: "low", 1: "medium", 2: "high"}
    return idx_to_class[pred_idx.item()], conf.item()

class PredictHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/predict":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                raw_message = data.get("message", "")
                alert_type = data.get("type", "manual_form")

                if not raw_message:
                    self._respond(400, {"error": "message is required"})
                    return

                message, media_urls = extract_media_urls(raw_message)

                # 1. Text Inference
                severity = "low"
                response_type = "unknown"
                sev_conf = 0.0
                resp_conf = 0.0
                
                if sev_model and resp_model and message:
                    severity = sev_model.predict([message])[0]
                    sev_proba = sev_model.predict_proba([message])[0]
                    sev_conf = float(max(sev_proba))

                    response_type = resp_model.predict([message])[0]
                    resp_proba = resp_model.predict_proba([message])[0]
                    resp_conf = float(max(resp_proba))

                # 2. Image Inference
                img_severity = None
                img_conf = 0.0
                if image_model and media_urls:
                    try:
                        img_severity, img_conf = infer_image(media_urls[0])
                        print(f"  [ML] Image prediction: {img_severity} ({img_conf:.2f})")
                    except Exception as e:
                        print(f"  [ML] Image inference failed: {e}")
                        
                # 3. Fusion: If image predicts higher severity, trust the image
                sev_levels = {"low": 1, "medium": 2, "high": 3}
                if img_severity and sev_levels.get(img_severity, 0) > sev_levels.get(severity, 0):
                    severity = img_severity
                    sev_conf = img_conf

                # 4. Rules Fallback
                if alert_type == "sos_button" and severity == "low":
                    severity = "high"
                    sev_conf = max(sev_conf, 0.8)

                result = {
                    "severity": severity,
                    "response_type": response_type,
                    "severity_confidence": round(sev_conf, 3),
                    "response_confidence": round(resp_conf, 3),
                    "image_severity": img_severity,
                    "is_duplicate": False,
                    "extracted_location": None,
                }

                self._respond(200, result)

            except Exception as e:
                self._respond(500, {"error": str(e)})

        elif self.path == "/health":
            self._respond(200, {"status": "ok", "models_loaded": sev_model is not None})

        else:
            self._respond(404, {"error": "Not found"})

    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {"status": "ok", "models_loaded": sev_model is not None})
        else:
            self._respond(404, {"error": "Not found"})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        # Quieter logging
        if "/health" not in str(args):
            print(f"  [ML] {args[0]}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()

    load_models()

    server = HTTPServer(("0.0.0.0", args.port), PredictHandler)
    print(f"\\n  ResQ ML Inference Server running on port {args.port}")
    print(f"   POST /predict  — classify emergency text & images")
    print(f"   GET  /health   — health check\\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\\nShutting down ML server...")
        server.shutdown()


if __name__ == "__main__":
    main()
