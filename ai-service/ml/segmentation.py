"""
Segmentation des utilisateurs en archétypes via KMeans.

5 clusters identifiés a priori (centroids fixés sur des profils synthétiques) :
  0. Champion           — score élevé, beaucoup de tontines complétées, jamais en retard
  1. Régulier fiable    — score moyen-haut, paiements à temps, peu de tontines
  2. Nouveau prudent    — peu d'historique, comportement neutre
  3. À risque modéré    — quelques retards, score moyen
  4. À risque élevé     — défauts répétés, score bas

Cette segmentation permet :
  - de personnaliser la communication (onboarding, rappels)
  - de cibler des actions (formation pour cluster 4, parrainage pour cluster 0)
  - de justifier les recommandations de matching
"""
from __future__ import annotations
from typing import Dict, Any, List
import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/segmentation_model.joblib")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "../models/segmentation_scaler.joblib")

FEATURE_NAMES = [
    "trust_score",
    "completed_cycles",
    "on_time_ratio",
    "missed_count",
    "active_tontines",
    "tenure_days",
]

ARCHETYPES = {
    0: {
        "name": "Champion",
        "description": "Utilisateur très fiable : score élevé, plusieurs tontines complétées sans incident.",
        "actions": ["Proposer le programme parrain", "Inviter à co-créer une tontine premium"],
        "color": "#10b981",
    },
    1: {
        "name": "Régulier fiable",
        "description": "Bon comportement, paiements à temps. Profil idéal pour des tontines standard.",
        "actions": ["Suggérer d'augmenter le montant", "Activer la 2FA"],
        "color": "#3b82f6",
    },
    2: {
        "name": "Nouveau prudent",
        "description": "Peu d'historique, comportement neutre. Phase de découverte.",
        "actions": ["Proposer une tontine de démarrage", "Onboarding pédagogique"],
        "color": "#f59e0b",
    },
    3: {
        "name": "À risque modéré",
        "description": "Quelques retards. Score à surveiller.",
        "actions": ["Rappels SMS automatiques", "Coaching financier"],
        "color": "#f97316",
    },
    4: {
        "name": "À risque élevé",
        "description": "Défauts répétés. Nécessite une attention particulière.",
        "actions": [
            "Limiter les nouvelles tontines",
            "Médiation proactive",
            "Plan de remboursement",
        ],
        "color": "#ef4444",
    },
}


def assign_segment(features: Dict[str, Any]) -> Dict[str, Any]:
    """Assigne un utilisateur à un archétype."""
    x = np.array([[float(features.get(k, 0)) for k in FEATURE_NAMES]])

    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            scaler = joblib.load(SCALER_PATH)
            model = joblib.load(MODEL_PATH)
            xs = scaler.transform(x)
            cluster = int(model.predict(xs)[0])
            distances = model.transform(xs)[0]
            # Confiance = inverse de la distance la plus courte normalisée
            min_dist = float(distances.min())
            second = float(np.partition(distances, 1)[1])
            confidence = round(min(1.0, second / max(min_dist, 0.01) - 1.0), 2)
            engine = "kmeans"
        except Exception:
            cluster = _heuristic_segment(features)
            confidence = 0.5
            engine = "heuristic_fallback"
    else:
        cluster = _heuristic_segment(features)
        confidence = 0.6
        engine = "heuristic"

    archetype = ARCHETYPES.get(cluster, ARCHETYPES[2])
    return {
        "cluster": cluster,
        "archetype": archetype["name"],
        "description": archetype["description"],
        "color": archetype["color"],
        "actions": archetype["actions"],
        "confidence": confidence,
        "engine": engine,
    }


def _heuristic_segment(f: Dict[str, Any]) -> int:
    score = float(f.get("trust_score", 50))
    missed = float(f.get("missed_count", 0))
    completed = float(f.get("completed_cycles", 0))
    on_time = float(f.get("on_time_ratio", 0.5))
    tenure = float(f.get("tenure_days", 0))

    if missed >= 3 or score < 30:
        return 4
    if missed >= 1 or score < 55:
        return 3
    if tenure < 30 and completed < 1:
        return 2
    if score >= 80 and completed >= 3 and on_time > 0.95:
        return 0
    return 1


def segment_distribution(users: List[Dict[str, Any]]) -> Dict[str, int]:
    """Pour le dashboard admin : distribution des segments."""
    counts = {a["name"]: 0 for a in ARCHETYPES.values()}
    for u in users:
        seg = assign_segment(u)
        counts[seg["archetype"]] += 1
    return counts
