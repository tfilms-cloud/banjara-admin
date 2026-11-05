import { z } from "zod";

/** Same rule the API enforces (banjara-backend/src/validators/password.ts). */
export const newPasswordSchema = z
  .string()
  .min(8, "Minimum 8 characters")
  .max(72, "Maximum 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const PASSWORD_HINT = "8+ characters, with a letter and a number";
