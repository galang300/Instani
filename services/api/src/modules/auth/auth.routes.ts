import {
  adminLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
  petaniLoginSchema,
  petaniRegisterSchema
} from "@panganterkini/validation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { signAuthToken, verifyAuthToken } from "../../common/auth.js";
import { env } from "../../common/config.js";
import { prisma } from "../../database/prisma.js";

export const authRoutes = Router();

type AuthRole = "PETANI" | "TENGKULAK" | "ADMIN" | "PENYULUH";
type ContactMethod = "PHONE" | "EMAIL";
type VerificationChannel = "WHATSAPP" | "EMAIL";

const DEMO_OTP = "123456";

const demoOtp = new Map<
  string,
  { otp: string; role: AuthRole; channel: VerificationChannel; name?: string; userId?: string }
>();

function toAuthUser(user: {
  id: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  contactMethod?: ContactMethod | string;
  role: AuthRole;
  verificationStatus: string;
  gapoktanId?: string | null;
  ktpImageName?: string | null;
  ktpRejectionReason?: string | null;
}) {
  const contactMethod = user.contactMethod === "EMAIL" ? "EMAIL" : "PHONE";
  const contact = contactMethod === "EMAIL" ? user.email : user.phone;

  return {
    id: user.id,
    name: user.name,
    username: user.username ?? contact ?? user.id,
    phone: user.phone ?? undefined,
    email: user.email ?? undefined,
    contactMethod,
    contact: contact ?? user.username ?? "",
    role: user.role,
    verificationStatus: user.verificationStatus,
    gapoktanId: user.gapoktanId ?? undefined,
    ktpImageName: user.ktpImageName ?? undefined,
    ktpRejectionReason: user.ktpRejectionReason ?? undefined
  };
}

function normalizePhone(phone: string) {
  return phone.trim().replace(/[\s()-]/g, "");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  const trimmed = username.trim();
  if (trimmed.includes("@")) return normalizeEmail(trimmed);
  if (/^\+?[\d\s()-]+$/.test(trimmed)) return normalizePhone(trimmed);
  return trimmed.toLowerCase();
}

function fallbackName(phone: string, role: AuthRole = "PETANI") {
  const suffix = phone.slice(-4);
  const roleLabel: Record<AuthRole, string> = {
    PETANI: "Petani",
    TENGKULAK: "Tengkulak",
    ADMIN: "Admin",
    PENYULUH: "Penyuluh"
  };
  return `${roleLabel[role]} ${suffix || "Baru"}`;
}

function accountRoleForOtp(role: AuthRole) {
  return role === "PETANI" ? "TENGKULAK" : role;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${passwordHash}`;
}

function verifyPassword(password: string, storedPasswordHash?: string | null) {
  if (!storedPasswordHash) return false;

  const [algorithm, salt, passwordHash] = storedPasswordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !passwordHash) return false;

  try {
    const expectedHash = scryptSync(password, salt, 64);
    const storedHash = Buffer.from(passwordHash, "hex");
    return storedHash.length === expectedHash.length && timingSafeEqual(storedHash, expectedHash);
  } catch {
    return false;
  }
}

function contactTarget(input: { contactMethod: ContactMethod; phone?: string; email?: string }) {
  return input.contactMethod === "PHONE"
    ? normalizePhone(input.phone ?? "")
    : normalizeEmail(input.email ?? "");
}

authRoutes.post("/otp/request", (request, response) => {
  const parsed = otpRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const role = accountRoleForOtp(parsed.data.role);
  demoOtp.set(phone, {
    otp: DEMO_OTP,
    role,
    channel: "WHATSAPP",
    name: parsed.data.name
  });
  response.json({
    phone,
    channel: "WHATSAPP",
    devOtp: DEMO_OTP
  });
});

authRoutes.post("/otp/verify", async (request, response) => {
  const parsed = otpVerifySchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  const otpSession = demoOtp.get(phone);
  if (!otpSession || otpSession.otp !== parsed.data.otp) {
    response.status(401).json({ message: "OTP tidak valid" });
    return;
  }

  const user = await prisma.user.upsert({
    where: { phone },
    create: {
      name: otpSession.name ?? fallbackName(phone, accountRoleForOtp(otpSession.role)),
      username: phone,
      phone,
      contactMethod: "PHONE",
      role: accountRoleForOtp(otpSession.role),
      verificationStatus: "PENDING"
    },
    update: {
      name: otpSession.name ?? fallbackName(phone, accountRoleForOtp(otpSession.role)),
      username: phone,
      role: accountRoleForOtp(otpSession.role),
      verificationStatus: "PENDING"
    }
  });

  response.json({
    token: signAuthToken(user),
    user: toAuthUser(user)
  });
});

authRoutes.post("/petani/register", async (request, response) => {
  const parsed = petaniRegisterSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const target = contactTarget(parsed.data);
  const requestedUsername = normalizeUsername(parsed.data.username);
  const existingContactUser = await prisma.user.findFirst({
    where: {
      OR: [
        parsed.data.contactMethod === "PHONE" ? { phone: target } : { email: target }
      ]
    }
  });
  const existingUsernameUser = await prisma.user.findFirst({
    where: {
      username: requestedUsername
    }
  });

  if (existingContactUser) {
    response.status(409).json({ message: "Email atau telepon sudah terdaftar" });
    return;
  }

  if (existingUsernameUser) {
    response.status(409).json({ message: "Username sudah digunakan" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.username.trim(),
      username: requestedUsername,
      passwordHash: hashPassword(parsed.data.password),
      phone: parsed.data.contactMethod === "PHONE" ? target : null,
      email: parsed.data.contactMethod === "EMAIL" ? target : null,
      contactMethod: parsed.data.contactMethod,
      role: "TENGKULAK",
      verificationStatus: "PENDING"
    }
  });

  response.status(201).json({
    token: signAuthToken(user),
    user: toAuthUser(user)
  });
});

authRoutes.post("/petani/login", async (request, response) => {
  const parsed = petaniLoginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const identifier = normalizeUsername(parsed.data.identifier);
  const user = await prisma.user.findFirst({
    where: {
      role: { not: "ADMIN" },
      OR: [
        { phone: identifier },
        { email: identifier }
      ]
    }
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    response.status(401).json({ message: "Email/telepon atau kata sandi salah" });
    return;
  }

  response.json({
    token: signAuthToken(user),
    user: toAuthUser(user)
  });
});

authRoutes.post("/admin/login", async (request, response) => {
  const parsed = adminLoginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const identifier = normalizeUsername(parsed.data.identifier);
  const configuredAdminEmail = normalizeEmail(env.adminEmail);
  const shouldBootstrapAdmin =
    identifier === configuredAdminEmail && parsed.data.password === env.adminPassword;

  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
      OR: [{ username: identifier }, { email: identifier }, { phone: identifier }]
    }
  });

  const user =
    existingAdmin ??
    (shouldBootstrapAdmin
      ? await prisma.user.upsert({
          where: { email: configuredAdminEmail },
          create: {
            name: env.adminName,
            username: configuredAdminEmail,
            email: configuredAdminEmail,
            contactMethod: "EMAIL",
            passwordHash: hashPassword(env.adminPassword),
            role: "ADMIN",
            verificationStatus: "KTP_VERIFIED"
          },
          update: {
            name: env.adminName,
            username: configuredAdminEmail,
            passwordHash: hashPassword(env.adminPassword),
            role: "ADMIN",
            verificationStatus: "KTP_VERIFIED"
          }
        })
      : null);

  if (!user || user.role !== "ADMIN" || !verifyPassword(parsed.data.password, user.passwordHash)) {
    response.status(401).json({ message: "Akun admin atau kata sandi salah" });
    return;
  }

  response.json({
    token: signAuthToken(user),
    user: toAuthUser(user)
  });
});

authRoutes.get("/admin/me", async (request, response) => {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ message: "Login admin diperlukan" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id }
  });

  if (!user || user.role !== "ADMIN") {
    response.status(403).json({ message: "Akses admin diperlukan" });
    return;
  }

  response.json(toAuthUser(user));
});
