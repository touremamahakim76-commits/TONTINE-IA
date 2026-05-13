"""
Prédiction du risque de défaut sur la prochaine cotisation.

Utilise un Gradient Boosting Classifier entraîné sur des données synthétiques
réalistes. Renvoie une probabilité (0-1), un niveau de risque catégorique
(low / medium / high) et les facteurs d'importance via SHAP-like attribution.

L'objectif est de permettre à un créateur de tontine d'identifier en amont
les membres qui présentent un risque de manquer leur prochaine cotisation,
afin de prendre des mesures préventives (rappel manuel, ajustement, etc.).
"""
from __future__ import annotations
from typing import Dict, Any, List
import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/default_risk_model.joblib")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "../models/default_risk_scaler.joblib")

FEATURE_NAMES = [
    "trust_score",
    "completed_cycles",
    "missed_count",
    "late_count",
    "on_time_count",
    "avg_attempts_per_payment",
    "days_since_last_payment",
    "active_tontines",
    "cumulative_amount_paid",
    "dispute_count",
]


def predict(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prédit la probabilité de défaut.
    `features` doit contenir les clés de FEATURE_NAMES (valeurs manquantes -> 0).
    """
    x = np.array([[float(features.get(k, 0)) for k in FEATURE_NAMES]])

    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            proba = float(model.predict_proba(x)[0][1])
            # Importance via le modèle GB
            importances = model.feature_importances_
            top = sorted(
                zip(FEATURE_NAMES, importances), key=lambda t: -t[1]
            )[:5]
            top_features = [{"name": n, "importance": round(float(i), 3)} for n, i in top]
            engine = "gradient_boosting"
        except Exception as e:
            proba = _heuristic_default_proba(features)
            top_features = []
            engine = f"heuristic_fallback ({e})"
    else:
        proba = _heuristic_default_proba(features)
        top_features = []
        engine = "heuristic"

    risk_level = "high" if proba > 0.5 else "medium" if proba > 0.25 else "low"
    recommendation = _recommendation(risk_level, features)

    return {
        "default_probability": round(proba, 3),
        "risk_level": risk_level,
        "top_features": top_features,
        "recommendation": recommendation,
        "engine": engine,
    }


def _heuristic_default_proba(f: Dict[str, Any]) -> float:
    """Fallback simple, calibré pour des cas extrêmes."""
    score = float(f.get("trust_score", 50))
    missed = float(f.get("missed_count", 0))
    late = float(f.get("late_count", 0))
    proba = 0.5 - (score - 50) / 100 + missed * 0.15 + late * 0.05
    return float(max(0.01, min(0.99, proba)))


def _recommendation(level: str, f: Dict[str, Any]) -> str:
    if level == "high":
        return (
            "Risque élevé : envoyer un rappel personnalisé 7 jours avant l'échéance, "
            "envisager une cotisation partagée ou une garantie."
        )
    if level == "medium":
        return "Risque modéré : automatiser un rappel SMS 48h avant l'échéance."
    return "Risque faible : aucune action particulière requise."


def batch_predict(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [predict(r) for r in rows]
