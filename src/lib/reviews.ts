import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  investmentProfiles,
  portfolioSnapshots,
  portfolios,
  positions,
  reviews,
  type Review,
  type User,
} from "@/db/schema";
import { buildAnalysisPrompt } from "@/lib/analysis-prompt";
import { runClaudeAnalysis } from "@/lib/claude-analysis";
import {
  DEFAULT_INVESTMENT_PROFILE,
  type InvestmentRules,
} from "@/lib/default-investment-profile";
import { toInvestmentRules } from "@/lib/investment-profile-text";
import { buildLiquidSummary, getLiquidAssetsForUser } from "@/lib/liquid-assets";
import { analyzePortfolio } from "@/lib/market-data";
import { getQuotaUsage } from "@/lib/quota";
import { canRequestReview } from "@/lib/access";

export type ReviewRulesSnapshot = {
  investmentProfile: InvestmentRules;
  liquidSummary: ReturnType<typeof buildLiquidSummary>;
};

export type RequestReviewResult = {
  reviewId?: string;
  error?: string;
  existingReviewId?: string;
};

async function assertSnapshotOwnership(
  snapshotId: string,
  userId: string,
): Promise<{ portfolioId: string } | null> {
  const [row] = await db
    .select({
      portfolioId: portfolioSnapshots.portfolioId,
      ownerId: portfolios.userId,
    })
    .from(portfolioSnapshots)
    .innerJoin(portfolios, eq(portfolioSnapshots.portfolioId, portfolios.id))
    .where(eq(portfolioSnapshots.id, snapshotId))
    .limit(1);

  if (!row || row.ownerId !== userId) return null;
  return { portfolioId: row.portfolioId };
}

export async function getDoneReviewForSnapshot(
  snapshotId: string,
): Promise<Review | null> {
  const [row] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.snapshotId, snapshotId), eq(reviews.status, "done")))
    .orderBy(desc(reviews.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getFailedReviewForSnapshot(
  snapshotId: string,
): Promise<Review | null> {
  const [row] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.snapshotId, snapshotId), eq(reviews.status, "error")))
    .orderBy(desc(reviews.createdAt))
    .limit(1);
  return row ?? null;
}

async function getInvestmentRules(userId: string): Promise<InvestmentRules> {
  const [profile] = await db
    .select()
    .from(investmentProfiles)
    .where(eq(investmentProfiles.userId, userId))
    .limit(1);

  if (!profile) return DEFAULT_INVESTMENT_PROFILE;
  return toInvestmentRules(profile.rulesJson);
}

export async function requestReview(
  user: User,
  snapshotId: string,
): Promise<RequestReviewResult> {
  if (!canRequestReview(user.accessStatus)) {
    return { error: "No autorizado para solicitar reviews" };
  }

  const ownership = await assertSnapshotOwnership(snapshotId, user.clerkUserId);
  if (!ownership) {
    return { error: "Snapshot no encontrado" };
  }

  const doneReview = await getDoneReviewForSnapshot(snapshotId);
  if (doneReview) {
    return {
      error: "Este snapshot ya tiene una review exitosa",
      existingReviewId: doneReview.id,
    };
  }

  const [processingReview] = await db
    .select()
    .from(reviews)
    .where(
      and(eq(reviews.snapshotId, snapshotId), eq(reviews.status, "processing")),
    )
    .limit(1);

  if (processingReview) {
    return { error: "Ya hay una review en progreso para este snapshot" };
  }

  const failedReview = await getFailedReviewForSnapshot(snapshotId);
  const isFreeRetry = failedReview != null;

  if (!isFreeRetry) {
    const quota = await getQuotaUsage(user);
    if (quota.remaining <= 0) {
      return { error: "Cuota mensual de reviews agotada" };
    }
  }

  let reviewId: string;

  if (failedReview) {
    reviewId = failedReview.id;
    await db
      .update(reviews)
      .set({
        status: "processing",
        errorMessage: null,
        result: null,
      })
      .where(eq(reviews.id, reviewId));
  } else {
    const [created] = await db
      .insert(reviews)
      .values({
        snapshotId,
        userId: user.clerkUserId,
        status: "processing",
        claudeInvoked: false,
      })
      .returning();
    reviewId = created.id;
  }

  try {
    const positionRows = await db
      .select()
      .from(positions)
      .where(eq(positions.snapshotId, snapshotId));

    const investmentProfile = await getInvestmentRules(user.clerkUserId);
    const liquidRows = await getLiquidAssetsForUser(user.clerkUserId);
    const liquidSummary = buildLiquidSummary(liquidRows);

    const symbols = [
      ...new Set(positionRows.map((p) => p.symbol).filter(Boolean)),
    ];
    const symbolAnalyses = await analyzePortfolio(symbols);
    const prompt = buildAnalysisPrompt(
      positionRows,
      symbolAnalyses,
      liquidSummary,
      investmentProfile,
    );
    const result = await runClaudeAnalysis(prompt);

    const rulesSnapshot: ReviewRulesSnapshot = {
      investmentProfile,
      liquidSummary,
    };

    await db
      .update(reviews)
      .set({
        status: "done",
        claudeInvoked: true,
        result,
        rulesSnapshot,
        errorMessage: null,
      })
      .where(eq(reviews.id, reviewId));

    return { reviewId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(reviews)
      .set({
        status: "error",
        errorMessage: message,
      })
      .where(eq(reviews.id, reviewId));
    return { error: message };
  }
}

export async function getReviewForUser(
  reviewId: string,
  userId: string,
): Promise<Review | null> {
  const [row] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
    .limit(1);
  return row ?? null;
}

export type ReviewListItem = {
  id: string;
  status: string;
  createdAt: Date;
  snapshotId: string;
  capturedAt: Date | null;
  totalValueUsd: number | null;
};

export async function listReviewsForUser(userId: string): Promise<ReviewListItem[]> {
  const rows = await db
    .select({
      id: reviews.id,
      status: reviews.status,
      createdAt: reviews.createdAt,
      snapshotId: reviews.snapshotId,
      capturedAt: portfolioSnapshots.capturedAt,
      totalValueUsd: portfolioSnapshots.totalValueUsd,
    })
    .from(reviews)
    .innerJoin(
      portfolioSnapshots,
      eq(reviews.snapshotId, portfolioSnapshots.id),
    )
    .where(eq(reviews.userId, userId))
    .orderBy(desc(reviews.createdAt));

  return rows;
}

export async function getCurrentSnapshotReviewState(userId: string): Promise<{
  currentSnapshotId: string | null;
  doneReview: Review | null;
  failedReview: Review | null;
} | null> {
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);

  if (!portfolio) return null;

  const snapshotId = portfolio.currentSnapshotId;
  if (!snapshotId) {
    return {
      currentSnapshotId: null,
      doneReview: null,
      failedReview: null,
    };
  }

  const doneReview = await getDoneReviewForSnapshot(snapshotId);
  const failedReview = doneReview
    ? null
    : await getFailedReviewForSnapshot(snapshotId);

  return {
    currentSnapshotId: snapshotId,
    doneReview,
    failedReview,
  };
}
