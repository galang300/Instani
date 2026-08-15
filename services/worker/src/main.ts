import "dotenv/config";
import { Worker as BullWorker, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { calculateAnomalyJob } from "./calculate-anomaly.js";
import { processVideoEvidence } from "./process-video.js";
import { sendNotificationJob } from "./send-notification.js";
import { syncOfflinePriceDraft } from "./sync-offline.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const handlers = {
  "sync-offline": syncOfflinePriceDraft,
  "process-video": processVideoEvidence,
  "calculate-anomaly": calculateAnomalyJob,
  "send-notification": sendNotificationJob
} as const;

for (const [queueName, handler] of Object.entries(handlers)) {
  new BullWorker(
    queueName,
    async (job) => {
      const result = await handler(job.data as never);
      console.log(`[${queueName}] job ${job.id} done`, result);
      return result;
    },
    { connection, concurrency }
  );

  const events = new QueueEvents(queueName, { connection });
  events.on("failed", ({ jobId, failedReason }) => {
    console.error(`[${queueName}] job ${jobId} failed: ${failedReason}`);
  });
}

console.log(`Worker online with ${concurrency} concurrency`);
