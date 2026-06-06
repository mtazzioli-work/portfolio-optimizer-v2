import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVESTMENT_PROFILE,
  serializeProfileForPrompt,
} from "@/lib/default-investment-profile";

describe("default investment profile", () => {
  it("serializes the default rules into the prompt contract used by reviews", () => {
    const prompt = serializeProfileForPrompt(DEFAULT_INVESTMENT_PROFILE);

    expect(prompt).toContain("INVESTOR PROFILE & CONSTRAINTS:");
    expect(prompt).toContain(
      "- Risk profile: moderate | Objective: growth | Horizon: 3-5 years",
    );
    expect(prompt).toContain("- Max portfolio drawdown from peak: 10%");
    expect(prompt).toContain("- Equity / ETFs: 50–65%");
    expect(prompt).toContain("REBALANCING: quarterly");
    expect(prompt).toContain(
      "ADDITIONAL NOTES: Customize allocation targets, constraints, and notes in Settings before running analysis.",
    );
  });
});
