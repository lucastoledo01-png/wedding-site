/**
 * Shared Test Helpers and Mock Factories
 * Provides helpers for creating mock database clients and Hono test contexts
 */

import { vi } from "vitest";

/**
 * Creates a mock database pool for testing
 * @param {Object} queryResponses - Map of query patterns to responses
 * @returns {Object} Mock pool object
 */
export function createMockPool(queryResponses = {}) {
  return {
    query: vi.fn(async (sql, params) => {
      // Find matching response based on SQL pattern
      for (const [pattern, response] of Object.entries(queryResponses)) {
        if (sql.includes(pattern)) {
          if (typeof response === "function") {
            return response(sql, params);
          }
          return response;
        }
      }

      // Default empty response
      return { rows: [], rowCount: 0 };
    }),
  };
}

/**
 * Creates a mock Hono context with database pool
 * @param {Object} mockPool - Mock database pool
 * @returns {Object} Mock context
 */
export function createMockContext(mockPool) {
  return {
    env: {
      DB: mockPool,
    },
  };
}

/**
 * Creates mock invitation data
 * @param {Object} overrides - Override default values
 * @returns {Object} Invitation data
 */
export function createMockInvitation(overrides = {}) {
  return {
    uid: "test-wedding-2025",
    title: "Wedding of Test Groom & Test Bride",
    description: "You are invited to our wedding",
    groom_name: "Test Groom",
    bride_name: "Test Bride",
    parent_groom: "Parent of Groom",
    parent_bride: "Parent of Bride",
    wedding_date: "2025-06-15",
    time: "10:00",
    location: "Grand Ballroom",
    address: "123 Wedding Street",
    maps_url: "https://maps.google.com",
    maps_embed: "<iframe></iframe>",
    og_image: "/og-image.jpg",
    favicon: "/favicon.ico",
    audio: "/music.mp3",
    ...overrides,
  };
}

/**
 * Creates mock wish data
 * @param {Object} overrides - Override default values
 * @returns {Object} Wish data
 */
export function createMockWish(overrides = {}) {
  return {
    id: 1,
    name: "Test Guest",
    message: "Congratulations!",
    attendance: "ATTENDING",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates mock agenda data
 * @param {Object} overrides - Override default values
 * @returns {Object} Agenda data
 */
export function createMockAgenda(overrides = {}) {
  return {
    id: 1,
    title: "Akad Nikah",
    date: "2025-06-15",
    start_time: "10:00",
    end_time: "11:00",
    location: "Mosque",
    address: "123 Mosque Street",
    ...overrides,
  };
}

/**
 * Creates mock bank data
 * @param {Object} overrides - Override default values
 * @returns {Object} Bank data
 */
export function createMockBank(overrides = {}) {
  return {
    id: 1,
    bank: "Bank Central Asia",
    account_number: "1234567890",
    account_name: "Test Groom",
    ...overrides,
  };
}

/**
 * Creates mock stats data
 * @param {Object} overrides - Override default values
 * @returns {Object} Stats data
 */
export function createMockStats(overrides = {}) {
  return {
    attending: "10",
    not_attending: "5",
    maybe: "3",
    total: "18",
    ...overrides,
  };
}
