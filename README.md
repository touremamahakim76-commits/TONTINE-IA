# TontineDigital

Plateforme numérique sécurisée d'épargne collective rotative (tontine) avec Intelligence Artificielle.

---

## Qu'est-ce qu'une tontine ?

Une tontine est un système d'épargne collectif : un groupe de personnes cotise régulièrement une somme fixe, et à chaque cycle, un membre différent reçoit la totalité des cotisations. TontineDigital numérise et sécurise ce processus avec des modèles d'IA.

---

## Architecture du projet

```
tontinedigital/
├── backend/          # API REST — Node.js + Express + SQLite
├── frontend/         # Interface web — React + Vite + Tailwind CSS
├── ai-service/       # Service IA — Python + FastAPI + scikit-learn
├── docs/             # Documentation technique détaillée
└── docker-compose.yml
```

---

## Stack technique complète

### Frontend
| Outil | Rôle |
|-------|------|
| **React 18** | Framework UI — composants, pages, état |
| **Vite** | Bundler ultra-rapide (remplace webpack) |
| **Tailwind CSS** | Styles utilitaires — pas de CSS custom |
| **Recharts** | Graphiques (courbes, barres, camemberts) |
| **Zustand** | Gestion d'état global (session utilisateur) |
| **Axios** | Client HTTP pour appeler l'API backend |
| **React Router v6** | Navigation entre les pages |
| **Lucide React** | Icônes SVG |
| **Inter (Google Fonts)** | Police de caractères principale |

### Backend
| Outil | Rôle |
|-------|------|
| **Node.js 20** | Environnement d'exécution JavaScript serveur |
| **Express.js** | Framework HTTP — routing, middlewares |
| **better-sqlite3** | Base de données SQLite (rapide, sans serveur) |
| **jsonwebtoken (JWT)** | Authentification sans session serveur |
| **bcryptjs** | Hachage sécurisé des mots de passe |
| **otplib** | Génération et vérification des codes 2FA (TOTP) |
| **qrcode** | Génération du QR code pour l'appli 2FA |
| **express-validator** | Validation des données entrantes |
| **express-rate-limit** | Protection contre les attaques par force brute |
| **helmet** | En-têtes HTTP de sécurité |
| **morgan** | Logging des requêtes HTTP |
| **uuid** | Génération d'identifiants uniques |
| **cors** | Autorisation des requêtes cross-origin |
| **swagger-ui-express** | Documentation API interactive (OpenAPI) |
| **axios** | Appels HTTP vers le service IA Python |

### Service IA (Python)
| Outil | Rôle |
|-------|------|
| **FastAPI** | Framework API Python asynchrone et performant |
| **scikit-learn** | Bibliothèque ML (Random Forest, KMeans, etc.) |
| **uvicorn** | Serveur ASGI pour FastAPI |
| **joblib** | Sauvegarde/chargement des modèles ML entraînés |
| **NumPy** | Calculs matriciels pour les modèles |
| **pandas** | Manipulation des données tabulaires |

### Infrastructure
| Outil | Rôle |
|-------|------|
| **Docker** | Conteneurisation de chaque service |
| **Docker Compose** | Orchestration des 3 conteneurs ensemble |
| **GitHub** | Versioning du code source |

---

## Les 7 modèles d'Intelligence Artificielle

| # | Modèle | Algorithme | Ce qu'il fait |
|---|--------|------------|----------------|
| 1 | **Score de fiabilité** | Random Forest | Note chaque utilisateur de 0 à 100 selon son comportement |
| 2 | **Détection d'anomalies** | Isolation Forest | Détecte les paiements ou comportements suspects |
| 3 | **Risque de défaut** | Gradient Boosting | Prédit la probabilité de manquer la prochaine cotisation |
| 4 | **Segmentation** | KMeans (5 clusters) | Classe les utilisateurs en 5 profils d'épargnants |
| 5 | **Recommandation membres** | Similarité cosinus | Suggère les membres les plus compatibles pour une tontine |
| 6 | **Classification litiges** | TF-IDF + Naive Bayes | Catégorise automatiquement les plaintes (NLP) |
| 7 | **Prévision flux** | Régression linéaire | Prévoit les montants collectés sur les cycles à venir |

Tous les modèles sont entraînés au démarrage (`python train_models.py`) sur des données synthétiques. En cas d'indisponibilité du service IA, des fallbacks heuristiques garantissent la continuité.

---

## Démarrage rapide

### Avec Docker (recommandé)

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Interface web | http://localhost:5173 |
| API backend | http://localhost:4000 |
| API documentation | http://localhost:4000/api/docs |
| Service IA | http://localhost:8000 |

### Sans Docker

```bash
# 1. Service IA
cd ai-service
pip install -r requirements.txt
python train_models.py
uvicorn main:app --reload --port 8000

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
```

---

## Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| alice@demo.com | demo1234 | Utilisatrice (créatrice de tontine) |
| bob@demo.com | demo1234 | Utilisateur (membre) |
| carla@demo.com | demo1234 | Utilisatrice (membre) |
| david@demo.com | demo1234 | Utilisateur (membre) |
| admin@tontinedigital.com | admin1234 | Administrateur |

---

## Fonctionnalités implémentées

- [x] Inscription / Connexion / Déconnexion
- [x] Authentification JWT (24h) + 2FA TOTP (Google Authenticator)
- [x] Création de tontines avec cible de membres et fréquence (hebdo/mensuel)
- [x] Invitation de membres par email
- [x] Acceptation / refus d'invitation
- [x] Démarrage automatique avec génération des cycles
- [x] Paiement des cotisations (Stripe sandbox)
- [x] Versement automatique au bénéficiaire du cycle
- [x] Score de confiance calculé après chaque paiement
- [x] 7 modèles ML en production (voir tableau ci-dessus)
- [x] Chatbot IA conversationnel (mode local ou OpenAI)
- [x] Système de litiges avec classification automatique
- [x] Notifications in-app avec actions directes
- [x] Tableau de bord avec graphiques
- [x] Page Insights IA interactive
- [x] Audit log immuable de toutes les actions
- [x] Documentation API Swagger/OpenAPI

---

## Structure du code

```
backend/src/
├── server.js                   Point d'entrée Express
├── db/
│   ├── index.js                Connexion SQLite
│   ├── schema.js               Schéma des tables
│   └── seed.js                 Données de démonstration
├── middleware/
│   ├── auth.js                 Vérification JWT + rôles
│   └── audit.js                Enregistrement des actions
├── routes/                     Un fichier par domaine métier
└── services/
    ├── tontine.service.js      Génération des cycles
    ├── payment.service.js      Stripe (sandbox → prod)
    ├── notification.service.js Notifications in-app
    └── ai.service.js           Pont vers le service IA

ai-service/
├── main.py                     Routes FastAPI
├── train_models.py             Entraînement des modèles
├── scoring.py                  Score de fiabilité
├── anomaly.py                  Détection d'anomalies
├── chatbot.py                  Chatbot IA
└── ml/
    ├── default_risk.py         Risque de défaut
    ├── segmentation.py         Segmentation KMeans
    ├── matching.py             Recommandation membres
    ├── forecast.py             Prévision flux
    └── dispute_clf.py          Classification litiges

frontend/src/
├── App.jsx                     Routes React
├── api/client.js               Client Axios + token JWT
├── hooks/useAuth.js            Store Zustand (session)
├── components/Layout.jsx       Sidebar + topbar
├── pages/                      10 pages (Login, Dashboard, Tontines...)
└── utils/format.js             Formatage dates et montants
```

---

## Documentation API

Après démarrage du backend : **http://localhost:4000/api/docs**

---

## Passer en production

1. Remplacer SQLite → PostgreSQL
2. HTTPS via nginx + Let's Encrypt
3. Brancher Stripe en mode production (`sk_live_...`)
4. Activer les vraies notifications (SendGrid, Twilio)
5. CI/CD via GitHub Actions
6. Monitoring (logs, alertes, sauvegardes)

---

## Licence

MIT — Projet réalisé dans le cadre d'un projet électif 2025/2026.
