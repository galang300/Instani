import {
  farmerKtpApplicationSchema,
  rejectFarmerKtpApplicationSchema
} from "@panganterkini/validation";
import { Router, type Request, type Response } from "express";
import { verifyAuthToken } from "../../common/auth.js";
import { prisma } from "../../database/prisma.js";

export const usersRoutes = Router();

type UserResponseInput = {
  id: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  contactMethod: "PHONE" | "EMAIL" | string;
  role: string;
  verificationStatus: string;
  gapoktanId?: string | null;
  ktpImageName?: string | null;
  ktpRejectionReason?: string | null;
};

function toUserResponse(user: UserResponseInput) {
  const contact = user.contactMethod === "EMAIL" ? user.email : user.phone;

  return {
    id: user.id,
    name: user.name,
    username: user.username ?? user.phone ?? user.email ?? user.id,
    phone: user.phone ?? undefined,
    email: user.email ?? undefined,
    contactMethod: user.contactMethod,
    contact: contact ?? user.username ?? "",
    role: user.role,
    verificationStatus: user.verificationStatus,
    gapoktanId: user.gapoktanId ?? undefined,
    ktpImageName: user.ktpImageName ?? undefined,
    ktpRejectionReason: user.ktpRejectionReason ?? undefined
  };
}

async function requireAdmin(request: Request, response: Response) {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ message: "Login admin diperlukan" });
    return null;
  }

  const admin = await prisma.user.findUnique({
    where: { id: token.id },
    select: { id: true, role: true }
  });

  if (admin?.role !== "ADMIN") {
    response.status(403).json({ message: "Akses admin diperlukan" });
    return null;
  }

  return admin;
}

usersRoutes.get("/me", async (request, response) => {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ message: "Login petani diperlukan" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      email: true,
      contactMethod: true,
      role: true,
      verificationStatus: true,
      gapoktanId: true,
      ktpImageName: true,
      ktpRejectionReason: true
    }
  });

  if (!user) {
    response.status(404).json({ message: "Akun tidak ditemukan" });
    return;
  }

  response.json(toUserResponse(user));
});

usersRoutes.post("/me/farmer-application", async (request, response) => {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ message: "Login diperlukan untuk mengajukan verifikasi KTP" });
    return;
  }

  const parsed = farmerKtpApplicationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: token.id },
    select: { id: true, role: true, verificationStatus: true }
  });

  if (!existingUser) {
    response.status(404).json({ message: "Akun tidak ditemukan" });
    return;
  }

  if (existingUser.role === "PETANI" && existingUser.verificationStatus === "KTP_VERIFIED") {
    response.status(409).json({ message: "Akun sudah terverifikasi sebagai petani" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: token.id },
    data: {
      ktpImageName: parsed.data.ktpImageName,
      ktpImageDataUrl: parsed.data.ktpImageDataUrl,
      ktpRejectionReason: null,
      verificationStatus: "PENDING"
    },
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      email: true,
      contactMethod: true,
      role: true,
      verificationStatus: true,
      gapoktanId: true,
      ktpImageName: true,
      ktpRejectionReason: true
    }
  });

  response.status(201).json(toUserResponse(user));
});

usersRoutes.get("/farmer-applications", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const applications = await prisma.user.findMany({
    where: {
      verificationStatus: "PENDING",
      ktpImageDataUrl: { not: null }
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      email: true,
      contactMethod: true,
      role: true,
      verificationStatus: true,
      ktpImageName: true,
      ktpImageDataUrl: true,
      ktpRejectionReason: true,
      updatedAt: true
    }
  });

  response.json(
    applications.map((application) => ({
      ...application,
      phone: application.phone ?? undefined,
      email: application.email ?? undefined,
      ktpImageName: application.ktpImageName ?? undefined,
      ktpImageDataUrl: application.ktpImageDataUrl ?? undefined,
      updatedAt: application.updatedAt.toISOString()
    }))
  );
});

usersRoutes.post("/farmer-applications/:id/approve", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const existingUser = await prisma.user.findUnique({
    where: { id: request.params.id },
    select: { id: true, ktpImageDataUrl: true }
  });

  if (!existingUser?.ktpImageDataUrl) {
    response.status(404).json({ message: "Pengajuan KTP tidak ditemukan" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      role: "PETANI",
      verificationStatus: "KTP_VERIFIED"
    },
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      email: true,
      contactMethod: true,
      role: true,
      verificationStatus: true,
      gapoktanId: true,
      ktpImageName: true,
      ktpRejectionReason: true
    }
  });

  response.json(toUserResponse(user));
});

usersRoutes.post("/farmer-applications/:id/reject", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const parsed = rejectFarmerKtpApplicationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: request.params.id },
    select: { id: true, ktpImageDataUrl: true }
  });

  if (!existingUser?.ktpImageDataUrl) {
    response.status(404).json({ message: "Pengajuan KTP tidak ditemukan" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      role: "TENGKULAK",
      verificationStatus: "KTP_REJECTED",
      ktpImageDataUrl: null,
      ktpRejectionReason: parsed.data.reason,
      gapoktanId: null
    },
    select: {
      id: true,
      name: true,
      username: true,
      phone: true,
      email: true,
      contactMethod: true,
      role: true,
      verificationStatus: true,
      gapoktanId: true,
      ktpImageName: true,
      ktpRejectionReason: true
    }
  });

  response.json(toUserResponse(user));
});
