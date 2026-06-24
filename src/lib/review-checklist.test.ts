import { describe, expect, it } from "vitest";
import { buildOrderChecklist } from "@/lib/review-checklist";
import { minimalAnalysisResult } from "../../tests/fixtures/analysis-result";

describe("review-checklist", () => {
  it("builds buy and sell rows", () => {
    const result = minimalAnalysisResult({
      sellHoldWatch: [
        {
          symbol: "TSLA",
          action: "SELL",
          technicalReason: ["Tendencia bajista"],
          estimatedExitCost: "$5",
        },
      ],
    });

    const rows = buildOrderChecklist(
      result,
      10000,
      [
        {
          id: "p1",
          snapshotId: "s1",
          symbol: "TSLA",
          positionValue: 2500,
        } as never,
        {
          id: "p2",
          snapshotId: "s1",
          symbol: "tsla",
          positionValue: 500,
        } as never,
      ],
      new Date("2026-02-01T00:00:00Z"),
    );

    expect(rows.some((r) => r.action === "COMPRA" && r.ticker === "VTI")).toBe(
      true,
    );
    expect(rows.some((r) => r.action === "VENTA" && r.ticker === "TSLA")).toBe(
      true,
    );
    expect(rows.find((r) => r.action === "VENTA")?.amountUsd).toBe(3000);
  });

  it("warns when tranches cannot be resolved", () => {
    const result = minimalAnalysisResult({
      topDestinations: [
        {
          ticker: "VTI",
          name: "Vanguard",
          suggestedPct: 100,
          role: "growth",
          riskLevel: 3,
          liquidity: "high",
          entryPlan: "sin porcentajes claros",
          thesis: ["x"],
          isNew: true,
        },
      ],
    });

    const rows = buildOrderChecklist(result, 1000, [], new Date("2026-01-01"));
    expect(rows[0].warning).toContain("no calculables");
  });

  it("warns when sell position is missing from snapshot", () => {
    const result = minimalAnalysisResult({
      sellHoldWatch: [
        {
          symbol: "XYZ",
          action: "SELL",
          technicalReason: ["Salir"],
          estimatedExitCost: "$2",
        },
      ],
      topDestinations: [],
    });

    const rows = buildOrderChecklist(result, 0, [], new Date("2026-01-01"));
    expect(rows[0].warning).toContain("Sin posición");
  });

  it("ignores blank and zero-value positions when matching sells", () => {
    const result = minimalAnalysisResult({
      sellHoldWatch: [
        {
          symbol: "XYZ",
          action: "SELL",
          technicalReason: ["Salir"],
        },
      ],
      topDestinations: [],
    });

    const rows = buildOrderChecklist(
      result,
      0,
      [
        { symbol: "", positionValue: 100 } as never,
        { symbol: "XYZ", positionValue: 0 } as never,
      ],
      new Date("2026-01-01"),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].amountUsd).toBeNull();
    expect(rows[0].warning).toBe("Sin posición en el snapshot");
  });

  it("skips duplicate sell symbols", () => {
    const result = minimalAnalysisResult({
      topDestinations: [],
      sellHoldWatch: [
        { symbol: "AAA", action: "SELL", technicalReason: ["a"] },
        { symbol: "AAA", action: "SELL", technicalReason: ["b"] },
        { symbol: "BBB", action: "HOLD", technicalReason: ["c"] },
      ],
    });

    const rows = buildOrderChecklist(result, 0, [], new Date("2026-01-01"));
    expect(rows.filter((r) => r.action === "VENTA")).toHaveLength(1);
  });
});
