"""
Prévision de flux de trésorerie d'une tontine.

Pour chaque cycle restant, prédit :
  - la probabilité de complétion à temps
  - le montant attendu effectivement versé
  - une fourchette de confiance

Utilise une régression linéaire entraînée sur des séries synthétiques
(décroissance progressive de la complétude au fil des cycles, en fonction
du score moyen du groupe et de l'historique de retards).
"""
from __future__ import annotations
from typing import Dict, Any, List
import os
import joblib
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/forecast_model.joblib")


def forecast_tontine(
    cycle_index: int,
    members_count: int,
    amount_per_cycle: int,
    avg_trust_score: float,
    historical_on_time_ratio: float,
    remaining_cycles: int,
) -> Dict[str, Any]:
    """Prévoit la performance des cycles restants."""
    cycles = []
    for i in range(remaining_cycles):
        future_idx = cycle_index + i + 1
        # Heuristique : la complétion baisse légèrement avec le temps si score moyen bas
        decay = 0.005 * i
        completion_prob = max(
            0.4,
            min(
                1.0,
                (avg_trust_score / 100) * 0.7
                + historical_on_time_ratio * 0.3
                - decay,
            ),
        )

        # Modèle ML s'il existe
        if os.path.exists(MODEL_PATH):
            try:
                model = joblib.load(MODEL_PATH)
                feats = np.array([[
                    future_idx, members_count, amount_per_cycle / 100.0,
                    avg_trust_score, historical_on_time_ratio,
                ]])
                ml_pred = float(model.predict(feats)[0])
                completion_prob = max(0.0, min(1.0, 0.5 * completion_prob + 0.5 * ml_pred))
            except Exception:
                pass

        expected_amount = int(amount_per_cycle * members_count * completion_prob)
        # Intervalle de confiance simple ±10%
        low = int(expected_amount * 0.9)
        high = int(min(amount_per_cycle * members_count, expected_amount * 1.1))

        cycles.append({
            "cycle_index": future_idx,
            "completion_probability": round(completion_prob, 3),
            "expected_amount": expected_amount,
            "ci_low": low,
            "ci_high": high,
        })
    return {
        "horizon": remaining_cycles,
        "forecast": cycles,
        "expected_total": sum(c["expected_amount"] for c in cycles),
        "ideal_total": amount_per_cycle * members_count * remaining_cycles,
    }
