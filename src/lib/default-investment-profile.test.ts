import { describe, expect, it } from "vitest";
import { serializeProfileForPrompt } from "@/lib/default-investment-profile";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";

describe("default-investment-profile", () => {
  it("serializes profile for prompt", () => {
    const text = serializeProfileForPrompt(DEFAULT_INVESTMENT_PROFILE);
    expect(text).toContain("INVESTOR PROFILE");
    expect(text).toContain("moderate");
    expect(text).toContain("quarterly");
  });
});
