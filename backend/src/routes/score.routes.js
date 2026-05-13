const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { computeTrustScore } = require('../services/ai.service');

const router = express.Router();

// Score de l'utilisateur courant (avec détail des facteurs)
router.get('/me', authRequired, async (req, res) => {
  const result = await computeTrustScore(req.user.id);
  db.prepare('UPDATE users SET trust_score = ? WHERE id = ?').run(result.score, req.user.id);
  const events = db
    .prepare(
      'SELECT event_type, weight, created_at FROM behavior_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
    )
    .all(req.user.id);
  res.json({ ...result, recent_events: events });
});

// Score d'un autre utilisateur (visible avec son consentement implicite via membership commun)
router.get('/user/:userId', authRequired, async (req, res) => {
  // L'utilisateur ne peut consulter le score que d'utilisateurs avec qui il a une tontine commune
  const common = db
    .prepare(
      `
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.tontine_id = m2.tontine_id
      WHERE m1.user_id = ? AND m2.user_id = ? LIMIT 1
    `
    )
    .get(req.user.id, req.params.userId);
  if (!common && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Accès refusé' });

  const user = db
    .prepare('SELECT id, full_name, trust_score FROM users WHERE id = ?')
    .get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

module.exports = router;
