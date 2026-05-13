"""
Système de recommandation de membres compatibles pour une tontine.

Calcule un score de compatibilité entre un porteur (créateur) et chaque
candidat membre, basé sur :
  - similarité de profil (cosinus sur les features comportementales)
  - alignement de fiabilité (score)
  - diversification : éviter de regrouper uniquement des profils identiques
  - bonus si tontines communes réussies dans le passé

Renvoie une liste de candidats triés par score de compatibilité (0-100).
"""
from __future__ import annotations
from typing import Dict, Any, List
import numpy as np


FEATURE_NAMES = [
    "trust_score",
    "on_time_ratio",
    "completed_cycles",
    "active_tontines",
]


def _vec(u: Dict[str, Any]) -> np.ndarray:
    return np.array([float(u.get(k, 0)) for k in FEATURE_NAMES], dtype=float)


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    na = float(np.linalg.norm(a))
    nb = float(np.linalg.norm(b))
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def recommend(target: Dict[str, Any], candidates: List[Dict[str, Any]],
              shared_history: Dict[str, int] | None = None,
              top_k: int = 10) -> List[Dict[str, Any]]:
    """
    target           : profil du créateur (avec id, full_name, features)
    candidates       : liste d'utilisateurs candidats
    shared_history   : { candidate_id: nb_tontines_completees_avec_target }
    """
    shared_history = shared_history or {}
    t_vec = _vec(target)

    results = []
    for c in candidates:
        if c.get("id") == target.get("id"):
            continue
        c_vec = _vec(c)
        sim = _cosine(t_vec, c_vec)

        # Score de fiabilité du candidat (0-1)
        reliability = float(c.get("trust_score", 0)) / 100.0

        # Bonus historique
        shared = shared_history.get(c.get("id"), 0)
        history_bonus = min(shared * 0.05, 0.2)  # 5% par tontine commune réussie, max 20%

        # Pénalité diversité (évite groupes trop homogènes)
        diversity_penalty = 0.0
        if sim > 0.99:
            diversity_penalty = 0.1

        # Score de compatibilité [0,1]
        compatibility = (
            0.4 * sim
            + 0.4 * reliability
            + history_bonus
            - diversity_penalty
        )
        compatibility = float(max(0.0, min(1.0, compatibility)))

        results.append({
            "user_id": c.get("id"),
            "full_name": c.get("full_name"),
            "trust_score": c.get("trust_score"),
            "compatibility_score": round(compatibility * 100, 1),
            "similarity": round(sim, 3),
            "reliability": round(reliability, 3),
            "shared_completed_tontines": shared,
            "explanation": _explain(sim, reliability, shared, diversity_penalty),
        })

    results.sort(key=lambda x: -x["compatibility_score"])
    return results[:top_k]


def _explain(sim: float, rel: float, shared: int, penalty: float) -> str:
    parts = []
    if rel > 0.75:
        parts.append("très fiable")
    elif rel > 0.5:
        parts.append("fiable")
    if sim > 0.85:
        parts.append("profil très similaire au vôtre")
    elif sim > 0.6:
        parts.append("profil compatible")
    if shared > 0:
        parts.append(f"{shared} tontine(s) commune(s) réussie(s)")
    if penalty > 0:
        parts.append("attention : profil quasi-identique, diversifiez")
    return ", ".join(parts) if parts else "compatibilité standard"
