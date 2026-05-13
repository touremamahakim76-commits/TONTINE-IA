/**
 * Script de seed : crée des utilisateurs et tontines de démo.
 * Usage : npm run seed
 */
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('./index');

console.log('Seeding database…');

// Reset
db.exec(`
  DELETE FROM contributions;
  DELETE FROM cycles;
  DELETE FROM memberships;
  DELETE FROM tontines;
  DELETE FROM behavior_events;
  DELETE FROM notifications;
  DELETE FROM audit_logs;
  DELETE FROM disputes;
  DELETE FROM anomaly_alerts;
  DELETE FROM users;
`);

// Users
const users = [
  { email: 'alice@demo.com', name: 'Alice Diallo', role: 'user', score: 85 },
  { email: 'bob@demo.com', name: 'Bob Mensah', role: 'user', score: 72 },
  { email: 'carla@demo.com', name: 'Carla Nguema', role: 'user', score: 64 },
  { email: 'david@demo.com', name: 'David Kouassi', role: 'user', score: 90 },
  { email: 'admin@tontinedigital.com', name: 'Admin', role: 'admin', score: 100 },
];

const hashedPwd = bcrypt.hashSync('demo1234', 10);
const adminPwd = bcrypt.hashSync('admin1234', 10);

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, full_name, role, kyc_status, trust_score, language)
  VALUES (?, ?, ?, ?, ?, 'approved', ?, 'fr')
`);

const userIds = {};
for (const u of users) {
  const id = uuid();
  userIds[u.email] = id;
  insertUser.run(id, u.email, u.email === 'admin@tontinedigital.com' ? adminPwd : hashedPwd, u.name, u.role, u.score);
}
console.log(`✔  ${users.length} utilisateurs créés`);

// Tontine de démo
const tontineId = uuid();
db.prepare(`
  INSERT INTO tontines (id, name, description, owner_id, amount, currency, frequency, members_target, status, start_date)
  VALUES (?, ?, ?, ?, ?, 'EUR', 'monthly', 4, 'active', date('now'))
`).run(
  tontineId,
  'Tontine Étudiants Paris',
  'Tontine mensuelle pour financer des projets étudiants',
  userIds['alice@demo.com'],
  10000, // 100€
);

// Memberships
const insertMembership = db.prepare(`
  INSERT INTO memberships (id, user_id, tontine_id, position, status, joined_at)
  VALUES (?, ?, ?, ?, 'accepted', datetime('now'))
`);
['alice@demo.com', 'bob@demo.com', 'carla@demo.com', 'david@demo.com'].forEach((email, i) => {
  insertMembership.run(uuid(), userIds[email], tontineId, i + 1);
});
console.log('✔  Tontine de démo et 4 membres créés');

// Cycles : 1 déjà payé, 1 en cours, 2 à venir
const insertCycle = db.prepare(`
  INSERT INTO cycles (id, tontine_id, cycle_index, beneficiary_id, due_date, total_amount, status, paid_out_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const cycleIds = [];
const beneficiaries = ['alice@demo.com', 'bob@demo.com', 'carla@demo.com', 'david@demo.com'];
beneficiaries.forEach((email, i) => {
  const cid = uuid();
  cycleIds.push(cid);
  const status = i === 0 ? 'paid_out' : (i === 1 ? 'collecting' : 'pending');
  const paidOut = i === 0 ? `datetime('now', '-30 days')` : null;
  insertCycle.run(
    cid,
    tontineId,
    i + 1,
    userIds[email],
    new Date(Date.now() + (i - 1) * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    40000,
    status,
    paidOut ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : null,
  );
});
console.log(`✔  ${cycleIds.length} cycles créés`);

// Contributions pour le cycle 1 (déjà payé)
const insertContribution = db.prepare(`
  INSERT INTO contributions (id, cycle_id, user_id, amount, status, paid_at, payment_provider, payment_reference)
  VALUES (?, ?, ?, 10000, 'paid', datetime('now', '-30 days'), 'stripe_sandbox', ?)
`);
beneficiaries.forEach((email) => {
  insertContribution.run(uuid(), cycleIds[0], userIds[email], 'pi_demo_' + uuid().slice(0, 8));
});

// Contributions pour le cycle 2 (en cours, 2 sur 4 payés)
['alice@demo.com', 'bob@demo.com'].forEach((email) => {
  insertContribution.run(uuid(), cycleIds[1], userIds[email], 'pi_demo_' + uuid().slice(0, 8));
});
db.prepare(`
  INSERT INTO contributions (id, cycle_id, user_id, amount, status, payment_provider)
  VALUES (?, ?, ?, 10000, 'pending', 'stripe_sandbox')
`).run(uuid(), cycleIds[1], userIds['carla@demo.com']);
db.prepare(`
  INSERT INTO contributions (id, cycle_id, user_id, amount, status, payment_provider)
  VALUES (?, ?, ?, 10000, 'pending', 'stripe_sandbox')
`).run(uuid(), cycleIds[1], userIds['david@demo.com']);

console.log('✔  Contributions créées');

// Événements de comportement (pour le scoring)
const insertEvent = db.prepare(`
  INSERT INTO behavior_events (id, user_id, event_type, weight, metadata)
  VALUES (?, ?, ?, ?, ?)
`);
const eventsByUser = {
  'alice@demo.com': [['contribution_paid_on_time', 1.0]] .concat(Array(8).fill(['contribution_paid_on_time', 1.0])),
  'bob@demo.com': Array(5).fill(['contribution_paid_on_time', 1.0]).concat([['contribution_late', -0.5]]),
  'carla@demo.com': Array(3).fill(['contribution_paid_on_time', 1.0]).concat([['contribution_late', -0.5], ['contribution_late', -0.5]]),
  'david@demo.com': Array(10).fill(['contribution_paid_on_time', 1.0]).concat([['tontine_completed', 2.0]]),
};
for (const [email, events] of Object.entries(eventsByUser)) {
  for (const [type, weight] of events) {
    insertEvent.run(uuid(), userIds[email], type, weight, '{}');
  }
}
console.log('✔  Événements de comportement créés');

// Notifications
const insertNotif = db.prepare(`
  INSERT INTO notifications (id, user_id, type, channel, title, body)
  VALUES (?, ?, ?, 'in_app', ?, ?)
`);
insertNotif.run(uuid(), userIds['alice@demo.com'], 'cycle_reminder', 'Prochaine cotisation', 'Votre cotisation de 100€ est due dans 2 jours.');
insertNotif.run(uuid(), userIds['bob@demo.com'], 'payout_received', 'Versement reçu', 'Vous avez reçu 400€ de la tontine "Étudiants Paris".');
console.log('✔  Notifications de démo créées');

console.log('\n🎉 Base de données seedée avec succès.');
console.log('\nComptes de démo :');
console.log('  alice@demo.com / demo1234');
console.log('  bob@demo.com / demo1234');
console.log('  admin@tontinedigital.com / admin1234');
