import type { Server, Socket } from "socket.io";
import type { BidInput, BidService } from "./bid.service.js";

export function registerAuctionGateway(io: Server, bidService: BidService) {
  io.on("connection", (socket: Socket) => {
    socket.emit("system:ready", {
      socketId: socket.id,
      connectedAt: new Date().toISOString()
    });

    socket.on("auction:join", (auctionId: string) => {
      socket.join(roomName(auctionId));
      socket.emit("auction:bids", bidService.list(auctionId));
    });

    socket.on("auction:bid", (payload: BidInput, ack?: (result: unknown) => void) => {
      const bid = bidService.create(payload);
      io.to(roomName(payload.auctionId)).emit("auction:bid-created", bid);
      ack?.({ ok: true, bid });
    });

    socket.on("auction:close", (auctionId: string, ack?: (result: unknown) => void) => {
      const winner = bidService.winner(auctionId);
      io.to(roomName(auctionId)).emit("auction:closed", { auctionId, winner });
      ack?.({ ok: true, winner });
    });
  });
}

function roomName(auctionId: string) {
  return `auction:${auctionId}`;
}
