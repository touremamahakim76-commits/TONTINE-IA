const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id);
  res.json(rows);
});

router.post('/:id/read', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read_at = datetime("now") WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.post('/read-all', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read_at = datetime("now") WHERE user_id = ? AND read_at IS NULL')
    .run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
