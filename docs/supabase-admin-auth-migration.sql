-- Admin authentication persistence for Lucas & Andressa wedding.
-- Run this once in Supabase SQL Editor if your database was created before
-- admin_users was added to docs/supabase-migration.sql.

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO admin_users (username, password_hash)
VALUES
  (
    'lucastoledo',
    'aa6fb2e45c8643ef818b968218b59fb4:4a571d2a19d0613e7b8075e62d22aa303f2c8dce5a6329cb05d370a7d127c83b44fb421da715ac4701c5bc00048a62b9ce47dced1edda7c078894395db1be5d7'
  ),
  (
    'andressa',
    '51277517601a058c9dc207ab2de4c078:afd797f3df51904e04ed377c2fb7f0d3f90a24768484bdec5a57478e21aa5148a06ee9b5014fd8f807318453a2031f463265b07b2deb195d286d714fc7135a01'
  )
ON CONFLICT (username)
DO UPDATE SET password_hash = EXCLUDED.password_hash;
