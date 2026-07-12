/**
 * Wishes Feature - Validation Schemas
 */

import { z } from "zod";

/**
 * Wish creation schema
 * Validates incoming wish submissions with attendance tracking
 */
export const createWishSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),

  message: z
    .string()
    .min(1, "Message is required")
    .max(500, "Message must be less than 500 characters")
    .trim(),

  attendance: z
    .enum(["ATTENDING", "NOT_ATTENDING", "MAYBE"], {
      errorMap: () => ({
        message: "Attendance must be ATTENDING, NOT_ATTENDING, or MAYBE",
      }),
    })
    .default("MAYBE"),

  recaptchaToken: z.string().optional(),
  recaptchaAction: z.string().optional(),
});

/**
 * Wishes query parameters schema
 * Validates pagination parameters
 */
export const wishesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .default("50")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int("Limit must be an integer")
        .positive("Limit must be positive")
        .max(100, "Limit cannot exceed 100"),
    ),

  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(
      z
        .number()
        .int("Offset must be an integer")
        .min(0, "Offset cannot be negative"),
    ),
});

/**
 * Wish ID parameter schema
 * Validates wish ID for deletion
 */
export const wishIdParamSchema = z.object({
  uid: z.string().min(1),
  id: z
    .string()
    .regex(/^\d+$/, "Wish ID must be a valid number")
    .transform((val) => parseInt(val, 10)),
});

/**
 * @typedef {import('zod').infer<typeof createWishSchema>} CreateWish
 * @typedef {import('zod').infer<typeof wishesQuerySchema>} WishesQuery
 * @typedef {import('zod').infer<typeof wishIdParamSchema>} WishIdParam
 */
