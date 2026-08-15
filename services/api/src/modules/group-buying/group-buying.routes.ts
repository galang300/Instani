import type { Prisma } from "@prisma/client";
import { Router, type Request } from "express";
import { verifyAuthToken } from "../../common/auth.js";
import { prisma } from "../../database/prisma.js";

export const groupBuyingRoutes = Router();

type StoredGroupBuyingOrder = Awaited<ReturnType<typeof prisma.groupBuyingOrder.findMany>>[number] & {
  commitments: Array<{
    id: string;
    orderId: string;
    buyerId: string;
    kg: number;
    createdAt: Date;
    buyer: { name: string };
  }>;
};

type GroupBuyingCommitmentRow = StoredGroupBuyingOrder["commitments"][number];

function calculateProgressPercent(targetKg: number, committedKg: number) {
  if (targetKg <= 0 || committedKg <= 0) return 0;

  const progress = Math.min(100, (committedKg / targetKg) * 100);
  if (progress < 10) {
    return Math.max(0.1, Number(progress.toFixed(1)));
  }

  return Math.round(progress);
}

function toGroupBuyingOrder(record: StoredGroupBuyingOrder) {
  const progressPercent = calculateProgressPercent(record.targetKg, record.committedKg);

  return {
    id: record.id,
    commodity: record.commodity,
    targetKg: record.targetKg,
    committedKg: record.committedKg,
    pickupPoint: record.pickupPoint,
    deadlineAt: record.deadlineAt.toISOString(),
    status: progressPercent >= 100 ? "READY" : record.status,
    createdAt: record.createdAt.toISOString(),
    progressPercent,
    commitmentCount: record.commitments.length,
    commitments: record.commitments.slice(0, 5).map((commitment: GroupBuyingCommitmentRow) => ({
      id: commitment.id,
      orderId: commitment.orderId,
      buyerId: commitment.buyerId,
      buyerName: commitment.buyer.name,
      kg: commitment.kg,
      createdAt: commitment.createdAt.toISOString()
    }))
  };
}

async function readBuyerToken(request: Request) {
  const token = verifyAuthToken(request.headers.authorization);
  if (!token?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { role: true, verificationStatus: true }
  });

  const isBuyer = user?.role === "TENGKULAK";
  const isVerifiedFarmer =
    user?.role === "PETANI" && user.verificationStatus === "KTP_VERIFIED";

  if (!isBuyer && !isVerifiedFarmer) {
    return null;
  }

  return token;
}

async function listOrders() {
  const orders = await prisma.groupBuyingOrder.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 20,
    include: {
      commitments: {
        orderBy: { createdAt: "desc" },
        include: {
          buyer: {
            select: { name: true }
          }
        }
      }
    }
  });

  return orders.map(toGroupBuyingOrder);
}

groupBuyingRoutes.get("/", async (_request, response) => {
  response.json(await listOrders());
});

groupBuyingRoutes.post("/", async (request, response) => {
  const commodity = String(request.body.commodity ?? "").trim();
  const pickupPoint = String(request.body.pickupPoint ?? "").trim();
  const targetKg = Number(request.body.targetKg);
  const deadlineDays = Number(request.body.deadlineDays ?? 7);

  if (!commodity || !pickupPoint || !Number.isFinite(targetKg)) {
    response.status(422).json({ message: "Lengkapi komoditas, target kg, dan titik ambil" });
    return;
  }

  if (targetKg <= 0) {
    response.status(422).json({ message: "Target kg harus lebih dari 0" });
    return;
  }

  const deadlineAt = new Date();
  deadlineAt.setDate(deadlineAt.getDate() + Math.max(1, Math.min(30, deadlineDays || 7)));

  const order = await prisma.groupBuyingOrder.create({
    data: {
      commodity,
      pickupPoint,
      targetKg,
      committedKg: 0,
      deadlineAt,
      status: "OPEN"
    },
    include: {
      commitments: {
        include: {
          buyer: {
            select: { name: true }
          }
        }
      }
    }
  });

  response.status(201).json(toGroupBuyingOrder(order));
});

groupBuyingRoutes.post("/:id/commit", async (request, response) => {
  const token = await readBuyerToken(request);
  if (!token) {
    response.status(401).json({ message: "Masuk sebagai akun pengguna dulu" });
    return;
  }

  const kg = Number(request.body.kg);
  if (!Number.isFinite(kg) || kg <= 0) {
    response.status(422).json({ message: "Komitmen kg harus lebih dari 0" });
    return;
  }

  const order = await prisma.groupBuyingOrder.findUnique({
    where: { id: request.params.id }
  });

  if (!order || order.status === "CLOSED") {
    response.status(404).json({ message: "Order group buying tidak tersedia" });
    return;
  }

  const remainingKg = order.targetKg - order.committedKg;
  if (remainingKg <= 0) {
    response.status(422).json({ message: "Target group buying sudah terpenuhi" });
    return;
  }

  const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const acceptedKg = Math.min(kg, remainingKg);
    const nextCommittedKg = Math.min(order.targetKg, order.committedKg + acceptedKg);
    await tx.groupBuyingCommitment.create({
      data: {
        orderId: order.id,
        buyerId: token.id,
        kg: acceptedKg
      }
    });

    return tx.groupBuyingOrder.update({
      where: { id: order.id },
      data: {
        committedKg: nextCommittedKg,
        status: nextCommittedKg >= order.targetKg ? "READY" : "OPEN"
      },
      include: {
        commitments: {
          orderBy: { createdAt: "desc" },
          include: {
            buyer: {
              select: { name: true }
            }
          }
        }
      }
    });
  });

  response.json(toGroupBuyingOrder(updatedOrder));
});
