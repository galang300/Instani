export async function sendNotificationJob(data: {
  channel: "WHATSAPP" | "FCM" | "EMAIL";
  target: string;
  message: string;
}) {
  return {
    channel: data.channel,
    target: data.target,
    providerMessageId: `mock-${Date.now()}`,
    sentAt: new Date().toISOString()
  };
}
