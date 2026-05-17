/**
 * Node.js specific database pool
 * NOTE: This is only for local scripts or standard Node environments.
 * For Cloudflare Workers / Hyperdrive, use lib/db-client.js
 */

import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
  } else {
    console.log("✅ Database connected at:", res.rows[0].now);
  }
});

export default pool;
