// eslint-disable-next-line @typescript-eslint/no-require-imports
const yahooFinance = require("yahoo-finance2").default;
import { buildSignals, type LatestSignal, type MonthlyBar } from "./indicators";

const KNOWN_SYMBOLS: Record<string, string[]> = {
  CSPX: ["CSPX.L", "SXR8.DE"],
  DBXD: ["DBXD.DE"],
  SXRU: ["SXRU.DE"],
  TNOW: ["TNOW.DE", "TNOW.MI"],
  GSLC: ["GSLC.L", "GSLC"],
  EQAC: ["EQQB.DE", "EQAC.MI"],
};

export function candidateSymbols(
  symbol: string,
  overrides: Record<string, string> = {},
): string[] {
  const s = symbol.toUpperCase();
  if (overrides[s]) return [overrides[s]];
  const cands: string[] = [];
  if (KNOWN_SYMBOLS[s]) cands.push(...KNOWN_SYMBOLS[s]);
  if (!cands.includes(s)) cands.push(s);
  return cands;
}

async function fetchMonthlyBars(symbol: string, years = 10): Promise<MonthlyBar[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await yahooFinance.chart(symbol, {
    period1: new Date(Date.now() - years * 365 * 24 * 3600 * 1000),
    interval: "1mo",
  });

  const quotes = result?.quotes ?? result?.indicators?.quote?.[0];
  if (!quotes || quotes.length === 0) {
    throw new Error(`No data for ${symbol}`);
  }

  const byMonth = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const q of quotes as any[]) {
    if (!q.close || !q.date) continue;
    const d = new Date(q.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, q.close);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, close]) => ({ date: key, close }));
}

export type FundamentalData = {
  sector?: string;
  industry?: string;
  country?: string;
  pe?: number;
  forwardPe?: number;
  revenueGrowth?: number;
  profitMargins?: number;
  debtToEquity?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
};

export async function fetchFundamentals(symbol: string): Promise<FundamentalData> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(symbol);
    return {
      sector: quote?.sector,
      industry: quote?.industry,
      country: quote?.country,
      pe: quote?.trailingPE,
      forwardPe: quote?.forwardPE,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow,
    };
  } catch {
    return {};
  }
}

export type SymbolAnalysis = {
  symbol: string;
  providerSymbol: string;
  signal: LatestSignal;
  history: MonthlyBar[];
  fundamentals: FundamentalData;
  error?: string;
};

export async function analyzeSymbol(
  symbol: string,
  overrides: Record<string, string> = {},
  years = 10,
): Promise<SymbolAnalysis> {
  const candidates = candidateSymbols(symbol, overrides);
  let bars: MonthlyBar[] | null = null;
  let usedSymbol = symbol;

  for (const cand of candidates) {
    try {
      bars = await fetchMonthlyBars(cand, years);
      usedSymbol = cand;
      break;
    } catch {
      continue;
    }
  }

  if (!bars || bars.length === 0) {
    return {
      symbol,
      providerSymbol: usedSymbol,
      signal: {
        symbol,
        providerSymbol: usedSymbol,
        lastMonthEnd: "",
        closeAdj: 0,
        ema6: 0,
        ema10: 0,
        rsi14: 0,
        trendUp: false,
        lastCross: 0,
      },
      history: [],
      fundamentals: {},
      error: `No data found. Tried: ${candidates.join(", ")}`,
    };
  }

  const signals = buildSignals(bars);
  const last = signals[signals.length - 1];
  const fundamentals = await fetchFundamentals(usedSymbol);

  return {
    symbol,
    providerSymbol: usedSymbol,
    signal: {
      symbol,
      providerSymbol: usedSymbol,
      lastMonthEnd: last.date,
      closeAdj: last.close,
      ema6: last.ema6,
      ema10: last.ema10,
      rsi14: last.rsi14,
      trendUp: last.trendUp,
      lastCross: last.cross,
    },
    history: bars,
    fundamentals,
  };
}

export async function analyzePortfolio(
  symbols: string[],
  overrides: Record<string, string> = {},
): Promise<SymbolAnalysis[]> {
  const results: SymbolAnalysis[] = [];
  for (const sym of symbols) {
    if (sym.toUpperCase().endsWith(".CNT")) continue;
    try {
      const analysis = await analyzeSymbol(sym, overrides);
      results.push(analysis);
    } catch (e) {
      results.push({
        symbol: sym,
        providerSymbol: sym,
        signal: {
          symbol: sym,
          providerSymbol: sym,
          lastMonthEnd: "",
          closeAdj: 0,
          ema6: 0,
          ema10: 0,
          rsi14: 0,
          trendUp: false,
          lastCross: 0,
        },
        history: [],
        fundamentals: {},
        error: e instanceof Error ? e.message : String(e),
      });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return results;
}
