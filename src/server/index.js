/**
 * Sakeenah API Server
 * Hono-based REST API for wedding invitations
 *
 * Features:
 * - Invitation: Fetch invitation data with agenda and bank accounts
 * - Wishes: Guest wishes/RSVP management
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { serveStatic } from "@hono/node-server/serve-static";

// Feature routes and schemas
import { invitationRoutes, wishesRoutes } from "./features/index.js";
import rsvpRoutes from "./features/rsvp/routes.js";
import giftRoutes from "./features/gift-products/routes.js";
import adminRoutes from "./features/admin/routes.js";
import { uidParamSchema } from "./features/invitation/invitation.schema.js";
import { getDbClient } from "./lib/db-client.js";
import { AppError } from "./lib/errors.js";

// Create main app and API sub-app
const app = new Hono();
const api = new Hono();

// ============ Middleware ============

app.use("*", logger());
app.use("*", async (c, next) => {
  c.header(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex",
  );
  await next();
});
app.use(
  "*",
  cors({
    origin: ["*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

// ============ Global Error Handler ============

app.onError((err, c) => {
  console.error(`[Error] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: err.message,
        code: err.code,
      },
      err.status,
    );
  }

  // Handle Zod validation errors from zValidator
  if (err.name === "ZodError") {
    return c.json(
      {
        success: false,
        error: "Validation failed",
        details: err.errors,
      },
      400,
    );
  }

  return c.json(
    {
      success: false,
      error: "Internal server error",
    },
    500,
  );
});

// ============ Mount Feature Routes ============

// Invitation routes: /api/invitation/:uid
api.route("/invitation", invitationRoutes);

// Wishes routes: /api/:uid/wishes/*
api.route("/:uid/wishes", wishesRoutes);
api.route("/:uid/rsvp", rsvpRoutes);
api.route("/:uid/gifts", giftRoutes);
api.route("/admin", adminRoutes);

// TEMPORARY DB UPDATE ROUTE FOR AUDIO
api.get("/temp-update-music", async (c) => {
  try {
    const pool = await getDbClient(c);
    const audioData = JSON.stringify({
      src: "",
      soundcloudUrl: "/audio/a_hora_e_agora.MP3, /audio/os_anjos_cantam_nosso_amor.MP3",
      title: "A Hora é Agora, Os Anjos Cantam Nosso Amor",
      autoplay: true,
      loop: true
    });
    
    const result = await pool.query(
      `UPDATE invitations 
          SET audio = $1::jsonb 
        WHERE uid = 'lucas-andressa' 
    RETURNING uid, audio`,
      [audioData]
    );

    return c.json({
      success: true,
      message: "Database audio configurations updated successfully!",
      rows: result.rows
    });
  } catch (error) {
    console.error("Temp update error:", error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Stats route (related to wishes but at /:uid level)
api.get("/:uid/stats", zValidator("param", uidParamSchema), async (c) => {
  const { uid } = c.req.valid("param");

  try {
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
  } catch (error) {
    console.error("Error fetching stats:", error);
    throw new Error("Internal server error");
  }
});

// ============ Mount API Routes ============

app.route("/api", api);

// ============ Frontend Static Files ============

app.use(
  "/assets/*",
  serveStatic({
    root: "./dist",
    onFound: (_path, c) => {
      c.header("Cache-Control", "public, immutable, max-age=31536000");
    },
  }),
);
app.use("/images/*", serveStatic({ root: "./dist" }));
// Serve audio files: check root (public_html/audio/), dist, and public in order
app.use("/audio/*", serveStatic({ root: "./" }));
app.use("/audio/*", serveStatic({ root: "./dist" }));
app.use("/audio/*", serveStatic({ root: "./public" }));
app.use("/uploads/*", serveStatic({ root: "./public" }));
app.use("/favicon.ico", serveStatic({ root: "./dist" }));
app.use("*", serveStatic({ root: "./dist", path: "index.html" }));

// ============ Export ============

export default app;
