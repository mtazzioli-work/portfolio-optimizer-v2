import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  canEditInvestmentProfile,
  canEditLiquidAssets,
  canRequestReview,
  canUploadSnapshots,
  isAdminPath,
  isDeniedPath,
  isSettingsPath,
  isWaitingPath,
  shouldRedirectToDenied,
  shouldRedirectToWaiting,
} from "@/lib/access";

describe("access path helpers", () => {
  it("recognizes guarded route groups", () => {
    expect(isSettingsPath("/settings")).toBe(true);
    expect(isSettingsPath("/settings/investment-profile")).toBe(true);
    expect(isSettingsPath("/settings-other")).toBe(false);
    expect(isWaitingPath("/waiting/review")).toBe(true);
    expect(isDeniedPath("/denied")).toBe(true);
    expect(isAdminPath("/admin/profile-chips")).toBe(true);
  });

  it("allows active users everywhere and admins into admin routes", () => {
    expect(canAccessPath("/portfolio/upload", "active", "user")).toBe(true);
    expect(canAccessPath("/admin", "pending", "admin")).toBe(true);
    expect(canAccessPath("/admin", "active", "user")).toBe(true);
  });

  it("restricts pending, denied, and paused users to their allowed surfaces", () => {
    expect(canAccessPath("/waiting", "pending", "user")).toBe(true);
    expect(canAccessPath("/settings/investment-profile", "pending", "user")).toBe(true);
    expect(canAccessPath("/reviews", "pending", "user")).toBe(false);

    expect(canAccessPath("/denied", "denied", "user")).toBe(true);
    expect(canAccessPath("/settings", "denied", "user")).toBe(false);

    expect(canAccessPath("/history/abc", "paused", "user")).toBe(true);
    expect(canAccessPath("/reviews/abc", "paused", "user")).toBe(true);
    expect(canAccessPath("/portfolio/upload", "paused", "user")).toBe(false);
  });

  it("gates actions by access status", () => {
    expect(canUploadSnapshots("active")).toBe(true);
    expect(canUploadSnapshots("paused")).toBe(false);
    expect(canRequestReview("active")).toBe(true);
    expect(canRequestReview("pending")).toBe(false);

    for (const status of ["active", "pending", "paused"] as const) {
      expect(canEditInvestmentProfile(status)).toBe(true);
      expect(canEditLiquidAssets(status)).toBe(true);
    }
    expect(canEditInvestmentProfile("denied")).toBe(false);
    expect(canEditLiquidAssets("denied")).toBe(false);
  });

  it("computes waiting and denied redirects", () => {
    expect(shouldRedirectToWaiting("/reviews", "pending")).toBe(true);
    expect(shouldRedirectToWaiting("/settings", "pending")).toBe(false);
    expect(shouldRedirectToWaiting("/reviews", "active")).toBe(false);

    expect(shouldRedirectToDenied("/reviews", "denied")).toBe(true);
    expect(shouldRedirectToDenied("/denied", "denied")).toBe(false);
    expect(shouldRedirectToDenied("/reviews", "paused")).toBe(false);
  });
});
