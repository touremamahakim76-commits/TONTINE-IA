"""
Module de scoring de fiabilité.

Approche : un modèle Random Forest entraîné sur des données synthétiques
prédit la probabilité qu'un membre honore ses prochaines cotisations.
Le score (0-100) est dérivé de cette probabilité, enrichi de facteurs
explicatifs pour la transparence.
"""
from __future__ import annotations
from typing import List, Dict, Any
import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "scoring_model.joblib")

# Mapping event_type → poids brut
EVENT_WEIGHTS = {
    "contribution_paid_on_time": 1.0,
    "contribution_late": -0.5,
    "contribution_missed": -2.0,
    "tontine_completed": 2.0,
    "dispute_opened": -0.3,
    "reported": -1.5,
    "kyc_approved": 0.5,
}


def _features_from_events(events: List[Dict[str, Any]]) -> np.ndarray:
    """Transforme une liste d'événements en vecteur de features."""
    counts = {k: 0 for k in EVENT_WEIGHTS}
    total_weight = 0.0
    for ev in events:
        t = ev.get("event_type")
        if t in counts:
            counts[t] += 1
        total_weight += float(ev.get("weight", EVENT_WEIGHTS.get(t, 0.0)))
    n = max(1, len(events))
    return np.array([
        counts["contribution_paid_on_time"],
        counts["contribution_late"],
        counts["contribution_missed"],
        counts["tontine_completed"],
        counts["dispute_opened"],
        counts["reported"],
        counts["kyc_approved"],
        total_weight,
        n,
        counts["contribution_paid_on_time"] / n,  # ratio à temps
        counts["contribution_late"] / n,           # ratio retards
    ], dtype=float)


def compute_score(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calcule le score (0-100) et les facteurs."""
    feats = _features_from_events(events)

    # Charge le modèle ML s'il existe
    if os.path.exists(MODEL_PATH):
        try:
            model = joblib.load(MODEL_PATH)
            proba = float(model.predict_proba([feats])[0][1])
            ml_score = proba * 100
        except Exception:
            ml_score = None
    else:
        ml_score = None

    # Score heuristique (transparent et explicable)
    base = 50.0
    on_time = feats[0] * EVENT_WEIGHTS["contribution_paid_on_time"] * 5
    late = feats[1] * EVENT_WEIGHTS["contribution_late"] * 5
    missed = feats[2] * EVENT_WEIGHTS["contribution_missed"] * 10
    completed = feats[3] * EVENT_WEIGHTS["tontine_completed"] * 8
    reported = feats[5] * EVENT_WEIGHTS["reported"] * 5

    heuristic_score = base + on_time + late + missed + completed + reported
    heuristic_score = float(max(0, min(100, heuristic_score)))

    # Combine ML et heuristique (60/40)
    score = (
        0.6 * ml_score + 0.4 * heuristic_score if ml_score is not None else heuristic_score
    )
    score = round(float(max(0, min(100, score))), 1)

    # Facteurs explicatifs
    factors = {
        "on_time_payments": int(feats[0]),
        "late_payments": int(feats[1]),
        "missed_payments": int(feats[2]),
        "completed_tontines": int(feats[3]),
        "reports_against_user": int(feats[5]),
        "total_events": int(feats[8]),
        "on_time_ratio": round(float(feats[9]), 2),
        "ml_proba": round(ml_score, 1) if ml_score is not None else None,
        "heuristic_score": round(heuristic_score, 1),
    }
    return {"score": score, "factors": factors}
