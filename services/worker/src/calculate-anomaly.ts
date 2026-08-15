export async function calculateAnomalyJob(data: { commodity: string; pricePerKg: number }) {
  return {
    commodity: data.commodity,
    pricePerKg: data.pricePerKg,
    status: "QUEUED_FOR_API_RECHECK",
    calculatedAt: new Date().toISOString()
  };
}
