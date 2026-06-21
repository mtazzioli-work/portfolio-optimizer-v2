import { describe, expect, it } from "vitest";
import { buildAnalysisPrompt } from "@/lib/analysis-prompt";

describe("analysis-prompt", () => {
  it("builds prompt with positions and liquid summary", () => {
    const prompt = buildAnalysisPrompt(
      [
        {
          id: "p1",
          snapshotId: "s1",
          symbol: "VTI",
          position: 10,
          markPrice: 100,
          positionValue: 1000,
          costBasisPrice: 90,
          currency: "USD",
          assetCategory: "ETF",
        } as never,
      ],
      [
        {
          symbol: "VTI",
          providerSymbol: "VTI",
          lastMonthEnd: "2026-01-31",
          closeAdj: 100,
          ema6: 99,
          ema10: 98,
          rsi14: 55,
          trendUp: true,
          lastCross: 0,
        },
      ],
      {
        cashUsd: 1000,
        stablecoins: 0,
        crypto: 0,
        realEstate: 0,
        liquidForInvesting: 5000,
      },
      "PERFIL DE INVERSIÓN\nRiesgo: moderate",
    );

    expect(prompt).toContain("VTI");
    expect(prompt).toContain("PERFIL DE INVERSIÓN");
    expect(prompt).toContain("5000");
    expect(prompt).toContain("TAREA:");
  });

  it("uses minimal task section when profile defines format", () => {
    const prompt = buildAnalysisPrompt([], [], {
      cashUsd: 0,
      stablecoins: 0,
      crypto: 0,
      realEstate: 0,
      liquidForInvesting: 1000,
    }, "Instrucciones B.1) y B.2)");

    expect(prompt).toContain("formato y las instrucciones definidas");
  });

  it("includes bullish technical and fundamental details", () => {
    const prompt = buildAnalysisPrompt(
      [
        {
          id: "p1",
          snapshotId: "s1",
          symbol: "AAPL",
          position: 1,
          markPrice: 100,
          positionValue: 100,
          costBasisPrice: 80,
          currency: "USD",
        } as never,
      ],
      [
        {
          symbol: "AAPL",
          providerSymbol: "AAPL",
          signal: {
            ema6: 101,
            ema10: 99,
            rsi14: 60,
            trendUp: true,
            lastCross: 1,
            closeAdj: 100,
            lastMonthEnd: "2026-01-31",
          },
          fundamentals: {
            sector: "Tech",
            industry: "Hardware",
            pe: 25,
            forwardPe: 22,
            revenueGrowth: 0.1,
            profitMargins: 0.2,
          },
        } as never,
      ],
      {
        cashUsd: 0,
        stablecoins: 0,
        crypto: 0,
        realEstate: 0,
        liquidForInvesting: 0,
      },
      "perfil",
    );

    expect(prompt).toContain("CRUCE ALCISTA");
    expect(prompt).toContain("Fundamental:");
  });

  it("labels bearish trend states", () => {
    const prompt = buildAnalysisPrompt(
      [
        {
          id: "p1",
          snapshotId: "s1",
          symbol: "XYZ",
          position: 1,
          markPrice: 10,
          positionValue: 10,
        } as never,
      ],
      [
        {
          symbol: "XYZ",
          providerSymbol: "XYZ",
          signal: {
            ema6: 90,
            ema10: 100,
            rsi14: 40,
            trendUp: false,
            lastCross: -1,
            closeAdj: 10,
            lastMonthEnd: "2026-01-31",
          },
          fundamentals: null,
        } as never,
      ],
      {
        cashUsd: 0,
        stablecoins: 0,
        crypto: 0,
        realEstate: 0,
        liquidForInvesting: 100,
      },
      "perfil",
    );

    expect(prompt).toContain("CRUCE BAJISTA");
  });

  it("labels steady uptrend without fresh cross", () => {
    const prompt = buildAnalysisPrompt(
      [
        {
          id: "p1",
          snapshotId: "s1",
          symbol: "ABC",
          position: 1,
          markPrice: 50,
          positionValue: 50,
        } as never,
      ],
      [
        {
          symbol: "ABC",
          providerSymbol: "ABC",
          signal: {
            ema6: 51,
            ema10: 49,
            rsi14: 55,
            trendUp: true,
            lastCross: 0,
            closeAdj: 50,
            lastMonthEnd: "2026-01-31",
          },
          fundamentals: null,
        } as never,
      ],
      {
        cashUsd: 0,
        stablecoins: 0,
        crypto: 0,
        realEstate: 0,
        liquidForInvesting: 0,
      },
      "perfil",
    );

    expect(prompt).toContain("TENDENCIA ALCISTA");
  });

  it("filters synthetic cash rows and labels missing and bearish data", () => {
    const prompt = buildAnalysisPrompt(
      [
        {
          id: "p1",
          snapshotId: "s1",
          symbol: "CASH.CNT",
          position: 100,
          positionValue: 100,
        } as never,
        {
          id: "p2",
          snapshotId: "s1",
          symbol: "BND",
          position: 2,
          positionValue: 200,
        } as never,
        {
          id: "p3",
          snapshotId: "s1",
          symbol: "SPY",
          position: 1,
          markPrice: 400,
          positionValue: 400,
          costBasisPrice: 410,
          currency: "USD",
        } as never,
      ],
      [
        {
          symbol: "SPY",
          providerSymbol: "SPY",
          signal: {
            ema6: 390,
            ema10: 410,
            rsi14: 35,
            trendUp: false,
            lastCross: 0,
            closeAdj: 400,
            lastMonthEnd: "2026-01-31",
          },
          fundamentals: {
            sector: null,
            industry: "Index",
            pe: null,
            forwardPe: null,
            revenueGrowth: null,
            profitMargins: null,
          },
        } as never,
      ],
      {
        cashUsd: 10,
        stablecoins: 20,
        crypto: 30,
        realEstate: 40,
        liquidForInvesting: 50,
      },
      "perfil",
    );

    expect(prompt).not.toContain("Símbolo: CASH.CNT");
    expect(prompt).toContain("Símbolo: BND");
    expect(prompt).toContain("Técnico: sin datos");
    expect(prompt).toContain("TENDENCIA BAJISTA");
    expect(prompt).toContain("P&L: -2.4%");
  });

  it("uses fundamental fallbacks when only partial data is available", () => {
    const prompt = buildAnalysisPrompt(
      [
        {
          id: "p1",
          snapshotId: "s1",
          symbol: "QQQ",
          position: 1,
          markPrice: 100,
          positionValue: 100,
          currency: "USD",
        } as never,
      ],
      [
        {
          symbol: "QQQ",
          providerSymbol: "QQQ",
          fundamentals: {
            sector: "Technology",
            industry: null,
            pe: null,
            forwardPe: null,
            revenueGrowth: null,
            profitMargins: null,
          },
        } as never,
      ],
      {
        cashUsd: 0,
        stablecoins: 0,
        crypto: 0,
        realEstate: 0,
        liquidForInvesting: 0,
      },
      "perfil",
    );

    expect(prompt).toContain("Fundamental: Sector=Technology");
    expect(prompt).toContain("Industria=N/A");
    expect(prompt).toContain("P/E=N/A");
    expect(prompt).toContain("Crec. ingresos=N/A");
  });
});
