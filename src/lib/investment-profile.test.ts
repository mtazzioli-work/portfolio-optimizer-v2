import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";
import { createMockDb } from "../../tests/helpers/db-mock";

const mockDb = createMockDb();
const { db, setSelectResult } = mockDb;

vi.mock("@/db", () => ({ db }));

describe("investment-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSelectResult([]);
  });

  it("returns defaults when profile is missing", async () => {
    const { getStoredInvestmentProfile } = await import(
      "@/lib/investment-profile"
    );
    const stored = await getStoredInvestmentProfile("user_1");
    expect(stored.rules.riskProfile).toBe(DEFAULT_INVESTMENT_PROFILE.riskProfile);
    expect(stored.hasSavedText).toBe(false);
  });

  it("detects saved profile editor text", async () => {
    setSelectResult([
      {
        rulesJson: {
          ...DEFAULT_INVESTMENT_PROFILE,
          profileEditorText: "mi perfil guardado",
        },
      },
    ]);
    const { userHasSavedInvestmentProfile, getStoredInvestmentProfile } =
      await import("@/lib/investment-profile");

    await expect(userHasSavedInvestmentProfile("user_1")).resolves.toBe(true);
    const stored = await getStoredInvestmentProfile("user_1");
    expect(stored.profileEditorText).toBe("mi perfil guardado");
    expect(stored.hasSavedText).toBe(true);
  });

  it("returns empty editor text when profile has no saved text", async () => {
    setSelectResult([{ rulesJson: DEFAULT_INVESTMENT_PROFILE }]);
    const { getStoredInvestmentProfile } = await import(
      "@/lib/investment-profile"
    );
    const stored = await getStoredInvestmentProfile("user_1");
    expect(stored.hasSavedText).toBe(false);
    expect(stored.profileEditorText).toBe("");
  });
});
