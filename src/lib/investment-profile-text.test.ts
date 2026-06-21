import { describe, expect, it } from "vitest";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";
import {
  getProfileEditorText,
  hasSavedProfileEditorText,
  parseProfileFromEditing,
  profileDefinesOutputFormat,
  serializeProfileForEditing,
  toInvestmentRules,
} from "@/lib/investment-profile-text";

describe("investment-profile-text", () => {
  const serialized = serializeProfileForEditing(DEFAULT_INVESTMENT_PROFILE);

  it("serializes default profile", () => {
    expect(serialized).toContain("PERFIL DE INVERSIÓN");
    expect(serialized).toContain("Riesgo: moderate");
  });

  it("parses edited profile text", () => {
    const edited = serialized.replace("Riesgo: moderate", "Riesgo: aggressive");
    const parsed = parseProfileFromEditing(edited, DEFAULT_INVESTMENT_PROFILE);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.riskProfile).toBe("aggressive");
    }
  });

  it("rejects invalid risk profile", () => {
    const edited = serialized.replace("Riesgo: moderate", "Riesgo: invalid");
    const parsed = parseProfileFromEditing(edited, DEFAULT_INVESTMENT_PROFILE);
    expect(parsed.ok).toBe(false);
  });

  it("detects custom output format", () => {
    expect(profileDefinesOutputFormat("Sección B.1) resultado")).toBe(true);
    expect(profileDefinesOutputFormat("perfil simple")).toBe(false);
  });

  it("rejects invalid objective and rebalancing", () => {
    const editedObjective = serialized.replace("Objetivo: growth", "Objetivo: invalid");
    expect(parseProfileFromEditing(editedObjective, DEFAULT_INVESTMENT_PROFILE).ok).toBe(
      false,
    );

    const editedRebalancing = serialized.replace(
      "REBALANCEO: quarterly",
      "REBALANCEO: weekly",
    );
    expect(
      parseProfileFromEditing(editedRebalancing, DEFAULT_INVESTMENT_PROFILE).ok,
    ).toBe(false);
  });

  it("parses drawdown and allocation ranges", () => {
    const edited = serialized
      .replace("Drawdown máximo del portfolio: 10%", "Drawdown máximo del portfolio: 12%")
      .replace("Pérdida máxima por posición: 30%", "Pérdida máxima por posición: 25%")
      .replace(
        "DIVERSIFICACIÓN GEOGRÁFICA: USA, EU, LatAm, Other",
        "DIVERSIFICACIÓN GEOGRÁFICA: USA, EU",
      );

    const parsed = parseProfileFromEditing(edited, DEFAULT_INVESTMENT_PROFILE);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.maxPortfolioDrawdown).toBe(0.12);
      expect(parsed.rules.maxPositionLoss).toBe(0.25);
      expect(parsed.rules.geoDiversification).toEqual(["USA", "EU"]);
    }
  });

  it("parses technical rules from profile text", () => {
    const edited = serialized
      .replace("- Timeframe principal: monthly", "- Timeframe principal: weekly")
      .replace(
        "- Regla de tendencia: EMA(6) vs EMA(10) on monthly close",
        "- Regla de tendencia: custom trend",
      );

    const parsed = parseProfileFromEditing(edited, DEFAULT_INVESTMENT_PROFILE);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.technicalRules.primaryTimeframe).toBe("weekly");
      expect(parsed.rules.technicalRules.trendRule).toBe("custom trend");
    }
  });

  it("parses notes and instrument lists", () => {
    const edited = serialized
      .replace(
        "INSTRUMENTOS PERMITIDOS: ETFs UCITS, US ETFs, commodities ETFs, precious metals ETFs, T-bills, IG bonds ETFs",
        "INSTRUMENTOS PERMITIDOS: ETFs UCITS, US ETFs",
      )
      .replace(
        "NOTAS ADICIONALES:\nCustomize allocation targets, constraints, and notes in Settings before running analysis.",
        "NOTAS ADICIONALES:\nNota personalizada",
      );

    const parsed = parseProfileFromEditing(edited, DEFAULT_INVESTMENT_PROFILE);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.allowedInstruments).toEqual(["ETFs UCITS", "US ETFs"]);
      expect(parsed.rules.notes).toBe("Nota personalizada");
    }
  });

  it("reads stored editor text", () => {
    const stored = {
      ...DEFAULT_INVESTMENT_PROFILE,
      profileEditorText: "mi texto",
    };
    expect(getProfileEditorText(stored, DEFAULT_INVESTMENT_PROFILE)).toBe(
      "mi texto",
    );
    expect(hasSavedProfileEditorText(stored)).toBe(true);
    expect(toInvestmentRules(stored).riskProfile).toBe("moderate");
  });
});
