/**
 * Unit tests for Wishes API routes
 * Uses mocked database for isolated testing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import wishesRoutes from "./routes.js";
import {
  createMockPool,
  createMockWish,
  createMockStats,
} from "../../lib/test-helpers.js";
import { AppError } from "../../lib/errors.js";

// Mock the db-client module
vi.mock("../../lib/db-client.js", () => ({
  getDbClient: vi.fn(),
}));

import { getDbClient } from "../../lib/db-client.js";

describe("wishes routes", () => {
  let app;
  let mockPool;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create fresh app for each test
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

    app.route("/:uid/wishes", wishesRoutes);
  });

  describe("GET /:uid/wishes", () => {
    it("should return wishes with pagination", async () => {
      const mockWishes = [
        createMockWish({ id: 1, name: "Guest 1" }),
        createMockWish({ id: 2, name: "Guest 2" }),
      ];

      mockPool = createMockPool({
        "SELECT uid FROM invitations": { rows: [{ uid: "test-wedding" }] },
        "SELECT id, name, message": { rows: mockWishes },
        "SELECT COUNT": { rows: [{ count: "2" }] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.pagination).toEqual({
        total: 2,
        limit: 50,
        offset: 0,
      });
    });

    it("should return 404 for non-existent invitation", async () => {
      mockPool = createMockPool({
        "SELECT uid FROM invitations": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/non-existent/wishes");
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invitation not found");
    });

    it("should respect pagination parameters", async () => {
      mockPool = createMockPool({
        "SELECT uid FROM invitations": { rows: [{ uid: "test-wedding" }] },
        "SELECT id, name, message": { rows: [] },
        "SELECT COUNT": { rows: [{ count: "100" }] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes?limit=10&offset=20");

      expect(res.status).toBe(200);

      // Verify the query was called with correct pagination
      const queryCall = mockPool.query.mock.calls.find((call) =>
        call[0].includes("LIMIT"),
      );
      expect(queryCall[1]).toContain(10); // limit
      expect(queryCall[1]).toContain(20); // offset
    });

    it("should handle database errors gracefully", async () => {
      mockPool = {
        query: vi.fn().mockRejectedValue(new Error("Database connection lost")),
      };

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes");
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Internal server error");
    });
  });

  describe("POST /:uid/wishes", () => {
    it("should create a new wish", async () => {
      const newWish = createMockWish({
        id: 1,
        name: "New Guest",
        message: "Best wishes!",
        attendance: "ATTENDING",
      });

      mockPool = createMockPool({
        "SELECT uid FROM invitations": { rows: [{ uid: "test-wedding" }] },
        "SELECT id FROM wishes WHERE invitation_uid": { rows: [] },
        "INSERT INTO wishes": { rows: [newWish] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Guest",
          message: "Best wishes!",
          attendance: "ATTENDING",
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("New Guest");
    });

    it("should return 404 for non-existent invitation", async () => {
      mockPool = createMockPool({
        "SELECT uid FROM invitations": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/non-existent/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Guest",
          message: "Test",
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("Invitation not found");
    });

    it("should return 409 for duplicate wish from same guest", async () => {
      mockPool = createMockPool({
        "SELECT uid FROM invitations": { rows: [{ uid: "test-wedding" }] },
        "SELECT id FROM wishes WHERE invitation_uid": { rows: [{ id: 1 }] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Existing Guest",
          message: "Another message",
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.code).toBe("DUPLICATE_WISH");
    });

    it("should validate required fields", async () => {
      const res = await app.request("/test-wedding/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          message: "",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("should default attendance to MAYBE", async () => {
      mockPool = createMockPool({
        "SELECT uid FROM invitations": { rows: [{ uid: "test-wedding" }] },
        "SELECT id FROM wishes WHERE invitation_uid": { rows: [] },
        "INSERT INTO wishes": (sql, params) => ({
          rows: [
            createMockWish({
              name: params[1],
              message: params[2],
              attendance: params[3],
            }),
          ],
        }),
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Guest",
          message: "Test message",
          // No attendance specified
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.attendance).toBe("MAYBE");
    });
  });

  describe("DELETE /:uid/wishes/:id", () => {
    it("should delete an existing wish", async () => {
      mockPool = createMockPool({
        "DELETE FROM wishes": { rows: [{ id: 1 }] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes/1", {
        method: "DELETE",
      });

      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("Wish deleted");
    });

    it("should return 404 for non-existent wish", async () => {
      mockPool = createMockPool({
        "DELETE FROM wishes": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes/999", {
        method: "DELETE",
      });

      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("Wish not found");
    });
  });

  describe("GET /:uid/wishes/check/:name", () => {
    it("should return hasSubmitted: true for existing wish", async () => {
      mockPool = createMockPool({
        "SELECT id FROM wishes WHERE invitation_uid": { rows: [{ id: 1 }] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes/check/ExistingGuest");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.hasSubmitted).toBe(true);
    });

    it("should return hasSubmitted: false for new guest", async () => {
      mockPool = createMockPool({
        "SELECT id FROM wishes WHERE invitation_uid": { rows: [] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes/check/NewGuest");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.hasSubmitted).toBe(false);
    });
  });

  describe("GET /:uid/wishes/stats", () => {
    it("should return attendance statistics", async () => {
      mockPool = createMockPool({
        SELECT: { rows: [createMockStats()] },
      });

      getDbClient.mockResolvedValue(mockPool);

      const res = await app.request("/test-wedding/wishes/stats");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty("attending");
      expect(json.data).toHaveProperty("not_attending");
      expect(json.data).toHaveProperty("maybe");
      expect(json.data).toHaveProperty("total");
    });
  });
});
