# Guide de démarrage — TontineDigital

## Prérequis

- Node.js 20+
- Python 3.11+
- (Optionnel) Docker + docker-compose pour le démarrage tout-en-un

---

## Option A — Démarrage avec Docker (recommandé)

```bash
docker-compose up --build
```

Trois services sont lancés :

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Service IA | http://localhost:8000 |

Avant le premier lancement, dans un autre terminal :

```bash
docker-compose exec backend npm run seed
```

---

## Option B — Démarrage manuel

### 1. Service IA (Python)

```bash
cd ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python train_models.py        # entraîne les modèles ML (1 fois)
uvicorn main:app --reload --port 8000
```

### 2. Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env          # ajuste les variables
npm run seed                  # crée la BDD avec données de démo
npm run dev
```

### 3. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Ouvre http://localhost:5173

---

## Comptes de démonstration

Après `npm run seed` :

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| alice@demo.com | demo1234 | Utilisatrice (créatrice de la tontine de démo) |
| bob@demo.com | demo1234 | Membre |
| carla@demo.com | demo1234 | Membre |
| david@demo.com | demo1234 | Membre |
| admin@tontinedigital.com | admin1234 | Administrateur |

---

## Parcours de démonstration

1. **Connecte-toi** avec alice@demo.com → arrives sur le tableau de bord
2. **Vérifie** la tontine "Étudiants Paris" déjà créée (4 membres, 1 cycle payé, 1 en cours)
3. **Va dans Cotisations** → paie la cotisation en attente (sandbox Stripe)
4. **Consulte ton score** → vois comment il évolue après chaque paiement
5. **Ouvre l'Assistant** → pose lui « quel est mon score ? » ou « ma prochaine cotisation »
6. **Crée une nouvelle tontine** → invite bob@demo.com
7. **Connecte-toi avec bob@demo.com** → accepte l'invitation
8. **Reviens sur Alice** → démarre la tontine, observe la génération automatique des cycles

---

## Endpoints API principaux

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/2fa/setup     (renvoie QR code)
POST   /api/auth/2fa/enable

GET    /api/tontines
POST   /api/tontines
GET    /api/tontines/:id
POST   /api/tontines/:id/invite
POST   /api/tontines/:id/respond
POST   /api/tontines/:id/start

GET    /api/payments/contributions
POST   /api/payments/contributions/:id/pay

GET    /api/score/me
GET    /api/score/user/:userId

POST   /api/chat

GET    /api/disputes
POST   /api/disputes
POST   /api/disputes/:id/resolve

GET    /api/notifications
POST   /api/notifications/read-all

GET    /api/dashboard/me
GET    /api/dashboard/admin
```

Toutes les routes sauf `/auth/register` et `/auth/login` requièrent un `Authorization: Bearer <token>`.

---

## Architecture du code

```
backend/src/
├── server.js               Point d'entrée Express
├── db/
│   ├── index.js            Connexion better-sqlite3
│   ├── schema.js           DDL SQL
│   └── seed.js             Données de démo
├── middleware/
│   ├── auth.js             JWT + RBAC
│   └── audit.js            Audit log immuable
├── routes/                 Endpoints REST par domaine
└── services/
    ├── tontine.service.js  Cycle, génération
    ├── payment.service.js  Stripe sandbox
    ├── notification.service.js
    └── ai.service.js       Pont vers le service IA Python

ai-service/
├── main.py                 FastAPI app
├── scoring.py              Random Forest + heuristiques
├── anomaly.py              Isolation Forest
├── chatbot.py              Rule-based + OpenAI optionnel
└── train_models.py         Entraînement initial

frontend/src/
├── App.jsx                 Router principal
├── api/client.js           Axios instance + interceptors
├── hooks/useAuth.js        Store Zustand
├── components/Layout.jsx   Sidebar + header
├── pages/                  10 pages (auth, dashboard, tontines, ...)
└── utils/format.js         Helpers d'affichage
```

---

## Tests

### Tester le backend manuellement

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@demo.com","password":"demo1234"}'

# Avec le token reçu :
TOKEN="..."
curl http://localhost:4000/api/dashboard/me -H "Authorization: Bearer $TOKEN"
```

### Tester le service IA directement

```bash
curl -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"events":[{"event_type":"contribution_paid_on_time","weight":1}]}'

curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"comment fonctionne une tontine ?","context":{}}'
```

---

## Activer OpenAI (optionnel)

Le chatbot fonctionne par défaut en mode "rule-based" (sans coût, sans dépendance externe).
Pour activer OpenAI :

```bash
# dans ai-service/.env
OPENAI_API_KEY=sk-...
```

Le chatbot utilisera alors GPT-4o-mini avec un system prompt adapté.

---

## Activer Stripe en sandbox réel

Le service `payment.service.js` simule par défaut les paiements. Pour brancher Stripe :

1. Créer un compte Stripe et récupérer une clé `sk_test_...`
2. Renseigner `STRIPE_SECRET_KEY` dans `backend/.env`
3. Remplacer le contenu de `payment.service.js` par l'intégration Stripe (la signature de
   `createPaymentIntent` est compatible avec `stripe.paymentIntents.create`).

---

## Production

Pour passer en production :

1. Remplacer SQLite par PostgreSQL (changer `better-sqlite3` → `pg` + ORM type Prisma)
2. Activer HTTPS (reverse proxy nginx + Let's Encrypt)
3. Activer le rate limiting strict, configurer les CORS, durcir helmet
4. Remplacer les services mock (notifications, paiements) par leurs équivalents réels
5. Mettre en place CI/CD (GitHub Actions fournis dans `.github/workflows/` à créer)
6. Configurer la sauvegarde des données et le monitoring
