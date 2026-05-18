const express = require('express');
const { v4: uuid } = require('uuid');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { generateCycles } = require('../services/tontine.service');
const { send: notify } = require('../services/notification.service');

const router = express.Router();

// Liste des tontines de l'utilisateur
router.get('/', authRequired, (req, res) => {
  const tontines = db
    .prepare(
      `
      SELECT t.*, m.status AS membership_status, m.position AS my_position
      FROM tontines t
      LEFT JOIN memberships m ON m.tontine_id = t.id AND m.user_id = ?
      WHERE t.owner_id = ? OR m.user_id = ?
      ORDER BY t.created_at DESC
    `
    )
    .all(req.user.id, req.user.id, req.user.id);
  res.json(tontines);
});

// Détail
router.get('/:id', authRequired, (req, res) => {
  const tontine = db.prepare('SELECT * FROM tontines WHERE id = ?').get(req.params.id);
  if (!tontine) return res.status(404).json({ error: 'Tontine introuvable' });

  const members = db
    .prepare(`
      SELECT m.*, u.full_name, u.email, u.trust_score
      FROM memberships m
      JOIN users u ON u.id = m.user_id
      WHERE m.tontine_id = ?
      ORDER BY m.position ASC
    `)
    .all(req.params.id);

  const cycles = db
    .prepare(`
      SELECT c.*, u.full_name AS beneficiary_name
      FROM cycles c
      LEFT JOIN users u ON u.id = c.beneficiary_id
      WHERE c.tontine_id = ?
      ORDER BY c.cycle_index ASC
    `)
    .all(req.params.id);

  res.json({ ...tontine, members, cycles });
});

// Création
router.post(
  '/',
  authRequired,
  [
    body('name').isLength({ min: 3 }),
    body('amount').isInt({ min: 100 }),
    body('frequency').isIn(['weekly', 'monthly']),
    body('members_target').isInt({ min: 2, max: 30 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, amount, currency, frequency, members_target, order_strategy } =
      req.body;
    const id = uuid();
    db.prepare(`
      INSERT INTO tontines (id, name, description, owner_id, amount, currency, frequency, members_target, order_strategy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || '',
      req.user.id,
      amount,
      currency || 'EUR',
      frequency,
      members_target,
      order_strategy || 'random'
    );

    // Le créateur est automatiquement membre
    db.prepare(`
      INSERT INTO memberships (id, user_id, tontine_id, position, status, joined_at)
      VALUES (?, ?, ?, 1, 'accepted', datetime('now'))
    `).run(uuid(), req.user.id, id);

    logAction({ userId: req.user.id, action: 'create_tontine', entityType: 'tontine', entityId: id, req });
    res.status(201).json(db.prepare('SELECT * FROM tontines WHERE id = ?').get(id));
  }
);

// Inviter un membre
router.post('/:id/invite', authRequired, (req, res) => {
  const tontine = db.prepare('SELECT * FROM tontines WHERE id = ?').get(req.params.id);
  if (!tontine) return res.status(404).json({ error: 'Tontine introuvable' });
  if (tontine.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Seul le créateur peut inviter' });

  const { email } = req.body;
  const invited = db.prepare('SELECT id, full_name FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!invited) return res.status(404).json({ error: 'Utilisateur non trouvé' });

  const existing = db
    .prepare('SELECT * FROM memberships WHERE user_id = ? AND tontine_id = ?')
    .get(invited.id, req.params.id);

  if (existing) {
    // Permet de ré-inviter un membre qui avait décliné
    if (existing.status === 'declined') {
      db.prepare("UPDATE memberships SET status = 'invited', joined_at = NULL WHERE id = ?")
        .run(existing.id);
      notify({
        userId: invited.id,
        type: 'tontine_invitation',
        title: 'Invitation à rejoindre une tontine',
        body: `Vous êtes invité(e) à rejoindre la tontine « ${tontine.name} ».`,
        data: { tontineId: req.params.id },
      });
      logAction({ userId: req.user.id, action: 'reinvite_member', entityType: 'tontine', entityId: req.params.id, req, payload: { invitedUserId: invited.id } });
      return res.status(201).json({ ok: true, invitedUser: invited });
    }
    return res.status(409).json({ error: 'Déjà invité ou membre' });
  }

  // Compte uniquement les membres non-déclinés pour savoir si la tontine est pleine
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM memberships WHERE tontine_id = ? AND status != 'declined'")
    .get(req.params.id).n;
  const position = count + 1;
  if (position > tontine.members_target)
    return res.status(400).json({ error: 'Tontine pleine' });

  const mid = uuid();
  db.prepare(`
    INSERT INTO memberships (id, user_id, tontine_id, position, status)
    VALUES (?, ?, ?, ?, 'invited')
  `).run(mid, invited.id, req.params.id, position);

  notify({
    userId: invited.id,
    type: 'tontine_invitation',
    title: 'Invitation à rejoindre une tontine',
    body: `Vous êtes invité(e) à rejoindre la tontine « ${tontine.name} ».`,
    data: { tontineId: req.params.id },
  });

  logAction({
    userId: req.user.id,
    action: 'invite_member',
    entityType: 'tontine',
    entityId: req.params.id,
    req,
    payload: { invitedUserId: invited.id },
  });
  res.status(201).json({ ok: true, invitedUser: invited });
});

// Accepter / refuser une invitation
router.post('/:id/respond', authRequired, (req, res) => {
  const { accept } = req.body;
  const m = db
    .prepare('SELECT * FROM memberships WHERE user_id = ? AND tontine_id = ?')
    .get(req.user.id, req.params.id);
  if (!m) return res.status(404).json({ error: 'Aucune invitation' });
  if (m.status !== 'invited') return res.status(400).json({ error: `Invitation déjà traitée (statut actuel : ${m.status}). Reconnectez-vous avec le bon compte.` });

  const newStatus = accept ? 'accepted' : 'declined';
  db.prepare("UPDATE memberships SET status = ?, joined_at = datetime('now') WHERE id = ?")
    .run(newStatus, m.id);
  logAction({ userId: req.user.id, action: 'respond_invitation', entityType: 'tontine', entityId: req.params.id, req, payload: { accept } });
  res.json({ status: newStatus });
});

// Démarrer la tontine (créateur uniquement, quand tous ont accepté)
router.post('/:id/start', authRequired, (req, res) => {
  const tontine = db.prepare('SELECT * FROM tontines WHERE id = ?').get(req.params.id);
  if (!tontine) return res.status(404).json({ error: 'Tontine introuvable' });
  if (tontine.owner_id !== req.user.id) return res.status(403).json({ error: 'Refusé' });
  if (tontine.status !== 'pending')
    return res.status(400).json({ error: 'Déjà démarrée ou clôturée' });

  try {
    const n = generateCycles(req.params.id);
    logAction({ userId: req.user.id, action: 'start_tontine', entityType: 'tontine', entityId: req.params.id, req });

    // Notifie tous les membres
    const members = db.prepare("SELECT user_id FROM memberships WHERE tontine_id = ? AND status = 'accepted'").all(req.params.id);
    for (const m of members) {
      notify({
        userId: m.user_id,
        type: 'tontine_started',
        title: 'Tontine démarrée',
        body: `La tontine « ${tontine.name} » a démarré.`,
        data: { tontineId: req.params.id },
      });
    }
    res.json({ ok: true, cyclesGenerated: n });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
