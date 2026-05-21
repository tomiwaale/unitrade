import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(
    /^(\+234|0)[789]\d{9}$/,
    "Enter a valid Nigerian mobile number (e.g. 08012345678)"
  ),
  password: z.string().min(6, "Password must be at least 6 characters"),
  university: z.string().min(2, "University name is required"),
});

export const payoutSchema = z.object({
  bankCode: z.string().min(1, "Settlement bank is required"),
  accountNumber: z.string().length(10, "Account number must be 10 digits"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PayoutInput = z.infer<typeof payoutSchema>;
