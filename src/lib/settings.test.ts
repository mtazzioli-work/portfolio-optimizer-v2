import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb } from "../../tests/helpers/db-mock";

const { db, selectChain } = createMockDb();

vi.mock("@/db", () => ({ db }));

describe("settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectChain.limit.mockResolvedValue([]);
  });

  it("returns fallback when setting is missing", async () => {
    const { getAppSetting } = await import("@/lib/settings");
    await expect(getAppSetting("missing", "fallback")).resolves.toBe("fallback");
  });

  it("returns null when setting and fallback are missing", async () => {
    const { getAppSetting } = await import("@/lib/settings");
    await expect(getAppSetting("missing")).resolves.toBeNull();
  });

  it("returns stored setting value", async () => {
    selectChain.limit.mockResolvedValueOnce([{ value: "10" }]);
    const { getAppSetting } = await import("@/lib/settings");
    await expect(getAppSetting("key")).resolves.toBe("10");
  });

  it("uses default monthly review limit", async () => {
    const { getMonthlyReviewLimitDefault } = await import("@/lib/settings");
    await expect(getMonthlyReviewLimitDefault()).resolves.toBe(3);
  });

  it("parses configured monthly review limit", async () => {
    selectChain.limit.mockResolvedValueOnce([{ value: "7" }]);
    const { getMonthlyReviewLimitDefault } = await import("@/lib/settings");
    await expect(getMonthlyReviewLimitDefault()).resolves.toBe(7);
  });

  it("falls back on invalid monthly limit", async () => {
    selectChain.limit.mockResolvedValueOnce([{ value: "invalid" }]);
    const { getMonthlyReviewLimitDefault } = await import("@/lib/settings");
    await expect(getMonthlyReviewLimitDefault()).resolves.toBe(3);
  });

  it("floors decimal monthly review limits", async () => {
    selectChain.limit.mockResolvedValueOnce([{ value: "7.9" }]);
    const { getMonthlyReviewLimitDefault } = await import("@/lib/settings");
    await expect(getMonthlyReviewLimitDefault()).resolves.toBe(7);
  });
});
