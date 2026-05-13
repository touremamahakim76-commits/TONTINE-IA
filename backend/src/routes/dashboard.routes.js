const express = require('express');
const db = require('../db');
const { authRequired, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Tableau de bord utilisateur
router.get('/me', authRequired, (req, res) => {
  const tontinesCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM tontines t
       LEFT JOIN memberships m ON m.tontine_id = t.id
       WHERE t.owner_id = ? OR (m.user_id = ? AND m.status = 'accepted')`
    )
    .get(req.user.id, req.user.id).n;

  const upcoming = db
    .prepare(`
      SELECT t.name AS tontine, c.due_date, co.amount, t.currency, co.status
      FROM contributions co
      JOIN cycles c ON c.id = co.cycle_id
      JOIN tontines t ON t.id = c.tontine_id
      WHERE co.user_id = ? AND co.status = 'pending'
      ORDER BY c.due_date ASC LIMIT 10
    `)
    .all(req.user.id);

  const totalSaved = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM contributions
       WHERE user_id = ? AND status = 'paid'`
    )
    .get(req.user.id).total;

  const totalReceived = db
    .prepare(
      `SELECT COALESCE(SUM(total_amount), 0) AS total FROM cycles
       WHERE beneficiary_id = ? AND status = 'paid_out'`
    )
    .get(req.user.id).total;

  // Historique mensuel des paiements (pour graph)
  const monthly = db
    .prepare(`
      SELECT strftime('%Y-%m', paid_at) AS month, SUM(amount) AS total
      FROM contributions
      WHERE user_id = ? AND status = 'paid' AND paid_at IS NOT NULL
      GROUP BY month ORDER BY month ASC
    `)
    .all(req.user.id);

  // Score
  const me = db.prepare('SELECT trust_score FROM users WHERE id = ?').get(req.user.id);

  // Notifications non lues
  const unread = db
    .prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .get(req.user.id).n;

  res.json({
    tontines_count: tontinesCount,
    upcoming_contributions: upcoming,
    total_saved: totalSaved,
    total_received: totalReceived,
    monthly_history: monthly,
    trust_score: me.trust_score,
    unread_notifications: unread,
  });
});

// Tableau de bord admin
router.get('/admin', authRequired, adminOnly, (req, res) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    tontines: db.prepare('SELECT COUNT(*) AS n FROM tontines').get().n,
    active_tontines: db.prepare("SELECT COUNT(*) AS n FROM tontines WHERE status = 'active'").get().n,
    total_volume: db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE status='paid'").get().s,
    open_disputes: db.prepare("SELECT COUNT(*) AS n FROM disputes WHERE status = 'open'").get().n,
    anomalies: db.prepare('SELECT COUNT(*) AS n FROM anomaly_alerts WHERE resolved = 0').get().n,
  };
  const recentAlerts = db
    .prepare('SELECT * FROM anomaly_alerts ORDER BY created_at DESC LIMIT 10')
    .all();
  res.json({ ...stats, recent_alerts: recentAlerts });
});

module.exports = router;
