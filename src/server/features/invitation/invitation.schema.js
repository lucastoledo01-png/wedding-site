/**
 * Invitation Feature - Validation Schemas
 */

import { z } from "zod";

/**
 * UID parameter schema
 * Validates wedding invitation UID format
 */
export const uidParamSchema = z.object({
  uid: z
    .string()
    .min(1, "UID is required")
    .max(100, "UID must be less than 100 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "UID must contain only lowercase letters, numbers, and hyphens",
    ),
});

/**
 * @typedef {import('zod').infer<typeof uidParamSchema>} UidParam
 */
