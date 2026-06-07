/**
 * Database connection helper
 * Supports both Cloudflare Workers (Hyperdrive) and Node.js/Bun environments.
 *
 * Connection source resolution order (see spec: database-connection):
 *   1. Cloudflare Hyperdrive binding at `c.env.DB`
 *      - Hyperdrive exposes a *connection string*, typically at
 *        `c.env.DB.connectionString`. Some setups bind a plain string directly,
 *        so we accept `c.env.DB` itself when it is already a string.
 *   2. `c.env.DATABASE_URL` connection string (Wrangler dev / Node / Bun)
 *   3. Otherwise: throw a clear, actionable error.
 *
 * Pools are created lazily and cached per connection string for the lifetime of
 * the runtime instance, so we never construct a new pool per request.
 */

// Module-scoped cache: connectionString -> pg.Pool
// Reused across requests within the same runtime instance.
const poolCache = new Map();

/**
 * Resolve the database connection string for the current request context.
 * @param {import('hono').Context} c - Hono context
 * @returns {string | null} The connection string, or null if none is configured
 */
function resolveConnectionString(c) {
  const binding = c.env?.DB;

  // Hyperdrive binding: prefer its connectionString, but accept a raw string.
  if (binding) {
    if (typeof binding === "string") {
      return binding;
    }
    if (typeof binding.connectionString === "string") {
      return binding.connectionString;
    }
  }

  // Fallback: explicit DATABASE_URL (Wrangler dev with .env, Node/Bun).
  if (typeof c.env?.DATABASE_URL === "string") {
    return c.env.DATABASE_URL;
  }

  return null;
}

/**
 * Get a database client based on the environment.
 *
 * The returned client exposes an async `query(sql, params)` method resolving to
 * a result with a `rows` array, matching the contract relied upon by the
 * invitation, wishes, and stats routes.
 *
 * @param {import('hono').Context} c - Hono context
 * @returns {Promise<import('pg').Pool>} Database pool (cached per connection string)
 */
export async function getDbClient(c) {
  const connectionString = resolveConnectionString(c);

  if (!connectionString) {
    throw new Error(
      "No database connection available. Configure a Hyperdrive binding (env.DB) or DATABASE_URL.",
    );
  }

  // Reuse an existing pool for this connection string if we have one.
  const cached = poolCache.get(connectionString);
  if (cached) {
    return cached;
  }

  // Lazily import pg so the driver isn't evaluated until a connection is needed.
  const pg = await import("pg");
  const { Pool } = pg.default || pg;

  const pool = new Pool({ connectionString });
  poolCache.set(connectionString, pool);

  return pool;
}
