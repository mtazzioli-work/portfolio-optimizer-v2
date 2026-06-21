import { describe, expect, it } from "vitest";
import {
  getTemplateById,
  INVESTMENT_PROFILE_TEMPLATES,
} from "@/lib/investment-profile-templates";

describe("investment-profile-templates", () => {
  it("lists templates", () => {
    expect(INVESTMENT_PROFILE_TEMPLATES.length).toBe(3);
  });

  it("finds template by id", () => {
    expect(getTemplateById("moderate")?.name).toBe("Moderado");
    expect(getTemplateById("conservative")?.rules.riskProfile).toBe(
      "conservative",
    );
    expect(getTemplateById("invalid" as never)).toBeUndefined();
  });
});
