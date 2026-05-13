/**
 * Pont vers le microservice IA Python (FastAPI).
 * Si le service IA n'est pas joignable, fallback sur des heuristiques locales.
 */
const axios = require('axios');
const db = require('../db');

const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT = 4000;

async function safeCall(path, payload, fallback) {
  try {
    const r = await axios.post(`${AI_BASE}${path}`, payload, { timeout: TIMEOUT });
    return r.data;
  } catch (e) {
    return fallback;
  }
}

async function safeGet(path, fallback) {
  try {
    const r = await axios.get(`${AI_BASE}${path}`, { timeout: TIMEOUT });
    return r.data;
  } catch (e) {
    return fallback;
  }
}

async function computeTrustScore(userId) {
  const events = db
    .prepare('SELECT event_type, weight FROM behavior_events WHERE user_id = ?')
    .all(userId);
  const fallback = (() => {
    const sum = events.reduce((acc, ev) => acc + ev.weight, 50);
    return { score: Math.max(0, Math.min(100, sum)), factors: { fallback: true, events: events.length } };
  })();
  return await safeCall('/score', { events }, fallback);
}

async function detectAnomalies(payload) {
  return await safeCall('/anomaly', payload, { anomalies: [], fallback: true });
}

async function chatbot(question, context = {}) {
  try {
    const r = await axios.post(`${AI_BASE}/chat`, { question, context }, { timeout: 15000 });
    return r.data;
  } catch (e) {
    return {
      answer:
        "Désolé, l'assistant n'est pas joignable. Voici quelques pistes : consultez votre tableau de bord, vérifiez vos prochaines échéances ou contactez le support.",
      fallback: true,
    };
  }
}

// ============== Nouveaux modèles ML ==============

/**
 * Construit les features ML à partir de la BDD pour un utilisateur.
 */
function buildUserFeatures(userId) {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!u) return null;

  const events = db
    .prepare('SELECT event_type FROM behavior_events WHERE user_id = ?')
    .all(userId);
  const onTime = events.filter((e) => e.event_type === 'contribution_paid_on_time').length;
  const late = events.filter((e) => e.event_type === 'contribution_late').length;
  const missed = events.filter((e) => e.event_type === 'contribution_missed').length;
  const completed = events.filter((e) => e.event_type === 'tontine_completed').length;
  const reported = events.filter((e) => e.event_type === 'reported').length;
  const total = events.length || 1;

  const activeTontines = db
    .prepare(`
      SELECT COUNT(*) AS n FROM memberships m
      JOIN tontines t ON t.id = m.tontine_id
      WHERE m.user_id = ? AND m.status = 'accepted' AND t.status = 'active'
    `)
    .get(userId).n;

  const cumul = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS s FROM contributions WHERE user_id = ? AND status = 'paid'")
    .get(userId).s;

  const lastPaid = db
    .prepare("SELECT MAX(paid_at) AS d FROM contributions WHERE user_id = ? AND status = 'paid'")
    .get(userId).d;
  const daysSince = lastPaid
    ? Math.floor((Date.now() - new Date(lastPaid).getTime()) / 86400000)
    : 999;

  const avgAttempts = db
    .prepare("SELECT COALESCE(AVG(attempt_count),1) AS a FROM contributions WHERE user_id = ?")
    .get(userId).a;

  const disputes = db
    .prepare('SELECT COUNT(*) AS n FROM disputes WHERE target_user_id = ?')
    .get(userId).n;

  const tenureDays = u.created_at
    ? Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000)
    : 0;

  return {
    id: u.id,
    full_name: u.full_name,
    trust_score: u.trust_score || 50,
    completed_cycles: completed,
    missed_count: missed,
    late_count: late,
    on_time_count: onTime,
    on_time_ratio: onTime / total,
    avg_attempts_per_payment: avgAttempts,
    days_since_last_payment: daysSince,
    active_tontines: activeTontines,
    cumulative_amount_paid: cumul,
    dispute_count: disputes,
    tenure_days: tenureDays,
  };
}

async function predictDefaultRisk(userId) {
  const features = buildUserFeatures(userId);
  if (!features) return null;
  return await safeCall('/default-risk', { features }, {
    default_probability: 0.3, risk_level: 'medium', engine: 'fallback',
  });
}

async function assignSegment(userId) {
  const features = buildUserFeatures(userId);
  if (!features) return null;
  return await safeCall('/segment', { features }, {
    cluster: 2, archetype: 'Nouveau prudent', engine: 'fallback', actions: [], color: '#f59e0b',
  });
}

async function recommendMembers(ownerId, topK = 10) {
  const target = buildUserFeatures(ownerId);
  if (!target) return [];

  // Tous les autres utilisateurs validés
  const others = db
    .prepare("SELECT id FROM users WHERE id != ? AND kyc_status = 'approved'")
    .all(ownerId);
  const candidates = others.map((u) => buildUserFeatures(u.id)).filter(Boolean);

  // Historique : nombre de tontines complétées en commun
  const sharedHistory = {};
  for (const c of candidates) {
    const n = db
      .prepare(`
        SELECT COUNT(*) AS n FROM tontines t
        JOIN memberships m1 ON m1.tontine_id = t.id AND m1.user_id = ?
        JOIN memberships m2 ON m2.tontine_id = t.id AND m2.user_id = ?
        WHERE t.status = 'completed'
      `)
      .get(ownerId, c.id).n;
    if (n > 0) sharedHistory[c.id] = n;
  }

  const r = await safeCall('/matching/recommend', {
    target, candidates, shared_history: sharedHistory, top_k: topK,
  }, { recommendations: [] });
  return r.recommendations || [];
}

async function classifyDispute(reason, description) {
  return await safeCall('/dispute/classify', { reason, description }, {
    category: 'autre', label: 'Autre', priority: 5, engine: 'fallback',
  });
}

async function forecastTontine(tontineId) {
  const t = db.prepare('SELECT * FROM tontines WHERE id = ?').get(tontineId);
  if (!t) return null;

  const cycles = db
    .prepare('SELECT * FROM cycles WHERE tontine_id = ? ORDER BY cycle_index')
    .all(tontineId);
  const lastIndex = cycles.filter((c) => c.status === 'paid_out').length;
  const remaining = cycles.length - lastIndex;
  if (remaining === 0) return { remaining: 0, forecast: [] };

  const memberIds = db
    .prepare("SELECT user_id FROM memberships WHERE tontine_id = ? AND status = 'accepted'")
    .all(tontineId).map((m) => m.user_id);
  const scores = memberIds
    .map((id) => db.prepare('SELECT trust_score FROM users WHERE id = ?').get(id)?.trust_score || 50);
  const avgScore = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);

  const onTimeEvents = db
    .prepare(`
      SELECT
        SUM(CASE WHEN event_type = 'contribution_paid_on_time' THEN 1 ELSE 0 END) AS ot,
        COUNT(*) AS total
      FROM behavior_events
      WHERE user_id IN (${memberIds.map(() => '?').join(',') || "''"})
    `)
    .get(...memberIds);
  const ratio = onTimeEvents.total > 0 ? onTimeEvents.ot / onTimeEvents.total : 0.85;

  return await safeCall('/forecast', {
    cycle_index: lastIndex,
    members_count: memberIds.length,
    amount_per_cycle: t.amount,
    avg_trust_score: avgScore,
    historical_on_time_ratio: ratio,
    remaining_cycles: remaining,
  }, { remaining, forecast: [] });
}

async function modelsInfo() {
  return await safeGet('/models/info', { models: [], unreachable: true });
}

module.exports = {
  computeTrustScore,
  detectAnomalies,
  chatbot,
  predictDefaultRisk,
  assignSegment,
  recommendMembers,
  classifyDispute,
  forecastTontine,
  modelsInfo,
  buildUserFeatures,
};
