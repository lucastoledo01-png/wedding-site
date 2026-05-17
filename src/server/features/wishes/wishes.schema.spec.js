/**
 * Unit tests for Wishes validation schemas
 */

import { describe, it, expect } from "vitest";
import {
  createWishSchema,
  wishesQuerySchema,
  wishIdParamSchema,
} from "./wishes.schema.js";

describe("wishes schemas", () => {
  describe("createWishSchema", () => {
    it("should validate a valid wish", () => {
      const result = createWishSchema.safeParse({
        name: "Ahmad Abdullah",
        message: "Congratulations on your wedding!",
        attendance: "ATTENDING",
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: "Ahmad Abdullah",
        message: "Congratulations on your wedding!",
        attendance: "ATTENDING",
      });
    });

    it("should trim whitespace from name and message", () => {
      const result = createWishSchema.safeParse({
        name: "  Ahmad  ",
        message: "  Best wishes!  ",
        attendance: "MAYBE",
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe("Ahmad");
      expect(result.data.message).toBe("Best wishes!");
    });

    it("should default attendance to MAYBE", () => {
      const result = createWishSchema.safeParse({
        name: "Guest",
        message: "Congrats!",
      });

      expect(result.success).toBe(true);
      expect(result.data.attendance).toBe("MAYBE");
    });

    it("should reject empty name", () => {
      const result = createWishSchema.safeParse({
        name: "",
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Name is required");
    });

    it("should reject name exceeding 100 characters", () => {
      const result = createWishSchema.safeParse({
        name: "A".repeat(101),
        message: "Test",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe(
        "Name must be less than 100 characters",
      );
    });

    it("should reject empty message", () => {
      const result = createWishSchema.safeParse({
        name: "Guest",
        message: "",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Message is required");
    });

    it("should reject message exceeding 500 characters", () => {
      const result = createWishSchema.safeParse({
        name: "Guest",
        message: "A".repeat(501),
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe(
        "Message must be less than 500 characters",
      );
    });

    it("should reject invalid attendance value", () => {
      const result = createWishSchema.safeParse({
        name: "Guest",
        message: "Test",
        attendance: "INVALID",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain("ATTENDING");
    });
  });

  describe("wishesQuerySchema", () => {
    it("should use default values when no params provided", () => {
      const result = wishesQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    });

    it("should parse string values to numbers", () => {
      const result = wishesQuerySchema.safeParse({
        limit: "25",
        offset: "10",
      });

      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(10);
    });

    it("should reject limit exceeding 100", () => {
      const result = wishesQuerySchema.safeParse({
        limit: "150",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Limit cannot exceed 100");
    });

    it("should reject negative offset", () => {
      const result = wishesQuerySchema.safeParse({
        offset: "-5",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe("Offset cannot be negative");
    });
  });

  describe("wishIdParamSchema", () => {
    it("should validate valid wish ID params", () => {
      const result = wishIdParamSchema.safeParse({
        uid: "wedding-2025",
        id: "123",
      });

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(123);
    });

    it("should transform string ID to number", () => {
      const result = wishIdParamSchema.safeParse({
        uid: "wedding",
        id: "456",
      });

      expect(result.success).toBe(true);
      expect(typeof result.data.id).toBe("number");
    });

    it("should reject non-numeric ID", () => {
      const result = wishIdParamSchema.safeParse({
        uid: "wedding",
        id: "abc",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe(
        "Wish ID must be a valid number",
      );
    });
  });
});
