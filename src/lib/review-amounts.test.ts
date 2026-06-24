import { describe, expect, it } from "vitest";
import {
  amountsDifferMoreThan,
  computeDestinationAmount,
  computeTotalPortfolioUsd,
  computeTrancheAmount,
  formatNumber,
  formatUsd,
  parseTranchePctsFromString,
  resolveEntryTranches,
  roundingResidue,
  totalLiquidAssetsUsd,
} from "@/lib/review-amounts";

describe("review-amounts", () => {
  const liquid = {
    cashUsd: 1000,
    stablecoins: 500,
    crypto: 200,
    realEstate: 300,
    liquidForInvesting: 4000,
  };

  it("formats and rounds amounts", () => {
    expect(formatUsd(1234.56)).toContain("1,235");
    expect(formatUsd(1234.56, { decimals: 2 })).toContain("1,234.56");
    expect(formatNumber(1234)).toBe("1,234");
    expect(computeDestinationAmount(10000, 25)).toBe(2500);
    expect(computeTrancheAmount(1000, 50)).toBe(500);
    expect(totalLiquidAssetsUsd(liquid)).toBe(6000);
    expect(computeTotalPortfolioUsd(50000, liquid)).toBe(56000);
    expect(computeTotalPortfolioUsd(null, liquid)).toBe(6000);
  });

  it("parses tranche percentages from strings", () => {
    expect(parseTranchePctsFromString("25% mes 1, 25% mes 2, 50% mes 3")).toEqual([
      25, 25, 50,
    ]);
    expect(parseTranchePctsFromString("no percentages")).toBeNull();
    expect(parseTranchePctsFromString("10% + 10%")).toBeNull();
  });

  it("resolves structured entry tranches", () => {
    const createdAt = new Date("2026-01-15T12:00:00Z");
    const resolved = resolveEntryTranches(
      {
        strategy: "dca",
        summary: "DCA",
        tranches: [
          { pctOfAllocation: 40, timing: "Mes 1" },
          { pctOfAllocation: 60, timing: "Mes 2" },
        ],
      },
      1000,
      createdAt,
    );

    expect(resolved?.tranches).toHaveLength(2);
    expect(resolved?.tranches[0].amountUsd).toBe(400);
    expect(resolved?.strategyLabel).toBe("DCA");
  });

  it("resolves lump_sum and string plans", () => {
    const createdAt = new Date("2026-01-15T12:00:00Z");
    const lump = resolveEntryTranches(
      { strategy: "lump_sum", summary: "Todo junto" },
      500,
      createdAt,
    );
    expect(lump?.tranches[0].amountUsd).toBe(500);

    const fromString = resolveEntryTranches("50% y 50%", 1000, createdAt);
    expect(fromString?.tranches).toHaveLength(2);
  });

  it("resolves market and custom strategy labels", () => {
    const createdAt = new Date("2026-01-15T12:00:00Z");
    const market = resolveEntryTranches(
      { strategy: "market", summary: "Comprar a mercado" },
      500,
      createdAt,
    );
    expect(market?.strategyLabel).toBe("Mercado");
    expect(market?.tranches[0].timing).toBe("Inmediato");

    const custom = resolveEntryTranches(
      {
        strategy: "ladder",
        summary: "Escalonado",
        tranches: [{ pctOfAllocation: 100, timing: "Cuando confirme" }],
      },
      500,
      createdAt,
    );
    expect(custom?.strategyLabel).toBe("ladder");
  });

  it("returns null for entry plans without resolvable tranches", () => {
    const createdAt = new Date("2026-01-15T12:00:00Z");

    expect(resolveEntryTranches("sin porcentajes", 1000, createdAt)).toBeNull();
    expect(
      resolveEntryTranches(
        { strategy: "dca", summary: "DCA sin tramos" },
        1000,
        createdAt,
      ),
    ).toBeNull();
  });

  it("compares amounts and residues", () => {
    expect(roundingResidue([100, 200], 301)).toBe(1);
    expect(amountsDifferMoreThan(110, 100, 5)).toBe(true);
    expect(amountsDifferMoreThan(102, 100, 5)).toBe(false);
    expect(amountsDifferMoreThan(1, 0, 5)).toBe(true);
    expect(amountsDifferMoreThan(0, 0, 5)).toBe(false);
  });
});
