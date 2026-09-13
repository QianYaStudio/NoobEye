CREATE TABLE IF NOT EXISTS subscription_requests (
 email TEXT PRIMARY KEY,
 locale TEXT NOT NULL,
 token_hash TEXT UNIQUE NOT NULL,
 requested_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 confirmed_at INTEGER
);
CREATE INDEX IF NOT EXISTS subscription_expiry ON subscription_requests(expires_at);
CREATE TABLE IF NOT EXISTS runs (
  run_id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  issue TEXT NOT NULL,
  revision INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  elapsed_ms INTEGER,
  hints INTEGER NOT NULL DEFAULT 0,
  mistakes INTEGER NOT NULL DEFAULT 0,
  eligible INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS runs_issue ON runs(issue, revision, completed_at);
CREATE INDEX IF NOT EXISTS runs_visitor ON runs(visitor_id, issue, revision);
