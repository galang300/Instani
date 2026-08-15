"use client";

import type { MarketTransaction } from "@panganterkini/shared-types";
import { ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { getTransactions } from "../../lib/api";

export function TransactionPanel() {
  const [transactions, setTransactions] = useState<MarketTransaction[]>([]);
  const [status, setStatus] = useState("Memuat transaksi");

  async function loadTransactions() {
    try {
      const nextTransactions = await getTransactions();
      setTransactions(nextTransactions);
      setStatus(
        nextTransactions.length > 0
          ? `${nextTransactions.length} transaksi panen`
          : "Belum ada transaksi"
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memuat transaksi");
    }
  }

  useEffect(() => {
    void loadTransactions();
    const interval = window.setInterval(() => void loadTransactions(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Transaksi panen</h2>
          <p className="mt-1 text-sm text-slate-600">Hasil lelang yang sudah ditutup.</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-field text-ink">
          <ReceiptText size={20} />
        </span>
      </div>

      <div className="mt-4 text-sm font-semibold text-slate-700">{status}</div>

      <div className="mt-2 divide-y divide-slate-100">
        {transactions.length === 0 ? (
          <p className="py-4 text-sm font-medium text-slate-600">Belum ada transaksi tersimpan.</p>
        ) : (
          transactions.map((transaction) => (
            <article key={transaction.id} className="grid gap-1 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{transaction.commodity}</p>
                  <p className="text-sm text-slate-600">
                    {transaction.sellerName ?? "-"} ke {transaction.buyerName ?? "-"}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {transaction.quantityKg?.toLocaleString("id-ID") ?? "-"} kg -{" "}
                    {transaction.district ?? "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-ink">
                    Rp{transaction.totalAmount.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs font-semibold text-emerald-700">{transaction.status}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
