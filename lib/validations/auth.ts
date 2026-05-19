import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid university email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  university: z.string().min(2, "University name is required"),
  // Bank details for Paystack subaccount
  bankCode: z.string().min(1, "Settlement bank is required"),
  accountNumber: z.string().length(10, "Account number must be 10 digits"),
  // KYC — National Identification Number (11 digits)
  nin: z.string().regex(/^\d{11}$/, "NIN must be exactly 11 digits"),
});

export const kycSchema = z.object({
  nin: z.string().regex(/^\d{11}$/, "NIN must be exactly 11 digits"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type KYCInput = z.infer<typeof kycSchema>;
