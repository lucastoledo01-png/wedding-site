/**
 * Invitation Feature - API Routes
 * Handles fetching invitation data with all related entities
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { uidParamSchema } from "./invitation.schema.js";
import { getDbClient } from "../../lib/db-client.js";
import { NotFoundError } from "../../lib/errors.js";

const invitationRoutes = new Hono();

/**
 * GET /invitation/:uid
 * Get invitation by UID with all related data (agenda, banks)
 */
invitationRoutes.get(
  "/:uid",
  zValidator("param", uidParamSchema),
  async (c) => {
    const { uid } = c.req.valid("param");

    const pool = await getDbClient(c);

    // Get invitation details
    const invitationResult = await pool.query(
      "SELECT * FROM invitations WHERE uid = $1",
      [uid],
    );

    if (invitationResult.rows.length === 0) {
      throw new NotFoundError("Invitation not found");
    }

    const invitation = invitationResult.rows[0];

    // Get agenda items
    const agendaResult = await pool.query(
      "SELECT id, title, date, start_time, end_time, location, address FROM agenda WHERE invitation_uid = $1 ORDER BY order_index, date",
      [uid],
    );

    // Get bank accounts
    const banksResult = await pool.query(
      "SELECT id, bank, account_number, account_name FROM banks WHERE invitation_uid = $1 ORDER BY order_index",
      [uid],
    );

    // Get hero carousel slides
    const heroSlidesResult = await pool.query(
      `SELECT id, image_url, alt_text, sort_order
         FROM hero_slides
        WHERE invitation_uid = $1 AND is_active = TRUE
        ORDER BY sort_order ASC, id ASC`,
      [uid],
    );

    // Format the response to match frontend config structure
    const data = {
      title: invitation.title,
      description: invitation.description,
      groomName: invitation.groom_name,
      brideName: invitation.bride_name,
      parentGroom: invitation.parent_groom,
      parentBride: invitation.parent_bride,
      date: invitation.wedding_date,
      time: invitation.time,
      location: invitation.location,
      address: invitation.address,
      maps_url: invitation.maps_url,
      maps_embed: invitation.maps_embed,
      ogImage: invitation.og_image,
      favicon: invitation.favicon,
      audio: invitation.audio,
      heroSlides: heroSlidesResult.rows.map((slide) => ({
        id: slide.id,
        imageUrl: slide.image_url,
        altText: slide.alt_text,
        sortOrder: slide.sort_order,
      })),
      agenda: agendaResult.rows.map((a) => ({
        title: a.title,
        date: a.date,
        startTime: a.start_time,
        endTime: a.end_time,
        location: a.location,
        address: a.address,
      })),
      banks: banksResult.rows.map((b) => ({
        bank: b.bank,
        accountNumber: b.account_number,
        accountName: b.account_name,
      })),
    };

    return c.json({ success: true, data });
  },
);

export default invitationRoutes;
