export async function processVideoEvidence(data: { objectKey: string; transactionId: string }) {
  return {
    transactionId: data.transactionId,
    objectKey: data.objectKey,
    moderationStatus: "PENDING_REVIEW",
    processedAt: new Date().toISOString()
  };
}
