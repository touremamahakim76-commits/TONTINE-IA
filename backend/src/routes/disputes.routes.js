const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { send: notify } = require('../services/notification.service');
const { classifyDispute } = require('../services/ai.service');

const router = express.Router();

// Liste des litiges visibles par l'utilisateur (ses tontines)
router.get('/', authRequired, (req, res) => {
  const rows = db
    .prepare(`
      SELECT d.*, t.name AS tontine_name, u.full_name AS opener_name
      FROM disputes d
      JOIN tontines t ON t.id = d.tontine_id
      JOIN users u ON u.id = d.opener_id
      WHERE d.tontine_id IN (SELECT tontine_id FROM memberships WHERE user_id = ?)
        OR d.tontine_id IN (SELECT id FROM tontines WHERE owner_id = ?)
      ORDER BY d.created_at DESC
    `)
    .all(req.user.id, req.user.id);
  res.json(rows);
});

// Ouvrir un litige (avec classification ML automatique)
router.post('/', authRequired, async (req, res) => {
  const { tontineId, reason, description, targetUserId } = req.body;
  if (!tontineId || !reason) return res.status(400).json({ error: 'tontineId et reason requis' });

  const member = db
    .prepare('SELECT id FROM memberships WHERE user_id = ? AND tontine_id = ?')
    .get(req.user.id, tontineId);
  if (!member) return res.status(403).json({ error: 'Vous n\'êtes pas membre de cette tontine' });

  // Classification automatique du litige par le modèle NLP
  const classification = await classifyDispute(reason, description || '');

  const id = uuid();
  db.prepare(`
    INSERT INTO disputes (id, tontine_id, opener_id, target_user_id, reason, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, tontineId, req.user.id, targetUserId || null, reason, description || '');

  // Notifie le propriétaire de la tontine
  const tontine = db.prepare('SELECT owner_id, name FROM tontines WHERE id = ?').get(tontineId);
  if (tontine && tontine.owner_id !== req.user.id) {
    notify({
      userId: tontine.owner_id,
      type: 'dispute_opened',
      title: 'Nouveau litige',
      body: `Un litige a été ouvert sur la tontine « ${tontine.name} ».`,
      data: { disputeId: id },
    });
  }

  // Événement de comportement négatif si target désigné
  if (targetUserId) {
    db.prepare(`
      INSERT INTO behavior_events (id, user_id, event_type, weight, metadata)
      VALUES (?, ?, 'reported', -1.5, ?)
    `).run(uuid(), targetUserId, JSON.stringify({ disputeId: id }));
  }

  logAction({
    userId: req.user.id, action: 'open_dispute', entityType: 'dispute', entityId: id, req,
    payload: { auto_classification: classification },
  });
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
  res.status(201).json({ ...dispute, classification });
});

// Résoudre un litige (créateur de la tontine ou admin)
router.post('/:id/resolve', authRequired, (req, res) => {
  const dispute = db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
  if (!dispute) return res.status(404).json({ error: 'Litige introuvable' });
  const tontine = db.prepare('SELECT owner_id FROM tontines WHERE id = ?').get(dispute.tontine_id);
  if (tontine.owner_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Refusé' });

  const { resolution } = req.body;
  db.prepare(`
    UPDATE disputes SET status = 'resolved', resolution = ?, resolved_at = datetime('now')
    WHERE id = ?
  `).run(resolution || '', req.params.id);

  notify({
    userId: dispute.opener_id,
    type: 'dispute_resolved',
    title: 'Litige résolu',
    body: 'Votre litige a été résolu.',
    data: { disputeId: req.params.id },
  });
  logAction({ userId: req.user.id, action: 'resolve_dispute', entityType: 'dispute', entityId: req.params.id, req });
  res.json({ ok: true });
});

module.exports = router;
