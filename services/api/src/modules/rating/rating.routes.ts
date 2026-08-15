import { farmerPerformanceReviewSchema } from "@panganterkini/validation";
import { Router, type Request, type Response } from "express";
import { verifyAuthToken } from "../../common/auth.js";
import { prisma } from "../../database/prisma.js";
import { hargaRepository } from "../harga/harga.repository.js";

export const ratingRoutes = Router();

type FarmerRatingRecord = Awaited<ReturnType<typeof prisma.rating.findMany>>[number] & {
  author: { name: string };
};

function performanceLabel(score: number) {
  if (score >= 5) return "Sangat baik";
  if (score >= 4) return "Baik";
  if (score >= 3) return "Cukup";
  return "Perlu pembinaan";
}

function toRatingResponse(record: FarmerRatingRecord) {
  return {
    id: record.id,
    farmerId: record.targetId,
    adminName: record.author.name,
    score: record.score,
    performanceLabel: record.performanceLabel ?? performanceLabel(record.score),
    note: record.note ?? undefined,
    benefitTitle: record.benefitTitle ?? undefined,
    benefitDescription: record.benefitDescription ?? undefined,
    benefitValue: record.benefitValue ?? undefined,
    benefitStatus: record.benefitStatus ?? undefined,
    createdAt: record.createdAt.toISOString()
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
    select: { id: true, name: true, role: true }
  });

  if (admin?.role !== "ADMIN") {
    response.status(403).json({ message: "Akses admin diperlukan" });
    return null;
  }

  return admin;
}

async function requireUser(request: Request, response: Response) {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token) {
    response.status(401).json({ message: "Login diperlukan" });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { id: true, role: true, verificationStatus: true }
  });

  if (!user) {
    response.status(404).json({ message: "Akun tidak ditemukan" });
    return null;
  }

  return user;
}

ratingRoutes.get("/farmers", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const dashboard = await hargaRepository.monthlyReportingDashboard();
  response.json(dashboard.farmers);
});

ratingRoutes.get("/farmers/:id/performance", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const farmer = await prisma.user.findFirst({
    where: {
      id: request.params.id,
      role: "PETANI",
      verificationStatus: "KTP_VERIFIED"
    },
    select: { id: true, name: true }
  });

  if (!farmer) {
    response.status(404).json({ message: "Petani terverifikasi tidak ditemukan" });
    return;
  }

  response.json({
    farmer,
    ...(await hargaRepository.farmerPerformanceForUser(farmer.id))
  });
});

ratingRoutes.post("/farmers/:id/reviews", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const parsed = farmerPerformanceReviewSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  const farmer = await prisma.user.findFirst({
    where: {
      id: request.params.id,
      role: "PETANI",
      verificationStatus: "KTP_VERIFIED"
    },
    select: { id: true, name: true }
  });

  if (!farmer) {
    response.status(404).json({ message: "Petani terverifikasi tidak ditemukan" });
    return;
  }

  const benefitTitle = parsed.data.benefitTitle?.trim();
  const rating = await prisma.rating.create({
    data: {
      authorId: admin.id,
      targetId: farmer.id,
      score: parsed.data.score,
      performanceLabel: performanceLabel(parsed.data.score),
      note: parsed.data.note?.trim() || null,
      benefitTitle: benefitTitle || null,
      benefitDescription: parsed.data.benefitDescription?.trim() || null,
      benefitValue: parsed.data.benefitValue ?? null,
      benefitStatus: benefitTitle ? "AWARDED" : null
    },
    include: {
      author: {
        select: { name: true }
      }
    }
  });

  if (benefitTitle) {
    await prisma.notificationLog.create({
      data: {
        channel: "IN_APP",
        target: farmer.id,
        payload: {
          type: "FARMER_REWARD",
          ratingId: rating.id,
          benefitTitle,
          benefitValue: parsed.data.benefitValue ?? null
        },
        status: "QUEUED"
      }
    });
  }

  response.status(201).json(toRatingResponse(rating));
});

ratingRoutes.get("/me/farmer-performance", async (request, response) => {
  const user = await requireUser(request, response);
  if (!user) return;

  if (user.role !== "PETANI" || user.verificationStatus !== "KTP_VERIFIED") {
    response.status(403).json({ message: "Akses petani terverifikasi diperlukan" });
    return;
  }

  response.json(await hargaRepository.farmerPerformanceForUser(user.id));
});

ratingRoutes.get("/buyers", (_request, response) => {
  response.json([
    {
      id: "buyer-001",
      name: "Tengkulak Amanah",
      rating: 4.7,
      completedTransactions: 28
    }
  ]);
});
