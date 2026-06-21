import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  canEditInvestmentProfile,
  canEditLiquidAssets,
  canRequestReview,
  canUploadSnapshots,
  getAccessRedirectPath,
  isAdminPath,
  isDeniedPath,
  isSettingsPath,
  isWaitingPath,
  shouldRedirectToDenied,
  shouldRedirectToWaiting,
} from "@/lib/access";

describe("access", () => {
  it("detects path prefixes", () => {
    expect(isSettingsPath("/settings/investment-profile")).toBe(true);
    expect(isWaitingPath("/waiting")).toBe(true);
    expect(isDeniedPath("/denied")).toBe(true);
    expect(isAdminPath("/admin/profile-chips")).toBe(true);
  });

  it("allows active users everywhere", () => {
    expect(canAccessPath("/reviews", "active", "user")).toBe(true);
    expect(canUploadSnapshots("active")).toBe(true);
    expect(canRequestReview("active")).toBe(true);
  });

  it("restricts pending users", () => {
    expect(canAccessPath("/reviews", "pending", "user")).toBe(false);
    expect(canAccessPath("/", "pending", "user")).toBe(true);
    expect(canAccessPath("/settings/investment-profile", "pending", "user")).toBe(
      true,
    );
    expect(canEditInvestmentProfile("pending")).toBe(true);
    expect(canUploadSnapshots("pending")).toBe(false);
  });

  it("restricts denied users to denied page", () => {
    expect(canAccessPath("/reviews", "denied", "user")).toBe(false);
    expect(canAccessPath("/denied", "denied", "user")).toBe(true);
    expect(shouldRedirectToDenied("/reviews", "denied")).toBe(true);
  });

  it("allows paused users read-only areas", () => {
    expect(canAccessPath("/reviews", "paused", "user")).toBe(true);
    expect(canAccessPath("/portfolio/upload", "paused", "user")).toBe(false);
    expect(canEditLiquidAssets("paused")).toBe(true);
    expect(canRequestReview("paused")).toBe(false);
  });

  it("allows admins on admin paths regardless of status", () => {
    expect(canAccessPath("/admin", "pending", "admin")).toBe(true);
  });

  it("returns redirect targets", () => {
    expect(getAccessRedirectPath("/reviews", "pending", "user")).toBe("/waiting");
    expect(getAccessRedirectPath("/reviews", "denied", "user")).toBe("/denied");
    expect(getAccessRedirectPath("/portfolio/upload", "paused", "user")).toBe("/");
    expect(getAccessRedirectPath("/", "active", "user")).toBeNull();
  });

  it("flags pending redirect to waiting", () => {
    expect(shouldRedirectToWaiting("/reviews", "pending")).toBe(true);
    expect(shouldRedirectToWaiting("/settings", "pending")).toBe(false);
  });
});
