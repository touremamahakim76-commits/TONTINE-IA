const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { chatbot } = require('../services/ai.service');

const router = express.Router();

router.post('/', authRequired, async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question manquante' });

  // Contexte personnel : tontines actives + score
  const tontines = db
    .prepare(`
      SELECT t.name, t.status, t.amount, t.currency, t.frequency
      FROM tontines t
      JOIN memberships m ON m.tontine_id = t.id
      WHERE m.user_id = ? AND m.status = 'accepted'
    `)
    .all(req.user.id);
  const upcoming = db
    .prepare(`
      SELECT t.name AS tontine, cy.due_date, c.amount, t.currency
      FROM contributions c
      JOIN cycles cy ON cy.id = c.cycle_id
      JOIN tontines t ON t.id = cy.tontine_id
      WHERE c.user_id = ? AND c.status = 'pending'
      ORDER BY cy.due_date ASC LIMIT 5
    `)
    .all(req.user.id);

  const context = {
    user: { name: req.user.full_name, score: req.user.trust_score },
    tontines,
    upcoming_contributions: upcoming,
  };

  const r = await chatbot(question, context);
  res.json(r);
});

module.exports = router;
