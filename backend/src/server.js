/**
 * TontineDigital — Backend API
 * Serveur Express principal.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const authRoutes = require('./routes/auth.routes');
const tontinesRoutes = require('./routes/tontines.routes');
const paymentsRoutes = require('./routes/payments.routes');
const scoreRoutes = require('./routes/score.routes');
const chatRoutes = require('./routes/chat.routes');
const disputesRoutes = require('./routes/disputes.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const mlRoutes = require('./routes/ml.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globaux
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

// Rate limit global (anti-bruteforce)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'tontinedigital-backend', time: new Date().toISOString() }));

// Documentation OpenAPI minimaliste (description en JSON)
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'TontineDigital API',
    version: '1.0.0',
    endpoints: [
      { method: 'POST', path: '/api/auth/register' },
      { method: 'POST', path: '/api/auth/login' },
      { method: 'GET', path: '/api/auth/me' },
      { method: 'POST', path: '/api/auth/2fa/setup' },
      { method: 'POST', path: '/api/auth/2fa/enable' },
      { method: 'GET', path: '/api/tontines' },
      { method: 'POST', path: '/api/tontines' },
      { method: 'GET', path: '/api/tontines/:id' },
      { method: 'POST', path: '/api/tontines/:id/invite' },
      { method: 'POST', path: '/api/tontines/:id/respond' },
      { method: 'POST', path: '/api/tontines/:id/start' },
      { method: 'GET', path: '/api/payments/contributions' },
      { method: 'POST', path: '/api/payments/contributions/:id/pay' },
      { method: 'GET', path: '/api/score/me' },
      { method: 'GET', path: '/api/score/user/:userId' },
      { method: 'POST', path: '/api/chat' },
      { method: 'GET', path: '/api/disputes' },
      { method: 'POST', path: '/api/disputes' },
      { method: 'POST', path: '/api/disputes/:id/resolve' },
      { method: 'GET', path: '/api/notifications' },
      { method: 'GET', path: '/api/dashboard/me' },
      { method: 'GET', path: '/api/dashboard/admin' },
      { method: 'GET', path: '/api/ml/models' },
      { method: 'GET', path: '/api/ml/default-risk/me' },
      { method: 'GET', path: '/api/ml/default-risk/tontine/:id' },
      { method: 'GET', path: '/api/ml/segment/me' },
      { method: 'GET', path: '/api/ml/segment/distribution' },
      { method: 'GET', path: '/api/ml/matching/recommend' },
      { method: 'POST', path: '/api/ml/dispute/classify' },
      { method: 'GET', path: '/api/ml/forecast/tontine/:id' },
    ],
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tontines', tontinesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ml', mlRoutes);

// Gestion d'erreurs
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

// 404
app.use((req, res) => res.status(404).json({ error: 'Endpoint introuvable' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✓ TontineDigital backend démarré sur http://localhost:${PORT}`);
    console.log(`✓ Documentation : http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app;
