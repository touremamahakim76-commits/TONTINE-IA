"""
Entraîne TOUS les modèles ML de TontineDigital sur des données synthétiques.

Modèles entraînés :
  - scoring (Random Forest)              -> models/scoring_model.joblib
  - anomaly (Isolation Forest)           -> models/anomaly_model.joblib
  - default_risk (Gradient Boosting)     -> models/default_risk_model.joblib
  - segmentation (KMeans + StandardScaler) -> models/segmentation_*.joblib
  - dispute_clf (TF-IDF + Naive Bayes)   -> models/dispute_clf_pipeline.joblib
  - forecast (Linear Regression)         -> models/forecast_model.joblib

Usage :
    python train_models.py
"""
import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest, GradientBoostingClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, classification_report

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)
RNG = np.random.default_rng(42)


# =========================================================================
# 1) SCORING — Random Forest
# =========================================================================
def train_scoring():
    print("→ [1/6] Scoring (Random Forest)…")
    X, y = [], []
    for _ in range(5000):
        on_time = RNG.integers(0, 30)
        late = RNG.integers(0, 10)
        missed = RNG.integers(0, 5)
        completed = RNG.integers(0, 4)
        disputed = RNG.integers(0, 3)
        reported = RNG.integers(0, 3)
        kyc = RNG.integers(0, 2)
        total = on_time + late + missed + completed + disputed + reported + kyc
        weight = on_time * 1.0 - late * 0.5 - missed * 2.0 + completed * 2.0 - reported * 1.5
        n = max(1, total)
        ratio_ot = on_time / n
        ratio_lt = late / n
        X.append([on_time, late, missed, completed, disputed, reported, kyc, weight, n, ratio_ot, ratio_lt])
        y.append(1 if (ratio_ot > 0.7 and missed < 2 and reported < 2) else 0)
    X, y = np.array(X), np.array(y)
    m = RandomForestClassifier(n_estimators=120, max_depth=8, random_state=42)
    m.fit(X, y)
    joblib.dump(m, os.path.join(MODELS_DIR, "scoring_model.joblib"))
    print(f"   ✓ Accuracy: {m.score(X, y):.3f}")


# =========================================================================
# 2) ANOMALY — Isolation Forest
# =========================================================================
def train_anomaly():
    print("→ [2/6] Anomalies (Isolation Forest)…")
    X = []
    for _ in range(2000):
        avg_amount = RNG.normal(10000, 2000)
        std_amount = abs(RNG.normal(0, 500))
        avg_attempts = max(0, RNG.normal(1.0, 0.3))
        failed = RNG.integers(0, 2)
        paid = RNG.integers(5, 20)
        X.append([avg_amount, std_amount, avg_attempts, failed, paid])
    m = IsolationForest(contamination=0.05, n_estimators=120, random_state=42)
    m.fit(np.array(X))
    joblib.dump(m, os.path.join(MODELS_DIR, "anomaly_model.joblib"))
    print("   ✓ Modèle entraîné")


# =========================================================================
# 3) DEFAULT RISK — Gradient Boosting
# =========================================================================
def train_default_risk():
    print("→ [3/6] Risque de défaut (Gradient Boosting)…")
    X, y = [], []
    for _ in range(8000):
        trust_score = RNG.uniform(0, 100)
        completed = RNG.integers(0, 10)
        missed = RNG.integers(0, 6)
        late = RNG.integers(0, 8)
        on_time = RNG.integers(0, 30)
        avg_attempts = max(1, RNG.normal(1.2, 0.5))
        days_since = max(0, RNG.normal(15, 10))
        active = RNG.integers(0, 5)
        cumul = RNG.integers(0, 500000)
        disputes = RNG.integers(0, 3)

        # Vérité terrain : défaut probable si trust_score bas + missed élevé
        prob_default = 0.5 - trust_score / 200 + missed * 0.1 + late * 0.03 - completed * 0.02
        prob_default = max(0.01, min(0.99, prob_default))
        label = 1 if RNG.random() < prob_default else 0

        X.append([trust_score, completed, missed, late, on_time, avg_attempts,
                  days_since, active, cumul, disputes])
        y.append(label)

    X, y = np.array(X), np.array(y)
    split = int(0.8 * len(X))
    Xtr, ytr, Xte, yte = X[:split], y[:split], X[split:], y[split:]
    m = GradientBoostingClassifier(n_estimators=150, max_depth=4, learning_rate=0.1, random_state=42)
    m.fit(Xtr, ytr)
    yp = m.predict(Xte)
    joblib.dump(m, os.path.join(MODELS_DIR, "default_risk_model.joblib"))
    print(f"   ✓ Accuracy test: {accuracy_score(yte, yp):.3f}")


# =========================================================================
# 4) SEGMENTATION — KMeans
# =========================================================================
def train_segmentation():
    print("→ [4/6] Segmentation (KMeans, k=5)…")
    # Génère des profils répartis sur 5 archétypes (cf. ml/segmentation.py)
    profiles = []
    for _ in range(800):  # Champion
        profiles.append([RNG.uniform(80, 100), RNG.integers(3, 10), RNG.uniform(0.95, 1.0),
                         RNG.integers(0, 1), RNG.integers(1, 4), RNG.integers(180, 1000)])
    for _ in range(1500):  # Régulier
        profiles.append([RNG.uniform(60, 85), RNG.integers(1, 4), RNG.uniform(0.85, 0.98),
                         RNG.integers(0, 2), RNG.integers(0, 3), RNG.integers(60, 500)])
    for _ in range(1200):  # Nouveau
        profiles.append([RNG.uniform(45, 65), RNG.integers(0, 1), RNG.uniform(0.5, 0.9),
                         RNG.integers(0, 1), RNG.integers(0, 1), RNG.integers(0, 60)])
    for _ in range(800):  # Risque modéré
        profiles.append([RNG.uniform(35, 60), RNG.integers(0, 3), RNG.uniform(0.6, 0.85),
                         RNG.integers(1, 3), RNG.integers(0, 3), RNG.integers(30, 300)])
    for _ in range(500):  # Risque élevé
        profiles.append([RNG.uniform(0, 35), RNG.integers(0, 2), RNG.uniform(0, 0.6),
                         RNG.integers(2, 6), RNG.integers(0, 3), RNG.integers(30, 400)])
    X = np.array(profiles)
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    m = KMeans(n_clusters=5, n_init=20, random_state=42)
    m.fit(Xs)
    joblib.dump(scaler, os.path.join(MODELS_DIR, "segmentation_scaler.joblib"))
    joblib.dump(m, os.path.join(MODELS_DIR, "segmentation_model.joblib"))
    print(f"   ✓ Inertie: {m.inertia_:.0f}")


# =========================================================================
# 5) DISPUTE CLASSIFIER — TF-IDF + Naive Bayes
# =========================================================================
def train_dispute_clf():
    print("→ [5/6] Classification de litiges (TF-IDF + Naive Bayes)…")
    samples = [
        # paiement_manquant
        ("le membre n'a pas payé sa cotisation", "paiement_manquant"),
        ("aucune cotisation reçue depuis trois mois", "paiement_manquant"),
        ("paiement manquant pour le cycle 2", "paiement_manquant"),
        ("il n'a jamais payé sa part", "paiement_manquant"),
        ("le débiteur ne règle pas ses cotisations", "paiement_manquant"),
        ("missing contribution from member", "paiement_manquant"),
        # retard_recurrent
        ("ce membre est toujours en retard", "retard_recurrent"),
        ("retards répétés sur plusieurs mois", "retard_recurrent"),
        ("paie systématiquement avec un mois de retard", "retard_recurrent"),
        ("retard de paiement habituel", "retard_recurrent"),
        ("repeated late payments", "retard_recurrent"),
        # communication
        ("comportement irrespectueux dans le chat", "communication"),
        ("insultes envers les autres membres", "communication"),
        ("pas de réponse aux messages depuis longtemps", "communication"),
        ("communication difficile avec ce membre", "communication"),
        ("rude messages on the group", "communication"),
        # probleme_versement
        ("je n'ai pas reçu mon versement de la cagnotte", "probleme_versement"),
        ("la cagnotte n'a pas été versée à temps", "probleme_versement"),
        ("payout n'est jamais arrivé sur mon compte", "probleme_versement"),
        ("versement bloqué sur la plateforme", "probleme_versement"),
        ("missing payout from tontine", "probleme_versement"),
        # fraude_suspectee
        ("je pense que c'est une arnaque, le créateur a disparu", "fraude_suspectee"),
        ("usurpation d'identité, faux compte", "fraude_suspectee"),
        ("vol de la cagnotte par le gestionnaire", "fraude_suspectee"),
        ("escroquerie à la tontine", "fraude_suspectee"),
        ("suspected fraud and identity theft", "fraude_suspectee"),
        # autre
        ("autre problème non listé", "autre"),
        ("question sur le fonctionnement", "autre"),
        ("demande générique sans précision", "autre"),
    ]
    X = [s[0] for s in samples]
    y = [s[1] for s in samples]
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True)),
        ("clf", MultinomialNB()),
    ])
    pipeline.fit(X, y)
    joblib.dump(pipeline, os.path.join(MODELS_DIR, "dispute_clf_pipeline.joblib"))
    yp = pipeline.predict(X)
    print(f"   ✓ Accuracy entraînement: {accuracy_score(y, yp):.3f}")


# =========================================================================
# 6) FORECAST — Régression linéaire
# =========================================================================
def train_forecast():
    print("→ [6/6] Forecast cash-flow (Régression linéaire)…")
    X, y = [], []
    for _ in range(4000):
        idx = RNG.integers(1, 12)
        members = RNG.integers(3, 20)
        amt = RNG.uniform(10, 1000)
        score = RNG.uniform(20, 100)
        ratio = RNG.uniform(0.4, 1.0)
        # vérité = ratio de complétion
        completion = (score / 100 * 0.5 + ratio * 0.5) - 0.005 * idx
        completion = max(0.3, min(1.0, completion + RNG.normal(0, 0.05)))
        X.append([idx, members, amt, score, ratio])
        y.append(completion)
    X, y = np.array(X), np.array(y)
    m = LinearRegression()
    m.fit(X, y)
    joblib.dump(m, os.path.join(MODELS_DIR, "forecast_model.joblib"))
    print(f"   ✓ R² entraînement: {m.score(X, y):.3f}")


if __name__ == "__main__":
    train_scoring()
    train_anomaly()
    train_default_risk()
    train_segmentation()
    train_dispute_clf()
    train_forecast()
    print("\n✅ Tous les modèles sont prêts dans:", MODELS_DIR)
