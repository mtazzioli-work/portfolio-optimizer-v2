import { describe, expect, it } from "vitest";
import {
  amountsDifferMoreThan,
  computeDestinationAmount,
  computeTotalPortfolioUsd,
  computeTrancheAmount,
  parseTranchePctsFromString,
  resolveEntryTranches,
  roundingResidue,
  totalLiquidAssetsUsd,
} from "@/lib/review-amounts";

describe("review amount helpers", () => {
  it("computes destination, tranche, and total portfolio amounts", () => {
    const liquidSummary = {
      cashUsd: 100,
      stablecoins: 200,
      crypto: 300,
      realEstate: 400,
      liquidForInvesting: 10_000,
    };

    expect(computeDestinationAmount(10_000, 25)).toBe(2_500);
    expect(computeTrancheAmount(2_500, 33.3)).toBe(833);
    expect(totalLiquidAssetsUsd(liquidSummary)).toBe(11_000);
    expect(computeTotalPortfolioUsd(null, liquidSummary)).toBe(11_000);
    expect(computeTotalPortfolioUsd(9_000, liquidSummary)).toBe(20_000);
  });

  it("parses string tranche percentages only when they sum near 100", () => {
    expect(parseTranchePctsFromString("25% / 25% / 50%")).toEqual([25, 25, 50]);
    expect(parseTranchePctsFromString("33.3%, 33.3%, 33.4%")).toEqual([
      33.3, 33.3, 33.4,
    ]);
    expect(parseTranchePctsFromString("40% + 40%")).toBeNull();
    expect(parseTranchePctsFromString("sin porcentajes")).toBeNull();
  });

  it("resolves string, structured DCA, and single-entry plans", () => {
    const reviewDate = new Date("2026-01-01T12:00:00.000Z");

    const fromString = resolveEntryTranches("25% / 25% / 50%", 4_000, reviewDate);
    expect(fromString?.strategyLabel).toBe("DCA");
    expect(fromString?.tranches.map((t) => t.amountUsd)).toEqual([1_000, 1_000, 2_000]);
    expect(fromString?.tranches[0].timing).toBe("Tramo 1");
    expect(fromString?.tranches[0].suggestedDate).toContain("2026");

    const dca = resolveEntryTranches(
      {
        strategy: "dca",
        summary: "Tres compras",
        tranches: [
          { pctOfAllocation: 20, timing: "Mes 1" },
          { pctOfAllocation: 80, timing: "Mes 2" },
        ],
      },
      5_000,
      reviewDate,
    );
    expect(dca?.strategyLabel).toBe("DCA");
    expect(dca?.tranches.map((t) => [t.timing, t.amountUsd])).toEqual([
      ["Mes 1", 1_000],
      ["Mes 2", 4_000],
    ]);

    const lumpSum = resolveEntryTranches(
      { strategy: "lump_sum", summary: "Entrar ahora" },
      7_500,
      reviewDate,
    );
    expect(lumpSum?.strategyLabel).toBe("Una sola entrada");
    expect(lumpSum?.tranches).toMatchObject([
      { pctOfAllocation: 100, timing: "Inmediato", amountUsd: 7_500 },
    ]);

    expect(
      resolveEntryTranches({ strategy: "limit", summary: "Esperar precio" }, 1_000, reviewDate),
    ).toBeNull();
  });

  it("reports rounding residue and percentage differences", () => {
    expect(roundingResidue([333, 333, 333], 1_000)).toBe(1);
    expect(amountsDifferMoreThan(106, 100, 5)).toBe(true);
    expect(amountsDifferMoreThan(105, 100, 5)).toBe(false);
    expect(amountsDifferMoreThan(1, 0, 5)).toBe(true);
    expect(amountsDifferMoreThan(0, 0, 5)).toBe(false);
  });
});
