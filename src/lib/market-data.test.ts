import { beforeEach, describe, expect, it, vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require("yahoo-finance2").default;

const chartMock = vi.fn();
const quoteMock = vi.fn();

function monthlyQuotes(count = 16) {
  return Array.from({ length: count }, (_, i) => ({
    close: 100 + i,
    date: new Date(Date.UTC(2024, i, 1)),
  }));
}

describe("market data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    yahooFinance.chart = chartMock;
    yahooFinance.quote = quoteMock;
    quoteMock.mockResolvedValue({
      country: "US",
      fiftyTwoWeekHigh: 150,
      fiftyTwoWeekLow: 90,
      forwardPE: 20,
      industry: "Asset Management",
      sector: "Financial Services",
      trailingPE: 22,
    });
  });

  it("builds candidate symbols from overrides, known mappings, and uppercase fallbacks", async () => {
    const { candidateSymbols } = await import("@/lib/market-data");

    expect(candidateSymbols("cspx")).toEqual(["CSPX.L", "SXR8.DE", "CSPX"]);
    expect(candidateSymbols("cspx", { CSPX: "CUSTOM.L" })).toEqual([
      "CUSTOM.L",
    ]);
    expect(candidateSymbols("vti")).toEqual(["VTI"]);
  });

  it("fetches fundamentals and returns an empty object on provider errors", async () => {
    const { fetchFundamentals } = await import("@/lib/market-data");

    await expect(fetchFundamentals("VTI")).resolves.toEqual({
      country: "US",
      fiftyTwoWeekHigh: 150,
      fiftyTwoWeekLow: 90,
      forwardPe: 20,
      industry: "Asset Management",
      pe: 22,
      sector: "Financial Services",
    });

    quoteMock.mockRejectedValueOnce(new Error("provider down"));
    await expect(fetchFundamentals("BROKEN")).resolves.toEqual({});
  });

  it("analyzes a symbol using the first provider candidate with monthly bars", async () => {
    const { analyzeSymbol } = await import("@/lib/market-data");

    chartMock
      .mockRejectedValueOnce(new Error("missing first candidate"))
      .mockResolvedValueOnce({ quotes: monthlyQuotes() });

    const analysis = await analyzeSymbol("CSPX");

    expect(chartMock).toHaveBeenNthCalledWith(
      1,
      "CSPX.L",
      expect.objectContaining({ interval: "1mo" }),
    );
    expect(chartMock).toHaveBeenNthCalledWith(
      2,
      "SXR8.DE",
      expect.objectContaining({ interval: "1mo" }),
    );
    expect(analysis.providerSymbol).toBe("SXR8.DE");
    expect(analysis.history).toHaveLength(16);
    expect(analysis.signal.symbol).toBe("CSPX");
    expect(analysis.fundamentals.sector).toBe("Financial Services");
  });

  it("returns a structured error when no monthly data is available", async () => {
    const { analyzeSymbol } = await import("@/lib/market-data");
    chartMock.mockResolvedValue({ quotes: [] });

    const analysis = await analyzeSymbol("MISSING");

    expect(analysis.error).toContain("No data found");
    expect(analysis.history).toEqual([]);
    expect(analysis.fundamentals).toEqual({});
  });

  it("skips .CNT symbols while analyzing a portfolio", async () => {
    const { analyzePortfolio } = await import("@/lib/market-data");
    chartMock.mockResolvedValue({ quotes: monthlyQuotes() });

    const analyses = await analyzePortfolio(["CASH.CNT", "VTI"]);

    expect(analyses).toHaveLength(1);
    expect(analyses[0].symbol).toBe("VTI");
    expect(chartMock).toHaveBeenCalledOnce();
  });
});
