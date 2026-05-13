/**
 * Schéma de la base de données SQLite.
 * Toutes les tables monétaires utilisent INTEGER (montants en centimes).
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user',                    -- user | admin
  kyc_status TEXT DEFAULT 'pending',           -- pending | approved | rejected
  twofa_secret TEXT,
  twofa_enabled INTEGER DEFAULT 0,
  trust_score REAL DEFAULT 50.0,
  language TEXT DEFAULT 'fr',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tontines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  amount INTEGER NOT NULL,                     -- en centimes
  currency TEXT DEFAULT 'EUR',
  frequency TEXT NOT NULL,                     -- weekly | monthly
  members_target INTEGER NOT NULL,
  order_strategy TEXT DEFAULT 'random',        -- random | fixed | bid
  status TEXT DEFAULT 'pending',               -- pending | active | completed | cancelled
  start_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tontine_id TEXT NOT NULL,
  position INTEGER,
  status TEXT DEFAULT 'invited',               -- invited | accepted | declined | removed
  joined_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, tontine_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tontine_id) REFERENCES tontines(id)
);

CREATE TABLE IF NOT EXISTS cycles (
  id TEXT PRIMARY KEY,
  tontine_id TEXT NOT NULL,
  cycle_index INTEGER NOT NULL,
  beneficiary_id TEXT,
  due_date TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',               -- pending | collecting | paid_out | failed
  paid_out_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tontine_id) REFERENCES tontines(id),
  FOREIGN KEY (beneficiary_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',               -- pending | paid | failed | refunded
  paid_at TEXT,
  payment_provider TEXT,
  payment_reference TEXT,
  attempt_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cycle_id) REFERENCES cycles(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS behavior_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,                    -- contribution_paid_on_time | contribution_late | contribution_missed | tontine_completed | dispute_opened | reported
  weight REAL DEFAULT 1.0,
  metadata TEXT,                               -- JSON string
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  tontine_id TEXT NOT NULL,
  opener_id TEXT NOT NULL,
  target_user_id TEXT,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',                  -- open | mediation | resolved | escalated
  resolution TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY (tontine_id) REFERENCES tontines(id),
  FOREIGN KEY (opener_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app',               -- in_app | email | sms | push
  title TEXT NOT NULL,
  body TEXT,
  data TEXT,
  read_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anomaly_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  tontine_id TEXT,
  severity TEXT DEFAULT 'low',                 -- low | medium | high
  description TEXT NOT NULL,
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tontine ON memberships(tontine_id);
CREATE INDEX IF NOT EXISTS idx_cycles_tontine ON cycles(tontine_id);
CREATE INDEX IF NOT EXISTS idx_contributions_cycle ON contributions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_user ON behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
`;

module.exports = SCHEMA;
