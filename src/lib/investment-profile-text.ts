import type { InvestmentRules } from "@/lib/default-investment-profile";

export type StoredInvestmentProfile = InvestmentRules & {
  profileEditorText?: string;
};

export function getProfileEditorText(
  stored: unknown,
  rules: InvestmentRules,
): string {
  const profileEditorText = (stored as StoredInvestmentProfile | undefined)
    ?.profileEditorText;
  if (typeof profileEditorText === "string" && profileEditorText.trim()) {
    return profileEditorText;
  }
  return serializeProfileForEditing(rules);
}

export function toInvestmentRules(stored: unknown): InvestmentRules {
  const { profileEditorText: _, ...rules } = stored as StoredInvestmentProfile;
  return rules;
}

export function hasSavedProfileEditorText(stored: unknown): boolean {
  const profileEditorText = (stored as StoredInvestmentProfile | undefined)
    ?.profileEditorText;
  return typeof profileEditorText === "string" && profileEditorText.trim().length > 0;
}

export function profileDefinesOutputFormat(text: string): boolean {
  return /B\.1\)|B\.2\)|RESULTADO ESPERADO|Resultado esperado/i.test(text);
}

export function serializeProfileForEditing(rules: InvestmentRules): string {
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
  const range = (min: number, max: number) => `${pct(min)}–${pct(max)}`;

  return `PERFIL DE INVERSIÓN

Riesgo: ${rules.riskProfile}
Objetivo: ${rules.objective}
Horizonte: ${rules.horizon}
Drawdown máximo del portfolio: ${pct(rules.maxPortfolioDrawdown)}
Pérdida máxima por posición: ${pct(rules.maxPositionLoss)}
Jurisdicción fiscal: ${rules.taxJurisdiction}
Tipo de cuenta: ${rules.accountType}

ASIGNACIÓN OBJETIVO (% del portfolio total)
- Equity / ETFs: ${range(rules.targetAllocation.equityEtf.min, rules.targetAllocation.equityEtf.max)}
- Bonos IG / T-bills: ${range(rules.targetAllocation.bondsIG.min, rules.targetAllocation.bondsIG.max)}
- Commodities / Metales: ${range(rules.targetAllocation.commodities.min, rules.targetAllocation.commodities.max)}
- Crypto: ${range(rules.targetAllocation.crypto.min, rules.targetAllocation.crypto.max)}
- Liquidez (efectivo/stablecoins): ${range(rules.targetAllocation.liquidity.min, rules.targetAllocation.liquidity.max)}

DIVERSIFICACIÓN GEOGRÁFICA: ${rules.geoDiversification.join(", ")}

INSTRUMENTOS PERMITIDOS: ${rules.allowedInstruments.join(", ")}

INSTRUMENTOS PROHIBIDOS: ${rules.prohibitedInstruments.join(", ")}

REBALANCEO: ${rules.rebalancingPolicy}

REGLAS TÉCNICAS
- Timeframe principal: ${rules.technicalRules.primaryTimeframe}
- Regla de tendencia: ${rules.technicalRules.trendRule}
- Disparador de entrada: ${rules.technicalRules.trigger}
- Estrategia de entrada: ${rules.technicalRules.entryStrategy}

NOTAS ADICIONALES:
${rules.notes}`.trim();
}

function parsePercent(value: string): number | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*%?$/);
  if (!match) return null;
  return Number(match[1]) / 100;
}

function parseRange(value: string): { min: number; max: number } | null {
  const parts = value.split(/[–-]/).map((p) => p.trim());
  if (parts.length !== 2) return null;
  const min = parsePercent(parts[0]);
  const max = parsePercent(parts[1]);
  if (min === null || max === null) return null;
  return { min, max };
}

function parseLabeledLine(
  text: string,
  label: string,
): string | null {
  const re = new RegExp(`^${label}:\\s*(.+)$`, "im");
  const match = text.match(re);
  return match?.[1]?.trim() ?? null;
}

function parseBulletRange(
  text: string,
  label: string,
): { min: number; max: number } | null {
  const re = new RegExp(`^- ${label}:\\s*(.+)$`, "im");
  const match = text.match(re);
  if (!match) return null;
  return parseRange(match[1]);
}

function parseListLine(text: string, label: string): string[] | null {
  const value = parseLabeledLine(text, label);
  if (!value) return null;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const RISK_PROFILES = new Set<InvestmentRules["riskProfile"]>([
  "conservative",
  "moderate",
  "aggressive",
]);

const OBJECTIVES = new Set<InvestmentRules["objective"]>([
  "growth",
  "income",
  "balanced",
]);

const REBALANCING = new Set<InvestmentRules["rebalancingPolicy"]>([
  "monthly",
  "quarterly",
  "semi-annual",
  "annual",
]);

export type ProfileParseResult =
  | { ok: true; rules: InvestmentRules }
  | { ok: false; error: string };

export function parseProfileFromEditing(
  text: string,
  base: InvestmentRules,
): ProfileParseResult {
  const riskProfile = parseLabeledLine(text, "Riesgo");
  if (riskProfile && !RISK_PROFILES.has(riskProfile as InvestmentRules["riskProfile"])) {
    return { ok: false, error: "Riesgo inválido. Usá: conservative, moderate o aggressive." };
  }

  const objective = parseLabeledLine(text, "Objetivo");
  if (objective && !OBJECTIVES.has(objective as InvestmentRules["objective"])) {
    return { ok: false, error: "Objetivo inválido. Usá: growth, income o balanced." };
  }

  const rebalancing = parseLabeledLine(text, "REBALANCEO");
  if (
    rebalancing &&
    !REBALANCING.has(rebalancing as InvestmentRules["rebalancingPolicy"])
  ) {
    return {
      ok: false,
      error: "Rebalanceo inválido. Usá: monthly, quarterly, semi-annual o annual.",
    };
  }

  const maxPortfolioDrawdown = parseLabeledLine(text, "Drawdown máximo del portfolio");
  const maxPositionLoss = parseLabeledLine(text, "Pérdida máxima por posición");

  const equityEtf = parseBulletRange(text, "Equity / ETFs");
  const bondsIG = parseBulletRange(text, "Bonos IG / T-bills");
  const commodities = parseBulletRange(text, "Commodities / Metales");
  const crypto = parseBulletRange(text, "Crypto");
  const liquidity = parseBulletRange(text, "Liquidez \\(efectivo/stablecoins\\)");

  const geo = parseListLine(text, "DIVERSIFICACIÓN GEOGRÁFICA");
  const allowed = parseListLine(text, "INSTRUMENTOS PERMITIDOS");
  const prohibited = parseListLine(text, "INSTRUMENTOS PROHIBIDOS");

  const notesMatch = text.match(/NOTAS ADICIONALES:\s*([\s\S]*)$/i);
  const notes = notesMatch ? notesMatch[1].trim() : base.notes;

  const rules: InvestmentRules = {
    ...base,
    riskProfile: (riskProfile as InvestmentRules["riskProfile"]) ?? base.riskProfile,
    objective: (objective as InvestmentRules["objective"]) ?? base.objective,
    horizon: parseLabeledLine(text, "Horizonte") ?? base.horizon,
    maxPortfolioDrawdown: maxPortfolioDrawdown
      ? (parsePercent(maxPortfolioDrawdown) ?? base.maxPortfolioDrawdown)
      : base.maxPortfolioDrawdown,
    maxPositionLoss: maxPositionLoss
      ? (parsePercent(maxPositionLoss) ?? base.maxPositionLoss)
      : base.maxPositionLoss,
    taxJurisdiction:
      parseLabeledLine(text, "Jurisdicción fiscal") ?? base.taxJurisdiction,
    accountType: parseLabeledLine(text, "Tipo de cuenta") ?? base.accountType,
    targetAllocation: {
      equityEtf: equityEtf ?? base.targetAllocation.equityEtf,
      bondsIG: bondsIG ?? base.targetAllocation.bondsIG,
      commodities: commodities ?? base.targetAllocation.commodities,
      crypto: crypto ?? base.targetAllocation.crypto,
      liquidity: liquidity ?? base.targetAllocation.liquidity,
    },
    geoDiversification: geo ?? base.geoDiversification,
    allowedInstruments: allowed ?? base.allowedInstruments,
    prohibitedInstruments: prohibited ?? base.prohibitedInstruments,
    rebalancingPolicy:
      (rebalancing as InvestmentRules["rebalancingPolicy"]) ??
      base.rebalancingPolicy,
    technicalRules: {
      primaryTimeframe:
        parseLabeledLine(text, "- Timeframe principal") ??
        base.technicalRules.primaryTimeframe,
      trendRule:
        parseLabeledLine(text, "- Regla de tendencia") ??
        base.technicalRules.trendRule,
      trigger:
        parseLabeledLine(text, "- Disparador de entrada") ??
        base.technicalRules.trigger,
      entryStrategy:
        parseLabeledLine(text, "- Estrategia de entrada") ??
        base.technicalRules.entryStrategy,
    },
    notes,
  };

  return { ok: true, rules };
}
