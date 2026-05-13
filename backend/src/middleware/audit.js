const { v4: uuid } = require('uuid');
const db = require('../db');

const insertLog = db.prepare(`
  INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent, payload)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

function logAction({ userId, action, entityType, entityId, req, payload }) {
  try {
    insertLog.run(
      uuid(),
      userId || null,
      action,
      entityType || null,
      entityId || null,
      req?.ip || null,
      req?.headers?.['user-agent'] || null,
      payload ? JSON.stringify(payload) : null
    );
  } catch (e) {
    // L'audit log ne doit pas casser une requête
    console.error('Audit log error:', e.message);
  }
}

module.exports = { logAction };
