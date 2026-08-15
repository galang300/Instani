import { Router, type Request } from "express";
import { verifyAuthToken, type AuthUserToken } from "../../common/auth.js";
import { prisma } from "../../database/prisma.js";

export const lelangRoutes = Router();

type StoredAuction = Awaited<ReturnType<typeof prisma.auction.findMany>>[number] & {
  owner: { name: string };
  bids: Array<{
    id: string;
    auctionId: string;
    bidderId: string;
    pricePerKg: number;
    quantityKg: number;
    createdAt: Date;
    bidder: { name: string };
  }>;
  transaction?: {
    id: string;
    auctionId: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
    buyer?: { name: string } | null;
    seller?: { name: string } | null;
  } | null;
};

function toAuctionResponse(auction: StoredAuction) {
  const sortedBids = [...auction.bids].sort((a, b) => b.pricePerKg - a.pricePerKg);
  const highestBid = sortedBids[0]?.pricePerKg;

  return {
    id: auction.id,
    commodity: auction.commodity,
    quantityKg: auction.quantityKg,
    floorPrice: auction.floorPrice,
    district: auction.district,
    status: auction.status,
    ownerId: auction.ownerId,
    ownerName: auction.owner.name,
    createdAt: auction.createdAt.toISOString(),
    closedAt: auction.closedAt?.toISOString(),
    highestBid,
    bidCount: auction.bids.length,
    bids: sortedBids.slice(0, 5).map((bid) => ({
      id: bid.id,
      auctionId: bid.auctionId,
      bidderId: bid.bidderId,
      bidderName: bid.bidder.name,
      pricePerKg: bid.pricePerKg,
      quantityKg: bid.quantityKg,
      createdAt: bid.createdAt.toISOString()
    })),
    transaction: auction.transaction
      ? {
          id: auction.transaction.id,
          auctionId: auction.transaction.auctionId,
          status: auction.transaction.status,
          totalAmount: auction.transaction.totalAmount,
          buyerName: auction.transaction.buyer?.name,
          sellerName: auction.transaction.seller?.name,
          createdAt: auction.transaction.createdAt.toISOString(),
          updatedAt: auction.transaction.updatedAt.toISOString()
        }
      : undefined
  };
}

function readAuthUser(request: Request) {
  return verifyAuthToken(request.headers.authorization);
}

async function hasCurrentRole(token: AuthUserToken | null, roles: string[]) {
  if (!token?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { role: true, verificationStatus: true }
  });

  if (!user?.role) return false;
  if (user.role === "PETANI") {
    return roles.includes("PETANI") && user.verificationStatus === "KTP_VERIFIED";
  }

  return roles.includes(user.role);
}

async function listAuctions() {
  const auctions = await prisma.auction.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      owner: {
        select: { name: true }
      },
      bids: {
        orderBy: { pricePerKg: "desc" },
        include: {
          bidder: {
            select: { name: true }
          }
        }
      },
      transaction: {
        include: {
          buyer: {
            select: { name: true }
          },
          seller: {
            select: { name: true }
          }
        }
      }
    }
  });

  return auctions.map(toAuctionResponse);
}

lelangRoutes.get("/", async (_request, response) => {
  response.json(await listAuctions());
});

lelangRoutes.post("/", async (request, response) => {
  const token = readAuthUser(request);
  if (!(await hasCurrentRole(token, ["PETANI"]))) {
    response.status(401).json({ message: "Login petani diperlukan untuk membuat lelang" });
    return;
  }

  const commodity = String(request.body.commodity ?? "").trim();
  const district = String(request.body.district ?? "").trim();
  const quantityKg = Number(request.body.quantityKg);
  const floorPrice = Number(request.body.floorPrice);

  if (!commodity || !district || !Number.isFinite(quantityKg) || !Number.isFinite(floorPrice)) {
    response.status(422).json({ message: "Lengkapi komoditas, wilayah, volume, dan harga awal" });
    return;
  }

  if (quantityKg <= 0 || floorPrice <= 0) {
    response.status(422).json({ message: "Volume dan harga awal harus lebih dari 0" });
    return;
  }

  const auction = await prisma.auction.create({
    data: {
      commodity,
      district,
      quantityKg,
      floorPrice: Math.round(floorPrice),
      status: "OPEN",
      ownerId: token!.id
    },
    include: {
      owner: {
        select: { name: true }
      },
      bids: {
        include: {
          bidder: {
            select: { name: true }
          }
        }
      }
    }
  });

  response.status(201).json(toAuctionResponse(auction));
});

lelangRoutes.post("/:id/bids", async (request, response) => {
  const token = readAuthUser(request);
  if (!(await hasCurrentRole(token, ["TENGKULAK", "PETANI"]))) {
    response.status(401).json({ message: "Login pembeli atau tengkulak diperlukan untuk bidding" });
    return;
  }

  const pricePerKg = Number(request.body.pricePerKg);
  const quantityKg = Number(request.body.quantityKg);
  if (!Number.isFinite(pricePerKg) || !Number.isFinite(quantityKg)) {
    response.status(422).json({ message: "Lengkapi harga bid dan volume bid" });
    return;
  }

  const auction = await prisma.auction.findUnique({
    where: { id: request.params.id },
    include: {
      bids: {
        orderBy: { pricePerKg: "desc" },
        take: 1
      }
    }
  });

  if (!auction || auction.status !== "OPEN") {
    response.status(404).json({ message: "Lelang tidak tersedia" });
    return;
  }

  if (auction.ownerId === token!.id) {
    response.status(422).json({ message: "Pemilik lelang tidak bisa bid lelang sendiri" });
    return;
  }

  const currentPrice = auction.bids[0]?.pricePerKg ?? auction.floorPrice;
  if (pricePerKg <= currentPrice) {
    response.status(422).json({
      message: `Bid harus lebih tinggi dari Rp${currentPrice.toLocaleString("id-ID")}`
    });
    return;
  }

  const bid = await prisma.bid.create({
    data: {
      auctionId: auction.id,
      bidderId: token!.id,
      pricePerKg: Math.round(pricePerKg),
      quantityKg
    },
    include: {
      bidder: {
        select: { name: true }
      }
    }
  });

  response.status(201).json({
    id: bid.id,
    auctionId: bid.auctionId,
    bidderId: bid.bidderId,
    bidderName: bid.bidder.name,
    pricePerKg: bid.pricePerKg,
    quantityKg: bid.quantityKg,
    createdAt: bid.createdAt.toISOString()
  });
});

lelangRoutes.post("/:id/close", async (request, response) => {
  const token = readAuthUser(request);
  if (!(await hasCurrentRole(token, ["PETANI"]))) {
    response.status(401).json({ message: "Login petani diperlukan" });
    return;
  }

  const auction = await prisma.auction.findUnique({
    where: { id: request.params.id },
    include: {
      bids: {
        orderBy: { pricePerKg: "desc" },
        take: 1
      }
    }
  });

  if (!auction || auction.ownerId !== token!.id) {
    response.status(404).json({ message: "Lelang tidak ditemukan" });
    return;
  }

  if (auction.status !== "OPEN") {
    response.status(422).json({ message: "Lelang sudah ditutup" });
    return;
  }

  const winningBid = auction.bids[0];

  await prisma.$transaction(async (tx) => {
    await tx.auction.update({
      where: { id: auction.id },
      data: {
        status: "CLOSED",
        closedAt: new Date()
      }
    });

    if (winningBid) {
      await tx.transaction.upsert({
        where: { auctionId: auction.id },
        create: {
          auctionId: auction.id,
          buyerId: winningBid.bidderId,
          sellerId: auction.ownerId,
          status: "WAITING_CONFIRMATION",
          totalAmount: Math.round(winningBid.pricePerKg * winningBid.quantityKg)
        },
        update: {
          buyerId: winningBid.bidderId,
          sellerId: auction.ownerId,
          status: "WAITING_CONFIRMATION",
          totalAmount: Math.round(winningBid.pricePerKg * winningBid.quantityKg)
        }
      });
    }
  });

  response.json(await listAuctions());
});
