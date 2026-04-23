"""
ResQ ML — Inference Server

Lightweight Flask/HTTP server that loads trained models and serves predictions.
The Node.js backend calls this instead of keyword matching.

Usage:
    python inference_server.py              # Start on port 5000
    python inference_server.py --port 5001  # Custom port

API:
    POST /predict
    Body: { "message": "Building on fire...", "type": "sos_button" }
    Response: { "severity": "high", "response_type": "fire", "confidence": 0.94 }
"""

import os
import sys
import json
import pickle
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Load models at startup
sev_model = None
resp_model = None


def load_models():
    global sev_model, resp_model

    sev_path = os.path.join(MODEL_DIR, "severity_model.pkl")
    resp_path = os.path.join(MODEL_DIR, "response_model.pkl")

    # Fallback to old names
    if not os.path.exists(sev_path):
        sev_path = os.path.join(MODEL_DIR, "severity_classifier.pkl")
    if not os.path.exists(resp_path):
        resp_path = os.path.join(MODEL_DIR, "response_classifier.pkl")

    if not os.path.exists(sev_path) or not os.path.exists(resp_path):
        print("[ERROR] Models not found. Train first: python train_text_model.py")
        sys.exit(1)

    print("Loading severity model...")
    with open(sev_path, "rb") as f:
        sev_model = pickle.load(f)
    print("Loading response type model...")
    with open(resp_path, "rb") as f:
        resp_model = pickle.load(f)
    print("[OK] Models loaded successfully")


class PredictHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/predict":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                message = data.get("message", "")
                alert_type = data.get("type", "manual_form")

                if not message:
                    self._respond(400, {"error": "message is required"})
                    return

                # Predict
                severity = sev_model.predict([message])[0]
                sev_proba = sev_model.predict_proba([message])[0]
                sev_conf = float(max(sev_proba))

                response_type = resp_model.predict([message])[0]
                resp_proba = resp_model.predict_proba([message])[0]
                resp_conf = float(max(resp_proba))

                # SOS button always gets high severity minimum
                if alert_type == "sos_button" and severity == "low":
                    severity = "high"
                    sev_conf = max(sev_conf, 0.8)

                result = {
                    "severity": severity,
                    "response_type": response_type,
                    "severity_confidence": round(sev_conf, 3),
                    "response_confidence": round(resp_conf, 3),
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
    print(f"\n  ResQ ML Inference Server running on port {args.port}")
    print(f"   POST /predict  — classify emergency text")
    print(f"   GET  /health   — health check\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down ML server...")
        server.shutdown()


if __name__ == "__main__":
    main()
