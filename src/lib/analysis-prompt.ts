import { type Position } from "@/db/schema";
import {
  type InvestmentRules,
  serializeProfileForPrompt,
} from "@/lib/default-investment-profile";
import { type SymbolAnalysis } from "@/lib/market-data";

export type LiquidSummary = {
  cashUsd: number;
  stablecoins: number;
  crypto: number;
  realEstate: number;
  liquidForInvesting: number;
};

export function buildAnalysisPrompt(
  positions: Position[],
  symbolAnalyses: SymbolAnalysis[],
  liquidSummary: LiquidSummary,
  investmentRules: InvestmentRules,
): string {
  const profileSection = serializeProfileForPrompt(investmentRules);
  const today = new Date().toISOString().slice(0, 10);

  const analysisMap = new Map(symbolAnalyses.map((a) => [a.symbol, a]));
  const positionRows = positions
    .filter(
      (p) =>
        !p.symbol?.toUpperCase().endsWith(".CNT") && (p.positionValue ?? 0) > 0,
    )
    .map((p) => {
      const a = analysisMap.get(p.symbol ?? "");
      const pnlPct =
        p.costBasisPrice && p.markPrice
          ? (((p.markPrice - p.costBasisPrice) / p.costBasisPrice) * 100).toFixed(1)
          : "N/A";
      const signal = a?.signal;
      const fund = a?.fundamentals;
      const trendLabel = signal
        ? signal.trendUp
          ? signal.lastCross === 1
            ? "BULLISH CROSS"
            : "UPTREND"
          : signal.lastCross === -1
            ? "BEARISH CROSS"
            : "DOWNTREND"
        : "N/A";

      return [
        `Symbol: ${p.symbol}`,
        `  ISIN: ${p.isin ?? "N/A"} | Currency: ${p.currency ?? "N/A"} | Category: ${p.assetCategory ?? "N/A"}/${p.subCategory ?? "N/A"} | Country: ${p.issuerCountryCode ?? "N/A"}`,
        `  Position: ${p.position?.toFixed(4) ?? "N/A"} units | Mark price: ${p.markPrice?.toFixed(2) ?? "N/A"} | Market value: ${p.positionValue?.toFixed(2) ?? "N/A"} ${p.currency ?? ""}`,
        `  Cost basis: ${p.costBasisPrice?.toFixed(4) ?? "N/A"} | P&L: ${pnlPct}%`,
        signal
          ? `  Technical (monthly): ${trendLabel} | EMA6=${signal.ema6.toFixed(2)} EMA10=${signal.ema10.toFixed(2)} | RSI14=${signal.rsi14.toFixed(1)} | Last close: ${signal.closeAdj.toFixed(2)} (${signal.lastMonthEnd})`
          : "  Technical: no data",
        fund && (fund.sector || fund.pe)
          ? `  Fundamental: Sector=${fund.sector ?? "N/A"} | Industry=${fund.industry ?? "N/A"} | P/E=${fund.pe?.toFixed(1) ?? "N/A"} | Fwd P/E=${fund.forwardPe?.toFixed(1) ?? "N/A"} | Rev growth=${fund.revenueGrowth != null ? (fund.revenueGrowth * 100).toFixed(1) + "%" : "N/A"} | Margins=${fund.profitMargins != null ? (fund.profitMargins * 100).toFixed(1) + "%" : "N/A"}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    });

  const totalInvested = positions.reduce((s, p) => s + (p.positionValue ?? 0), 0);
  const totalPortfolio =
    totalInvested +
    liquidSummary.cashUsd +
    liquidSummary.stablecoins +
    liquidSummary.crypto +
    liquidSummary.realEstate;

  return `
Today's date: ${today}
Analysis type: Monthly portfolio review (first business day of the month)

${profileSection}

---
CURRENT PORTFOLIO SUMMARY:
- Invested in stocks/ETFs (IB): ~$${totalInvested.toFixed(0)} USD
- Liquid for investing (broker cash): ~$${liquidSummary.liquidForInvesting.toFixed(0)} USD
- Cash (idle): ~$${liquidSummary.cashUsd.toFixed(0)} USD
- Stablecoins: ~$${liquidSummary.stablecoins.toFixed(0)} USD
- Crypto (off-exchange): ~$${liquidSummary.crypto.toFixed(0)} USD
- Real estate / other illiquid: ~$${liquidSummary.realEstate.toFixed(0)} USD
- TOTAL PORTFOLIO: ~$${totalPortfolio.toFixed(0)} USD

---
CURRENT POSITIONS (${positions.filter((p) => (p.positionValue ?? 0) > 0).length} holdings):

${positionRows.join("\n\n")}

---
TASK: Perform the monthly portfolio review. Use BOTH technical analysis (EMA signals, RSI) AND fundamental analysis as inputs.

Please generate a structured analysis with the following sections:

A) BEARISH CANDIDATES: List any holdings showing bearish signals (downtrend, bearish cross, broken support, or deteriorating fundamentals) that should be considered for liquidation. For each: provide reason (technical + fundamental), key level, exit trigger, estimated exit cost, and a replacement alternative.

B1) ALLOCATION DIAGNOSIS: Diagnose current allocation vs targets. Provide:
  - Table by asset class (current % vs target min-max, status: OK/UNDERWEIGHT/OVERWEIGHT)
  - Table by geographic region
  - Table by sector

B2) SELL / HOLD / WATCH LIST: For each position provide: action (SELL/HOLD/WATCH), technical reason, key level, exit trigger (if any), estimated cost to exit.

B3) TOP 5 INVESTMENT DESTINATIONS: Best 5 instruments to deploy the $${liquidSummary.liquidForInvesting.toFixed(0)} available cash. For each: ticker, name, suggested % allocation, role (growth/defensive/hedge), risk level (1-5), liquidity (high/medium/low), TER/fee if known, entry plan (DCA vs limit), and investment thesis (technical + fundamental).

B4) TWO SCENARIOS:
  - "Invest today": allocate the cash now per B3 recommendations
  - "Wait": conditions/levels to watch before entering, risk of waiting too long

Be specific with price levels and percentages. Reference the investor's constraints throughout.
`.trim();
}
