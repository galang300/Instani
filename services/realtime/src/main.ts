import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerAuctionGateway } from "./auction.gateway.js";
import { BidService } from "./bid.service.js";

const port = Number(process.env.REALTIME_PORT ?? process.env.PORT ?? 4001);
const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  }
});

registerAuctionGateway(io, new BidService());

httpServer.listen(port, () => {
  console.log(`Realtime auction gateway listening on :${port}`);
});
