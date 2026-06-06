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
import type { AccessStatus, UserRole } from "@/db/schema";

describe("path classifiers", () => {
  it.each([
    [isSettingsPath, "/settings", true],
    [isSettingsPath, "/settings/investment-profile", true],
    [isSettingsPath, "/settingsx", false],
    [isWaitingPath, "/waiting", true],
    [isWaitingPath, "/waiting/details", true],
    [isWaitingPath, "/wait", false],
    [isDeniedPath, "/denied", true],
    [isDeniedPath, "/denied/reason", true],
    [isDeniedPath, "/deniedx", false],
    [isAdminPath, "/admin", true],
    [isAdminPath, "/admin/users", true],
    [isAdminPath, "/administrator", false],
  ])("%s(%s) returns %s", (fn, pathname, expected) => {
    expect(fn(pathname)).toBe(expected);
  });
});

describe("canAccessPath", () => {
  it.each(["/", "/portfolio/upload", "/settings", "/admin"])(
    "allows active users to access %s",
    (pathname) => {
      expect(canAccessPath(pathname, "active", "user")).toBe(true);
    },
  );

  it.each([
    ["/", true],
    ["/waiting", true],
    ["/waiting/status", true],
    ["/settings", true],
    ["/settings/liquid-assets", true],
    ["/portfolio/upload", false],
    ["/history", false],
    ["/admin", false],
  ])("handles pending access to %s", (pathname, expected) => {
    expect(canAccessPath(pathname, "pending", "user")).toBe(expected);
  });

  it.each([
    ["/denied", true],
    ["/denied/details", true],
    ["/", false],
    ["/settings", false],
    ["/history", false],
  ])("handles denied access to %s", (pathname, expected) => {
    expect(canAccessPath(pathname, "denied", "user")).toBe(expected);
  });

  it.each([
    ["/", true],
    ["/settings/investment-profile", true],
    ["/history", true],
    ["/history/2026-01", true],
    ["/reviews", true],
    ["/reviews/latest", true],
    ["/portfolio/upload", false],
    ["/admin", false],
  ])("handles paused access to %s", (pathname, expected) => {
    expect(canAccessPath(pathname, "paused", "user")).toBe(expected);
  });

  it.each<AccessStatus>(["pending", "active", "denied", "paused"])(
    "allows admins to reach admin routes even when status is %s",
    (status) => {
      expect(canAccessPath("/admin/users", status, "admin")).toBe(true);
    },
  );

  it("rejects unknown access statuses defensively", () => {
    expect(
      canAccessPath("/anything", "unknown" as AccessStatus, "user" as UserRole),
    ).toBe(false);
  });
});

describe("capabilities", () => {
  it.each<AccessStatus>(["pending", "active", "denied", "paused"])(
    "gates upload and review for %s users",
    (status) => {
      const expected = status === "active";
      expect(canUploadSnapshots(status)).toBe(expected);
      expect(canRequestReview(status)).toBe(expected);
    },
  );

  it.each([
    ["pending", true],
    ["active", true],
    ["paused", true],
    ["denied", false],
  ] as const)("gates settings edits for %s users", (status, expected) => {
    expect(canEditInvestmentProfile(status)).toBe(expected);
    expect(canEditLiquidAssets(status)).toBe(expected);
  });
});

describe("redirect helpers", () => {
  it.each([
    ["/portfolio/upload", "pending", true],
    ["/waiting", "pending", false],
    ["/settings", "pending", false],
    ["/", "pending", false],
    ["/portfolio/upload", "active", false],
  ] as const)("shouldRedirectToWaiting(%s, %s)", (pathname, status, expected) => {
    expect(shouldRedirectToWaiting(pathname, status)).toBe(expected);
  });

  it.each([
    ["/portfolio/upload", "denied", true],
    ["/denied", "denied", false],
    ["/denied/info", "denied", false],
    ["/portfolio/upload", "active", false],
  ] as const)("shouldRedirectToDenied(%s, %s)", (pathname, status, expected) => {
    expect(shouldRedirectToDenied(pathname, status)).toBe(expected);
  });
});
