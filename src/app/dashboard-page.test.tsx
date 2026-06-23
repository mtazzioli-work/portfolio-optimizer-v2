import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const { mockGetOrCreateUser, mockGetQuotaUsage } = vi.hoisted(() => ({
  mockGetOrCreateUser: vi.fn(),
  mockGetQuotaUsage: vi.fn(),
}));

vi.mock("@/lib/users", () => ({ getOrCreateUser: mockGetOrCreateUser }));
vi.mock("@/lib/quota", () => ({ getQuotaUsage: mockGetQuotaUsage }));

import DashboardPage from "@/app/(app)/page";

const user: User = {
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
    mockGetOrCreateUser.mockResolvedValue(user);
    mockGetQuotaUsage.mockResolvedValue({ used: 1, limit: 3, remaining: 2 });
  });

  it("renders nothing without an app user", async () => {
    mockGetOrCreateUser.mockResolvedValue(null);

    const result = await DashboardPage();

    expect(result).toBeNull();
    expect(mockGetQuotaUsage).not.toHaveBeenCalled();
  });

  it("renders active status and review quota for active users", async () => {
    render(await DashboardPage());

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 usadas este mes")).toBeInTheDocument();
    expect(screen.getByText("2 restantes (mes calendario, Argentina)")).toBeInTheDocument();
    expect(mockGetQuotaUsage).toHaveBeenCalledWith(user);
  });

  it("renders pending guidance without quota lookup", async () => {
    mockGetOrCreateUser.mockResolvedValue({
      ...user,
      accessStatus: "pending",
    });

    render(await DashboardPage());

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText(/Usuario pendiente/)).toBeInTheDocument();
    expect(mockGetQuotaUsage).not.toHaveBeenCalled();
  });

  it("renders paused guidance without quota lookup", async () => {
    mockGetOrCreateUser.mockResolvedValue({
      ...user,
      accessStatus: "paused",
    });

    render(await DashboardPage());

    expect(screen.getByText("Suspendido")).toBeInTheDocument();
    expect(screen.getByText(/suspendida temporalmente/)).toBeInTheDocument();
    expect(mockGetQuotaUsage).not.toHaveBeenCalled();
  });
});
