import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createReadStream } from "fs";
import csv from "csv-parser";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function parsePriceNumber(value) {
  if (!value) return NaN;

  let normalized = value.toString().trim().replace(/[^\d.,-]/g, "");
  if (!normalized) return NaN;

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const groupSeparator = decimalSeparator === "," ? "." : ",";
    normalized = normalized
      .replace(new RegExp(`\\${groupSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    const decimals = normalized.length - lastComma - 1;
    normalized = decimals === 3 ? normalized.replace(/,/g, "") : normalized.replace(",", ".");
  } else if (lastDot >= 0) {
    const decimals = normalized.length - lastDot - 1;
    normalized = decimals === 3 ? normalized.replace(/\./g, "") : normalized;
  }

  return Math.round(Number(normalized));
}

/**
 * Parse CSV file and seed PriceReference table
 * CSV columns: Jenis Pasar, Provinsi, Kabupaten/Kota, Kategori, Komoditas, Satuan, Tanggal, Harga (Rp)
 */

async function seedPihps() {
  const csvPath = path.join(__dirname, "../data/harga_pangan_bi_RINCIAN_2026-07-13_2026-08-12.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`📖 Reading CSV file: ${csvPath}`);

  const batch = [];
  let totalRows = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let processingBatch = false;

  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        totalRows++;

        try {
          // Normalize field names from CSV
          const komoditas = row["Komoditas"]?.trim();
          const harga = parsePriceNumber(row["Harga (Rp)"]);
          const tanggal = row["Tanggal"]?.trim();
          const provinsi = row["Provinsi"]?.trim() || "Jawa Timur";
          const kabupaten = row["Kabupaten/Kota"]?.trim() || "Tulungagung";

          // Validate required fields
          if (!komoditas || !Number.isFinite(harga) || !tanggal) {
            skippedCount++;
            return;
          }

          // Parse date (YYYY-MM-DD format)
          const sampledAt = new Date(`${tanggal}T00:00:00.000Z`);
          if (Number.isNaN(sampledAt.getTime())) {
            skippedCount++;
            return;
          }

          // Create upsert payload
          batch.push({
            commodity: komoditas,
            pricePerKg: harga,
            source: "PIHPS",
            province: provinsi,
            regency: kabupaten,
            sampledAt
          });

          // Process batch every 1000 rows (non-blocking)
          if (batch.length >= 1000 && !processingBatch) {
            processingBatch = true;
            const batchToProcess = batch.splice(0, 1000);
            processBatch(batchToProcess)
              .then((result) => {
                createdCount += result.createdCount;
                updatedCount += result.updatedCount;
                processingBatch = false;
              })
              .catch((error) => {
                console.error("❌ Batch processing error:", error.message);
                processingBatch = false;
              });
          }
        } catch (error) {
          console.error(`❌ Error processing row ${totalRows}:`, error.message);
          skippedCount++;
        }
      })
      .on("end", async () => {
        try {
          // Wait for any pending batch processing
          while (processingBatch) {
            await new Promise((r) => setTimeout(r, 100));
          }

          // Process remaining batch
          if (batch.length > 0) {
            const result = await processBatch(batch);
            createdCount += result.createdCount;
            updatedCount += result.updatedCount;
          }

          console.log("\n✅ Seeding completed!");
          console.log(`📊 Total rows: ${totalRows}`);
          console.log(`✨ Created: ${createdCount}`);
          console.log(`🔄 Updated: ${updatedCount}`);
          console.log(`⏭️  Skipped: ${skippedCount}`);

          await prisma.$disconnect();
          resolve();
        } catch (error) {
          console.error("❌ Error in final batch:", error.message);
          await prisma.$disconnect();
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("❌ CSV parsing error:", error.message);
        prisma.$disconnect();
        reject(error);
      });
  });
}

/**
 * Process batch of records with upsert
 */
async function processBatch(batch) {
  if (batch.length === 0) {
    return { createdCount: 0, updatedCount: 0 };
  }

  let createdCount = 0;
  let updatedCount = 0;

  try {
    console.log(`⏳ Processing batch of ${batch.length} records...`);

    // Use upsert for each record
    for (const item of batch) {
      try {
        // Try to find existing record first
        const existing = await prisma.priceReference.findUnique({
          where: {
            commodity_source_sampledAt_province_regency: {
              commodity: item.commodity,
              source: item.source,
              sampledAt: item.sampledAt,
              province: item.province,
              regency: item.regency
            }
          }
        });

        if (existing) {
          // Update if price changed
          if (existing.pricePerKg !== item.pricePerKg) {
            await prisma.priceReference.update({
              where: {
                commodity_source_sampledAt_province_regency: {
                  commodity: item.commodity,
                  source: item.source,
                  sampledAt: item.sampledAt,
                  province: item.province,
                  regency: item.regency
                }
              },
              data: { pricePerKg: item.pricePerKg }
            });
            updatedCount++;
          }
        } else {
          // Create new record
          await prisma.priceReference.create({
            data: item
          });
          createdCount++;
        }
      } catch (error) {
        if (error.code === "P2025") {
          // Record not found, create it
          try {
            await prisma.priceReference.create({
              data: item
            });
            createdCount++;
          } catch (createError) {
            console.warn(
              `⚠️  Warning for ${item.commodity} on ${item.sampledAt}: ${createError.message}`
            );
          }
        } else if (error.code === "P2002") {
          // Unique constraint violation, update instead
          try {
            await prisma.priceReference.update({
              where: {
                commodity_source_sampledAt_province_regency: {
                  commodity: item.commodity,
                  source: item.source,
                  sampledAt: item.sampledAt,
                  province: item.province,
                  regency: item.regency
                }
              },
              data: { pricePerKg: item.pricePerKg }
            });
            updatedCount++;
          } catch (updateError) {
            console.warn(
              `⚠️  Warning for ${item.commodity} on ${item.sampledAt}: ${updateError.message}`
            );
          }
        } else {
          console.warn(
            `⚠️  Warning for ${item.commodity} on ${item.sampledAt}: ${error.message}`
          );
        }
      }
    }

    console.log(`✅ Batch processed: ${createdCount} created, ${updatedCount} updated`);
    return { createdCount, updatedCount };
  } catch (error) {
    console.error("❌ Batch processing error:", error.message);
    throw error;
  }
}

// Run seeder
seedPihps().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
