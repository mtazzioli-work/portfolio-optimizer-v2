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

describe("investment profile editing text", () => {
  it("detects whether a profile has saved editor text", () => {
    expect(hasSavedProfileEditorText(undefined)).toBe(false);
    expect(hasSavedProfileEditorText({ profileEditorText: "" })).toBe(false);
    expect(hasSavedProfileEditorText({ profileEditorText: "   \n" })).toBe(false);
    expect(hasSavedProfileEditorText({ profileEditorText: "Mi perfil" })).toBe(true);
  });

  it("uses saved editor text before serialized defaults", () => {
    expect(
      getProfileEditorText({ profileEditorText: "  Perfil custom  " }, DEFAULT_INVESTMENT_PROFILE),
    ).toBe("  Perfil custom  ");

    const fallback = getProfileEditorText({}, DEFAULT_INVESTMENT_PROFILE);
    expect(fallback).toContain("PERFIL DE INVERSIÓN");
    expect(fallback).toContain("Riesgo: moderate");
  });

  it("identifies profiles that define their own review output format", () => {
    expect(profileDefinesOutputFormat("B.1) Diagnóstico de asignación")).toBe(true);
    expect(profileDefinesOutputFormat("b.2) vender / mantener / observar")).toBe(true);
    expect(profileDefinesOutputFormat("## Resultado esperado")).toBe(true);
    expect(profileDefinesOutputFormat("Solo reglas de riesgo")).toBe(false);
  });

  it("round-trips serialized defaults through the parser", () => {
    const serialized = serializeProfileForEditing(DEFAULT_INVESTMENT_PROFILE);
    const parsed = parseProfileFromEditing(serialized, DEFAULT_INVESTMENT_PROFILE);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules).toMatchObject({
        riskProfile: "moderate",
        objective: "growth",
        rebalancingPolicy: "quarterly",
        maxPortfolioDrawdown: 0.1,
        maxPositionLoss: 0.3,
      });
      expect(parsed.rules.targetAllocation.equityEtf).toEqual({ min: 0.5, max: 0.65 });
      expect(parsed.rules.allowedInstruments).toContain("US ETFs");
    }
  });

  it("rejects invalid enum values but preserves base values for omitted fields", () => {
    expect(parseProfileFromEditing("Riesgo: reckless", DEFAULT_INVESTMENT_PROFILE)).toEqual({
      ok: false,
      error: "Riesgo inválido. Usá: conservative, moderate o aggressive.",
    });
    expect(parseProfileFromEditing("Objetivo: speculation", DEFAULT_INVESTMENT_PROFILE)).toEqual({
      ok: false,
      error: "Objetivo inválido. Usá: growth, income o balanced.",
    });
    expect(parseProfileFromEditing("REBALANCEO: daily", DEFAULT_INVESTMENT_PROFILE)).toEqual({
      ok: false,
      error: "Rebalanceo inválido. Usá: monthly, quarterly, semi-annual o annual.",
    });

    const parsed = parseProfileFromEditing("Horizonte: 10 años", DEFAULT_INVESTMENT_PROFILE);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rules.horizon).toBe("10 años");
      expect(parsed.rules.riskProfile).toBe(DEFAULT_INVESTMENT_PROFILE.riskProfile);
    }
  });

  it("strips profileEditorText when converting to investment rules", () => {
    expect(
      toInvestmentRules({
        ...DEFAULT_INVESTMENT_PROFILE,
        profileEditorText: "texto guardado",
      }),
    ).not.toHaveProperty("profileEditorText");
  });
});
