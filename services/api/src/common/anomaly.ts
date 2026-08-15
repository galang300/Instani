import { ANOMALY_THRESHOLDS } from "@panganterkini/config";
import type { AnomalyResult, PriceStatus } from "@panganterkini/shared-types";

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  const avg = mean(values);

  const variance =
    values.reduce(
      (total, value) => total + (value - avg) ** 2,
      0
    ) / values.length;

  return Math.sqrt(variance);
}

function percentile(values: number[], position: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * position;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return (
    sorted[lower] +
    (sorted[upper] - sorted[lower]) * (index - lower)
  );
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

function statusFromZScore(zScore: number): PriceStatus {
  if (zScore <= ANOMALY_THRESHOLDS.zScoreLow) {
    return "LOW";
  }

  if (zScore >= ANOMALY_THRESHOLDS.zScoreHigh) {
    return "HIGH";
  }

  return "NORMAL";
}

export function detectZScore(
  values: number[],
  value: number
): AnomalyResult {
  if (values.length < ANOMALY_THRESHOLDS.minimumSamples) {
    return {
      value,
      mean: values.length > 0 ? mean(values) : value,
      standardDeviation: 0,
      zScore: 0,
      status: "INSUFFICIENT_DATA",
      method: "ZSCORE",
      message: "Sampel belum cukup untuk keputusan statistik."
    };
  }

  const avg = mean(values);
  const std = standardDeviation(values);

  /*
   * Jika semua harga sebelumnya sama, standard deviation = 0.
   *
   * Jangan langsung menganggap NORMAL.
   *
   * Contoh:
   * [10000, 10000, 10000, 10000, 10000]
   * input 50000 -> HIGH
   * input 5000  -> LOW
   */
  if (std === 0) {
    let status: PriceStatus = "NORMAL";

    if (value > avg) {
      status = "HIGH";
    } else if (value < avg) {
      status = "LOW";
    }

    return {
      value,
      mean: avg,
      standardDeviation: 0,
      zScore: 0,
      status,
      method: "ZSCORE",
      message:
        status === "HIGH"
          ? "Harga jauh lebih tinggi dari seluruh harga sebelumnya."
          : status === "LOW"
            ? "Harga jauh lebih rendah dari seluruh harga sebelumnya."
            : "Harga sama dengan pola harga sebelumnya."
    };
  }

  const zScore = (value - avg) / std;
  const status = statusFromZScore(zScore);

  return {
    value,
    mean: avg,
    standardDeviation: std,
    zScore,
    status,
    method: "ZSCORE",
    message:
      status === "LOW"
        ? "Harga lebih rendah dari pola pasar lokal."
        : status === "HIGH"
          ? "Harga lebih tinggi dari pola pasar lokal."
          : "Harga berada dalam rentang wajar."
  };
}

export function detectIqr(
  values: number[],
  value: number
): PriceStatus {
  if (values.length < ANOMALY_THRESHOLDS.minimumSamples) {
    return "INSUFFICIENT_DATA";
  }

  const q1 = percentile(values, 0.25);
  const q3 = percentile(values, 0.75);
  const iqr = q3 - q1;

  /*
   * Jika semua harga sama, IQR = 0.
   *
   * Jangan membiarkan input ekstrem menjadi NORMAL.
   */
  if (iqr === 0) {
    if (value > q3) {
      return "HIGH";
    }

    if (value < q1) {
      return "LOW";
    }

    return "NORMAL";
  }

  if (value < q1 - 1.5 * iqr) {
    return "LOW";
  }

  if (value > q3 + 1.5 * iqr) {
    return "HIGH";
  }

  return "NORMAL";
}

export function detectMad(
  values: number[],
  value: number
): PriceStatus {
  if (values.length < ANOMALY_THRESHOLDS.minimumSamples) {
    return "INSUFFICIENT_DATA";
  }

  const med = median(values);

  const deviations = values.map(
    (item) => Math.abs(item - med)
  );

  const mad = median(deviations);

  /*
   * Jika MAD = 0 berarti mayoritas/seluruh harga identik.
   * Input yang berbeda harus tetap dianggap anomaly.
   */
  if (mad === 0) {
    if (value > med) {
      return "HIGH";
    }

    if (value < med) {
      return "LOW";
    }

    return "NORMAL";
  }

  const modifiedZ = (0.6745 * (value - med)) / mad;

  return statusFromZScore(modifiedZ);
}

export function calculateHpp(input: {
  seedCost: number;
  fertilizerCost: number;
  laborCost: number;
  landRent: number;
  logisticsCost: number;
  yieldKg: number;
  marginPercent: number;
}) {
  const totalCost =
    input.seedCost +
    input.fertilizerCost +
    input.laborCost +
    input.landRent +
    input.logisticsCost;

  const hppPerKg = totalCost / input.yieldKg;

  const marginValue =
    hppPerKg * (input.marginPercent / 100);

  return {
    totalCost,
    hppPerKg,
    targetSellPrice: hppPerKg + marginValue,
    marginValue
  };
}