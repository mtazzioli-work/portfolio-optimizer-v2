export type InvestmentRules = {
  riskProfile: "conservative" | "moderate" | "aggressive";
  horizon: string;
  objective: "growth" | "income" | "balanced";
  maxPortfolioDrawdown: number;
  maxPositionLoss: number;
  targetAllocation: {
    equityEtf: { min: number; max: number };
    bondsIG: { min: number; max: number };
    commodities: { min: number; max: number };
    crypto: { min: number; max: number };
    liquidity: { min: number; max: number };
  };
  geoDiversification: string[];
  allowedInstruments: string[];
  prohibitedInstruments: string[];
  rebalancingPolicy: "monthly" | "quarterly" | "semi-annual" | "annual";
  technicalRules: {
    primaryTimeframe: string;
    trendRule: string;
    trigger: string;
    entryStrategy: string;
  };
  taxJurisdiction: string;
  accountType: string;
  notes: string;
};

export const DEFAULT_INVESTMENT_PROFILE: InvestmentRules = {
  riskProfile: "moderate",
  horizon: "3-5 years",
  objective: "growth",
  maxPortfolioDrawdown: 0.10,
  maxPositionLoss: 0.30,
  targetAllocation: {
    equityEtf: { min: 0.50, max: 0.65 },
    bondsIG: { min: 0.15, max: 0.20 },
    commodities: { min: 0.10, max: 0.20 },
    crypto: { min: 0.00, max: 0.20 },
    liquidity: { min: 0.10, max: 0.15 },
  },
  geoDiversification: ["USA", "EU", "LatAm", "Other"],
  allowedInstruments: ["ETFs UCITS", "US ETFs", "commodities ETFs", "precious metals ETFs", "T-bills", "IG bonds ETFs"],
  prohibitedInstruments: ["short selling", "High Yield bonds", "options", "leverage", "margin"],
  rebalancingPolicy: "quarterly",
  technicalRules: {
    primaryTimeframe: "monthly",
    trendRule: "EMA(6) vs EMA(10) on monthly close",
    trigger: "month-end candle close",
    entryStrategy: "DCA by tranches 25%/25%/50% at limit orders",
  },
  taxJurisdiction: "Your country",
  accountType: "Cash brokerage account",
  notes: "Customize allocation targets, constraints, and notes in Settings before running analysis.",
};

export function serializeProfileForPrompt(rules: InvestmentRules): string {
  return `
INVESTOR PROFILE & CONSTRAINTS:
- Risk profile: ${rules.riskProfile} | Objective: ${rules.objective} | Horizon: ${rules.horizon}
- Max portfolio drawdown from peak: ${(rules.maxPortfolioDrawdown * 100).toFixed(0)}%
- Max loss per position from entry: ${(rules.maxPositionLoss * 100).toFixed(0)}%
- Tax jurisdiction: ${rules.taxJurisdiction} | Account type: ${rules.accountType}

TARGET ALLOCATION (% of total portfolio):
- Equity / ETFs: ${(rules.targetAllocation.equityEtf.min * 100).toFixed(0)}–${(rules.targetAllocation.equityEtf.max * 100).toFixed(0)}%
- IG Bonds / T-bills: ${(rules.targetAllocation.bondsIG.min * 100).toFixed(0)}–${(rules.targetAllocation.bondsIG.max * 100).toFixed(0)}%
- Commodities / Metals: ${(rules.targetAllocation.commodities.min * 100).toFixed(0)}–${(rules.targetAllocation.commodities.max * 100).toFixed(0)}%
- Crypto: max ${(rules.targetAllocation.crypto.max * 100).toFixed(0)}%
- Liquidity (cash/stablecoins): ${(rules.targetAllocation.liquidity.min * 100).toFixed(0)}–${(rules.targetAllocation.liquidity.max * 100).toFixed(0)}%

GEOGRAPHIC DIVERSIFICATION: ${rules.geoDiversification.join(", ")}

ALLOWED INSTRUMENTS: ${rules.allowedInstruments.join(", ")}
PROHIBITED INSTRUMENTS: ${rules.prohibitedInstruments.join(", ")}

REBALANCING: ${rules.rebalancingPolicy}

TECHNICAL ANALYSIS RULES:
- Primary timeframe: ${rules.technicalRules.primaryTimeframe}
- Trend rule: ${rules.technicalRules.trendRule}
- Entry trigger: ${rules.technicalRules.trigger}
- Entry strategy: ${rules.technicalRules.entryStrategy}

ADDITIONAL NOTES: ${rules.notes}
`.trim();
}
