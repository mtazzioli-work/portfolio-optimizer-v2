import type { AccessStatus, UserRole } from "@/db/schema";

const SETTINGS_PREFIX = "/settings";

export function isSettingsPath(pathname: string): boolean {
  return (
    pathname === SETTINGS_PREFIX ||
    pathname.startsWith(`${SETTINGS_PREFIX}/`)
  );
}

export function isWaitingPath(pathname: string): boolean {
  return pathname === "/waiting" || pathname.startsWith("/waiting/");
}

export function isDeniedPath(pathname: string): boolean {
  return pathname === "/denied" || pathname.startsWith("/denied/");
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Paths a user may visit given access_status (excluding public auth routes). */
export function canAccessPath(
  pathname: string,
  accessStatus: AccessStatus,
  role: UserRole,
): boolean {
  if (role === "admin" && isAdminPath(pathname)) {
    return true;
  }

  switch (accessStatus) {
    case "active":
      return true;
    case "pending":
      return (
        isWaitingPath(pathname) ||
        isSettingsPath(pathname) ||
        pathname === "/"
      );
    case "denied":
      return isDeniedPath(pathname);
    case "paused":
      return (
        pathname === "/" ||
        isSettingsPath(pathname) ||
        pathname === "/history" ||
        pathname.startsWith("/history/") ||
        pathname === "/reviews" ||
        pathname.startsWith("/reviews/")
      );
    default:
      return false;
  }
}

export function canUploadSnapshots(accessStatus: AccessStatus): boolean {
  return accessStatus === "active";
}

export function canRequestReview(accessStatus: AccessStatus): boolean {
  return accessStatus === "active";
}

export function canEditInvestmentProfile(accessStatus: AccessStatus): boolean {
  return (
    accessStatus === "active" ||
    accessStatus === "pending" ||
    accessStatus === "paused"
  );
}

export function canEditLiquidAssets(accessStatus: AccessStatus): boolean {
  return canEditInvestmentProfile(accessStatus);
}

export function shouldRedirectToWaiting(
  pathname: string,
  accessStatus: AccessStatus,
): boolean {
  return (
    accessStatus === "pending" &&
    !isSettingsPath(pathname) &&
    !isWaitingPath(pathname) &&
    pathname !== "/"
  );
}

export function shouldRedirectToDenied(
  pathname: string,
  accessStatus: AccessStatus,
): boolean {
  return accessStatus === "denied" && !isDeniedPath(pathname);
}
