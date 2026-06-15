import { describe, expect, it } from "vitest";
import type { Position } from "@/db/schema";
import type { AnalysisResult } from "@/lib/claude-analysis";
import { buildOrderChecklist } from "@/lib/review-checklist";

function analysisResult(
  overrides: Partial<AnalysisResult> = {},
): AnalysisResult {
  return {
    bearishCandidates: [],
    allocationDiagnosis: {
      byAssetClass: [],
      byRegion: [],
      bySector: [],
      summary: [],
    },
    sellHoldWatch: [],
    topDestinations: [],
    scenarios: {
      investToday: {
        name: "Invertir hoy",
        description: [],
        allocation: [],
        expectedOutcome: [],
        mainRisk: [],
      },
      wait: {
        name: "Esperar",
        description: [],
        allocation: [],
        expectedOutcome: [],
        mainRisk: [],
      },
    },
    overallAssessment: [],
    ...overrides,
  };
}

describe("buildOrderChecklist", () => {
  it("creates buy rows from destinations and entry tranches", () => {
    const rows = buildOrderChecklist(
      analysisResult({
        topDestinations: [
          {
            ticker: "CSPX",
            name: "S&P 500 UCITS",
            suggestedPct: 40,
            role: "growth",
            riskLevel: 3,
            liquidity: "high",
            entryPlan: "25% / 25% / 50%",
            thesis: [],
            isNew: true,
          },
        ],
      }),
      10_000,
      [],
      new Date("2026-01-01T12:00:00.000Z"),
    );

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.amountUsd)).toEqual([1_000, 1_000, 2_000]);
    expect(rows.map((r) => r.action)).toEqual(["COMPRA", "COMPRA", "COMPRA"]);
    expect(rows[0]).toMatchObject({
      ticker: "CSPX",
      amountLabel: "USD 1.000",
      origin: "Destino #1 · tramo 1",
    });
    expect(rows[0].timing).toContain("Tramo 1");
  });

  it("falls back to destination amount when tranche percentages are not calculable", () => {
    const rows = buildOrderChecklist(
      analysisResult({
        topDestinations: [
          {
            ticker: "GLD",
            name: "Gold",
            suggestedPct: 10,
            role: "hedge",
            riskLevel: 2,
            liquidity: "high",
            entryPlan: "Comprar en dos tramos sin porcentajes",
            thesis: [],
            isNew: true,
          },
        ],
      }),
      12_345,
      [],
      new Date("2026-01-01T12:00:00.000Z"),
    );

    expect(rows).toEqual([
      expect.objectContaining({
        ticker: "GLD",
        action: "COMPRA",
        amountUsd: 1_235,
        timing: "Ver plan de entrada",
        warning: "Montos de tramos no calculables",
      }),
    ]);
  });

  it("dedupes SELL rows, sums snapshot values case-insensitively, and warns on missing positions", () => {
    const rows = buildOrderChecklist(
      analysisResult({
        sellHoldWatch: [
          {
            symbol: "aapl",
            action: "SELL",
            technicalReason: [],
            estimatedExitCost: "spread bajo",
          },
          {
            symbol: "AAPL",
            action: "SELL",
            technicalReason: [],
          },
          {
            symbol: "MSFT",
            action: "HOLD",
            technicalReason: [],
          },
          {
            symbol: "TSLA",
            action: "SELL",
            technicalReason: [],
            estimatedExitCost: "comisión estimada",
          },
        ],
      }),
      0,
      [
        { symbol: "AAPL", positionValue: 1_200 } as Position,
        { symbol: "aapl", positionValue: 300 } as Position,
        { symbol: "CASH", positionValue: 999 } as Position,
      ],
      new Date("2026-01-01T12:00:00.000Z"),
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      ticker: "aapl",
      action: "VENTA",
      amountUsd: 1_500,
      amountLabel: "USD 1.500",
    });
    expect(rows[1]).toMatchObject({
      ticker: "TSLA",
      action: "VENTA",
      amountUsd: null,
      amountLabel: "—",
      warning: "Sin posición en el snapshot · hint: comisión estimada",
    });
  });
});
