import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portfolios, portfolioSnapshots, positions } from "@/db/schema";
import type { ParsedPosition } from "@/lib/csv-parser";

export async function saveSnapshot(
  userId: string,
  rows: ParsedPosition[],
  source: "csv" | "text",
): Promise<string> {
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  if (!portfolio) {
    throw new Error("No se encontró el portfolio del usuario");
  }

  const totalValueUsd = rows.reduce((s, r) => s + (r.positionValue ?? 0), 0);

  const [snapshot] = await db
    .insert(portfolioSnapshots)
    .values({
      portfolioId: portfolio.id,
      source,
      totalValueUsd,
      capturedAt: new Date(),
    })
    .returning();

  if (rows.length > 0) {
    await db.insert(positions).values(
      rows.map((r) => ({
        snapshotId: snapshot.id,
        symbol: r.symbol,
        isin: r.isin,
        currency: r.currency,
        assetCategory: r.assetCategory,
        subCategory: r.subCategory,
        issuerCountryCode: r.issuerCountryCode,
        position: r.position,
        markPrice: r.markPrice,
        positionValue: r.positionValue,
        costBasisPrice: r.costBasisPrice,
      })),
    );
  }

  await db
    .update(portfolios)
    .set({
      currentSnapshotId: snapshot.id,
      updatedAt: new Date(),
    })
    .where(eq(portfolios.id, portfolio.id));

  return snapshot.id;
}
