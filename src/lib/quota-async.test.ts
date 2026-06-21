import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb } from "../../tests/helpers/db-mock";

const mockDb = createMockDb();
const { db, setSelectResult } = mockDb;

vi.mock("@/db", () => ({ db }));
vi.mock("@/lib/settings", () => ({
  getMonthlyReviewLimitDefault: vi.fn().mockResolvedValue(3),
}));

describe("quota async", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSelectResult([{ total: 2 }]);
  });

  it("counts reviews this month", async () => {
    const { countClaudeReviewsThisMonth } = await import("@/lib/quota");
    await expect(countClaudeReviewsThisMonth("user_1")).resolves.toBe(2);
  });

  it("returns zero when no monthly review count row exists", async () => {
    setSelectResult([]);
    const { countClaudeReviewsThisMonth } = await import("@/lib/quota");
    await expect(countClaudeReviewsThisMonth("user_1")).resolves.toBe(0);
  });

  it("returns effective per-user limit", async () => {
    const { getEffectiveLimit } = await import("@/lib/quota");
    await expect(
      getEffectiveLimit({
        id: "user_1",
        monthlyReviewLimit: 5,
      } as never),
    ).resolves.toBe(5);
  });

  it("uses default limit when user has none", async () => {
    const { getEffectiveLimit } = await import("@/lib/quota");
    await expect(
      getEffectiveLimit({ id: "user_1", monthlyReviewLimit: null } as never),
    ).resolves.toBe(3);
  });

  it("aggregates quota usage", async () => {
    setSelectResult([{ total: 1 }]);
    db.select
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => Promise.resolve([{ total: 1 }]),
        }),
      }))
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () =>
            Promise.resolve([
              {
                totalInputTokens: 100,
                totalOutputTokens: 50,
                totalTokens: 150,
                totalCostUsd: 1.5,
              },
            ]),
        }),
      }));

    const { getQuotaUsage } = await import("@/lib/quota");
    const usage = await getQuotaUsage({
      id: "user_1",
      monthlyReviewLimit: 3,
    } as never);

    expect(usage.used).toBe(1);
    expect(usage.limit).toBe(3);
    expect(usage.remaining).toBe(2);
    expect(usage.totalTokens).toBe(150);
  });

  it("returns zero token totals when no reviews exist", async () => {
    db.select.mockImplementation(() => ({
      from: () => ({
        where: () => Promise.resolve([undefined]),
      }),
    }));

    const { getMonthlyTokenUsage } = await import("@/lib/quota");
    const usage = await getMonthlyTokenUsage("user_1");
    expect(usage.totalTokens).toBe(0);
    expect(usage.totalCostUsd).toBe(0);
  });
});
