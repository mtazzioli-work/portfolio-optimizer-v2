import { describe, expect, it } from "vitest";
import {
  INVESTMENT_PROFILE_REQUIRED_ERROR,
  INVESTMENT_PROFILE_SETTINGS_PATH,
} from "@/lib/investment-profile-messages";

describe("investment-profile-messages", () => {
  it("exports constants", () => {
    expect(INVESTMENT_PROFILE_REQUIRED_ERROR).toContain("perfil de inversión");
    expect(INVESTMENT_PROFILE_SETTINGS_PATH).toBe(
      "/settings/investment-profile",
    );
  });
});
