"use client";

import type { GroupBuyingOrder } from "@panganterkini/shared-types";
import { Plus, ShoppingBasket, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ApiRequestError,
  commitGroupBuyingOrder,
  createGroupBuyingOrder,
  getGroupBuyingOrders
} from "../../lib/api";

function formatProgressPercent(percent: number) {
  return `${percent.toLocaleString("id-ID", {
    maximumFractionDigits: 1
  })}%`;
}

function progressBarWidth(percent: number) {
  if (percent <= 0) return "0%";
  return `${Math.min(100, Math.max(1, percent))}%`;
}

function parseKgInput(value: string) {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  return Number(normalized);
}

export function GroupBuyingPanel() {
  const [orders, setOrders] = useState<GroupBuyingOrder[]>([]);
  const [commodity, setCommodity] = useState("Beras Medium");
  const [targetKg, setTargetKg] = useState("500");
  const [pickupPoint, setPickupPoint] = useState("Kedungwaru");
  const [deadlineDays, setDeadlineDays] = useState("7");
  const [commitValues, setCommitValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("Memuat group buying");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadOrders() {
    try {
      const nextOrders = await getGroupBuyingOrders();
      setOrders(nextOrders);
      setStatus(nextOrders.length > 0 ? `${nextOrders.length} order aktif` : "Belum ada order");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memuat group buying");
    }
  }

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 15000);
    return () => window.clearInterval(interval);
  }, []);

  async function submitOrder() {
    if (!commodity.trim() || !targetKg || !pickupPoint.trim()) {
      setStatus("Lengkapi group buying");
      return;
    }

    setIsSubmitting(true);
    try {
      await createGroupBuyingOrder({
        commodity: commodity.trim(),
        targetKg: Number(targetKg),
        pickupPoint: pickupPoint.trim(),
        deadlineDays: Number(deadlineDays) || 7
      });
      setStatus("Order dibuat");
      await loadOrders();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal membuat order");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCommit(order: GroupBuyingOrder) {
    const kg = parseKgInput(commitValues[order.id] ?? "");
    if (!Number.isFinite(kg) || kg <= 0) {
      setStatus("Isi komitmen kg");
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedOrder = await commitGroupBuyingOrder(order.id, kg);
      setCommitValues((current) => ({ ...current, [order.id]: "" }));
      setOrders((current) =>
        current.map((currentOrder) => (currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder))
      );
      setStatus(
        `${kg.toLocaleString("id-ID", {
          maximumFractionDigits: 2
        })} kg masuk ke ${updatedOrder.commodity}`
      );
      await loadOrders();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setStatus("Masuk akun pengguna dulu");
      } else {
        setStatus(error instanceof Error ? error.message : "Gagal menambah komitmen");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Group buying</h2>
          <p className="mt-1 text-sm text-slate-600">Gabungkan permintaan hingga target kg tercapai.</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-field text-ink">
          <UsersRound size={20} />
        </span>
      </div>

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
            Titik ambil
            <input
              className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
              value={pickupPoint}
              onChange={(event) => setPickupPoint(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Target kg
            <input
              className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
              inputMode="numeric"
              value={targetKg}
              onChange={(event) => setTargetKg(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Deadline hari
            <input
              className="focus-ring rounded-md border border-slate-200 bg-white px-3 py-2"
              inputMode="numeric"
              value={deadlineDays}
              onChange={(event) => setDeadlineDays(event.target.value)}
            />
          </label>
        </div>
        <button
          className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md bg-water px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          disabled={isSubmitting}
          onClick={submitOrder}
        >
          <Plus size={16} />
          Buat order
        </button>
      </div>

      <div className="mt-4 text-sm font-semibold text-slate-700">{status}</div>

      <div className="mt-2 grid gap-3">
        {orders.length === 0 ? (
          <p className="py-4 text-sm font-medium text-slate-600">Belum ada group buying.</p>
        ) : (
          orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{order.commodity}</p>
                  <p className="text-sm text-slate-600">
                    {order.committedKg.toLocaleString("id-ID")} /{" "}
                    {order.targetKg.toLocaleString("id-ID")} kg - {order.pickupPoint}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    Deadline {new Date(order.deadlineAt).toLocaleDateString("id-ID")} - #
                    {order.id.slice(-5)}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {order.commitmentCount} komitmen pembeli
                  </p>
                </div>
                <span className="text-sm font-semibold text-water">
                  {formatProgressPercent(order.progressPercent)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-water"
                  style={{ width: progressBarWidth(order.progressPercent) }}
                />
              </div>
              {order.commitments.length > 0 ? (
                <div className="mt-3 grid gap-1 rounded-md bg-slate-50 px-3 py-2">
                  {order.commitments.map((commitment) => (
                    <div
                      key={commitment.id}
                      className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600"
                    >
                      <span className="truncate">{commitment.buyerName}</span>
                      <span>{commitment.kg.toLocaleString("id-ID")} kg</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className="focus-ring rounded-md border border-slate-200 px-3 py-2 text-sm"
                  inputMode="numeric"
                  min="0"
                  placeholder="Tambah kg"
                  value={commitValues[order.id] ?? ""}
                  onChange={(event) =>
                    setCommitValues((current) => ({
                      ...current,
                      [order.id]: event.target.value
                    }))
                  }
                />
                <button
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                  type="button"
                  disabled={isSubmitting || order.progressPercent >= 100}
                  onClick={() => submitCommit(order)}
                >
                  <ShoppingBasket size={15} />
                  Komit
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
