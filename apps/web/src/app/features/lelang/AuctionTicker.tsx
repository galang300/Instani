"use client";

import type { HarvestAuction } from "@panganterkini/shared-types";
import { CheckCircle2, Gavel, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ApiRequestError,
  closeAuction,
  createAuction,
  createAuctionBid,
  getAuctions
} from "../../lib/api";
import {
  clearPetaniSession,
  getStoredPetaniSession,
  PETANI_SESSION_EVENT,
  type PetaniSession
} from "../../lib/auth";

function auctionPrice(auction: HarvestAuction) {
  return auction.highestBid ?? auction.floorPrice;
}

function isVerifiedFarmer(session: PetaniSession | null) {
  return session?.user.role === "PETANI" && session.user.verificationStatus === "KTP_VERIFIED";
}

type AuctionTickerMode = "buyer" | "farmer" | "all";

type AuctionTickerProps = {
  mode?: AuctionTickerMode;
};

export function AuctionTicker({ mode = "all" }: AuctionTickerProps) {
  const [auctions, setAuctions] = useState<HarvestAuction[]>([]);
  const [commodity, setCommodity] = useState("Gabah Kering Panen");
  const [district, setDistrict] = useState("Ngantru");
  const [quantityKg, setQuantityKg] = useState("1000");
  const [floorPrice, setFloorPrice] = useState("5000");
  const [bidValues, setBidValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("Memuat lelang");
  const [petaniSession, setPetaniSession] = useState<PetaniSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const showBuyerTools = mode !== "farmer";
  const showSellerTools = mode !== "buyer";

  async function loadAuctions() {
    try {
      const nextAuctions = await getAuctions();
      setAuctions(nextAuctions);
      setStatus(nextAuctions.length > 0 ? `${nextAuctions.length} lelang aktif` : "Belum ada lelang");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memuat lelang");
    }
  }

  useEffect(() => {
    void loadAuctions();
    const interval = window.setInterval(() => void loadAuctions(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncSession = () => setPetaniSession(getStoredPetaniSession());
    syncSession();
    window.addEventListener(PETANI_SESSION_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(PETANI_SESSION_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  async function submitAuction() {
    if (!isVerifiedFarmer(petaniSession)) {
      setStatus("Akun petani belum disetujui admin");
      return;
    }

    if (!commodity.trim() || !district.trim() || !quantityKg || !floorPrice) {
      setStatus("Lengkapi lelang");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAuction({
        commodity: commodity.trim(),
        district: district.trim(),
        quantityKg: Number(quantityKg),
        floorPrice: Number(floorPrice)
      });
      setStatus("Lelang dibuat");
      await loadAuctions();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        clearPetaniSession();
        setStatus("Login ulang untuk lelang");
      } else if (error instanceof ApiRequestError && error.status === 403) {
        setStatus(error.message);
      } else {
        setStatus(error instanceof Error ? error.message : "Gagal membuat lelang");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitBid(auction: HarvestAuction) {
    const bidPrice = Number(bidValues[auction.id]);
    if (!Number.isFinite(bidPrice) || bidPrice <= 0) {
      setStatus("Isi harga bid");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAuctionBid(auction.id, {
        pricePerKg: bidPrice,
        quantityKg: auction.quantityKg
      });
      setBidValues((current) => ({ ...current, [auction.id]: "" }));
      setStatus("Bid terkirim");
      await loadAuctions();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        clearPetaniSession();
        setStatus("Login ulang untuk bid");
      } else if (error instanceof ApiRequestError && error.status === 403) {
        setStatus(error.message);
      } else {
        setStatus(error instanceof Error ? error.message : "Bid gagal");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitClose(auction: HarvestAuction) {
    if (!isVerifiedFarmer(petaniSession)) {
      setStatus("Akun petani belum disetujui admin");
      return;
    }

    setIsSubmitting(true);
    try {
      const nextAuctions = await closeAuction(auction.id);
      setAuctions(nextAuctions);
      setStatus(auction.bidCount > 0 ? "Lelang ditutup, transaksi dibuat" : "Lelang ditutup");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        clearPetaniSession();
        setStatus("Login ulang untuk menutup lelang");
      } else if (error instanceof ApiRequestError && error.status === 403) {
        setStatus(error.message);
      } else {
        setStatus(error instanceof Error ? error.message : "Gagal menutup lelang");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Lelang panen</h2>
          <p className="mt-1 text-sm text-slate-600">
            {mode === "buyer"
              ? "Bid panen dari petani terverifikasi."
              : "Buka lelang dan kelola bid harga panen."}
          </p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-field text-ink">
          <Gavel size={20} />
        </span>
      </div>

      {showSellerTools ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Komoditas
              <input
                className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
                value={commodity}
                onChange={(event) => setCommodity(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Wilayah
              <input
                className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Volume kg
              <input
                className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
                inputMode="numeric"
                value={quantityKg}
                onChange={(event) => setQuantityKg(event.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Harga awal/kg
              <input
                className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
                inputMode="numeric"
                value={floorPrice}
                onChange={(event) => setFloorPrice(event.target.value)}
              />
            </label>
          </div>
          <button
            className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            disabled={isSubmitting || !isVerifiedFarmer(petaniSession)}
            onClick={submitAuction}
          >
            <Plus size={16} />
            Buat lelang
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{status}</span>
      </div>

      <div className="mt-2 divide-y divide-slate-100">
        {auctions.length === 0 ? (
          <p className="py-4 text-sm font-medium text-slate-600">Belum ada lelang panen.</p>
        ) : (
          auctions.map((auction) => (
            <article key={auction.id} className="grid gap-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{auction.commodity}</p>
                  <p className="text-sm text-slate-600">
                    {auction.district} - {auction.quantityKg.toLocaleString("id-ID")} kg
                  </p>
                  <p className="text-xs font-medium text-slate-500">Pemilik {auction.ownerName}</p>
                  {auction.transaction ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      Transaksi {auction.transaction.status} -{" "}
                      Rp{auction.transaction.totalAmount.toLocaleString("id-ID")}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">
                    Rp{auctionPrice(auction).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {auction.status === "OPEN" ? `${auction.bidCount} bid` : auction.status}
                  </p>
                </div>
              </div>

              {showBuyerTools ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm"
                    inputMode="numeric"
                    placeholder={`Bid > Rp${auctionPrice(auction).toLocaleString("id-ID")}`}
                    value={bidValues[auction.id] ?? ""}
                    onChange={(event) =>
                      setBidValues((current) => ({
                        ...current,
                        [auction.id]: event.target.value
                      }))
                    }
                  />
                  <button
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                    type="button"
                    disabled={isSubmitting || auction.status !== "OPEN"}
                    onClick={() => submitBid(auction)}
                  >
                    <Send size={15} />
                    Bid
                  </button>
                </div>
              ) : null}

              {auction.status === "OPEN" &&
              auction.ownerId === petaniSession?.user.id &&
              isVerifiedFarmer(petaniSession) &&
              showSellerTools ? (
                <button
                  className="focus-ring inline-flex w-fit items-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => submitClose(auction)}
                >
                  <CheckCircle2 size={15} />
                  Tutup lelang
                </button>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
