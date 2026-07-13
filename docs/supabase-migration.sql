-- Supabase migration for Lucas & Andressa wedding.
-- Run this once in Supabase SQL Editor before deploying with DATABASE_URL.

CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  groom_name VARCHAR(100) NOT NULL,
  bride_name VARCHAR(100) NOT NULL,
  parent_groom VARCHAR(255),
  parent_bride VARCHAR(255),
  wedding_date DATE NOT NULL,
  time VARCHAR(100),
  location VARCHAR(500),
  address TEXT,
  maps_url TEXT,
  maps_embed TEXT,
  og_image VARCHAR(500) DEFAULT '/images/og-image.jpg',
  favicon VARCHAR(500) DEFAULT '/images/favicon.ico',
  audio JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wishes (
  id SERIAL PRIMARY KEY,
  invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  attendance VARCHAR(20) DEFAULT 'MAYBE' CHECK (attendance IN ('ATTENDING', 'NOT_ATTENDING', 'MAYBE')),
  ip_address TEXT,
  device TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_wish_per_guest UNIQUE (invitation_uid, name)
);

CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  party_size INTEGER DEFAULT 1 CHECK (party_size > 0),
  attendance VARCHAR(20) DEFAULT 'PENDING' CHECK (attendance IN ('PENDING', 'ATTENDING', 'NOT_ATTENDING')),
  message TEXT DEFAULT '',
  confirmed_at TIMESTAMP,
  confirmed_ip TEXT,
  confirmed_device TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_guest_per_invitation UNIQUE (invitation_uid, normalized_name)
);

CREATE TABLE IF NOT EXISTS blocked_ips (
  id SERIAL PRIMARY KEY,
  invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_blocked_ip_per_invitation UNIQUE (invitation_uid, ip_address)
);

CREATE TABLE IF NOT EXISTS gift_products (
  id SERIAL PRIMARY KEY,
  invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
  url TEXT,
  name VARCHAR(500) NOT NULL,
  image_url TEXT,
  price VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  is_received BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agenda (
  id SERIAL PRIMARY KEY,
  invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(500),
  address TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
  bank VARCHAR(255) NOT NULL,
  account_number VARCHAR(100) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(80) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wishes_invitation_uid ON wishes(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_wishes_created_at ON wishes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_invitation_uid ON guests(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_guests_normalized_name ON guests(invitation_uid, normalized_name);
CREATE INDEX IF NOT EXISTS idx_gift_products_invitation_uid ON gift_products(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_gift_products_order ON gift_products(invitation_uid, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_invitation_uid ON blocked_ips(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(invitation_uid, ip_address);
CREATE INDEX IF NOT EXISTS idx_agenda_invitation_uid ON agenda(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_agenda_order ON agenda(invitation_uid, order_index);
CREATE INDEX IF NOT EXISTS idx_banks_invitation_uid ON banks(invitation_uid);
CREATE INDEX IF NOT EXISTS idx_banks_order ON banks(invitation_uid, order_index);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gift_products_updated_at ON gift_products;
CREATE TRIGGER update_gift_products_updated_at
  BEFORE UPDATE ON gift_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

INSERT INTO invitations (
  uid,
  title,
  description,
  groom_name,
  bride_name,
  parent_groom,
  parent_bride,
  wedding_date,
  time,
  location,
  address,
  maps_url,
  maps_embed,
  og_image,
  favicon,
  audio
) VALUES (
  'lucas-andressa',
  'Casamento Lucas & Andressa',
  'Com alegria, convidamos você para celebrar o nosso casamento.',
  'Lucas',
  'Andressa',
  'Família do Lucas',
  'Família da Andressa',
  '2026-11-14',
  '14 de novembro de 2026',
  'Restaurante Farol',
  'Bairro Pôr do Sol - R. Maria R. C. Silva, 3850 - Pôr do Sol, Monte Sião - MG, 37580-000',
  'https://www.google.com/maps/search/?api=1&query=Restaurante%20Farol%20Monte%20Si%C3%A3o%20MG',
  'https://www.google.com/maps?q=Restaurante%20Farol%20Monte%20Si%C3%A3o%20MG&output=embed',
  '/images/og-image.jpg',
  '/images/favicon.ico',
  '{"src":"","soundcloudUrl":"https://soundcloud.com/creitu-silva-7/jorge-e-mateus-os-anjos-cantam-nosso-amor","title":"Os Anjos Cantam Nosso Amor","autoplay":true,"loop":true}'::jsonb
)
ON CONFLICT (uid) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  groom_name = EXCLUDED.groom_name,
  bride_name = EXCLUDED.bride_name,
  parent_groom = EXCLUDED.parent_groom,
  parent_bride = EXCLUDED.parent_bride,
  wedding_date = EXCLUDED.wedding_date,
  time = EXCLUDED.time,
  location = EXCLUDED.location,
  address = EXCLUDED.address,
  maps_url = EXCLUDED.maps_url,
  maps_embed = EXCLUDED.maps_embed,
  og_image = EXCLUDED.og_image,
  favicon = EXCLUDED.favicon,
  audio = EXCLUDED.audio;

DELETE FROM agenda WHERE invitation_uid = 'lucas-andressa';

INSERT INTO agenda (
  invitation_uid,
  title,
  date,
  start_time,
  end_time,
  location,
  address,
  order_index
) VALUES
  (
    'lucas-andressa',
    'Cerimônia',
    '2026-11-14',
    '20:00',
    '21:00',
    'Santuário Nossa Senhora da Medalha Milagrosa',
    'Rua Padre Cornélio, 27 - Centro, Monte Sião - MG, 37580-000',
    1
  ),
  (
    'lucas-andressa',
    'Recepção',
    '2026-11-14',
    '21:30',
    '23:59',
    'Restaurante Farol',
    'Bairro Pôr do Sol - R. Maria R. C. Silva, 3850 - Pôr do Sol, Monte Sião - MG, 37580-000',
    2
  );
