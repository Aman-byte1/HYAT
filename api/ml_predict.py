import json
import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Path to models relative to this file
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml_models")

# Load model, scaler, and feature list at startup
model = joblib.load(os.path.join(MODEL_DIR, "xgboost.joblib"))
scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.joblib"))
with open(os.path.join(MODEL_DIR, "feature_list.json")) as f:
    FEATURE_LIST = json.load(f)

SAFE_DEFAULTS = {
    "VL1": 230.0, "VL2": 230.0, "VL3": 230.0,
    "VL12": 400.0, "VL23": 400.0, "VL31": 400.0,
    "IL1": 50.0, "IL2": 50.0, "IL3": 50.0,
    "INUT": 0.5, "OTI": 45.0, "ATI": 25.0, "OLI": 80.0,
    "WL1": 15.0, "WL2": 15.0, "WL3": 15.0,
    "VAL1": 18.0, "VAL2": 18.0, "VAL3": 18.0,
    "RVAL1": 5.0, "RVAL2": 5.0, "RVAL3": 5.0,
    "PFL1": 0.85, "PFL2": 0.85, "PFL3": 0.85,
    "Avg_PF": 0.85, "Sum_PF": 2.55, "FRQ": 50.0,
    "THDVL1": 2.0, "THDVL2": 2.0, "THDVL3": 2.0,
    "THDIL1": 5.0, "THDIL2": 5.0, "THDIL3": 5.0,
    "MDIL1": 60.0, "MDIL2": 60.0, "MDIL3": 60.0,
    "KWH": 1000.0, "KWH_I": 0.0, "KVARH": 200.0,
    "KW": 45.0, "KVA": 55.0, "KVAR": 15.0,
    "MPD": 50.0, "MKVAD": 60.0,
    "voltage_imbalance": 0.0, "current_imbalance": 0.0,
    "temp_diff_oil_ambient": 20.0, "load_ratio": 0.3,
    "OTI_rolling_mean_10": 45.0, "OTI_rolling_std_10": 1.0,
    "IL1_rolling_mean_10": 50.0, "IL1_rolling_std_10": 2.0,
    "VL1_rolling_mean_10": 230.0, "VL1_rolling_std_10": 1.0,
}

def build_feature_vector(voltage: float, temperature: float, oil_level: float, current: float) -> list:
    features = dict(SAFE_DEFAULTS)
    if voltage > 0:
        features["VL1"], features["VL2"], features["VL3"] = voltage, voltage, voltage
        features["VL12"] = features["VL23"] = features["VL31"] = voltage * 1.732
    if temperature > 0: features["OTI"] = temperature
    if oil_level > 0: features["OLI"] = oil_level
    if current > 0: features["IL1"] = features["IL2"] = features["IL3"] = current
    
    v_mean = voltage if voltage > 0 else 1
    features["voltage_imbalance"] = 0.0
    i_vals = [features["IL1"], features["IL2"], features["IL3"]]
    i_mean = np.mean(i_vals) if np.mean(i_vals) > 0 else 1
    features["current_imbalance"] = (np.std(i_vals) / i_mean) * 100
    features["temp_diff_oil_ambient"] = temperature - features["ATI"]
    features["load_ratio"] = features["KVA"] / max(features["KVA"] * 1.5, 1)
    features["OTI_rolling_mean_10"] = temperature
    features["VL1_rolling_mean_10"] = voltage
    
    return [features.get(f, 0.0) for f in FEATURE_LIST]

@app.route("/api/ml_predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        voltage = float(data.get("voltage", 0))
        temperature = float(data.get("temperature", 0))
        oil_level = float(data.get("oilLevel", 0))
        current = float(data.get("current", 0))

        raw_vector = build_feature_vector(voltage, temperature, oil_level, current)
        X = scaler.transform([raw_vector])
        
        prediction = int(model.predict(X)[0])
        probabilities = model.predict_proba(X)[0]
        failure_prob = float(probabilities[1])
        normal_prob = float(probabilities[0])
        health_score = round((1 - failure_prob) * 100, 1)

        return jsonify({
            "prediction": prediction,
            "confidence": round(max(failure_prob, normal_prob) * 100, 1),
            "failureProbability": round(failure_prob * 100, 1),
            "healthScore": health_score,
            "riskLabel": "CRITICAL" if failure_prob > 0.8 else "WARNING" if failure_prob > 0.5 else "CAUTION" if failure_prob > 0.3 else "NORMAL",
            "model": "XGBoost (Vercel Serverless)",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
