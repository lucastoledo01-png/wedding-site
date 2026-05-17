/**
 * Wishes Feature - API Routes
 * Handles guest wishes and RSVP functionality
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createWishSchema, wishesQuerySchema } from "./wishes.schema.js";
import { getDbClient } from "../../lib/db-client.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";

const wishesRoutes = new Hono();

/**
 * GET /:uid/wishes
 * Get all wishes for an invitation with pagination
 */
wishesRoutes.get("/", zValidator("query", wishesQuerySchema), async (c) => {
  const uid = c.req.param("uid");
  const { limit, offset } = c.req.valid("query");

  const pool = await getDbClient(c);

  // Verify invitation exists
  const invitation = await pool.query(
    "SELECT uid FROM invitations WHERE uid = $1",
    [uid],
  );
  if (invitation.rows.length === 0) {
    throw new NotFoundError("Invitation not found");
  }

  // Get wishes
  const result = await pool.query(
    `SELECT id, name, message, attendance,
              created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' as created_at
       FROM wishes
       WHERE invitation_uid = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
    [uid, limit, offset],
  );

  // Get total count
  const countResult = await pool.query(
    "SELECT COUNT(*) FROM wishes WHERE invitation_uid = $1",
    [uid],
  );

  return c.json({
    success: true,
    data: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    },
  });
});

/**
 * POST /:uid/wishes
 * Create a new wish
 */
wishesRoutes.post("/", zValidator("json", createWishSchema), async (c) => {
  const uid = c.req.param("uid");
  const { name, message, attendance } = c.req.valid("json");

  const pool = await getDbClient(c);

  // Verify invitation exists
  const invitation = await pool.query(
    "SELECT uid FROM invitations WHERE uid = $1",
    [uid],
  );
  if (invitation.rows.length === 0) {
    throw new NotFoundError("Invitation not found");
  }

  // Check if guest has already submitted a wish
  const existingWish = await pool.query(
    "SELECT id FROM wishes WHERE invitation_uid = $1 AND name = $2",
    [uid, name],
  );

  if (existingWish.rows.length > 0) {
    throw new ConflictError(
      "You have already submitted a wish. Each guest can only send one wish.",
      "DUPLICATE_WISH",
    );
  }

  // Insert wish
  try {
    const result = await pool.query(
      `INSERT INTO wishes (invitation_uid, name, message, attendance, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')
         RETURNING id, name, message, attendance,
                   created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta' as created_at`,
      [uid, name, message, attendance],
    );

    return c.json({ success: true, data: result.rows[0] }, 201);
  } catch (error) {
    // Handle database unique constraint violation
    if (error.code === "23505") {
      throw new ConflictError(
        "You have already submitted a wish. Each guest can only send one wish.",
        "DUPLICATE_WISH",
      );
    }
    throw error;
  }
});

/**
 * DELETE /:uid/wishes/:id
 * Delete a wish (admin only)
 */
wishesRoutes.delete("/:id", async (c) => {
  const uid = c.req.param("uid");
  const id = c.req.param("id");

  const pool = await getDbClient(c);
  const result = await pool.query(
    "DELETE FROM wishes WHERE id = $1 AND invitation_uid = $2 RETURNING id",
    [id, uid],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("Wish not found");
  }

  return c.json({ success: true, message: "Wish deleted" });
});

/**
 * GET /:uid/wishes/check/:name
 * Check if guest has already submitted a wish
 */
wishesRoutes.get("/check/:name", async (c) => {
  const uid = c.req.param("uid");
  const name = c.req.param("name");

  if (!name || name.trim().length === 0) {
    return c.json({ success: false, error: "Name is required" }, 400);
  }

  const pool = await getDbClient(c);

  const existingWish = await pool.query(
    "SELECT id FROM wishes WHERE invitation_uid = $1 AND name = $2",
    [uid, name.trim()],
  );

  return c.json({
    success: true,
    hasSubmitted: existingWish.rows.length > 0,
  });
});

/**
 * GET /:uid/stats
 * Get attendance statistics
 */
wishesRoutes.get("/stats", async (c) => {
  const uid = c.req.param("uid");

  const pool = await getDbClient(c);
  const result = await pool.query(
    `SELECT
          COUNT(*) FILTER (WHERE attendance = 'ATTENDING') as attending,
          COUNT(*) FILTER (WHERE attendance = 'NOT_ATTENDING') as not_attending,
          COUNT(*) FILTER (WHERE attendance = 'MAYBE') as maybe,
          COUNT(*) as total
       FROM wishes
       WHERE invitation_uid = $1`,
    [uid],
  );

  return c.json({ success: true, data: result.rows[0] });
});

export default wishesRoutes;
