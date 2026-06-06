import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

export const MONTHLY_REVIEW_LIMIT_DEFAULT_KEY = "monthly_review_limit_default";

const FALLBACK_MONTHLY_REVIEW_LIMIT = 3;

export async function getAppSetting(
  key: string,
  fallback?: string,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  if (row) return row.value;
  return fallback ?? null;
}

export async function getMonthlyReviewLimitDefault(): Promise<number> {
  const raw = await getAppSetting(
    MONTHLY_REVIEW_LIMIT_DEFAULT_KEY,
    String(FALLBACK_MONTHLY_REVIEW_LIMIT),
  );
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return FALLBACK_MONTHLY_REVIEW_LIMIT;
  }
  return Math.floor(parsed);
}
