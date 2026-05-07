"""
HYAT ML Prediction Server
Loads the trained XGBoost model and serves predictions via a Flask API.
The SCADA dashboard calls this to get real ML-based failure predictions.
"""

import json
import os
import sys
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, "ml_models")

app = Flask(__name__)
CORS(app)

# Load model, scaler, and feature list at startup
import joblib

print("[HYAT ML] Loading XGBoost model...")
model = joblib.load(os.path.join(MODEL_DIR, "xgboost.joblib"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.joblib"))
with open(os.path.join(MODEL_DIR, "feature_list.json")) as f:
    FEATURE_LIST = json.load(f)

print(f"[HYAT ML] Model loaded. {len(FEATURE_LIST)} features expected.")


# Safe defaults for the 55 features based on normal transformer operation
# These represent "healthy" baseline values for features we don't have sensors for.
SAFE_DEFAULTS = {
    # Phase voltages (will be overridden by sensor)
    "VL1": 230.0, "VL2": 230.0, "VL3": 230.0,
    # Line-to-line voltages
    "VL12": 400.0, "VL23": 400.0, "VL31": 400.0,
    # Phase currents (no sensor, assume moderate load)
    "IL1": 50.0, "IL2": 50.0, "IL3": 50.0,
    # Neutral current
    "INUT": 0.5,
    # Temperatures
    "OTI": 45.0,  # Oil temp (will be overridden)
    "ATI": 25.0,  # Ambient temp
    # Oil level (will be overridden)
    "OLI": 80.0,
    # Active power per phase (moderate load)
    "WL1": 15.0, "WL2": 15.0, "WL3": 15.0,
    # Apparent power per phase
    "VAL1": 18.0, "VAL2": 18.0, "VAL3": 18.0,
    # Reactive power per phase
    "RVAL1": 5.0, "RVAL2": 5.0, "RVAL3": 5.0,
    # Power factor (good PF ~0.85)
    "PFL1": 0.85, "PFL2": 0.85, "PFL3": 0.85,
    "Avg_PF": 0.85, "Sum_PF": 2.55,
    # Frequency
    "FRQ": 50.0,
    # THD (voltage harmonic distortion, low = good)
    "THDVL1": 2.0, "THDVL2": 2.0, "THDVL3": 2.0,
    # THD (current harmonic distortion)
    "THDIL1": 5.0, "THDIL2": 5.0, "THDIL3": 5.0,
    # Max demand current
    "MDIL1": 60.0, "MDIL2": 60.0, "MDIL3": 60.0,
    # Total power metrics
    "KWH": 1000.0, "KWH_I": 0.0, "KVARH": 200.0,
    "KW": 45.0, "KVA": 55.0, "KVAR": 15.0,
    "MPD": 50.0, "MKVAD": 60.0,
    # Engineered features (will be computed)
    "voltage_imbalance": 0.0,
    "current_imbalance": 0.0,
    "temp_diff_oil_ambient": 20.0,
    "load_ratio": 0.3,
    "OTI_rolling_mean_10": 45.0,
    "OTI_rolling_std_10": 1.0,
    "IL1_rolling_mean_10": 50.0,
    "IL1_rolling_std_10": 2.0,
    "VL1_rolling_mean_10": 230.0,
    "VL1_rolling_std_10": 1.0,
}


def build_feature_vector(voltage: float, temperature: float, oil_level: float, current: float) -> list:
    """
    Map our 3 available sensor values into the 55-feature vector.
    Uses safe defaults for missing sensors, computes engineered features.
    """
    features = dict(SAFE_DEFAULTS)

    # Override with actual sensor data, only if valid (avoid 0 indicating missing sensor)
    if voltage > 0:
        features["VL1"] = voltage
        features["VL2"] = voltage
        features["VL3"] = voltage
        features["VL12"] = voltage * 1.732  # Line-to-line ≈ phase * √3
        features["VL23"] = voltage * 1.732
        features["VL31"] = voltage * 1.732
    if temperature > 0:
        features["OTI"] = temperature
    if oil_level > 0:
        features["OLI"] = oil_level
    if current > 0:
        features["IL1"] = current
        features["IL2"] = current
        features["IL3"] = current

    # Compute engineered features from available data
    v_mean = voltage if voltage > 0 else 1
    features["voltage_imbalance"] = 0.0  # All phases same → 0 imbalance

    i_vals = [features["IL1"], features["IL2"], features["IL3"]]
    i_mean = np.mean(i_vals) if np.mean(i_vals) > 0 else 1
    features["current_imbalance"] = (np.std(i_vals) / i_mean) * 100

    features["temp_diff_oil_ambient"] = temperature - features["ATI"]
    features["load_ratio"] = features["KVA"] / max(features["KVA"] * 1.5, 1)

    features["OTI_rolling_mean_10"] = temperature
    features["OTI_rolling_std_10"] = 0.5  # Low variability (single reading)
    features["VL1_rolling_mean_10"] = voltage
    features["VL1_rolling_std_10"] = 0.5

    # Build ordered vector matching the feature list
    vector = [features.get(f, 0.0) for f in FEATURE_LIST]
    return vector


@app.route("/predict", methods=["POST"])
def predict():
    """Accept sensor readings and return ML prediction."""
    try:
        data = request.get_json()
        voltage = float(data.get("voltage", 0))
        temperature = float(data.get("temperature", 0))
        oil_level = float(data.get("oilLevel", 0))
        current = float(data.get("current", 0))

        # Build feature vector
        raw_vector = build_feature_vector(voltage, temperature, oil_level, current)

        # Scale features
        X = scaler.transform([raw_vector])

        # Predict
        prediction = int(model.predict(X)[0])
        probabilities = model.predict_proba(X)[0]
        failure_prob = float(probabilities[1])
        normal_prob = float(probabilities[0])

        # Health score: inverse of failure probability (0-100)
        health_score = round((1 - failure_prob) * 100, 1)

        result = {
            "prediction": prediction,  # 0 = Normal, 1 = Failure/Risk
            "confidence": round(max(failure_prob, normal_prob) * 100, 1),
            "failureProbability": round(failure_prob * 100, 1),
            "healthScore": health_score,
            "riskLabel": "CRITICAL" if failure_prob > 0.8 else
                         "WARNING" if failure_prob > 0.5 else
                         "CAUTION" if failure_prob > 0.3 else "NORMAL",
            "model": "XGBoost (95.7% F1)",
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "model": "xgboost", "features": len(FEATURE_LIST)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"[HYAT ML] Starting prediction server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
