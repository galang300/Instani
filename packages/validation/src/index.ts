import { z } from "zod";

export const priceReportSchema = z.object({
  commodity: z.string().min(2),
  pricePerKg: z.coerce.number().positive(),
  volumeKg: z.coerce.number().positive(),
  district: z.string().min(2),
  village: z.string().optional(),
  reporterName: z.string().optional(),
  reporterPhone: z.string().optional(),
  source: z.enum(["WEB", "WHATSAPP", "MOBILE", "SCRAPER", "ADMIN"]).default("WEB"),
  location: z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number()
  })
});

export const hppInputSchema = z.object({
  seedCost: z.coerce.number().min(0),
  fertilizerCost: z.coerce.number().min(0),
  laborCost: z.coerce.number().min(0),
  landRent: z.coerce.number().min(0),
  logisticsCost: z.coerce.number().min(0),
  yieldKg: z.coerce.number().positive(),
  marginPercent: z.coerce.number().min(0).max(100)
});

export const otpRequestSchema = z.object({
  phone: z.string().min(8),
  role: z.enum(["PETANI", "TENGKULAK", "ADMIN", "PENYULUH"]).default("PETANI"),
  name: z.string().trim().min(2).optional()
});

export const otpVerifySchema = z.object({
  phone: z.string().min(8),
  otp: z.string().min(4)
});

export const petaniRegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung"),
  password: z.string().min(6),
  contactMethod: z.enum(["PHONE", "EMAIL"]),
  phone: z.string().trim().min(8).optional(),
  email: z.string().trim().email().optional()
}).superRefine((value, context) => {
  if (value.contactMethod === "PHONE" && !value.phone) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Nomor telepon wajib diisi",
      path: ["phone"]
    });
  }

  if (value.contactMethod === "EMAIL" && !value.email) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Email wajib diisi",
      path: ["email"]
    });
  }
});

export const petaniLoginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1)
});

export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1)
});

export const farmerKtpApplicationSchema = z.object({
  ktpImageName: z.string().trim().min(1),
  ktpImageDataUrl: z.string().trim().min(20).max(6_000_000)
});

export const rejectFarmerKtpApplicationSchema = z.object({
  reason: z.string().trim().min(3).max(240).default("Data KTP belum sesuai")
});

export const farmerPerformanceReviewSchema = z.object({
  score: z.coerce.number().int().min(0).max(10),
  note: z.string().trim().max(400).optional(),
  benefitTitle: z.string().trim().min(3).max(120).optional(),
  benefitDescription: z.string().trim().max(300).optional(),
  benefitValue: z.coerce.number().int().min(0).max(10_000_000).optional()
});

export const anomalyDetectSchema = z.object({
  values: z.array(z.coerce.number()).min(3),
  value: z.coerce.number()
});

export type PriceReportInput = z.infer<typeof priceReportSchema>;
export type HppInputPayload = z.infer<typeof hppInputSchema>;
export type PetaniRegisterInput = z.infer<typeof petaniRegisterSchema>;
export type PetaniLoginInput = z.infer<typeof petaniLoginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type FarmerKtpApplicationInput = z.infer<typeof farmerKtpApplicationSchema>;
export type RejectFarmerKtpApplicationInput = z.infer<typeof rejectFarmerKtpApplicationSchema>;
export type FarmerPerformanceReviewInput = z.infer<typeof farmerPerformanceReviewSchema>;
