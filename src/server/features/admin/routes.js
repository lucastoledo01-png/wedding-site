import { Hono } from "hono";
import { getDbClient } from "../../lib/db-client.js";
import { createGuest } from "../rsvp/routes.js";
import { listAdminGifts, reorderGifts, upsertGift } from "../gift-products/routes.js";
import { normalizeName } from "../../lib/text-match.js";
import { NotFoundError } from "../../lib/errors.js";
import {
  activateAdminTwoFactor,
  authenticateAdmin,
  verifyAdminSession,
} from "../../lib/admin-auth.js";
import { appendGuestListBackup } from "../../lib/google-sheets-backup.js";
import { getClientIp, getDevice } from "../../lib/request-metadata.js";

const adminRoutes = new Hono();
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

adminRoutes.post("/auth/login", async (c) => {
  const result = await authenticateAdmin(c, await c.req.json());

  if (!result.success) {
    return c.json({ success: false, error: result.error }, result.status);
  }

  return c.json({
    success: true,
    data: {
      token: result.token,
      expiresAt: result.expiresAt,
      requires2faSetup: result.requires2faSetup,
      setupToken: result.setupToken,
      setupExpiresAt: result.setupExpiresAt,
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
    },
  });
});

adminRoutes.post("/auth/activate-2fa", async (c) => {
  const result = await activateAdminTwoFactor(c, await c.req.json());

  if (!result.success) {
    return c.json({ success: false, error: result.error }, result.status);
  }

  return c.json({
    success: true,
    data: {
      token: result.token,
      expiresAt: result.expiresAt,
    },
  });
});

adminRoutes.get("/auth/session", async (c) => {
  const token = c.req.header("x-admin-session") || c.req.header("x-admin-token");
  return c.json({ success: true, authenticated: verifyAdminSession(c, token) });
});

adminRoutes.use("*", async (c, next) => {
  const sessionToken = c.req.header("x-admin-session") || c.req.header("x-admin-token");

  if (verifyAdminSession(c, sessionToken)) {
    await next();
    return;
  }

  return c.json({ success: false, error: "Sessao administrativa expirada." }, 401);
});

adminRoutes.get("/:uid/guests", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  const result = await pool.query(
    `SELECT id, full_name, party_size, attendance, confirmed_at, message,
            confirmed_ip, confirmed_device, created_at
       FROM guests
      WHERE invitation_uid = $1
      ORDER BY full_name ASC`,
    [uid],
  );
  return c.json({ success: true, data: result.rows });
});

adminRoutes.post("/:uid/guests", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  const guest = await createGuest(pool, uid, await c.req.json());

  try {
    await appendGuestListBackup(c, {
      name: guest.full_name,
      attendance: guest.attendance,
      device: getDevice(c),
      ipAddress: getClientIp(c),
    });
  } catch (error) {
    console.error("Google Sheets guest list backup failed:", error.message);
  }

  return c.json({ success: true, data: guest }, 201);
});

adminRoutes.post("/:uid/guests/import", async (c) => {
  const uid = c.req.param("uid");
  const body = await c.req.json();
  const rawNames = Array.isArray(body.names)
    ? body.names
    : String(body.names || body.text || "")
        .split(/\r?\n|,/)
        .map((name) => name.trim());
  const names = rawNames.filter(Boolean);

  const pool = await getDbClient(c);
  const imported = [];
  for (const name of names) {
    const guest = await createGuest(pool, uid, { fullName: name, partySize: 1 });
    imported.push(guest);

    try {
      await appendGuestListBackup(c, {
        name: guest.full_name,
        attendance: guest.attendance,
        device: getDevice(c),
        ipAddress: getClientIp(c),
      });
    } catch (error) {
      console.error("Google Sheets guest list backup failed:", error.message);
    }
  }

  return c.json({ success: true, data: imported });
});

adminRoutes.patch("/:uid/guests/:id", async (c) => {
  const uid = c.req.param("uid");
  const id = c.req.param("id");
  const body = await c.req.json();
  const fullName = String(body.fullName || body.full_name || "").trim();
  const pool = await getDbClient(c);
  const result = await pool.query(
    `UPDATE guests
        SET full_name = COALESCE(NULLIF($1, ''), full_name),
            normalized_name = COALESCE(NULLIF($2, ''), normalized_name),
            party_size = COALESCE($3, party_size),
            attendance = COALESCE($4, attendance),
            message = COALESCE($5, message),
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND invitation_uid = $7
      RETURNING id, full_name, party_size, attendance, confirmed_at, message`,
    [
      fullName,
      fullName ? normalizeName(fullName) : "",
      body.partySize ?? body.party_size ?? null,
      body.attendance ?? null,
      body.message ?? null,
      id,
      uid,
    ],
  );

  if (!result.rows[0]) throw new NotFoundError("Guest not found");
  return c.json({ success: true, data: result.rows[0] });
});

adminRoutes.delete("/:uid/guests/:id", async (c) => {
  const uid = c.req.param("uid");
  const id = c.req.param("id");
  const pool = await getDbClient(c);
  await pool.query("DELETE FROM guests WHERE id = $1 AND invitation_uid = $2", [id, uid]);
  return c.json({ success: true });
});

adminRoutes.get("/:uid/gifts", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  return c.json({ success: true, data: await listAdminGifts(pool, uid) });
});

adminRoutes.post("/:uid/gifts", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  return c.json({ success: true, data: await upsertGift(pool, uid, await c.req.json()) }, 201);
});

adminRoutes.post("/:uid/gifts/reorder", async (c) => {
  const uid = c.req.param("uid");
  const body = await c.req.json();
  const pool = await getDbClient(c);
  return c.json({
    success: true,
    data: await reorderGifts(pool, uid, body.giftIds || body.ids),
  });
});

adminRoutes.patch("/:uid/gifts/:id", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  return c.json({
    success: true,
    data: await upsertGift(pool, uid, { ...(await c.req.json()), id: c.req.param("id") }),
  });
});

adminRoutes.delete("/:uid/gifts/:id", async (c) => {
  const uid = c.req.param("uid");
  const id = c.req.param("id");
  const pool = await getDbClient(c);
  await pool.query("DELETE FROM gift_products WHERE id = $1 AND invitation_uid = $2", [id, uid]);
  return c.json({ success: true });
});

adminRoutes.post("/:uid/gifts/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.image;

  if (!(file instanceof File)) {
    return c.json({ success: false, error: "Envie uma imagem do produto." }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return c.json(
      { success: false, error: "Use uma imagem JPG, PNG ou WEBP." },
      400,
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return c.json(
      { success: false, error: "A imagem deve ter no maximo 4 MB." },
      400,
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  return c.json({
    success: true,
    data: {
      imageUrl: `data:${file.type};base64,${base64}`,
    },
  });
});

adminRoutes.get("/:uid/comments", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  const result = await pool.query(
    `SELECT id, name, message, attendance, ip_address, device, created_at
       FROM wishes
      WHERE invitation_uid = $1
      ORDER BY created_at DESC`,
    [uid],
  );
  return c.json({ success: true, data: result.rows });
});

adminRoutes.delete("/:uid/comments/:id", async (c) => {
  const uid = c.req.param("uid");
  const id = c.req.param("id");
  const pool = await getDbClient(c);
  const result = await pool.query(
    "DELETE FROM wishes WHERE id = $1 AND invitation_uid = $2 RETURNING id",
    [id, uid],
  );

  if (!result.rows[0]) throw new NotFoundError("Comment not found");
  return c.json({ success: true });
});

adminRoutes.get("/:uid/blocked-ips", async (c) => {
  const uid = c.req.param("uid");
  const pool = await getDbClient(c);
  const result = await pool.query(
    `SELECT id, ip_address, reason, created_at
       FROM blocked_ips
      WHERE invitation_uid = $1
      ORDER BY created_at DESC`,
    [uid],
  );

  return c.json({ success: true, data: result.rows });
});

adminRoutes.post("/:uid/blocked-ips", async (c) => {
  const uid = c.req.param("uid");
  const body = await c.req.json();
  const ipAddress = String(body.ipAddress || body.ip_address || "").trim();
  const reason = String(body.reason || "Bloqueado pelo painel").trim();

  if (!ipAddress) {
    return c.json({ success: false, error: "Informe o IP para bloquear." }, 400);
  }

  const pool = await getDbClient(c);
  const result = await pool.query(
    `INSERT INTO blocked_ips (invitation_uid, ip_address, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (invitation_uid, ip_address)
     DO UPDATE SET reason = EXCLUDED.reason, created_at = CURRENT_TIMESTAMP
     RETURNING id, ip_address, reason, created_at`,
    [uid, ipAddress, reason],
  );

  return c.json({ success: true, data: result.rows[0] }, 201);
});

adminRoutes.delete("/:uid/blocked-ips/:id", async (c) => {
  const uid = c.req.param("uid");
  const id = c.req.param("id");
  const pool = await getDbClient(c);
  const result = await pool.query(
    "DELETE FROM blocked_ips WHERE id = $1 AND invitation_uid = $2 RETURNING id",
    [id, uid],
  );

  if (!result.rows[0]) throw new NotFoundError("Blocked IP not found");
  return c.json({ success: true });
});

export default adminRoutes;
