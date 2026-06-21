import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, createSelectChain } from "../../tests/helpers/db-mock";

const mockDb = createMockDb();
const { db, selectChain, setSelectResult } = mockDb;

vi.mock("@/db", () => ({ db: mockDb.db }));

const mockGetLiquidAssetsForUser = vi.fn();
vi.mock("@/lib/liquid-assets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/liquid-assets")>();
  return {
    ...actual,
    getLiquidAssetsForUser: (...args: unknown[]) =>
      mockGetLiquidAssetsForUser(...args),
  };
});

const mockUserHasSavedInvestmentProfile = vi.fn();
vi.mock("@/lib/investment-profile", () => ({
  userHasSavedInvestmentProfile: (...args: unknown[]) =>
    mockUserHasSavedInvestmentProfile(...args),
}));

describe("onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSelectResult([]);
    db.select.mockReset();
    db.select.mockReturnValue(selectChain);
    mockGetLiquidAssetsForUser.mockResolvedValue([]);
    mockUserHasSavedInvestmentProfile.mockResolvedValue(false);
  });

  it("shows checklist for pending and active only", async () => {
    const { shouldShowOnboardingChecklist } = await import("@/lib/onboarding");
    expect(shouldShowOnboardingChecklist("pending")).toBe(true);
    expect(shouldShowOnboardingChecklist("active")).toBe(true);
    expect(shouldShowOnboardingChecklist("paused")).toBe(false);
    expect(shouldShowOnboardingChecklist("denied")).toBe(false);
  });

  it("locks operational steps for pending users", async () => {
    mockUserHasSavedInvestmentProfile.mockResolvedValue(false);

    const { getOnboardingProgress } = await import("@/lib/onboarding");
    const progress = await getOnboardingProgress("user_1", "pending", false);

    expect(progress.steps[0]?.status).toBe("available");
    expect(progress.steps[1]?.status).toBe("locked");
    expect(progress.steps[4]?.status).toBe("locked");
    expect(progress.isComplete).toBe(false);
  });

  it("locks all incomplete steps for paused users", async () => {
    mockUserHasSavedInvestmentProfile.mockResolvedValue(false);

    const { getOnboardingProgress } = await import("@/lib/onboarding");
    const progress = await getOnboardingProgress("user_1", "paused", false);

    expect(progress.steps.every((step) => step.status === "locked")).toBe(true);
    expect(progress.isComplete).toBe(false);
  });

  it("marks step 2 complete when liquid_for_investing is positive", async () => {
    mockUserHasSavedInvestmentProfile.mockResolvedValue(true);
    mockGetLiquidAssetsForUser.mockResolvedValue([
      { category: "liquid_for_investing", label: "Invest", amountUsd: 5000 },
    ]);

    const { getOnboardingProgress } = await import("@/lib/onboarding");
    const progress = await getOnboardingProgress("user_1", "active", false);

    expect(progress.steps[0]?.status).toBe("complete");
    expect(progress.steps[1]?.status).toBe("complete");
    expect(progress.steps[2]?.status).toBe("available");
  });

  it("marks step 3 complete when portfolio has current snapshot", async () => {
    mockUserHasSavedInvestmentProfile.mockResolvedValue(true);
    mockGetLiquidAssetsForUser.mockResolvedValue([
      { category: "liquid_for_investing", label: "Invest", amountUsd: 1000 },
    ]);
    setSelectResult([{ currentSnapshotId: "snap_1" }]);

    const { getOnboardingProgress } = await import("@/lib/onboarding");
    const progress = await getOnboardingProgress("user_1", "active", false);

    expect(progress.steps[2]?.status).toBe("complete");
  });

  it("marks step 4 complete when a done review exists", async () => {
    mockUserHasSavedInvestmentProfile.mockResolvedValue(true);
    mockGetLiquidAssetsForUser.mockResolvedValue([
      { category: "liquid_for_investing", label: "Invest", amountUsd: 1000 },
    ]);
    let selectCall = 0;
    db.select.mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) {
        return createSelectChain([{ currentSnapshotId: "snap_1" }]);
      }
      return createSelectChain([{ id: "rev_done" }]);
    });

    const { getOnboardingProgress } = await import("@/lib/onboarding");
    const progress = await getOnboardingProgress("user_1", "active", false);

    expect(progress.steps[3]?.status).toBe("complete");
    expect(progress.steps[4]?.status).toBe("available");
  });

  it("is complete when all five steps are done", async () => {
    mockUserHasSavedInvestmentProfile.mockResolvedValue(true);
    mockGetLiquidAssetsForUser.mockResolvedValue([
      { category: "liquid_for_investing", label: "Invest", amountUsd: 1000 },
    ]);
    let selectCall = 0;
    db.select.mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) {
        return createSelectChain([{ currentSnapshotId: "snap_1" }]);
      }
      return createSelectChain([{ id: "rev_done" }]);
    });

    const { getOnboardingProgress } = await import("@/lib/onboarding");
    const progress = await getOnboardingProgress("user_1", "active", true);

    expect(progress.isComplete).toBe(true);
    expect(progress.steps.every((step) => step.status === "complete")).toBe(
      true,
    );
  });
});

describe("userHasLiquidForInvesting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLiquidAssetsForUser.mockResolvedValue([]);
  });

  it("returns false when liquid_for_investing is zero", async () => {
    mockGetLiquidAssetsForUser.mockResolvedValue([
      { category: "cash_usd", label: "Cash", amountUsd: 1000 },
      { category: "liquid_for_investing", label: "Invest", amountUsd: 0 },
    ]);

    const { userHasLiquidForInvesting } = await import("@/lib/onboarding");
    await expect(userHasLiquidForInvesting("user_1")).resolves.toBe(false);
  });

  it("returns true when liquid_for_investing is positive", async () => {
    mockGetLiquidAssetsForUser.mockResolvedValue([
      { category: "liquid_for_investing", label: "Invest", amountUsd: 2500 },
    ]);

    const { userHasLiquidForInvesting } = await import("@/lib/onboarding");
    await expect(userHasLiquidForInvesting("user_1")).resolves.toBe(true);
  });
});
