# TontineDigital

Plateforme numérique sécurisée d'épargne collective rotative (tontine) — Projet électif 2025/2026.

## Architecture

```
tontinedigital/
├── backend/        # API REST Node.js + Express + SQLite
├── frontend/       # SPA React + Vite + Tailwind
├── ai-service/     # Microservice Python FastAPI (scoring, anomalies, chatbot)
├── docs/           # Documentation technique
└── docker-compose.yml
```

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + Tailwind + Recharts |
| Backend | Node.js + Express + better-sqlite3 |
| Auth | JWT + bcrypt + 2FA TOTP |
| Paiements | Stripe (sandbox) |
| Service IA | Python 3.11 + FastAPI + scikit-learn |
| BDD | SQLite (dev) / PostgreSQL (prod) |

## Démarrage rapide

### Avec Docker (recommandé)

```bash
docker-compose up --build
```

Frontend : http://localhost:5173
Backend : http://localhost:4000
IA : http://localhost:8000

### Sans Docker

**Backend :**
```bash
cd backend
npm install
npm run seed     # crée la BDD avec données de démo
npm run dev
```

**Service IA :**
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend :**
```bash
cd frontend
npm install
npm run dev
```

## Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| alice@demo.com | demo1234 | Utilisatrice (créatrice de tontine) |
| bob@demo.com | demo1234 | Utilisateur (membre) |
| admin@tontinedigital.com | admin1234 | Administrateur |

## Modules implémentés

- [x] Authentification JWT + inscription + 2FA (TOTP)
- [x] Gestion complète des tontines (création, invitation, démarrage, cycles)
- [x] Cotisations automatiques avec Stripe sandbox
- [x] **6 modèles d'apprentissage automatique** (voir ci-dessous)
- [x] Chatbot conversationnel
- [x] Système de médiation et de litiges (avec classification ML auto)
- [x] Tableau de bord avec Recharts
- [x] Page « Insights IA » dédiée
- [x] Notifications (email/SMS simulés)
- [x] Audit log immuable
- [x] Internationalisation FR/EN

## Modèles ML

| # | Modèle | Algorithme | Usage |
|---|--------|-----------|-------|
| 1 | Scoring de fiabilité | Random Forest (sklearn) | Score 0-100 par utilisateur |
| 2 | Détection d'anomalies | Isolation Forest | Repère les comportements suspects |
| 3 | Risque de défaut | Gradient Boosting | Prédit la probabilité de défaut sur la prochaine cotisation |
| 4 | Segmentation utilisateurs | KMeans (k=5) + StandardScaler | 5 archétypes (Champion, Régulier, Nouveau, Risque modéré, Risque élevé) |
| 5 | Recommandation de membres | Similarité cosinus + scoring | Suggère des membres compatibles pour une tontine |
| 6 | Classification de litiges | TF-IDF + Naive Bayes (NLP) | Catégorise automatiquement les litiges |
| 7 | Forecast cash-flow | Régression linéaire | Prévoit les flux de trésorerie d'une tontine |

Tous les modèles sont entraînés sur des données synthétiques au build (`python train_models.py`) et exposés via FastAPI. En cas d'indisponibilité du service IA, des fallbacks heuristiques garantissent la continuité de service.

## Documentation API

Une fois le backend démarré, la doc OpenAPI est disponible sur :
http://localhost:4000/api/docs

## Tests

```bash
# Backend
cd backend && npm test

# Service IA
cd ai-service && pytest
```

## Licence

MIT — Projet éducatif réalisé dans le cadre du projet électif.
