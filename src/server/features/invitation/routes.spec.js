/**
 * Unit tests for Invitation API routes
 * Uses mocked database for isolated testing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import invitationRoutes from "./routes.js";
import {
  createMockPool,
  createMockInvitation,
  createMockAgenda,
  createMockBank,
} from "../../lib/test-helpers.js";
import { AppError } from "../../lib/errors.js";

// Mock the db-client module
vi.mock("../../lib/db-client.js", () => ({
  getDbClient: vi.fn(),
}));

import { getDbClient } from "../../lib/db-client.js";

describe("invitation routes", () => {
  let app;
  let mockPool;

  beforeEach(() => {
    vi.clearAllMocks();

    app = new Hono();

    // Add error handler identical to src/server/index.js
    app.onError((err, c) => {
      if (err instanceof AppError) {
        return c.json(
          { success: false, error: err.message, code: err.code },
          err.status,
        );
      }
      return c.json({ success: false, error: "Internal server error" }, 500);
    });

    app.route("/invitation", invitationRoutes);
  });

  describe("GET /invitation/:uid", () => {
    it("should return invitation with agenda and banks", async () => {
      const mockInvitation = createMockInvitation();
      const mockAgenda = [
        createMockAgenda({ id: 1, title: "Akad Nikah" }),
        createMockAgenda({ id: 2, title: "Resepsi" }),
      ];
      const mockBanks = [
        createMockBank({ id: 1, bank: "BCA" }),
        createMockBank({ id: 2, bank: "Mandiri" }),
      ];

      mockPool = createMockPool({
        "SELECT * FROM invitations": { rows: [mockInvitation] },
        "SELECT id, title, date, start_time": { rows: mockAgenda },
        "SELECT id, bank, account_number": { rows: mockBanks },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/invitation/test-wedding-2025");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.groomName).toBe("Test Groom");
      expect(json.data.brideName).toBe("Test Bride");
      expect(json.data.agenda).toHaveLength(2);
      expect(json.data.banks).toHaveLength(2);
    });

    it("should format response to match frontend structure", async () => {
      const mockInvitation = createMockInvitation({
        groom_name: "Ahmad",
        bride_name: "Fatimah",
        parent_groom: "Bapak Ahmad Sr",
        parent_bride: "Bapak Fatimah Sr",
        wedding_date: "2025-06-15",
        maps_url: "https://maps.google.com/test",
        maps_embed: "<iframe src='test'></iframe>",
      });

      mockPool = createMockPool({
        "SELECT * FROM invitations": { rows: [mockInvitation] },
        "SELECT id, title, date, start_time": { rows: [] },
        "SELECT id, bank, account_number": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/invitation/test-wedding");
      const json = await res.json();

      // Check camelCase conversion
      expect(json.data.groomName).toBe("Ahmad");
      expect(json.data.brideName).toBe("Fatimah");
      expect(json.data.parentGroom).toBe("Bapak Ahmad Sr");
      expect(json.data.parentBride).toBe("Bapak Fatimah Sr");
      expect(json.data.date).toBe("2025-06-15");
      expect(json.data.maps_url).toBe("https://maps.google.com/test");
    });

    it("should return 404 for non-existent invitation", async () => {
      mockPool = createMockPool({
        "SELECT * FROM invitations": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/invitation/non-existent");
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invitation not found");
    });

    it("should validate UID format", async () => {
      const res = await app.request("/invitation/INVALID_UID");

      expect(res.status).toBe(400);
    });

    it("should handle empty agenda and banks", async () => {
      const mockInvitation = createMockInvitation();

      mockPool = createMockPool({
        "SELECT * FROM invitations": { rows: [mockInvitation] },
        "SELECT id, title, date, start_time": { rows: [] },
        "SELECT id, bank, account_number": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/invitation/test-wedding");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.agenda).toEqual([]);
      expect(json.data.banks).toEqual([]);
    });

    it("should format agenda items correctly", async () => {
      const mockInvitation = createMockInvitation();
      const mockAgenda = [
        {
          id: 1,
          title: "Akad Nikah",
          date: "2025-06-15",
          start_time: "10:00",
          end_time: "11:00",
          location: "Mosque",
          address: "123 Street",
        },
      ];

      mockPool = createMockPool({
        "SELECT * FROM invitations": { rows: [mockInvitation] },
        "SELECT id, title, date, start_time": { rows: mockAgenda },
        "SELECT id, bank, account_number": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/invitation/test-wedding");
      const json = await res.json();

      expect(json.data.agenda[0]).toEqual({
        title: "Akad Nikah",
        date: "2025-06-15",
        startTime: "10:00",
        endTime: "11:00",
        location: "Mosque",
        address: "123 Street",
      });
    });

    it("should format bank items correctly", async () => {
      const mockInvitation = createMockInvitation();
      const mockBanks = [
        {
          id: 1,
          bank: "BCA",
          account_number: "1234567890",
          account_name: "Ahmad",
        },
      ];

      mockPool = createMockPool({
        "SELECT * FROM invitations": { rows: [mockInvitation] },
        "SELECT id, title, date, start_time": { rows: [] },
        "SELECT id, bank, account_number": { rows: mockBanks },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/invitation/test-wedding");
      const json = await res.json();

      expect(json.data.banks[0]).toEqual({
        bank: "BCA",
        accountNumber: "1234567890",
        accountName: "Ahmad",
      });
    });

    it("should handle database errors gracefully", async () => {
      mockPool = {
        query: vi.fn().mockRejectedValue(new Error("Connection timeout")),
      };

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/invitation/test-wedding");
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Internal server error");
    });
  });
});
