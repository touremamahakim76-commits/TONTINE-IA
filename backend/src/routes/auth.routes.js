const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { signToken, authRequired } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').isLength({ min: 2 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, full_name, phone, language } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    const id = uuid();
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, email, hash, full_name, phone || null, language || 'fr');

    const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(id);
    logAction({ userId: id, action: 'register', entityType: 'user', entityId: id, req });
    res.status(201).json({ token: signToken(user), user });
  }
);

router.post('/login', async (req, res) => {
  const { email, password, otp } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

  if (user.twofa_enabled) {
    if (!otp) return res.status(401).json({ error: 'Code 2FA requis', twofaRequired: true });
    const valid = authenticator.verify({ token: otp, secret: user.twofa_secret });
    if (!valid) return res.status(401).json({ error: 'Code 2FA invalide' });
  }

  const safeUser = {
    id: user.id, email: user.email, full_name: user.full_name,
    role: user.role, twofa_enabled: !!user.twofa_enabled, trust_score: user.trust_score,
  };
  logAction({ userId: user.id, action: 'login', entityType: 'user', entityId: user.id, req });
  res.json({ token: signToken(user), user: safeUser });
});

router.get('/me', authRequired, (req, res) => {
  const user = db
    .prepare('SELECT id, email, full_name, role, twofa_enabled, trust_score, kyc_status, language, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  res.json(user);
});

// Setup 2FA
router.post('/2fa/setup', authRequired, async (req, res) => {
  const secret = authenticator.generateSecret();
  db.prepare('UPDATE users SET twofa_secret = ? WHERE id = ?').run(secret, req.user.id);
  const otpauth = authenticator.keyuri(req.user.email, 'TontineDigital', secret);
  const qr = await QRCode.toDataURL(otpauth);
  res.json({ secret, qr });
});

router.post('/2fa/enable', authRequired, (req, res) => {
  const { otp } = req.body;
  const user = db.prepare('SELECT twofa_secret FROM users WHERE id = ?').get(req.user.id);
  if (!user.twofa_secret) return res.status(400).json({ error: 'Setup non initié' });
  const valid = authenticator.verify({ token: otp, secret: user.twofa_secret });
  if (!valid) return res.status(400).json({ error: 'Code invalide' });
  db.prepare('UPDATE users SET twofa_enabled = 1 WHERE id = ?').run(req.user.id);
  logAction({ userId: req.user.id, action: '2fa_enabled', req });
  res.json({ ok: true });
});

router.post('/2fa/disable', authRequired, (req, res) => {
  db.prepare('UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?').run(req.user.id);
  logAction({ userId: req.user.id, action: '2fa_disabled', req });
  res.json({ ok: true });
});

module.exports = router;
