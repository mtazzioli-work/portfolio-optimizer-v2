import {
  DEFAULT_INVESTMENT_PROFILE,
  type InvestmentRules,
} from "@/lib/default-investment-profile";

export type ProfileTemplateId = "conservative" | "moderate" | "aggressive";

export type ProfileTemplate = {
  id: ProfileTemplateId;
  name: string;
  summary: string;
  rules: InvestmentRules;
};

const COMMON: Pick<
  InvestmentRules,
  | "geoDiversification"
  | "allowedInstruments"
  | "prohibitedInstruments"
  | "technicalRules"
  | "taxJurisdiction"
  | "accountType"
> = {
  geoDiversification: ["USA", "EU", "LatAm", "Other"],
  allowedInstruments: [
    "ETFs UCITS",
    "US ETFs",
    "commodities ETFs",
    "precious metals ETFs",
    "T-bills",
    "IG bonds ETFs",
  ],
  prohibitedInstruments: [
    "short selling",
    "High Yield bonds",
    "options",
    "leverage",
    "margin",
  ],
  technicalRules: {
    primaryTimeframe: "monthly",
    trendRule: "EMA(6) vs EMA(10) on monthly close",
    trigger: "month-end candle close",
    entryStrategy: "DCA by tranches 25%/25%/50% at limit orders",
  },
  taxJurisdiction: "Your country",
  accountType: "Cash brokerage account",
};

export const INVESTMENT_PROFILE_TEMPLATES: ProfileTemplate[] = [
  {
    id: "conservative",
    name: "Conservador",
    summary:
      "Preservación e ingreso. Menor drawdown, más bonos y liquidez, poco crypto.",
    rules: {
      ...COMMON,
      riskProfile: "conservative",
      horizon: "5+ years",
      objective: "income",
      maxPortfolioDrawdown: 0.08,
      maxPositionLoss: 0.2,
      targetAllocation: {
        equityEtf: { min: 0.35, max: 0.5 },
        bondsIG: { min: 0.25, max: 0.35 },
        commodities: { min: 0.05, max: 0.15 },
        crypto: { min: 0, max: 0.05 },
        liquidity: { min: 0.15, max: 0.25 },
      },
      rebalancingPolicy: "semi-annual",
      notes:
        "Plantilla conservadora: prioriza preservación de capital y flujo de ingreso.",
    },
  },
  {
    id: "moderate",
    name: "Moderado",
    summary:
      "Crecimiento balanceado (default v1). Asignación equilibrada y rebalanceo trimestral.",
    rules: {
      ...DEFAULT_INVESTMENT_PROFILE,
      ...COMMON,
      notes:
        "Plantilla moderada: equilibrio entre crecimiento y estabilidad (perfil default v1).",
    },
  },
  {
    id: "aggressive",
    name: "Agresivo",
    summary:
      "Crecimiento con mayor tolerancia al riesgo. Más equity y crypto, menos liquidez.",
    rules: {
      ...COMMON,
      riskProfile: "aggressive",
      horizon: "3+ years",
      objective: "growth",
      maxPortfolioDrawdown: 0.15,
      maxPositionLoss: 0.35,
      targetAllocation: {
        equityEtf: { min: 0.65, max: 0.8 },
        bondsIG: { min: 0.05, max: 0.15 },
        commodities: { min: 0.05, max: 0.15 },
        crypto: { min: 0, max: 0.25 },
        liquidity: { min: 0.05, max: 0.1 },
      },
      rebalancingPolicy: "quarterly",
      notes:
        "Plantilla agresiva: mayor exposición a equity y crypto; drawdown máximo más alto.",
    },
  },
];

export function getTemplateById(
  id: ProfileTemplateId,
): ProfileTemplate | undefined {
  return INVESTMENT_PROFILE_TEMPLATES.find((t) => t.id === id);
}
