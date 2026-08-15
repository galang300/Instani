import { Router } from "express";
import { prisma } from "../../database/prisma.js";

export const transaksiRoutes = Router();

function toTransactionResponse(record: {
  id: string;
  auctionId: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  buyer?: { name: string } | null;
  seller?: { name: string } | null;
  auction: {
    commodity: string;
    quantityKg: number;
    district: string;
    bids: Array<{ pricePerKg: number; quantityKg: number }>;
  };
}) {
  const winningBid = record.auction.bids[0];

  return {
    id: record.id,
    auctionId: record.auctionId,
    status: record.status,
    totalAmount: record.totalAmount,
    commodity: record.auction.commodity,
    quantityKg: winningBid?.quantityKg ?? record.auction.quantityKg,
    pricePerKg: winningBid?.pricePerKg,
    district: record.auction.district,
    buyerName: record.buyer?.name,
    sellerName: record.seller?.name,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

transaksiRoutes.get("/", async (_request, response) => {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      buyer: {
        select: { name: true }
      },
      seller: {
        select: { name: true }
      },
      auction: {
        select: {
          commodity: true,
          quantityKg: true,
          district: true,
          bids: {
            orderBy: { pricePerKg: "desc" },
            take: 1,
            select: {
              pricePerKg: true,
              quantityKg: true
            }
          }
        }
      }
    }
  });

  response.json(transactions.map(toTransactionResponse));
});

transaksiRoutes.post("/:id/status", async (request, response) => {
  const allowedStatuses = ["WAITING_CONFIRMATION", "CONFIRMED", "PAID", "DONE", "CANCELLED"];
  const status = String(request.body.status ?? "").trim().toUpperCase();

  if (!allowedStatuses.includes(status)) {
    response.status(422).json({ message: "Status transaksi tidak valid" });
    return;
  }

  const transaction = await prisma.transaction.update({
    where: { id: request.params.id },
    data: { status },
    include: {
      buyer: {
        select: { name: true }
      },
      seller: {
        select: { name: true }
      },
      auction: {
        select: {
          commodity: true,
          quantityKg: true,
          district: true,
          bids: {
            orderBy: { pricePerKg: "desc" },
            take: 1,
            select: {
              pricePerKg: true,
              quantityKg: true
            }
          }
        }
      }
    }
  });

  response.json(toTransactionResponse(transaction));
});
