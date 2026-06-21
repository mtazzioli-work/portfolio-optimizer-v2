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
        then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
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

vi.mock("@/lib/quota", () => ({ getQuotaUsage: (...args: unknown[]) => mockGetQuotaUsage(...args) }));
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
});
