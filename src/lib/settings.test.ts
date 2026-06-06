import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
}));

vi.mock("@/db", () => ({ db: mockDb }));

import {
  getAppSetting,
  getMonthlyReviewLimitDefault,
  MONTHLY_REVIEW_LIMIT_DEFAULT_KEY,
} from "@/lib/settings";

function mockSettingRows(rows: Array<{ value: string }>) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockResolvedValue(rows);
  mockDb.select.mockReturnValue(query);
  return query;
}

describe("settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a setting value when it exists", async () => {
    const query = mockSettingRows([{ value: "enabled" }]);

    await expect(getAppSetting("feature_flag", "disabled")).resolves.toBe(
      "enabled",
    );
    expect(mockDb.select).toHaveBeenCalledOnce();
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it("returns the provided fallback or null when a setting is missing", async () => {
    mockSettingRows([]);
    await expect(getAppSetting("missing", "fallback")).resolves.toBe(
      "fallback",
    );

    mockSettingRows([]);
    await expect(getAppSetting("missing")).resolves.toBeNull();
  });

  it.each([
    ["5", 5],
    ["5.9", 5],
    ["0", 0],
  ])("parses monthly default %s as %i", async (storedValue, expected) => {
    mockSettingRows([{ value: storedValue }]);

    await expect(getMonthlyReviewLimitDefault()).resolves.toBe(expected);
  });

  it.each(["not-a-number", "-1", "Infinity"])(
    "falls back when monthly default is invalid: %s",
    async (storedValue) => {
      mockSettingRows([{ value: storedValue }]);

      await expect(getMonthlyReviewLimitDefault()).resolves.toBe(3);
    },
  );

  it("uses the built-in fallback when the monthly default setting is missing", async () => {
    const query = mockSettingRows([]);

    await expect(getMonthlyReviewLimitDefault()).resolves.toBe(3);
    expect(query.where).toHaveBeenCalledOnce();
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(await getAppSetting(MONTHLY_REVIEW_LIMIT_DEFAULT_KEY, "3")).toBe(
      "3",
    );
  });
});
