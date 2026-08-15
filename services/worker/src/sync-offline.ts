export async function syncOfflinePriceDraft(data: {
  id: string;
  reporterPhone?: string;
  payload: unknown;
}) {
  return {
    synced: true,
    sourceId: data.id,
    syncedAt: new Date().toISOString()
  };
}
