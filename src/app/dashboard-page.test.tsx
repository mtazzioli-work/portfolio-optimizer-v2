import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const {
  mockGetCurrentUser,
  mockGetOnboardingProgress,
  mockGetQuotaUsage,
  mockHasReviewsListSeen,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockGetOnboardingProgress: vi.fn(),
  mockGetQuotaUsage: vi.fn(),
  mockHasReviewsListSeen: vi.fn(),
}));

vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/quota", () => ({ getQuotaUsage: mockGetQuotaUsage }));
vi.mock("@/lib/onboarding-cookie", () => ({
  hasReviewsListSeen: mockHasReviewsListSeen,
}));
vi.mock("@/lib/onboarding", () => ({
  getOnboardingProgress: mockGetOnboardingProgress,
  shouldShowOnboardingChecklist: (status: string) =>
    status === "pending" || status === "active",
}));
vi.mock("@/components/onboarding/onboarding-checklist", () => ({
  OnboardingChecklist: () => <div data-testid="onboarding-checklist" />,
}));

import DashboardPage from "@/app/(app)/page";

const user: User = {
  id: "app_user_123",
  clerkUserId: "user_123",
  email: "user@example.com",
  accessStatus: "active",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(user);
    mockGetQuotaUsage.mockResolvedValue({
      used: 1,
      limit: 3,
      remaining: 2,
      totalTokens: 0,
      totalCostUsd: 0,
    });
    mockHasReviewsListSeen.mockResolvedValue(false);
    mockGetOnboardingProgress.mockResolvedValue({
      isComplete: true,
      steps: [],
    });
  });

  it("renders nothing without an app user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await DashboardPage();

    expect(result).toBeNull();
    expect(mockGetQuotaUsage).not.toHaveBeenCalled();
  });

  it("renders active status and review quota for active users", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Panel" })).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 usadas este mes")).toBeInTheDocument();
    expect(screen.getByText("2 restantes (mes calendario, Argentina)")).toBeInTheDocument();
    expect(mockGetQuotaUsage).toHaveBeenCalledWith(user);
  });

  it("renders pending guidance without quota lookup", async () => {
    mockGetCurrentUser.mockResolvedValue({
      ...user,
      accessStatus: "pending",
    });

    render(await DashboardPage());

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText(/Usuario pendiente/)).toBeInTheDocument();
    expect(mockGetQuotaUsage).not.toHaveBeenCalled();
  });

  it("renders paused guidance without quota lookup", async () => {
    mockGetCurrentUser.mockResolvedValue({
      ...user,
      accessStatus: "paused",
    });

    render(await DashboardPage());

    expect(screen.getByText("Suspendido")).toBeInTheDocument();
    expect(screen.getByText(/suspendida temporalmente/)).toBeInTheDocument();
    expect(mockGetQuotaUsage).not.toHaveBeenCalled();
  });
});
