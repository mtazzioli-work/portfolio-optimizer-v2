import { describe, expect, it } from "vitest";
import type { Position } from "@/db/schema";
import type { SymbolAnalysis } from "@/lib/market-data";
import { buildAnalysisPrompt } from "@/lib/analysis-prompt";

const liquidSummary = {
  cashUsd: 1_000,
  stablecoins: 2_000,
  crypto: 3_000,
  realEstate: 4_000,
  liquidForInvesting: 5_000,
};

const positions = [
  {
    symbol: "AAPL",
    isin: "US0378331005",
    currency: "USD",
    assetCategory: "Stocks",
    subCategory: "Common",
    issuerCountryCode: "US",
    position: 10,
    markPrice: 200,
    costBasisPrice: 100,
    positionValue: 2_000,
  },
  {
    symbol: "CASH.CNT",
    position: 1,
    markPrice: 1,
    positionValue: 0,
  },
] as Position[];

const symbolAnalyses = [
  {
    symbol: "AAPL",
    providerSymbol: "AAPL",
    signal: {
      symbol: "AAPL",
      providerSymbol: "AAPL",
      lastMonthEnd: "2026-05",
      closeAdj: 200,
      ema6: 180,
      ema10: 170,
      rsi14: 62.3,
      trendUp: true,
      lastCross: 1,
    },
    history: [],
    fundamentals: {
      sector: "Technology",
      industry: "Consumer Electronics",
      pe: 31.5,
      forwardPe: 28,
      revenueGrowth: 0.08,
      profitMargins: 0.24,
    },
  },
] as SymbolAnalysis[];

describe("buildAnalysisPrompt", () => {
  it("includes saved profile text and the default B1-B4 instructions when no output format is defined", () => {
    const prompt = buildAnalysisPrompt(
      positions,
      symbolAnalyses,
      liquidSummary,
      "Perfil custom sin formato de salida",
    );

    expect(prompt).toContain("PERFIL DE INVERSIÓN DEL USUARIO:");
    expect(prompt).toContain("Perfil custom sin formato de salida");
    expect(prompt).toContain("B1) DIAGNÓSTICO DE ASIGNACIÓN");
    expect(prompt).toContain(
      "Los 5 mejores instrumentos para desplegar los $5000 USD de efectivo disponible",
    );
    expect(prompt).toContain("- PORTAFOLIO TOTAL: ~$12000 USD");
    expect(prompt).toContain("Técnico (mensual): CRUCE ALCISTA");
    expect(prompt).toContain("Fundamental: Sector=Technology");
    expect(prompt).not.toContain("Símbolo: CASH.CNT");
  });

  it("uses the minimal task section when the profile defines B.1-B.4 output", () => {
    const prompt = buildAnalysisPrompt(
      positions,
      [],
      liquidSummary,
      `Mi perfil

B.1) Diagnóstico propio
B.2) Lista propia`,
    );

    expect(prompt).toContain(
      "según el formato y las instrucciones definidas en el PERFIL DE INVERSIÓN DEL USUARIO",
    );
    expect(prompt).not.toContain("Generá un análisis estructurado con las siguientes secciones");
    expect(prompt).not.toContain("B1) DIAGNÓSTICO DE ASIGNACIÓN");
  });

  it("renders missing market data without throwing", () => {
    const prompt = buildAnalysisPrompt(
      [{ symbol: "MSFT", positionValue: 100 } as Position],
      [],
      liquidSummary,
      "Perfil custom",
    );

    expect(prompt).toContain("Símbolo: MSFT");
    expect(prompt).toContain("Técnico: sin datos");
    expect(prompt).toContain("P&L: N/A%");
  });
});
