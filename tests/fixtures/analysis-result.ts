import type { AnalysisResult } from "@/lib/claude-analysis";

export function minimalAnalysisResult(
  overrides: Partial<AnalysisResult> = {},
): AnalysisResult {
  return {
    bearishCandidates: [],
    allocationDiagnosis: {
      byAssetClass: [],
      byRegion: [],
      bySector: [],
      summary: ["ok"],
    },
    sellHoldWatch: [],
    topDestinations: [
      {
        ticker: "VTI",
        name: "Vanguard Total Stock",
        suggestedPct: 100,
        role: "growth",
        riskLevel: 3,
        liquidity: "high",
        entryPlan: {
          strategy: "dca",
          summary: "Entrada gradual",
          tranches: [
            { pctOfAllocation: 50, timing: "Mes 1" },
            { pctOfAllocation: 50, timing: "Mes 2" },
          ],
        },
        thesis: ["Diversificación US"],
        isNew: true,
      },
    ],
    scenarios: {
      investToday: {
        name: "Hoy",
        description: ["Invertir"],
        allocation: [{ ticker: "VTI", amountUsd: 1000, rationale: ["ok"] }],
        expectedOutcome: ["Crecimiento"],
        mainRisk: ["Volatilidad"],
      },
      wait: {
        name: "Esperar",
        description: ["Esperar"],
        allocation: [],
        expectedOutcome: ["Menor riesgo"],
        mainRisk: ["Oportunidad perdida"],
      },
    },
    overallAssessment: ["Balanceado"],
    ...overrides,
  };
}
