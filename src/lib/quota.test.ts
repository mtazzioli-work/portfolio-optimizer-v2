import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const { mockDb, mockGetMonthlyReviewLimitDefault } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
  mockGetMonthlyReviewLimitDefault: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/lib/settings", () => ({
  getMonthlyReviewLimitDefault: mockGetMonthlyReviewLimitDefault,
}));

import {
  countClaudeReviewsThisMonth,
  getBuenosAiresMonthRange,
  getEffectiveLimit,
  getQuotaUsage,
} from "@/lib/quota";

const user: User = {
  clerkUserId: "user_123",
  email: "user@example.com",
  accessStatus: "active",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function mockReviewCount(total: number | undefined) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.where.mockResolvedValue(total === undefined ? [] : [{ total }]);
  mockDb.select.mockReturnValue(query);
  return query;
}

describe("quota month boundaries", () => {
  it("returns UTC dates for the current Buenos Aires calendar month", () => {
    const range = getBuenosAiresMonthRange(
      new Date("2026-06-15T12:00:00.000Z"),
    );

    expect(range.start.toISOString()).toBe("2026-06-01T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-07-01T03:00:00.000Z");
  });

  it("uses the Buenos Aires month when the UTC date is still crossing midnight", () => {
    const range = getBuenosAiresMonthRange(
      new Date("2026-01-01T01:00:00.000Z"),
    );

    expect(range.start.toISOString()).toBe("2025-12-01T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-01-01T03:00:00.000Z");
  });

  it("handles December to January rollover", () => {
    const range = getBuenosAiresMonthRange(
      new Date("2026-12-10T12:00:00.000Z"),
    );

    expect(range.start.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(range.end.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });
});

describe("quota usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMonthlyReviewLimitDefault.mockResolvedValue(3);
  });

  it("counts only Claude-backed reviews in the current month query", async () => {
    const query = mockReviewCount(2);

    await expect(countClaudeReviewsThisMonth("user_123")).resolves.toBe(2);
    expect(mockDb.select).toHaveBeenCalledWith({ total: expect.anything() });
    expect(query.from).toHaveBeenCalledOnce();
    expect(query.where).toHaveBeenCalledOnce();
  });

  it("returns zero when the count query does not return a row", async () => {
    mockReviewCount(undefined);

    await expect(countClaudeReviewsThisMonth("user_123")).resolves.toBe(0);
  });

  it("uses a user override before the app default", async () => {
    await expect(
      getEffectiveLimit({ ...user, monthlyReviewLimit: 9 }),
    ).resolves.toBe(9);
    expect(mockGetMonthlyReviewLimitDefault).not.toHaveBeenCalled();
  });

  it("uses the app default when the user has no override", async () => {
    mockGetMonthlyReviewLimitDefault.mockResolvedValue(4);

    await expect(getEffectiveLimit(user)).resolves.toBe(4);
  });

  it("returns used, limit, and non-negative remaining quota", async () => {
    mockReviewCount(5);
    mockGetMonthlyReviewLimitDefault.mockResolvedValue(3);

    await expect(getQuotaUsage(user)).resolves.toEqual({
      used: 5,
      limit: 3,
      remaining: 0,
    });
  });
});
