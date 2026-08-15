export type UserRole = "PETANI" | "TENGKULAK" | "ADMIN" | "PENYULUH";

export type PriceStatus = "LOW" | "NORMAL" | "HIGH" | "INSUFFICIENT_DATA";

export type Commodity =
  | "Beras Medium"
  | "Gabah Kering Panen"
  | "Jagung Pipilan"
  | "Cabai Rawit"
  | "Bawang Merah"
  | "Telur Ayam";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface PriceReport {
  id: string;
  commodity: Commodity | string;
  pricePerKg: number;
  volumeKg: number;
  district: string;
  village?: string;
  reporterName?: string;
  reporterPhone?: string;
  source: "WEB" | "WHATSAPP" | "MOBILE" | "SCRAPER" | "ADMIN";
  createdAt: string;
  location: GeoPoint;
  zScore?: number;
  status?: PriceStatus;
}

export interface ReferencePrice {
  id: string;
  commodity: Commodity | string;
  pricePerKg: number;
  source: "BAPANAS" | "PIHPS" | "LOCAL_AVERAGE";
  province: string;
  regency: string;
  sampledAt: string;
}

export interface HeatmapPoint {
  id?: string;
  district: string;
  commodity: Commodity | string;
  pricePerKg: number;
  status: PriceStatus;
  location: GeoPoint;
  sampleSize: number;
  createdAt?: string;
  reporterName?: string;
  reporterPhone?: string;
  zScore?: number;
}

export interface AnomalyResult {
  value: number;
  mean: number;
  standardDeviation: number;
  zScore: number;
  status: PriceStatus;
  method: "ZSCORE" | "IQR" | "MAD";
  message: string;
}

export interface HppInput {
  seedCost: number;
  fertilizerCost: number;
  laborCost: number;
  landRent: number;
  logisticsCost: number;
  yieldKg: number;
  marginPercent: number;
}

export interface HppResult {
  totalCost: number;
  hppPerKg: number;
  targetSellPrice: number;
  marginValue: number;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidderName: string;
  bidderId?: string;
  pricePerKg: number;
  quantityKg: number;
  createdAt: string;
}

export interface HarvestAuction {
  id: string;
  commodity: Commodity | string;
  quantityKg: number;
  floorPrice: number;
  district: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  ownerId?: string;
  ownerName: string;
  createdAt: string;
  closedAt?: string;
  highestBid?: number;
  bidCount: number;
  bids: AuctionBid[];
  transaction?: MarketTransaction;
}

export interface GroupBuyingCommitment {
  id: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  kg: number;
  createdAt: string;
}

export interface GroupBuyingOrder {
  id: string;
  commodity: Commodity | string;
  targetKg: number;
  committedKg: number;
  pickupPoint: string;
  deadlineAt: string;
  status: string;
  createdAt: string;
  progressPercent: number;
  commitmentCount: number;
  commitments: GroupBuyingCommitment[];
}

export interface MarketTransaction {
  id: string;
  auctionId: string;
  status: string;
  totalAmount: number;
  commodity?: Commodity | string;
  quantityKg?: number;
  pricePerKg?: number;
  district?: string;
  buyerName?: string;
  sellerName?: string;
  createdAt: string;
  updatedAt: string;
}
