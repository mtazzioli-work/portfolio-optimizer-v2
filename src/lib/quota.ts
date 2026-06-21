import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { reviews, type User } from "@/db/schema";
import { getMonthlyReviewLimitDefault } from "@/lib/settings";

const QUOTA_TIMEZONE = "America/Argentina/Buenos_Aires";

/** Month boundaries in Buenos Aires (UTC-3, no DST). */
export function getBuenosAiresMonthRange(reference = new Date()): {
  start: Date;
  end: Date;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: QUOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  });
  const parts = formatter.formatToParts(reference);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);

  const pad = (n: number) => String(n).padStart(2, "0");
  const start = new Date(`${year}-${pad(month)}-01T00:00:00.000-03:00`);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00.000-03:00`);

  return { start, end };
}

function monthReviewFilter(userId: string) {
  const { start, end } = getBuenosAiresMonthRange();
  return and(
    eq(reviews.userId, userId),
    eq(reviews.claudeInvoked, true),
    gte(reviews.createdAt, start),
    lt(reviews.createdAt, end),
  );
}

export async function countClaudeReviewsThisMonth(
  userId: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(reviews)
    .where(monthReviewFilter(userId));
  return row?.total ?? 0;
}

export async function getMonthlyTokenUsage(userId: string): Promise<{
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
}> {
  const [row] = await db
    .select({
      totalInputTokens: sql<number>`coalesce(sum(${reviews.inputTokens}), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum(${reviews.outputTokens}), 0)::int`,
      totalTokens: sql<number>`coalesce(sum(${reviews.totalTokens}), 0)::int`,
      totalCostUsd: sql<number>`coalesce(sum(${reviews.estimatedCostUsd}), 0)`,
    })
    .from(reviews)
    .where(monthReviewFilter(userId));

  return {
    totalInputTokens: Number(row?.totalInputTokens ?? 0),
    totalOutputTokens: Number(row?.totalOutputTokens ?? 0),
    totalTokens: Number(row?.totalTokens ?? 0),
    totalCostUsd: Number(row?.totalCostUsd ?? 0),
  };
}

export async function getEffectiveLimit(user: User): Promise<number> {
  if (user.monthlyReviewLimit != null) {
    return user.monthlyReviewLimit;
  }
  return getMonthlyReviewLimitDefault();
}

export async function getQuotaUsage(user: User): Promise<{
  used: number;
  limit: number;
  remaining: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
}> {
  const used = await countClaudeReviewsThisMonth(user.id);
  const limit = await getEffectiveLimit(user);
  const tokens = await getMonthlyTokenUsage(user.id);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    ...tokens,
  };
}
