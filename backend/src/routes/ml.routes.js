/**
 * Routes ML — expose les 6 modèles d'apprentissage automatique.
 */
const express = require('express');
const db = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');
const ai = require('../services/ai.service');

const router = express.Router();

// Information sur les modèles chargés
router.get('/models', authRequired, async (req, res) => {
  const info = await ai.modelsInfo();
  res.json(info);
});

// Risque de défaut pour l'utilisateur courant
router.get('/default-risk/me', authRequired, async (req, res) => {
  const r = await ai.predictDefaultRisk(req.user.id);
  res.json(r);
});

// Risque de défaut pour TOUS les membres d'une tontine (vue créateur)
router.get('/default-risk/tontine/:id', authRequired, async (req, res) => {
  const tontine = db.prepare('SELECT * FROM tontines WHERE id = ?').get(req.params.id);
  if (!tontine) return res.status(404).json({ error: 'Tontine introuvable' });
  if (tontine.owner_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Réservé au créateur' });
  }
  const members = db
    .prepare("SELECT user_id FROM memberships WHERE tontine_id = ? AND status = 'accepted'")
    .all(req.params.id);
  const out = [];
  for (const m of members) {
    const f = ai.buildUserFeatures(m.user_id);
    const r = await ai.predictDefaultRisk(m.user_id);
    out.push({ user_id: m.user_id, full_name: f?.full_name, ...r });
  }
  res.json(out);
});

// Segmentation de l'utilisateur
router.get('/segment/me', authRequired, async (req, res) => {
  const r = await ai.assignSegment(req.user.id);
  res.json(r);
});

// Distribution globale des segments (admin)
router.get('/segment/distribution', authRequired, adminOnly, async (req, res) => {
  const users = db.prepare('SELECT id FROM users').all();
  const features = users.map((u) => ai.buildUserFeatures(u.id)).filter(Boolean);
  const r = await ai.modelsInfo(); // pour archetypes
  // On appelle directement le service
  const axios = require('axios');
  const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  try {
    const resp = await axios.post(`${AI_BASE}/segment/distribution`, { users: features }, { timeout: 5000 });
    return res.json(resp.data);
  } catch (e) {
    res.json({ distribution: {}, error: 'IA non joignable' });
  }
});

// Recommandation de membres compatibles
router.get('/matching/recommend', authRequired, async (req, res) => {
  const top = parseInt(req.query.top || '10', 10);
  const recs = await ai.recommendMembers(req.user.id, top);
  res.json(recs);
});

// Classification d'un texte de litige
router.post('/dispute/classify', authRequired, async (req, res) => {
  const { reason, description } = req.body;
  if (!reason) return res.status(400).json({ error: 'reason requis' });
  const r = await ai.classifyDispute(reason, description || '');
  res.json(r);
});

// Forecast d'une tontine
router.get('/forecast/tontine/:id', authRequired, async (req, res) => {
  const f = await ai.forecastTontine(req.params.id);
  if (!f) return res.status(404).json({ error: 'Tontine introuvable' });
  res.json(f);
});

module.exports = router;
