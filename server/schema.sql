-- The sync server's database (feature 025, Cloudflare D1, which is SQLite). It holds only what constitution 3.0.1,
-- Principle III, allows: the email, a sign-in verifier and the devices' sign-ins, the data key encrypted by the
-- password and by the recovery code, and the encrypted stores with their size and save times. No plain data, no IP.

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,              -- the PBKDF2 salt, base64url
  verifier TEXT NOT NULL,          -- SHA-256(sign-in key ‖ pepper), base64url
  key_by_password TEXT NOT NULL,   -- the data key, wrapped by the key from the password
  key_by_recovery TEXT NOT NULL,   -- the data key, wrapped by the key from the recovery code
  confirmed_at INTEGER,            -- null until the email is confirmed
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS signins (
  token_hash TEXT PRIMARY KEY,     -- SHA-256 of the device's token; the token itself is never stored
  account_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS signins_account ON signins (account_id);

CREATE TABLE IF NOT EXISTS stores (
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,              -- progress, workouts or settings
  version INTEGER NOT NULL,
  iv TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  size INTEGER NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, name)
);

CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  kind TEXT NOT NULL,              -- confirm or reset
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS email_tokens_expiry ON email_tokens (expires_at);

CREATE TABLE IF NOT EXISTS failures (
  account_id INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS failures_account ON failures (account_id, at);
