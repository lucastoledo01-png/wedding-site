/**
 * Unit tests for RSVP API routes
 * Uses a mocked database and stubbed side effects (Sheets backup, WhatsApp).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockPool } from "../../lib/test-helpers.js";

vi.mock("../../lib/db-client.js", () => ({ getDbClient: vi.fn() }));
vi.mock("../../lib/google-sheets-backup.js", () => ({
  appendRsvpBackup: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../lib/whatsapp.js", () => ({
  triggerWhatsAppNotification: vi.fn().mockResolvedValue(undefined),
}));

import { getDbClient } from "../../lib/db-client.js";
import rsvpRoutes from "./routes.js";

const GUESTS = [
  { id: 1, full_name: "Vitória Casaloti", attendance: "PENDING" },
  { id: 2, full_name: "Ana Paula Lima", attendance: "PENDING" },
  { id: 3, full_name: "Ana Beatriz Costa", attendance: "PENDING" },
];

function poolWithGuests(extra = {}) {
  return createMockPool({
    "FROM guests\n      WHERE invitation_uid": { rows: GUESTS },
    "FROM guests": { rows: GUESTS },
    "UPDATE guests": (sql, params) => ({
      rows: [
        {
          id: params[6],
          full_name: "Vitória Casaloti",
          party_size: params[1] ?? 1,
          attendance: params[0],
          confirmed_at: new Date().toISOString(),
          message: params[2],
          confirmed_phone: params[3],
          confirmed_ip: params[4],
          confirmed_device: params[5],
        },
      ],
    }),
    ...extra,
  });
}

describe("rsvp routes", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/:uid/rsvp", rsvpRoutes);
    getDbClient.mockResolvedValue(poolWithGuests());
  });

  describe("GET /search", () => {
    it("matches a full name ignoring case and accents", async () => {
      const res = await app.request(
        "/lucas/rsvp/search?name=VITORIA%20casaloti",
      );
      const json = await res.json();
      expect(json.data.match?.id).toBe(1);
    });

    it("matches an unambiguous first name", async () => {
      const res = await app.request("/lucas/rsvp/search?name=Vit%C3%B3ria");
      const json = await res.json();
      expect(json.data.match?.id).toBe(1);
    });

    it("returns no match when the name is ambiguous", async () => {
      const res = await app.request("/lucas/rsvp/search?name=Ana");
      const json = await res.json();
      expect(json.data.match).toBeNull();
    });
  });

  describe("POST /confirm", () => {
    it("confirms using the guest id resolved by search", async () => {
      const res = await app.request("/lucas/rsvp/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          guestId: 1,
          name: "Vitória",
          attendance: "ATTENDING",
          phone: "+5535999990000",
        }),
      });
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.attendance).toBe("ATTENDING");
    });

    it("rejects an ambiguous name with 404", async () => {
      const res = await app.request("/lucas/rsvp/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Ana",
          attendance: "ATTENDING",
          phone: "+5535999990000",
        }),
      });
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });

    it("rejects an invalid phone with 400", async () => {
      const res = await app.request("/lucas/rsvp/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Vitória Casaloti", phone: "123" }),
      });
      expect(res.status).toBe(400);
    });
  });
});
