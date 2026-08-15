"use client";

import { Calculator } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

type HppInputField = {
  label: string;
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
};

export function HppCalculator() {
  const [seedCost, setSeedCost] = useState("");
  const [fertilizerCost, setFertilizerCost] = useState("");
  const [laborCost, setLaborCost] = useState("");
  const [landRent, setLandRent] = useState("");
  const [logisticsCost, setLogisticsCost] = useState("");
  const [yieldKg, setYieldKg] = useState("");
  const [marginPercent, setMarginPercent] = useState("");

  const result = useMemo(() => {
    const seed = Number(seedCost);
    const fertilizer = Number(fertilizerCost);
    const labor = Number(laborCost);
    const rent = Number(landRent);
    const logistics = Number(logisticsCost);
    const yieldValue = Number(yieldKg);
    const margin = Number(marginPercent || 0);

    if (!seedCost || !fertilizerCost || !laborCost || !landRent || !logisticsCost || yieldValue <= 0) {
      return null;
    }

    const totalCost = seed + fertilizer + labor + rent + logistics;
    const hppPerKg = totalCost / yieldValue;
    const marginValue = hppPerKg * (margin / 100);
    return {
      totalCost,
      hppPerKg,
      targetSellPrice: hppPerKg + marginValue
    };
  }, [fertilizerCost, landRent, laborCost, logisticsCost, marginPercent, seedCost, yieldKg]);

  const inputClass = "focus-ring rounded-md border border-slate-200 px-3 py-2 text-right";
  const inputFields: HppInputField[] = [
    { label: "Benih", value: seedCost, setValue: setSeedCost },
    { label: "Pupuk", value: fertilizerCost, setValue: setFertilizerCost },
    { label: "Tenaga kerja", value: laborCost, setValue: setLaborCost },
    { label: "Sewa lahan", value: landRent, setValue: setLandRent },
    { label: "Logistik", value: logisticsCost, setValue: setLogisticsCost },
    { label: "Hasil kg", value: yieldKg, setValue: setYieldKg },
    { label: "Margin %", value: marginPercent, setValue: setMarginPercent }
  ];

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Kalkulator HPP</h2>
          <p className="mt-1 text-sm text-slate-600">Batas bawah harga per kg.</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-field text-ink">
          <Calculator size={20} />
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {inputFields.map(({ label, value, setValue }) => (
          <label key={label} className="grid grid-cols-[1fr_150px] items-center gap-3 text-sm">
            <span className="font-medium text-slate-700">{label}</span>
            <input
              className={inputClass}
              inputMode="numeric"
              value={value}
              placeholder="0"
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-leaf/20 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-800">Harga target</p>
        {result ? (
          <>
            <p className="mt-1 text-2xl font-semibold text-ink">
              Rp{Math.round(result.targetSellPrice).toLocaleString("id-ID")}/kg
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Total biaya Rp{result.totalCost.toLocaleString("id-ID")} - HPP Rp
              {Math.round(result.hppPerKg).toLocaleString("id-ID")}/kg
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-semibold text-ink">-</p>
            <p className="mt-1 text-xs text-slate-600">
              Isi biaya produksi dan hasil panen untuk menghitung target.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
