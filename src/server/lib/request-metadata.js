export function getClientIp(c) {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    c.req.header("x-client-ip") ||
    ""
  );
}

export function getDevice(c) {
  return c.req.header("user-agent") || "";
}

export async function ensureIpAllowed(pool, uid, ipAddress) {
  if (!ipAddress) return;

  const result = await pool.query(
    `SELECT id
       FROM blocked_ips
      WHERE invitation_uid = $1
        AND ip_address = $2
      LIMIT 1`,
    [uid, ipAddress],
  );

  if (result.rows.length > 0) {
    throw new AppError(
      "Este acesso foi bloqueado para proteger o mural do casamento.",
      403,
      "IP_BLOCKED",
    );
  }
}
import { AppError } from "./errors.js";
