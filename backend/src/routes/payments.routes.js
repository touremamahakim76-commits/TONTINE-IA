const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { authRequired } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const payment = require('../services/payment.service');
const { advanceCycle } = require('../services/tontine.service');
const { send: notify } = require('../services/notification.service');
const { computeTrustScore, detectAnomalies } = require('../services/ai.service');

const router = express.Router();

// Lister les contributions de l'utilisateur
router.get('/contributions', authRequired, (req, res) => {
  const rows = db
    .prepare(`
      SELECT c.*, cy.cycle_index, cy.due_date, cy.tontine_id, t.name AS tontine_name, t.currency
      FROM contributions c
      JOIN cycles cy ON cy.id = c.cycle_id
      JOIN tontines t ON t.id = cy.tontine_id
      WHERE c.user_id = ?
      ORDER BY cy.due_date DESC
    `)
    .all(req.user.id);
  res.json(rows);
});

// Payer une contribution
router.post('/contributions/:id/pay', authRequired, async (req, res) => {
  const contrib = db.prepare('SELECT * FROM contributions WHERE id = ?').get(req.params.id);
  if (!contrib) return res.status(404).json({ error: 'Contribution introuvable' });
  if (contrib.user_id !== req.user.id) return res.status(403).json({ error: 'Refusé' });
  if (contrib.status === 'paid') return res.status(400).json({ error: 'Déjà payée' });

  const cycle = db.prepare('SELECT * FROM cycles WHERE id = ?').get(contrib.cycle_id);
  const tontine = db.prepare('SELECT * FROM tontines WHERE id = ?').get(cycle.tontine_id);

  const intent = await payment.createPaymentIntent({
    amount: contrib.amount,
    currency: tontine.currency,
    userId: req.user.id,
    metadata: { contributionId: contrib.id, cycleId: cycle.id },
  });

  if (intent.status !== 'succeeded') {
    db.prepare(`
      UPDATE contributions SET status = 'failed', attempt_count = attempt_count + 1,
      payment_provider = ?, payment_reference = ?
      WHERE id = ?
    `).run(intent.provider, intent.reference, contrib.id);

    logAction({ userId: req.user.id, action: 'payment_failed', entityType: 'contribution', entityId: contrib.id, req, payload: intent });
    return res.status(402).json({ error: 'Paiement échoué', intent });
  }

  db.prepare(`
    UPDATE contributions
    SET status = 'paid', paid_at = datetime('now'),
        payment_provider = ?, payment_reference = ?,
        attempt_count = attempt_count + 1
    WHERE id = ?
  `).run(intent.provider, intent.reference, contrib.id);

  // Évène­ment de comportement (paiement à temps si avant la due_date)
  const onTime = new Date() <= new Date(cycle.due_date + 'T23:59:59');
  db.prepare(`
    INSERT INTO behavior_events (id, user_id, event_type, weight, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    uuid(),
    req.user.id,
    onTime ? 'contribution_paid_on_time' : 'contribution_late',
    onTime ? 1.0 : -0.5,
    JSON.stringify({ contributionId: contrib.id })
  );

  logAction({ userId: req.user.id, action: 'payment_succeeded', entityType: 'contribution', entityId: contrib.id, req });
  notify({ userId: req.user.id, type: 'payment_confirmed', title: 'Cotisation reçue', body: `Votre cotisation de ${(contrib.amount/100).toFixed(2)} ${tontine.currency} a été enregistrée.` });

  // Recalcule du score
  computeTrustScore(req.user.id).then((s) => {
    db.prepare('UPDATE users SET trust_score = ? WHERE id = ?').run(s.score, req.user.id);
  }).catch(() => {});

  // Si toutes payées → versement au bénéficiaire et avancement
  const result = advanceCycle(cycle.tontine_id);
  if (result && result.ready) {
    if (cycle.beneficiary_id) {
      const payout = await payment.createPayout({
        amount: cycle.total_amount,
        currency: tontine.currency,
        userId: cycle.beneficiary_id,
        metadata: { cycleId: cycle.id },
      });
      notify({
        userId: cycle.beneficiary_id,
        type: 'payout_received',
        title: 'Versement reçu',
        body: `Vous avez reçu ${(cycle.total_amount/100).toFixed(2)} ${tontine.currency} de la tontine « ${tontine.name} ».`,
        data: { cycleId: cycle.id, payoutRef: payout.reference },
      });
    }
  }

  // Détection d'anomalie (asynchrone)
  const userContribs = db
    .prepare('SELECT amount, attempt_count, status FROM contributions WHERE user_id = ?')
    .all(req.user.id);
  detectAnomalies({ contributions: userContribs }).then((r) => {
    if (r.anomalies && r.anomalies.length) {
      for (const a of r.anomalies) {
        db.prepare(`
          INSERT INTO anomaly_alerts (id, user_id, severity, description)
          VALUES (?, ?, ?, ?)
        `).run(uuid(), req.user.id, a.severity || 'low', a.description || 'Anomalie détectée');
      }
    }
  }).catch(() => {});

  res.json({ ok: true, intent, cycleAdvanced: result });
});

module.exports = router;
