const { v4: uuid } = require('uuid');
const db = require('../db');

const insertNotif = db.prepare(`
  INSERT INTO notifications (id, user_id, type, channel, title, body, data)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

/**
 * Envoie une notification.
 * En production : intégration SendGrid (email), Twilio (SMS), FCM (push).
 * En MVP : enregistre la notif en BDD et log la simulation d'envoi.
 */
function send({ userId, type, title, body, channel = 'in_app', data }) {
  const id = uuid();
  insertNotif.run(id, userId, type, channel, title, body || '', data ? JSON.stringify(data) : null);
  if (channel !== 'in_app' && process.env.NODE_ENV !== 'production') {
    console.log(`[NOTIF/${channel}] → user=${userId} | ${title} | ${body}`);
  }
  return id;
}

module.exports = { send };
