"""
Azure ML inference helpers — AfricaGuard
Falls back to local rf_model.pkl when endpoint unavailable.
"""
import os
import time
import numpy as np
import requests

FEATURE_COLS = [
    "pages_viewed", "time_on_site", "engagement_score", "bot_score",
    "requests_per_ip", "requests_per_session", "hour_of_day",
    "is_weekend", "is_business_hours", "seconds_since_last_request",
    "avg_time_per_page", "is_bounce", "error_count",
    "bot_indicator_user_agent", "bot_indicator_high_freq",
    "bot_indicator_fast_requests",
]


def predict_local(features: list, rf_model, scaler) -> dict:
    arr = np.array([features], dtype=float)
    scaled = scaler.transform(arr)
    t0 = time.time()
    pred = rf_model.predict(scaled)[0]
    probs = rf_model.predict_proba(scaled)[0]
    ms = round((time.time() - t0) * 1000, 2)
    return {
        "prediction": str(pred),
        "confidence": round(float(max(probs)), 4),
        "probabilities": {
            str(cls): round(float(p), 4)
            for cls, p in zip(rf_model.classes_, probs)
        },
        "inference_source": "local_pkl",
        "inference_time_ms": ms,
    }


def predict_azure(features: list, rf_model, scaler) -> dict:
    endpoint_url = os.getenv("AZURE_ML_ENDPOINT_URL", "").strip()
    endpoint_key = os.getenv("AZURE_ML_ENDPOINT_KEY", "").strip()

    if not endpoint_url or not endpoint_key:
        return predict_local(features, rf_model, scaler)

    payload = {
        "input_data": {
            "columns": FEATURE_COLS,
            "data": [features],
        }
    }

    try:
        t0 = time.time()
        response = requests.post(
            endpoint_url,
            json=payload,
            headers={
                "Authorization": f"Bearer {endpoint_key}",
                "Content-Type": "application/json",
            },
            timeout=8,
        )
        response.raise_for_status()
        result = response.json()
        pred = result[0] if isinstance(result, list) else result.get("prediction", result)
        ms = round((time.time() - t0) * 1000, 2)
        return {
            "prediction": str(pred),
            "confidence": None,
            "probabilities": {},
            "inference_source": "azure_ml",
            "inference_time_ms": ms,
        }
    except Exception as exc:
        print(f"Azure ML fallback to local: {exc}")
        out = predict_local(features, rf_model, scaler)
        out["inference_source"] = "local_fallback"
        return out
