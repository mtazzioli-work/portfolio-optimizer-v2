import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const mockGetQuotaUsage = vi.fn();
const mockGetStoredInvestmentProfile = vi.fn();
const mockGetLiquidAssetsForUser = vi.fn();
const mockAnalyzePortfolio = vi.fn();
const mockRunClaudeAnalysis = vi.fn();

const selectResults: unknown[][] = [];
let selectCall = 0;

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => {
      const result = selectResults[selectCall] ?? [];
      selectCall += 1;
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => Promise.resolve(result),
        then: (resolve: (v: unknown) => void) =>
          Promise.resolve(result).then(resolve),
      };
      return chain;
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([{ id: "review-1" }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

vi.mock("@/lib/quota", () => ({
  getQuotaUsage: (...args: unknown[]) => mockGetQuotaUsage(...args),
}));
vi.mock("@/lib/investment-profile", () => ({
  getStoredInvestmentProfile: (...args: unknown[]) =>
    mockGetStoredInvestmentProfile(...args),
}));
vi.mock("@/lib/liquid-assets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/liquid-assets")>();
  return {
    ...actual,
    getLiquidAssetsForUser: (...args: unknown[]) =>
      mockGetLiquidAssetsForUser(...args),
  };
});
vi.mock("@/lib/market-data", () => ({
  analyzePortfolio: (...args: unknown[]) => mockAnalyzePortfolio(...args),
}));
vi.mock("@/lib/claude-analysis", () => ({
  runClaudeAnalysis: (...args: unknown[]) => mockRunClaudeAnalysis(...args),
}));

const activeUser: User = {
  id: "user_1",
  email: "user@example.com",
  passwordHash: "hash",
  sessionVersion: 0,
  role: "user",
  accessStatus: "active",
  monthlyReviewLimit: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("integration: requestReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCall = 0;
    selectResults.length = 0;
    mockGetQuotaUsage.mockResolvedValue({ remaining: 1 });
    mockGetStoredInvestmentProfile.mockResolvedValue({
      rules: {},
      profileEditorText: "perfil",
      hasSavedText: true,
    });
    mockGetLiquidAssetsForUser.mockResolvedValue([]);
    mockAnalyzePortfolio.mockResolvedValue([]);
    mockRunClaudeAnalysis.mockResolvedValue({
      result: {},
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      modelId: "claude",
    });
  });

  it("rejects unauthorized users", async () => {
    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(
      { ...activeUser, accessStatus: "pending" },
      "snap-1",
    );
    expect(result.error).toContain("No autorizado");
  });

  it("rejects unknown snapshots", async () => {
    selectResults.push([]);
    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(activeUser, "snap-1");
    expect(result.error).toContain("Snapshot no encontrado");
  });

  it("requires saved investment profile", async () => {
    selectResults.push(
      [{ portfolioId: "p1", ownerId: "user_1" }],
      [],
      [],
      [],
    );
    mockGetStoredInvestmentProfile.mockResolvedValueOnce({
      rules: {},
      profileEditorText: "",
      hasSavedText: false,
    });
    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(activeUser, "snap-1");
    expect(result.error).toContain("perfil de inversión");
  });

  it("rejects snapshots that already have a successful review", async () => {
    selectResults.push(
      [{ portfolioId: "p1", ownerId: "user_1" }],
      [{ id: "done-review", status: "done" }],
    );

    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(activeUser, "snap-1");

    expect(result).toEqual({
      error: "Este snapshot ya tiene una review exitosa",
      existingReviewId: "done-review",
    });
  });

  it("rejects snapshots with processing reviews", async () => {
    selectResults.push(
      [{ portfolioId: "p1", ownerId: "user_1" }],
      [],
      [{ id: "processing-review", status: "processing" }],
    );

    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(activeUser, "snap-1");

    expect(result.error).toContain("review en progreso");
  });

  it("rejects requests when monthly quota is exhausted", async () => {
    selectResults.push(
      [{ portfolioId: "p1", ownerId: "user_1" }],
      [],
      [],
      [],
    );
    mockGetQuotaUsage.mockResolvedValueOnce({ remaining: 0 });

    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(activeUser, "snap-1");

    expect(result.error).toContain("Cuota mensual");
  });

  it("creates and completes a new review", async () => {
    selectResults.push(
      [{ portfolioId: "p1", ownerId: "user_1" }],
      [],
      [],
      [],
      [
        {
          symbol: "VTI",
          positionValue: 1000,
          position: 3,
          markPrice: 333.33,
          costBasisPrice: 300,
        },
      ],
    );

    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(activeUser, "snap-1");

    expect(result).toEqual({ reviewId: "review-1" });
    expect(mockAnalyzePortfolio).toHaveBeenCalledWith(["VTI"]);
    expect(mockRunClaudeAnalysis).toHaveBeenCalledWith(
      expect.stringContaining("VTI"),
    );
  });

  it("retries failed reviews without consuming quota", async () => {
    selectResults.push(
      [{ portfolioId: "p1", ownerId: "user_1" }],
      [],
      [],
      [{ id: "failed-review", status: "error" }],
      [{ symbol: "VTI", positionValue: 1000 }],
    );

    const { requestReview } = await import("@/lib/reviews");
    const result = await requestReview(activeUser, "snap-1");

    expect(result).toEqual({ reviewId: "failed-review" });
    expect(mockGetQuotaUsage).not.toHaveBeenCalled();
  });

  it("marks the review as error when analysis fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    selectResults.push(
      [{ portfolioId: "p1", ownerId: "user_1" }],
      [],
      [],
      [],
      [{ symbol: "VTI", positionValue: 1000 }],
    );
    mockRunClaudeAnalysis.mockRejectedValueOnce(new Error("model down"));

    const { USER_FACING_REVIEW_ERROR, requestReview } = await import(
      "@/lib/reviews"
    );
    const result = await requestReview(activeUser, "snap-1");

    expect(result).toEqual({ error: USER_FACING_REVIEW_ERROR });
    expect(consoleError).toHaveBeenCalledWith(
      "Review analysis failed:",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("loads review detail context for a user's review", async () => {
    const capturedAt = new Date("2026-01-01T00:00:00Z");
    selectResults.push(
      [{ id: "review-1", userId: "user_1", snapshotId: "snap-1" }],
      [{ capturedAt, totalValueUsd: 1234 }],
      [{ symbol: "VTI", positionValue: 1000 }],
    );

    const { getReviewDetailContext } = await import("@/lib/reviews");
    const context = await getReviewDetailContext("review-1", "user_1");

    expect(context?.snapshotCapturedAt).toBe(capturedAt);
    expect(context?.snapshotTotalValueUsd).toBe(1234);
    expect(context?.positions).toEqual([{ symbol: "VTI", positionValue: 1000 }]);
  });

  it("returns null review detail context when the review is not visible", async () => {
    selectResults.push([]);

    const { getReviewDetailContext } = await import("@/lib/reviews");
    await expect(
      getReviewDetailContext("review-1", "user_1"),
    ).resolves.toBeNull();
  });

  it("lists reviews for a user", async () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    selectResults.push([
      {
        id: "review-1",
        status: "done",
        createdAt,
        snapshotId: "snap-1",
        capturedAt: createdAt,
        totalValueUsd: 1234,
        totalTokens: 20,
        estimatedCostUsd: 0.01,
        presentationVersion: 2,
      },
    ]);

    const { listReviewsForUser } = await import("@/lib/reviews");
    await expect(listReviewsForUser("user_1")).resolves.toEqual(
      selectResults[0],
    );
  });

  it("loads current snapshot review state variants", async () => {
    selectResults.push([]);
    const { getCurrentSnapshotReviewState } = await import("@/lib/reviews");
    await expect(getCurrentSnapshotReviewState("user_1")).resolves.toBeNull();

    selectCall = 0;
    selectResults.length = 0;
    selectResults.push([{ currentSnapshotId: null }]);
    await expect(getCurrentSnapshotReviewState("user_1")).resolves.toEqual({
      currentSnapshotId: null,
      doneReview: null,
      failedReview: null,
    });

    selectCall = 0;
    selectResults.length = 0;
    selectResults.push(
      [{ currentSnapshotId: "snap-1" }],
      [],
      [{ id: "failed-review", status: "error" }],
    );
    await expect(getCurrentSnapshotReviewState("user_1")).resolves.toEqual({
      currentSnapshotId: "snap-1",
      doneReview: null,
      failedReview: { id: "failed-review", status: "error" },
    });

    selectCall = 0;
    selectResults.length = 0;
    selectResults.push(
      [{ currentSnapshotId: "snap-1" }],
      [{ id: "done-review", status: "done" }],
    );
    await expect(getCurrentSnapshotReviewState("user_1")).resolves.toEqual({
      currentSnapshotId: "snap-1",
      doneReview: { id: "done-review", status: "done" },
      failedReview: null,
    });
  });
});
