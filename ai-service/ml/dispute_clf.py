"""
Classification automatique des litiges via NLP.

Pipeline scikit-learn : TfidfVectorizer (char + word n-grams) +
MultinomialNB. Entraîné sur un dataset synthétique de litiges en français.

Catégories prédites :
  - paiement_manquant
  - retard_recurrent
  - communication
  - probleme_versement
  - fraude_suspectee
  - autre

Permet de :
  - router automatiquement le litige vers le bon process de médiation
  - prioriser les cas urgents (fraude > paiement_manquant > retard > ...)
  - alimenter des statistiques sur les types de problèmes les plus fréquents
"""
from __future__ import annotations
from typing import Dict, Any
import os
import re
import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/dispute_clf_pipeline.joblib")

CATEGORIES = {
    "paiement_manquant": {
        "label": "Paiement manquant",
        "priority": 2,
        "suggested_action": "Notifier le débiteur et proposer un plan de remboursement.",
    },
    "retard_recurrent": {
        "label": "Retard récurrent",
        "priority": 3,
        "suggested_action": "Mettre le membre en surveillance, ajuster son score.",
    },
    "communication": {
        "label": "Problème de communication",
        "priority": 4,
        "suggested_action": "Médiation simple, message dans le groupe.",
    },
    "probleme_versement": {
        "label": "Problème lors du versement",
        "priority": 1,
        "suggested_action": "Vérifier la transaction, contacter le PSP si nécessaire.",
    },
    "fraude_suspectee": {
        "label": "Fraude suspectée",
        "priority": 0,
        "suggested_action": "ESCALADER : suspendre le compte, alerter l'équipe sécurité.",
    },
    "autre": {
        "label": "Autre",
        "priority": 5,
        "suggested_action": "Médiation manuelle.",
    },
}


# Dictionnaire de règles (utilisé en fallback ou pour overrides)
RULES = [
    (r"\b(fraude|escroc|arnaque|vol|fake|usurp)", "fraude_suspectee"),
    (r"\b(versement.*non.*reçu|cagnotte.*manquante|payout.*missing)", "probleme_versement"),
    (r"\b(jamais.*payé|n['e].*paie pas|défaut.*paiement|missing.*payment)", "paiement_manquant"),
    (r"\b(retard|en retard|toujours en retard|repeated.*late)", "retard_recurrent"),
    (r"\b(comportement|insulte|message|communication|réponse)", "communication"),
]


def classify(reason: str, description: str = "") -> Dict[str, Any]:
    text = f"{reason or ''} {description or ''}".lower().strip()
    if not text:
        return _format("autre", 0.0, "empty")

    # Modèle ML s'il existe
    if os.path.exists(MODEL_PATH):
        try:
            pipeline = joblib.load(MODEL_PATH)
            proba = pipeline.predict_proba([text])[0]
            classes = pipeline.classes_
            best_idx = int(proba.argmax())
            confidence = float(proba[best_idx])
            category = str(classes[best_idx])
            return _format(category, confidence, "ml", proba_dict={
                str(c): round(float(p), 3) for c, p in zip(classes, proba)
            })
        except Exception:
            pass

    # Fallback rule-based
    for pattern, cat in RULES:
        if re.search(pattern, text, re.IGNORECASE):
            return _format(cat, 0.7, "rule_based")
    return _format("autre", 0.4, "rule_based")


def _format(category: str, confidence: float, engine: str, **extra) -> Dict[str, Any]:
    info = CATEGORIES.get(category, CATEGORIES["autre"])
    return {
        "category": category,
        "label": info["label"],
        "priority": info["priority"],
        "suggested_action": info["suggested_action"],
        "confidence": round(confidence, 3),
        "engine": engine,
        **extra,
    }
