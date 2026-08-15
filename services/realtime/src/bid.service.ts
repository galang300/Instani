import type { AuctionBid } from "@panganterkini/shared-types";
import { randomUUID } from "node:crypto";

export interface BidInput {
  auctionId: string;
  bidderName: string;
  pricePerKg: number;
  quantityKg: number;
}

export class BidService {
  private readonly bids = new Map<string, AuctionBid[]>();

  list(auctionId: string) {
    return [...(this.bids.get(auctionId) ?? [])].sort((a, b) => b.pricePerKg - a.pricePerKg);
  }

  create(input: BidInput) {
    const bid: AuctionBid = {
      id: randomUUID(),
      auctionId: input.auctionId,
      bidderName: input.bidderName,
      pricePerKg: input.pricePerKg,
      quantityKg: input.quantityKg,
      createdAt: new Date().toISOString()
    };

    this.bids.set(input.auctionId, [bid, ...(this.bids.get(input.auctionId) ?? [])]);
    return bid;
  }

  winner(auctionId: string) {
    return this.list(auctionId)[0] ?? null;
  }
}
