import { describe, expect, it } from "vitest";
import {
  getProfileEditorText,
  parseProfileFromEditing,
  serializeProfileForEditing,
  toInvestmentRules,
} from "@/lib/investment-profile-text";
import {
  DEFAULT_INVESTMENT_PROFILE,
} from "@/lib/default-investment-profile";

describe("investment profile editor text", () => {
  it("round-trips serialized rules through the editable text format", () => {
    const text = serializeProfileForEditing(DEFAULT_INVESTMENT_PROFILE);
    const parsed = parseProfileFromEditing(text, DEFAULT_INVESTMENT_PROFILE);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules).toEqual(DEFAULT_INVESTMENT_PROFILE);
    }
  });

  it("merges partial edits with the base profile", () => {
    const parsed = parseProfileFromEditing(
      [
        "Riesgo: conservative",
        "Objetivo: income",
        "Horizonte: 10+ years",
        "NOTAS ADICIONALES:",
        "Prefer capital preservation.",
      ].join("\n"),
      DEFAULT_INVESTMENT_PROFILE,
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules).toMatchObject({
        riskProfile: "conservative",
        objective: "income",
        horizon: "10+ years",
        notes: "Prefer capital preservation.",
      });
      expect(parsed.rules.targetAllocation).toEqual(
        DEFAULT_INVESTMENT_PROFILE.targetAllocation,
      );
      expect(parsed.rules.rebalancingPolicy).toBe(
        DEFAULT_INVESTMENT_PROFILE.rebalancingPolicy,
      );
    }
  });

  it("accepts percentages with and without percent signs and both range separators", () => {
    const parsed = parseProfileFromEditing(
      [
        "Drawdown máximo del portfolio: 12.5",
        "Pérdida máxima por posición: 35%",
        "- Equity / ETFs: 45 - 55",
        "- Bonos IG / T-bills: 20%–30%",
        "- Commodities / Metales: 5-10",
        "- Crypto: 0%–5%",
        "- Liquidez (efectivo/stablecoins): 10 - 15",
      ].join("\n"),
      DEFAULT_INVESTMENT_PROFILE,
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.maxPortfolioDrawdown).toBe(0.125);
      expect(parsed.rules.maxPositionLoss).toBe(0.35);
      expect(parsed.rules.targetAllocation).toEqual({
        equityEtf: { min: 0.45, max: 0.55 },
        bondsIG: { min: 0.2, max: 0.3 },
        commodities: { min: 0.05, max: 0.1 },
        crypto: { min: 0, max: 0.05 },
        liquidity: { min: 0.1, max: 0.15 },
      });
    }
  });

  it.each([
    [
      "Riesgo: speculative",
      "Riesgo inválido. Usá: conservative, moderate o aggressive.",
    ],
    [
      "Objetivo: speculation",
      "Objetivo inválido. Usá: growth, income o balanced.",
    ],
    [
      "REBALANCEO: weekly",
      "Rebalanceo inválido. Usá: monthly, quarterly, semi-annual o annual.",
    ],
  ])("returns a helpful parse error for %s", (text, error) => {
    expect(parseProfileFromEditing(text, DEFAULT_INVESTMENT_PROFILE)).toEqual({
      ok: false,
      error,
    });
  });

  it("parses list and technical-rule edits", () => {
    const parsed = parseProfileFromEditing(
      [
        "DIVERSIFICACIÓN GEOGRÁFICA: USA, EU, Japan",
        "INSTRUMENTOS PERMITIDOS: ETFs, T-bills",
        "INSTRUMENTOS PROHIBIDOS: leverage, options",
        "- Timeframe principal: weekly",
        "- Regla de tendencia: price above SMA(20)",
        "- Disparador de entrada: weekly close",
        "- Estrategia de entrada: single tranche",
      ].join("\n"),
      DEFAULT_INVESTMENT_PROFILE,
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.geoDiversification).toEqual(["USA", "EU", "Japan"]);
      expect(parsed.rules.allowedInstruments).toEqual(["ETFs", "T-bills"]);
      expect(parsed.rules.prohibitedInstruments).toEqual([
        "leverage",
        "options",
      ]);
      expect(parsed.rules.technicalRules).toEqual({
        primaryTimeframe: "weekly",
        trendRule: "price above SMA(20)",
        trigger: "weekly close",
        entryStrategy: "single tranche",
      });
    }
  });

  it("prefers persisted editor text when it is non-empty", () => {
    expect(
      getProfileEditorText(
        { ...DEFAULT_INVESTMENT_PROFILE, profileEditorText: "Custom text" },
        DEFAULT_INVESTMENT_PROFILE,
      ),
    ).toBe("Custom text");
  });

  it("falls back to serialized rules when persisted editor text is absent or blank", () => {
    expect(
      getProfileEditorText(
        { ...DEFAULT_INVESTMENT_PROFILE, profileEditorText: "   " },
        DEFAULT_INVESTMENT_PROFILE,
      ),
    ).toBe(serializeProfileForEditing(DEFAULT_INVESTMENT_PROFILE));
  });

  it("removes profileEditorText before sending rules to downstream review code", () => {
    const stored = {
      ...DEFAULT_INVESTMENT_PROFILE,
      profileEditorText: "Editable copy",
    };

    const rules = toInvestmentRules(stored);

    expect(rules).toEqual(DEFAULT_INVESTMENT_PROFILE);
    expect(rules).not.toHaveProperty("profileEditorText");
  });

  it("preserves base values when malformed optional percentage fields are edited", () => {
    const parsed = parseProfileFromEditing(
      [
        "Drawdown máximo del portfolio: not a percent",
        "- Equity / ETFs: invalid",
      ].join("\n"),
      DEFAULT_INVESTMENT_PROFILE,
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.maxPortfolioDrawdown).toBe(
        DEFAULT_INVESTMENT_PROFILE.maxPortfolioDrawdown,
      );
      expect(parsed.rules.targetAllocation.equityEtf).toEqual(
        DEFAULT_INVESTMENT_PROFILE.targetAllocation.equityEtf,
      );
    }
  });
});
