import { eq } from "drizzle-orm";
import { db } from "@/db";
import { liquidAssets } from "@/db/schema";
import {
  LIQUID_EDITOR_CATEGORY,
  liquidAssetsFromDb,
} from "@/lib/liquid-assets-template";
import {
  getDefaultLiquidAssetsText,
  parseLiquidAssetsFromEditing,
  serializeLiquidAssetsForEditing,
} from "@/lib/liquid-assets-text";
import type { LiquidAssetEntry } from "@/lib/liquid-assets-template";
import type { LiquidSummary } from "@/lib/analysis-prompt";

function sumCategory(
  entries: LiquidAssetEntry[],
  category: string,
): number {
  return entries
    .filter((e) => e.category === category)
    .reduce((s, e) => s + e.amountUsd, 0);
}

export function buildLiquidSummary(
  rows: { category: string; label: string; amountUsd: number }[],
): LiquidSummary {
  const entries = liquidAssetsFromDb(rows);
  return {
    cashUsd: sumCategory(entries, "cash_usd"),
    stablecoins: sumCategory(entries, "stablecoins"),
    crypto: sumCategory(entries, "crypto"),
    realEstate: sumCategory(entries, "real_estate"),
    liquidForInvesting: sumCategory(entries, "liquid_for_investing"),
  };
}

export async function getLiquidAssetsForUser(userId: string) {
  return db
    .select()
    .from(liquidAssets)
    .where(eq(liquidAssets.userId, userId));
}

export function getLiquidAssetsEditorText(
  rows: { category: string; label: string; amountUsd: number; notes?: string | null }[],
): string {
  const editorRow = rows.find((r) => r.category === LIQUID_EDITOR_CATEGORY);
  if (editorRow?.notes?.trim()) {
    return editorRow.notes;
  }

  const entries = liquidAssetsFromDb(rows);
  if (entries.every((e) => e.amountUsd === 0) && rows.length === 0) {
    return getDefaultLiquidAssetsText();
  }

  return serializeLiquidAssetsForEditing(entries);
}

export async function upsertLiquidAssets(
  userId: string,
  editorText: string,
): Promise<{ error?: string }> {
  const parsed = parseLiquidAssetsFromEditing(editorText);
  if (!parsed.ok) {
    return { error: parsed.error };
  }

  await db.delete(liquidAssets).where(eq(liquidAssets.userId, userId));

  const now = new Date();
  const values: {
    userId: string;
    category: string;
    label: string;
    amountUsd: number;
    notes?: string;
    updatedAt: Date;
  }[] = parsed.entries.map((e: LiquidAssetEntry) => ({
    userId,
    category: e.category,
    label: e.label,
    amountUsd: e.amountUsd,
    updatedAt: now,
  }));

  values.push({
    userId,
    category: LIQUID_EDITOR_CATEGORY,
    label: "editor",
    amountUsd: 0,
    notes: editorText,
    updatedAt: now,
  });

  await db.insert(liquidAssets).values(values);
  return {};
}
