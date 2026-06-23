import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { REVIEW_PRESENTATION_VERSION } from "@/db/schema";
import { ReviewView } from "@/components/reviews/review-view";
import type { LegacyAnalysisResult } from "@/components/reviews/review-view-legacy";
import type { AnalysisResult } from "@/lib/claude-analysis";
import type { LiquidSummary } from "@/lib/analysis-prompt";

const v2Result: AnalysisResult = {
  overallAssessment: ["Riesgo concentrado", "Hay efectivo para desplegar"],
  bearishCandidates: [
    {
      symbol: "ARKK",
      reason: ["Momentum débil", "Volatilidad elevada"],
      keyLevel: "USD 40",
      exitTrigger: "Pierde soporte",
      estimatedExitCost: "Bajo",
      alternative: "SPY",
    },
  ],
  allocationDiagnosis: {
    summary: ["Sobrepeso en growth"],
    byAssetClass: [
      {
        category: "Acciones",
        currentPct: 80,
        targetMin: 45,
        targetMax: 60,
        status: "OVERWEIGHT",
        comment: "Reducir gradualmente",
      },
      {
        category: "Bonos",
        currentPct: 10,
        targetMin: 20,
        targetMax: 30,
        status: "UNDERWEIGHT",
      },
      {
        category: "Liquidez",
        currentPct: 10,
        targetMin: 10,
        targetMax: 20,
        status: "OK",
      },
    ],
    byRegion: [{ region: "Estados Unidos", currentPct: 70 }],
    bySector: [{ sector: "Tecnología", currentPct: 45, comment: "Alto peso" }],
  },
  sellHoldWatch: [
    {
      symbol: "ARKK",
      action: "SELL",
      technicalReason: ["Tendencia negativa"],
      keyLevel: "USD 40",
      exitTrigger: "Cierre semanal debajo",
      estimatedExitCost: "USD 5",
    },
    {
      symbol: "QQQ",
      action: "WATCH",
      technicalReason: ["Esperar confirmación"],
    },
    {
      symbol: "SPY",
      action: "HOLD",
      technicalReason: ["Base diversificada"],
    },
  ],
  topDestinations: [
    {
      ticker: "BND",
      name: "Vanguard Total Bond",
      suggestedPct: 60,
      role: "defensive",
      riskLevel: 2,
      liquidity: "high",
      ter: "0.03%",
      entryPlan: {
        strategy: "dca",
        summary: "Entrar en dos tramos",
        tranches: [
          { pctOfAllocation: 50, timing: "Hoy" },
          { pctOfAllocation: 50, timing: "Próximo mes" },
        ],
      },
      thesis: ["Baja volatilidad"],
      isNew: true,
    },
    {
      ticker: "SPY",
      name: "S&P 500 ETF",
      suggestedPct: 30,
      role: "growth",
      riskLevel: 3,
      liquidity: "high",
      entryPlan: "Comprar en retrocesos",
      thesis: "Exposición amplia",
      isNew: false,
    },
  ],
  scenarios: {
    investToday: {
      name: "Invertir hoy",
      description: ["Desplegar capital disponible"],
      allocation: [
        {
          ticker: "BND",
          amountUsd: 5500,
          pctOfCash: 55,
          rationale: ["Compensa sobrepeso growth"],
        },
      ],
      expectedOutcome: ["Menor volatilidad"],
      mainRisk: ["Suba de tasas"],
    },
    wait: {
      name: "Esperar",
      description: ["Mantener liquidez"],
      allocation: [],
      expectedOutcome: ["Opcionalidad"],
      mainRisk: ["Costo de oportunidad"],
    },
  },
};

const liquidSummary: LiquidSummary = {
  cashUsd: 10_000,
  stablecoins: 1_000,
  crypto: 500,
  realEstate: 500,
  liquidForInvesting: 10_000,
};

const legacyResult: LegacyAnalysisResult = {
  overallAssessment: "Cartera balanceada con ajustes menores.",
  bearishCandidates: [],
  allocationDiagnosis: {
    summary: "Asignación razonable",
    byAssetClass: [
      {
        category: "Acciones",
        currentPct: 60,
        targetMin: 50,
        targetMax: 70,
        status: "OK",
      },
    ],
    byRegion: [{ region: "Global", currentPct: 100 }],
    bySector: [{ sector: "Mixto", currentPct: 100 }],
  },
  sellHoldWatch: [
    {
      symbol: "SPY",
      action: "HOLD",
      technicalReason: "Mantener exposición",
    },
  ],
  topDestinations: [
    {
      ticker: "BND",
      name: "Bond ETF",
      suggestedPct: 100,
      role: "defensive",
      riskLevel: 2,
      liquidity: "high",
      entryPlan: "Comprar gradual",
      thesis: "Estabiliza cartera",
    },
  ],
  scenarios: {
    investToday: {
      name: "Invertir hoy",
      description: "Usar liquidez",
      allocation: [{ ticker: "BND", amount: "USD 1000", rationale: "Defensa" }],
      expectedOutcome: "Menos riesgo",
      mainRisk: "Tasas",
    },
    wait: {
      name: "Esperar",
      description: "Mantener cash",
      allocation: [],
      expectedOutcome: "Flexibilidad",
      mainRisk: "Oportunidad",
    },
  },
};

describe("ReviewView", () => {
  it("renders the v2 presentation with destinations, scenarios, and checklist", () => {
    render(
      <ReviewView
        result={v2Result}
        presentationVersion={REVIEW_PRESENTATION_VERSION}
        liquidSummary={liquidSummary}
        snapshotCapturedAt={new Date("2026-01-15T00:00:00.000Z")}
        snapshotTotalValueUsd={90_000}
        positions={[{ symbol: "ARKK", positionValue: 2500 } as never]}
        reviewCreatedAt={new Date("2026-01-20T00:00:00.000Z")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Resumen de acciones" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Capital a desplegar/)).toBeInTheDocument();
    expect(screen.getAllByText("ARKK").length).toBeGreaterThan(1);
    expect(screen.getByText(/Costo estimado de salida: USD 5/)).toBeInTheDocument();
    expect(screen.getByText(/#1 BND/)).toBeInTheDocument();
    expect(screen.getByText(/Plan de entrada/)).toBeInTheDocument();
    expect(screen.getByText(/Los montos del escenario/)).toBeInTheDocument();
    expect(screen.getByText("Checklist de órdenes")).toBeInTheDocument();
    expect(screen.getByText("Glosario")).toBeInTheDocument();
  });

  it("falls back to the legacy presentation without v2 liquid summary", () => {
    render(
      <ReviewView
        result={legacyResult}
        presentationVersion={1}
      />,
    );

    expect(
      screen.getByText("Review generada con versión anterior del formato de presentación."),
    ).toBeInTheDocument();
    expect(screen.getByText("Cartera balanceada con ajustes menores.")).toBeInTheDocument();
    expect(screen.getByText("Sin candidatos bajistas en este momento.")).toBeInTheDocument();
    expect(screen.getByText("BND")).toBeInTheDocument();
  });
});
