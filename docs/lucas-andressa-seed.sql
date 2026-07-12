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
  favicon
) VALUES (
  'lucas-andressa',
  'Casamento Lucas & Andressa',
  'Com alegria, convidamos voce para celebrar o nosso casamento.',
  'Lucas',
  'Andressa',
  'Familia do Lucas',
  'Familia da Andressa',
  '2026-11-14',
  '14 de novembro de 2026',
  'Restaurante Farol',
  'Bairro Por do Sol - R. Maria R. C. Silva, 3850 - Por do Sol, Monte Siao - MG, 37580-000',
  'https://www.google.com/maps/search/?api=1&query=Restaurante%20Farol%20HCCW%2B76%20Monte%20Siao%20Minas%20Gerais',
  'https://www.google.com/maps?q=Restaurante%20Farol%20HCCW%2B76%20Monte%20Siao%20Minas%20Gerais&output=embed',
  '/images/og-image.jpg',
  '/favicon.svg'
) ON CONFLICT (uid) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  groom_name = EXCLUDED.groom_name,
  bride_name = EXCLUDED.bride_name,
  wedding_date = EXCLUDED.wedding_date,
  time = EXCLUDED.time,
  location = EXCLUDED.location,
  address = EXCLUDED.address;

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
  ('lucas-andressa', 'Cerimonia', '2026-11-14', '16:00', '17:00', 'Santuario Nossa Senhora da Medalha Milagrosa', 'Rua Padre Cornelio, 27 - Centro, Monte Siao - MG, 37580-000', 1),
  ('lucas-andressa', 'Recepcao', '2026-11-14', '17:00', '22:00', 'Restaurante Farol', 'Bairro Por do Sol - R. Maria R. C. Silva, 3850 - Por do Sol, Monte Siao - MG, 37580-000', 2);
