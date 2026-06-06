import { describe, expect, it } from "vitest";
import {
  getTemplateById,
  INVESTMENT_PROFILE_TEMPLATES,
} from "@/lib/investment-profile-templates";

describe("investment profile templates", () => {
  it("exposes exactly one template for each supported profile", () => {
    expect(INVESTMENT_PROFILE_TEMPLATES.map((template) => template.id)).toEqual([
      "conservative",
      "moderate",
      "aggressive",
    ]);
  });

  it.each(INVESTMENT_PROFILE_TEMPLATES)(
    "keeps %s allocation ranges internally valid",
    (template) => {
      expect(template.name).toBeTruthy();
      expect(template.summary).toBeTruthy();
      expect(template.rules.riskProfile).toBe(template.id);
      expect(template.rules.maxPortfolioDrawdown).toBeGreaterThanOrEqual(0);

      for (const range of Object.values(template.rules.targetAllocation)) {
        expect(range.min).toBeGreaterThanOrEqual(0);
        expect(range.max).toBeGreaterThanOrEqual(range.min);
        expect(range.max).toBeLessThanOrEqual(1);
      }
    },
  );

  it("finds a template by id", () => {
    expect(getTemplateById("aggressive")?.name).toBe("Agresivo");
  });

  it("returns undefined for an unknown id", () => {
    expect(getTemplateById("unknown" as "moderate")).toBeUndefined();
  });
});
