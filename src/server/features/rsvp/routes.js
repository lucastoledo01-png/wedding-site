import { Hono } from "hono";
import { getDbClient } from "../../lib/db-client.js";
import { findBestGuestMatch, normalizeName } from "../../lib/text-match.js";
import { NotFoundError } from "../../lib/errors.js";

const rsvpRoutes = new Hono();

async function loadGuests(pool, uid) {
  const result = await pool.query(
    `SELECT id, full_name, party_size, attendance, confirmed_at, message
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
  const { best, suggestions } = findBestGuestMatch(name, guests);

  return c.json({
    success: true,
    data: {
      match: best,
      suggestions: suggestions.map((guest) => ({
        id: guest.id,
        fullName: guest.full_name,
        attendance: guest.attendance,
        matchScore: Number(guest.matchScore.toFixed(2)),
      })),
    },
  });
});

rsvpRoutes.post("/confirm", async (c) => {
  const uid = c.req.param("uid");
  const body = await c.req.json();
  const name = String(body.name || "").trim();
  const attendance = body.attendance === "NOT_ATTENDING" ? "NOT_ATTENDING" : "ATTENDING";
  const message = String(body.message || "").trim();
  const partySize = Number.isFinite(Number(body.partySize))
    ? Math.max(1, Number(body.partySize))
    : null;

  if (!name) {
    return c.json({ success: false, error: "Informe seu nome." }, 400);
  }

  const pool = await getDbClient(c);
  const guests = await loadGuests(pool, uid);
  const { best, suggestions } = findBestGuestMatch(name, guests);

  if (!best) {
    return c.json(
      {
        success: false,
        error: "Nao encontramos esse nome na lista de convidados.",
        suggestions: suggestions.map((guest) => guest.full_name),
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
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND invitation_uid = $5
      RETURNING id, full_name, party_size, attendance, confirmed_at, message`,
    [attendance, partySize, message, best.id, uid],
  );

  return c.json({ success: true, data: result.rows[0] });
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
     RETURNING id, full_name, party_size, attendance, confirmed_at, message`,
    [uid, fullName, normalizeName(fullName), Number(guest.partySize || guest.party_size || 1)],
  );

  return result.rows[0];
}

export default rsvpRoutes;
