-- D1 schema for the shared api.chigoa.me Worker
-- wrangler d1 execute chigoa-api --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS claps (
  site TEXT PRIMARY KEY,          -- @user@host
  count INTEGER NOT NULL DEFAULT 0
);

-- who clapped in the last hour (hashed address), so one visitor counts once
CREATE TABLE IF NOT EXISTS clap_seen (
  site TEXT NOT NULL,
  visitor TEXT NOT NULL,
  at INTEGER NOT NULL,            -- unix seconds
  PRIMARY KEY (site, visitor)
);
CREATE INDEX IF NOT EXISTS clap_seen_at ON clap_seen (at);
