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

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import staticConfig from "../../config/config.js";

// Module-scoped cache: connectionString -> pg.Pool
// Reused across requests within the same runtime instance.
const poolCache = new Map();
const schemaReady = new Set();
const FILE_DB_KEY = "__file_db__";

function shouldUseFileDb(connectionString) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    (!connectionString && !isProduction) ||
    connectionString.includes("username:password@localhost") ||
    process.env.USE_FILE_DB === "true"
  );
}

function normalizeLocalName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nowIso() {
  return new Date().toISOString();
}

function defaultStore() {
  const config = staticConfig.data;

  return {
    invitations: [
      {
        uid: "lucas-andressa",
        title: config.title,
        description: config.description,
        groom_name: config.groomName,
        bride_name: config.brideName,
        parent_groom: config.parentGroom,
        parent_bride: config.parentBride,
        wedding_date: config.date,
        time: config.time,
        location: config.location,
        address: config.address,
        maps_url: config.maps_url,
        maps_embed: config.maps_embed,
        og_image: config.ogImage,
        favicon: config.favicon,
        audio: config.audio,
      },
    ],
    agenda: config.agenda.map((item, index) => ({
      id: index + 1,
      invitation_uid: "lucas-andressa",
      order_index: index,
      title: item.title,
      date: item.date,
      start_time: item.startTime,
      end_time: item.endTime,
      location: item.location,
      address: item.address,
    })),
    banks: config.banks.map((item, index) => ({
      id: index + 1,
      invitation_uid: "lucas-andressa",
      order_index: index,
      bank: item.bank,
      account_number: item.accountNumber,
      account_name: item.accountName,
    })),
    guests: [],
    wishes: [],
    gift_products: [],
    counters: {
      guests: 1,
      wishes: 1,
      gift_products: 1,
    },
  };
}

async function readStore() {
  const filePath = path.join(process.cwd(), "data", "local-db.json");

  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    const store = defaultStore();
    await writeStore(store);
    return store;
  }
}

async function writeStore(store) {
  const filePath = path.join(process.cwd(), "data", "local-db.json");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2));
}

async function withStore(mutator) {
  const store = await readStore();
  const result = await mutator(store);
  await writeStore(store);
  return result;
}

function createFileDbClient() {
  return {
    async query(sql, params = []) {
      const compactSql = sql.replace(/\s+/g, " ").trim();

      return withStore(async (store) => {
        const uid = params[0];

        if (compactSql.startsWith("SELECT * FROM invitations WHERE uid = $1")) {
          return {
            rows: store.invitations.filter((item) => item.uid === uid),
          };
        }

        if (compactSql.startsWith("SELECT uid FROM invitations WHERE uid = $1")) {
          return {
            rows: store.invitations
              .filter((item) => item.uid === uid)
              .map((item) => ({ uid: item.uid })),
          };
        }

        if (compactSql.includes("FROM agenda WHERE invitation_uid = $1")) {
          return {
            rows: store.agenda
              .filter((item) => item.invitation_uid === uid)
              .sort((a, b) => a.order_index - b.order_index)
              .map(({ id, title, date, start_time, end_time, location, address }) => ({
                id,
                title,
                date,
                start_time,
                end_time,
                location,
                address,
              })),
          };
        }

        if (compactSql.includes("FROM banks WHERE invitation_uid = $1")) {
          return {
            rows: store.banks
              .filter((item) => item.invitation_uid === uid)
              .sort((a, b) => a.order_index - b.order_index)
              .map(({ id, bank, account_number, account_name }) => ({
                id,
                bank,
                account_number,
                account_name,
              })),
          };
        }

        if (compactSql.includes("FROM guests") && compactSql.includes("WHERE invitation_uid = $1")) {
          return {
            rows: store.guests
              .filter((item) => item.invitation_uid === uid)
              .sort((a, b) => a.full_name.localeCompare(b.full_name)),
          };
        }

        if (compactSql.startsWith("INSERT INTO guests")) {
          const [invitationUid, fullName, normalizedName, partySize] = params;
          const normalized = normalizedName || normalizeLocalName(fullName);
          let guest = store.guests.find(
            (item) =>
              item.invitation_uid === invitationUid &&
              item.normalized_name === normalized,
          );

          if (guest) {
            guest.full_name = fullName;
            guest.party_size = Number(partySize || 1);
            guest.updated_at = nowIso();
          } else {
            guest = {
              id: store.counters.guests++,
              invitation_uid: invitationUid,
              full_name: fullName,
              normalized_name: normalized,
              party_size: Number(partySize || 1),
              attendance: "PENDING",
              confirmed_at: null,
              confirmed_phone: "",
              message: "",
              created_at: nowIso(),
              updated_at: nowIso(),
            };
            store.guests.push(guest);
          }

          return { rows: [guest] };
        }

        if (compactSql.startsWith("UPDATE guests")) {
          const isAdminPatch = compactSql.includes("COALESCE(NULLIF");
          const guestId = Number(isAdminPatch ? params[5] : params[3]);
          const invitationUid = isAdminPatch ? params[6] : params[4];
          const guest = store.guests.find(
            (item) => item.id === guestId && item.invitation_uid === invitationUid,
          );

          if (!guest) return { rows: [] };

          if (isAdminPatch) {
            const [fullName, normalizedName, partySize, attendance, message] = params;
            if (fullName) guest.full_name = fullName;
            if (normalizedName) guest.normalized_name = normalizedName;
            if (partySize !== null && partySize !== undefined) {
              guest.party_size = Number(partySize);
            }
            if (attendance) guest.attendance = attendance;
            if (message !== null && message !== undefined) guest.message = message;
          } else {
            const [attendance, partySize, message, confirmedPhone, confirmedIp, confirmedDevice] = params;
            guest.attendance = attendance;
            if (partySize !== null && partySize !== undefined) {
              guest.party_size = Number(partySize);
            }
            guest.message = message;
            guest.confirmed_at = nowIso();
            guest.confirmed_phone = confirmedPhone || "";
            guest.confirmed_ip = confirmedIp || "";
            guest.confirmed_device = confirmedDevice || "";
          }

          guest.updated_at = nowIso();
          return { rows: [guest] };
        }

        if (compactSql.startsWith("DELETE FROM guests")) {
          const [id, invitationUid] = params;
          store.guests = store.guests.filter(
            (item) => !(item.id === Number(id) && item.invitation_uid === invitationUid),
          );
          return { rows: [] };
        }

        if (compactSql.includes("COUNT(*) FILTER") && compactSql.includes("FROM guests")) {
          const guests = store.guests.filter((item) => item.invitation_uid === uid);
          return {
            rows: [
              {
                total: guests.length,
                attending: guests.filter((item) => item.attendance === "ATTENDING").length,
                not_attending: guests.filter((item) => item.attendance === "NOT_ATTENDING").length,
                pending: guests.filter((item) => item.attendance === "PENDING").length,
                people_confirmed: guests
                  .filter((item) => item.attendance === "ATTENDING")
                  .reduce((total, item) => total + Number(item.party_size || 1), 0),
              },
            ],
          };
        }

        if (compactSql.includes("FROM wishes") && compactSql.includes("ORDER BY created_at DESC")) {
          const [invitationUid, limit = 50, offset = 0] = params;
          return {
            rows: store.wishes
              .filter((item) => item.invitation_uid === invitationUid)
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .slice(Number(offset), Number(offset) + Number(limit))
              .map(({ invitation_uid: _invitationUid, ...wish }) => wish),
          };
        }

        if (compactSql.startsWith("SELECT COUNT(*) FROM wishes")) {
          return {
            rows: [
              {
                count: String(
                  store.wishes.filter((item) => item.invitation_uid === uid).length,
                ),
              },
            ],
          };
        }

        if (compactSql.startsWith("SELECT id FROM wishes")) {
          const [invitationUid, name] = params;
          return {
            rows: store.wishes
              .filter(
                (item) => item.invitation_uid === invitationUid && item.name === name,
              )
              .map((item) => ({ id: item.id })),
          };
        }

        if (compactSql.startsWith("INSERT INTO wishes")) {
          const [invitationUid, name, message, attendance] = params;
          const wish = {
            id: store.counters.wishes++,
            invitation_uid: invitationUid,
            name,
            message,
            attendance,
            created_at: nowIso(),
          };
          store.wishes.push(wish);
          return { rows: [{ id: wish.id, name, message, attendance, created_at: wish.created_at }] };
        }

        if (compactSql.startsWith("DELETE FROM wishes")) {
          const [id, invitationUid] = params;
          store.wishes = store.wishes.filter(
            (item) => !(item.id === Number(id) && item.invitation_uid === invitationUid),
          );
          return { rows: [] };
        }

        if (compactSql.includes("COUNT(*) FILTER") && compactSql.includes("FROM wishes")) {
          const wishes = store.wishes.filter((item) => item.invitation_uid === uid);
          return {
            rows: [
              {
                attending: wishes.filter((item) => item.attendance === "ATTENDING").length,
                not_attending: wishes.filter((item) => item.attendance === "NOT_ATTENDING").length,
                maybe: wishes.filter((item) => item.attendance === "MAYBE").length,
                total: wishes.length,
              },
            ],
          };
        }

        if (compactSql.startsWith("SELECT id FROM gift_products")) {
          const [invitationUid, url] = params;
          return {
            rows: store.gift_products
              .filter(
                (item) => item.invitation_uid === invitationUid && item.url === url,
              )
              .slice(0, 1)
              .map((item) => ({ id: item.id })),
          };
        }

        if (compactSql.startsWith("SELECT url FROM gift_products")) {
          const [id, invitationUid] = params;
          return {
            rows: store.gift_products
              .filter((item) => item.id === Number(id) && item.invitation_uid === invitationUid)
              .map((item) => ({ url: item.url })),
          };
        }

        if (compactSql.includes("COALESCE(MAX(sort_order)") && compactSql.includes("FROM gift_products")) {
          const gifts = store.gift_products.filter((item) => item.invitation_uid === uid);
          const maxOrder = gifts.reduce(
            (max, item) => Math.max(max, Number(item.sort_order ?? -1)),
            -1,
          );
          return { rows: [{ next_sort_order: maxOrder + 1 }] };
        }

        if (compactSql.startsWith("SELECT id, url, name, image_url, price")) {
          const includeInactive = compactSql.includes("is_active, is_received");
          return {
            rows: store.gift_products
              .filter(
                (item) =>
                  item.invitation_uid === uid &&
                  (includeInactive || item.is_active !== false),
              )
              .map((item) => ({ ...item, category: item.category || "Presentes" }))
              .sort(
                (a, b) =>
                  Number(a.is_received || false) - Number(b.is_received || false) ||
                  Number(a.sort_order || 0) - Number(b.sort_order || 0) ||
                  new Date(b.created_at) - new Date(a.created_at),
              ),
          };
        }

        if (compactSql.startsWith("INSERT INTO gift_products")) {
          const [
            invitationUid,
            url,
            name,
            imageUrl,
            price,
            categoryOrIsActive,
            isActiveOrSortOrder,
            isReceived,
            sortOrder,
          ] = params;
          const isEnsurePixInsert = params.length === 7;
          const gift = {
            id: store.counters.gift_products++,
            invitation_uid: invitationUid,
            url,
            name,
            image_url: imageUrl,
            price,
            category: isEnsurePixInsert ? categoryOrIsActive : categoryOrIsActive || "Presentes",
            is_active: isEnsurePixInsert ? true : isActiveOrSortOrder,
            is_received: isEnsurePixInsert ? false : isReceived,
            sort_order: isEnsurePixInsert ? isActiveOrSortOrder : sortOrder,
            created_at: nowIso(),
            updated_at: nowIso(),
          };
          store.gift_products.push(gift);
          return { rows: [gift] };
        }

        if (compactSql.startsWith("UPDATE gift_products") && compactSql.includes("CASE id")) {
          const giftIds = params.slice(1).map(Number);
          for (const gift of store.gift_products) {
            if (gift.invitation_uid === uid) {
              const index = giftIds.indexOf(gift.id);
              if (index >= 0) gift.sort_order = index;
            }
          }
          return { rows: [] };
        }

        if (compactSql.startsWith("UPDATE gift_products")) {
          const [url, name, imageUrl, price, category, isActive, isReceived, sortOrder, id, invitationUid] = params;
          const gift = store.gift_products.find(
            (item) => item.id === Number(id) && item.invitation_uid === invitationUid,
          );
          if (!gift) return { rows: [] };
          gift.url = url;
          gift.name = name;
          gift.image_url = imageUrl;
          gift.price = price;
          gift.category = category || "Presentes";
          gift.is_active = isActive;
          gift.is_received = isReceived;
          gift.sort_order = sortOrder;
          gift.updated_at = nowIso();
          return { rows: [gift] };
        }

        if (compactSql.startsWith("DELETE FROM gift_products")) {
          const [id, invitationUid] = params;
          store.gift_products = store.gift_products.filter(
            (item) => !(item.id === Number(id) && item.invitation_uid === invitationUid),
          );
          return { rows: [] };
        }

        throw new Error(`File database does not support query: ${compactSql}`);
      });
    },
  };
}

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

  if (typeof c.env?.SUPABASE_DATABASE_URL === "string") {
    return c.env.SUPABASE_DATABASE_URL;
  }

  if (typeof process.env.DATABASE_URL === "string") {
    return process.env.DATABASE_URL;
  }

  if (typeof process.env.SUPABASE_DATABASE_URL === "string") {
    return process.env.SUPABASE_DATABASE_URL;
  }

  return null;
}

function shouldUseSsl(connectionString) {
  return /supabase\.co|pooler\.supabase\.com/i.test(connectionString);
}

async function ensureRuntimeSchema(pool, connectionString) {
  if (schemaReady.has(connectionString)) return;

  await pool.query(`
    ALTER TABLE guests
      ADD COLUMN IF NOT EXISTS confirmed_phone TEXT,
      ADD COLUMN IF NOT EXISTS confirmed_ip TEXT,
      ADD COLUMN IF NOT EXISTS confirmed_device TEXT
  `);
  await pool.query(`
    ALTER TABLE wishes
      ADD COLUMN IF NOT EXISTS ip_address TEXT,
      ADD COLUMN IF NOT EXISTS device TEXT
  `);
  await pool.query(`
    ALTER TABLE gift_products
      ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Presentes'
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocked_ips (
      id SERIAL PRIMARY KEY,
      invitation_uid VARCHAR(50) NOT NULL REFERENCES invitations(uid) ON DELETE CASCADE,
      ip_address TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_blocked_ip_per_invitation UNIQUE (invitation_uid, ip_address)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(80) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      totp_secret TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_blocked_ips_invitation_uid ON blocked_ips(invitation_uid)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(invitation_uid, ip_address)",
  );
  await pool.query("CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username)");

  schemaReady.add(connectionString);
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

  if (shouldUseFileDb(connectionString)) {
    if (!poolCache.has(FILE_DB_KEY)) {
      poolCache.set(FILE_DB_KEY, createFileDbClient());
    }
    return poolCache.get(FILE_DB_KEY);
  }

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required in production. Configure the Supabase Postgres connection string.",
    );
  }

  // Reuse an existing pool for this connection string if we have one.
  const cached = poolCache.get(connectionString);
  if (cached) {
    await ensureRuntimeSchema(cached, connectionString);
    return cached;
  }

  // Lazily import pg so the driver isn't evaluated until a connection is needed.
  const pg = await import("pg");
  const { Pool } = pg.default || pg;

  const pool = new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });
  poolCache.set(connectionString, pool);
  await ensureRuntimeSchema(pool, connectionString);

  return pool;
}
