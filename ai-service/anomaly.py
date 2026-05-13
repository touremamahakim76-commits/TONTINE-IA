"""
Détection d'anomalies sur les comportements de paiement.
Utilise un IsolationForest entraîné sur des données synthétiques.
"""
from __future__ import annotations
from typing import List, Dict, Any
import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "anomaly_model.joblib")


def _features(contribs: List[Dict[str, Any]]) -> np.ndarray:
    if not contribs:
        return np.zeros(5)
    amounts = [c.get("amount", 0) for c in contribs]
    attempts = [c.get("attempt_count", 0) for c in contribs]
    failed = sum(1 for c in contribs if c.get("status") == "failed")
    paid = sum(1 for c in contribs if c.get("status") == "paid")
    return np.array([
        np.mean(amounts),
        np.std(amounts) if len(amounts) > 1 else 0.0,
        np.mean(attempts),
        failed,
        paid,
    ], dtype=float)


def detect(payload: Dict[str, Any]) -> Dict[str, Any]:
    contribs = payload.get("contributions", [])
    feats = _features(contribs)

    anomalies = []

    # Heuristiques explicites
    failed = sum(1 for c in contribs if c.get("status") == "failed")
    if failed >= 3:
        anomalies.append({
            "type": "repeated_failures",
            "severity": "high",
            "description": f"{failed} paiements échoués détectés.",
        })
    avg_attempts = float(np.mean([c.get("attempt_count", 0) for c in contribs])) if contribs else 0
    if avg_attempts > 2:
        anomalies.append({
            "type": "high_retry_rate",
            "severity": "medium",
            "description": "Nombre moyen de tentatives élevé.",
        })

    # Modèle ML s'il existe
    if os.path.exists(MODEL_PATH) and contribs:
        try:
            model = joblib.load(MODEL_PATH)
            pred = model.predict([feats])[0]
            score = float(model.score_samples([feats])[0])
            if pred == -1:
                anomalies.append({
                    "type": "ml_anomaly",
                    "severity": "low",
                    "description": "Le modèle a détecté un pattern atypique.",
                    "ml_score": round(score, 3),
                })
        except Exception:
            pass

    return {"anomalies": anomalies, "evaluated": len(contribs)}
