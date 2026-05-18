const { v4: uuid } = require('uuid');
const db = require('../db');

/**
 * Génère les cycles d'une tontine au démarrage.
 */
function generateCycles(tontineId) {
  const tontine = db.prepare('SELECT * FROM tontines WHERE id = ?').get(tontineId);
  if (!tontine) throw new Error('Tontine introuvable');

  const memberships = db
    .prepare(
      "SELECT user_id, position FROM memberships WHERE tontine_id = ? AND status = 'accepted' ORDER BY position ASC"
    )
    .all(tontineId);

  if (memberships.length < tontine.members_target) {
    throw new Error(`Il faut ${tontine.members_target} membres acceptés pour démarrer (actuellement ${memberships.length}).`);
  }

  const totalAmount = tontine.amount * memberships.length;
  const insertCycle = db.prepare(`
    INSERT INTO cycles (id, tontine_id, cycle_index, beneficiary_id, due_date, total_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);

  const startDate = new Date();
  memberships.forEach((m, i) => {
    const dueDate = new Date(startDate);
    if (tontine.frequency === 'weekly') dueDate.setDate(dueDate.getDate() + i * 7);
    else dueDate.setMonth(dueDate.getMonth() + i);
    insertCycle.run(
      uuid(),
      tontineId,
      i + 1,
      m.user_id,
      dueDate.toISOString().slice(0, 10),
      totalAmount
    );
  });

  // Active le premier cycle
  db.prepare(
    "UPDATE cycles SET status = 'collecting' WHERE tontine_id = ? AND cycle_index = 1"
  ).run(tontineId);

  // Crée les contributions pending pour le 1er cycle
  const firstCycle = db
    .prepare('SELECT id FROM cycles WHERE tontine_id = ? AND cycle_index = 1')
    .get(tontineId);
  const insertContrib = db.prepare(`
    INSERT INTO contributions (id, cycle_id, user_id, amount, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  for (const m of memberships) {
    insertContrib.run(uuid(), firstCycle.id, m.user_id, tontine.amount);
  }

  db.prepare("UPDATE tontines SET status = 'active', start_date = date('now') WHERE id = ?").run(
    tontineId
  );

  return memberships.length;
}

/**
 * Avance la tontine au cycle suivant.
 */
function advanceCycle(tontineId) {
  const current = db
    .prepare(
      "SELECT * FROM cycles WHERE tontine_id = ? AND status = 'collecting' ORDER BY cycle_index ASC LIMIT 1"
    )
    .get(tontineId);
  if (!current) return null;

  // Vérifie que toutes les contributions sont payées
  const unpaid = db
    .prepare("SELECT COUNT(*) AS n FROM contributions WHERE cycle_id = ? AND status != 'paid'")
    .get(current.id).n;
  if (unpaid > 0) return { ready: false, unpaid };

  db.prepare(
    "UPDATE cycles SET status = 'paid_out', paid_out_at = datetime('now') WHERE id = ?"
  ).run(current.id);

  // Cycle suivant ?
  const next = db
    .prepare('SELECT * FROM cycles WHERE tontine_id = ? AND cycle_index = ?')
    .get(tontineId, current.cycle_index + 1);
  if (next) {
    db.prepare("UPDATE cycles SET status = 'collecting' WHERE id = ?").run(next.id);
    // Crée les contributions pending
    const memberships = db
      .prepare(
        "SELECT user_id FROM memberships WHERE tontine_id = ? AND status = 'accepted'"
      )
      .all(tontineId);
    const tontine = db.prepare('SELECT amount FROM tontines WHERE id = ?').get(tontineId);
    const insertContrib = db.prepare(`
      INSERT INTO contributions (id, cycle_id, user_id, amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    for (const m of memberships) {
      insertContrib.run(uuid(), next.id, m.user_id, tontine.amount);
    }
    return { ready: true, advancedTo: next.cycle_index };
  } else {
    db.prepare("UPDATE tontines SET status = 'completed' WHERE id = ?").run(tontineId);
    return { ready: true, completed: true };
  }
}

module.exports = { generateCycles, advanceCycle };
