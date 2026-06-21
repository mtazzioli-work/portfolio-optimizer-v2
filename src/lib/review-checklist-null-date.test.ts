import { describe, expect, it, vi } from "vitest";
import { minimalAnalysisResult } from "../../tests/fixtures/analysis-result";
import { buildOrderChecklist } from "@/lib/review-checklist";

vi.mock("@/lib/review-amounts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/review-amounts")>();
  return {
    ...actual,
    resolveEntryTranches: vi.fn(() => ({
      strategyLabel: "DCA",
      summary: "Sin fecha sugerida",
      tranches: [
        {
          index: 1,
          pctOfAllocation: 100,
          timing: "Cuando confirme",
          amountUsd: 1000,
          suggestedDate: null,
        },
      ],
    })),
  };
});

describe("review-checklist nullable tranche date", () => {
  it("uses tranche timing without a suggested date suffix", () => {
    const result = minimalAnalysisResult();

    const rows = buildOrderChecklist(result, 1000, [], new Date("2026-01-01"));

    expect(rows[0]).toMatchObject({
      action: "COMPRA",
      timing: "Cuando confirme",
    });
  });
});
