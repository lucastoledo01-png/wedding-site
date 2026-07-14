import { Hono } from "hono";
import { getDbClient } from "../../lib/db-client.js";
import { normalizeName } from "../../lib/text-match.js";
import { NotFoundError } from "../../lib/errors.js";
import { appendRsvpBackup } from "../../lib/google-sheets-backup.js";
import { getClientIp, getDevice } from "../../lib/request-metadata.js";

const rsvpRoutes = new Hono();

function findExactGuest(name, guests) {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  return guests.find((guest) => normalizeName(guest.full_name) === normalized) || null;
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

async function loadGuests(pool, uid) {
  const result = await pool.query(
    `SELECT id, full_name, party_size, attendance, confirmed_at, message,
            confirmed_phone, confirmed_ip, confirmed_device
       FROM guests
      WHERE invitation_uid = $1
      ORDER BY full_name ASC`,
    [uid],
  );
  return result.rows;
}

rsvpRoutes.get("/search", async (c) => {
  const uid = c.req.param("uid");
  const name = c.req.query("name") || "";
  const pool = await getDbClient(c);

  const guests = await loadGuests(pool, uid);
  const match = findExactGuest(name, guests);

  return c.json({
    success: true,
    data: {
      match,
      suggestions: [],
    },
  });
});

rsvpRoutes.post("/confirm", async (c) => {
  const uid = c.req.param("uid");
  const body = await c.req.json();
  const name = String(body.name || "").trim();
  const guestId = Number(body.guestId || body.guest_id || 0);
  const attendance = body.attendance === "NOT_ATTENDING" ? "NOT_ATTENDING" : "ATTENDING";
  const message = String(body.message || "").trim();
  const phone = cleanPhone(body.phone || body.whatsapp || body.confirmedPhone);
  const partySize = Number.isFinite(Number(body.partySize))
    ? Math.max(1, Number(body.partySize))
    : null;
  const ipAddress = getClientIp(c);

  if (!name) {
    return c.json({ success: false, error: "Informe seu nome." }, 400);
  }

  if (phone.replace(/\D/g, "").length < 10) {
    return c.json(
      { success: false, error: "Informe um WhatsApp válido para confirmar." },
      400,
    );
  }

  const pool = await getDbClient(c);
  const guests = await loadGuests(pool, uid);
  const exactGuest = findExactGuest(name, guests);
  const best = guestId ? (exactGuest?.id === guestId ? exactGuest : null) : exactGuest;

  if (!best) {
    return c.json(
      {
        success: false,
        error: "Não encontramos esse nome na lista de convidados.",
        suggestions: [],
      },
      404,
    );
  }

  const result = await pool.query(
    `UPDATE guests
        SET attendance = $1,
            party_size = COALESCE($2, party_size),
            message = $3,
            confirmed_at = CURRENT_TIMESTAMP,
            confirmed_phone = $4,
            confirmed_ip = $5,
            confirmed_device = $6,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND invitation_uid = $8
      RETURNING id, full_name, party_size, attendance, confirmed_at, message,
                confirmed_phone, confirmed_ip, confirmed_device`,
    [attendance, partySize, message, phone, ipAddress, getDevice(c), best.id, uid],
  );

  const confirmedGuest = result.rows[0];

  try {
    await appendRsvpBackup(c, {
      name: confirmedGuest.full_name,
      attendance: confirmedGuest.attendance,
      phone: confirmedGuest.confirmed_phone,
      device: confirmedGuest.confirmed_device,
      ipAddress: confirmedGuest.confirmed_ip,
    });
  } catch (error) {
    console.error("Google Sheets RSVP backup failed:", error.message);
  }

  return c.json({ success: true, data: confirmedGuest });
});

rsvpRoutes.get("/summary", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE attendance = 'ATTENDING')::int AS attending,
       COUNT(*) FILTER (WHERE attendance = 'NOT_ATTENDING')::int AS not_attending,
       COUNT(*) FILTER (WHERE attendance = 'PENDING')::int AS pending,
       COALESCE(SUM(party_size) FILTER (WHERE attendance = 'ATTENDING'), 0)::int AS people_confirmed
      FROM guests
      WHERE invitation_uid = $1`,
    [uid],
  );

  return c.json({ success: true, data: result.rows[0] });
});

export async function createGuest(pool, uid, guest) {
  const fullName = String(guest.fullName || guest.full_name || "").trim();
  if (!fullName) throw new NotFoundError("Guest name is required");

  const result = await pool.query(
    `INSERT INTO guests (invitation_uid, full_name, normalized_name, party_size)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (invitation_uid, normalized_name)
     DO UPDATE SET full_name = EXCLUDED.full_name, party_size = EXCLUDED.party_size, updated_at = CURRENT_TIMESTAMP
     RETURNING id, full_name, party_size, attendance, confirmed_at, message,
               confirmed_phone, confirmed_ip, confirmed_device`,
    [uid, fullName, normalizeName(fullName), Number(guest.partySize || guest.party_size || 1)],
  );

  return result.rows[0];
}

export default rsvpRoutes;
