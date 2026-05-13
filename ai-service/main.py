"""
TontineDigital — Service IA (FastAPI).

Endpoints :
  POST /score              → score de fiabilité d'un utilisateur (Random Forest)
  POST /anomaly            → détection d'anomalies sur des contributions (Isolation Forest)
  POST /chat               → assistant conversationnel (rule-based + OpenAI)
  POST /default-risk       → prédiction de défaut (Gradient Boosting)
  POST /segment            → segmentation utilisateur (KMeans)
  POST /matching/recommend → recommandation de membres (similarité cosinus)
  POST /dispute/classify   → classification NLP de litige (TF-IDF + Naive Bayes)
  POST /forecast           → prévision de flux de trésorerie (régression)
  GET  /models/info        → infos sur les modèles chargés
  GET  /health             → healthcheck
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from scoring import compute_score
from anomaly import detect
from chatbot import answer
from ml.default_risk import predict as predict_default, batch_predict as batch_default
from ml.segmentation import assign_segment, segment_distribution, ARCHETYPES
from ml.matching import recommend as recommend_members
from ml.dispute_clf import classify as classify_dispute
from ml.forecast import forecast_tontine

app = FastAPI(
    title="TontineDigital AI Service",
    description="Microservice IA : 6 modèles ML, chatbot, scoring, anomalies, NLP.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============= Schémas Pydantic =============

class ScoreRequest(BaseModel):
    events: List[Dict[str, Any]]


class AnomalyRequest(BaseModel):
    contributions: List[Dict[str, Any]] = []


class ChatRequest(BaseModel):
    question: str
    context: Optional[Dict[str, Any]] = {}


class DefaultRiskRequest(BaseModel):
    features: Dict[str, Any]


class DefaultRiskBatchRequest(BaseModel):
    rows: List[Dict[str, Any]]


class SegmentRequest(BaseModel):
    features: Dict[str, Any]


class SegmentDistributionRequest(BaseModel):
    users: List[Dict[str, Any]]


class MatchingRequest(BaseModel):
    target: Dict[str, Any]
    candidates: List[Dict[str, Any]]
    shared_history: Optional[Dict[str, int]] = {}
    top_k: Optional[int] = 10


class DisputeRequest(BaseModel):
    reason: str
    description: Optional[str] = ""


class ForecastRequest(BaseModel):
    cycle_index: int
    members_count: int
    amount_per_cycle: int
    avg_trust_score: float
    historical_on_time_ratio: float
    remaining_cycles: int


# ============= Endpoints =============

@app.get("/health")
def health():
    return {"status": "ok", "service": "tontinedigital-ai"}


@app.get("/models/info")
def models_info():
    """Liste les modèles ML disponibles et leur statut."""
    base = os.path.join(os.path.dirname(__file__), "models")
    files = {
        "scoring": "scoring_model.joblib",
        "anomaly": "anomaly_model.joblib",
        "default_risk": "default_risk_model.joblib",
        "segmentation": "segmentation_model.joblib",
        "dispute_clf": "dispute_clf_pipeline.joblib",
        "forecast": "forecast_model.joblib",
    }
    return {
        "models": [
            {
                "name": name,
                "loaded": os.path.exists(os.path.join(base, fn)),
                "file": fn,
            }
            for name, fn in files.items()
        ],
        "archetypes": ARCHETYPES,
    }


@app.post("/score")
def score_endpoint(req: ScoreRequest):
    return compute_score(req.events)


@app.post("/anomaly")
def anomaly_endpoint(req: AnomalyRequest):
    return detect(req.dict())


@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    return answer(req.question, req.context or {})


@app.post("/default-risk")
def default_risk_endpoint(req: DefaultRiskRequest):
    return predict_default(req.features)


@app.post("/default-risk/batch")
def default_risk_batch_endpoint(req: DefaultRiskBatchRequest):
    return {"predictions": batch_default(req.rows)}


@app.post("/segment")
def segment_endpoint(req: SegmentRequest):
    return assign_segment(req.features)


@app.post("/segment/distribution")
def segment_distribution_endpoint(req: SegmentDistributionRequest):
    return {"distribution": segment_distribution(req.users)}


@app.post("/matching/recommend")
def matching_endpoint(req: MatchingRequest):
    return {
        "recommendations": recommend_members(
            req.target, req.candidates, req.shared_history, req.top_k
        )
    }


@app.post("/dispute/classify")
def dispute_classify_endpoint(req: DisputeRequest):
    return classify_dispute(req.reason, req.description or "")


@app.post("/forecast")
def forecast_endpoint(req: ForecastRequest):
    return forecast_tontine(
        cycle_index=req.cycle_index,
        members_count=req.members_count,
        amount_per_cycle=req.amount_per_cycle,
        avg_trust_score=req.avg_trust_score,
        historical_on_time_ratio=req.historical_on_time_ratio,
        remaining_cycles=req.remaining_cycles,
    )
