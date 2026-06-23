import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const {
  mockCountClaudeReviewsThisMonth,
  mockDb,
  mockGetEffectiveLimit,
  mockGetMonthlyTokenUsage,
  mockGetMonthlyReviewLimitDefault,
} = vi.hoisted(() => ({
  mockCountClaudeReviewsThisMonth: vi.fn(),
  mockDb: {
    select: vi.fn(),
  },
  mockGetEffectiveLimit: vi.fn(),
  mockGetMonthlyTokenUsage: vi.fn(),
  mockGetMonthlyReviewLimitDefault: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/app/admin/actions", () => ({
  resetUserPassword: vi.fn(),
  updateMonthlyReviewLimitDefault: vi.fn(),
  updateUserAccessStatus: vi.fn(),
  updateUserMonthlyReviewLimitFromForm: vi.fn(),
}));
vi.mock("@/lib/quota", () => ({
  countClaudeReviewsThisMonth: mockCountClaudeReviewsThisMonth,
  getEffectiveLimit: mockGetEffectiveLimit,
  getMonthlyTokenUsage: mockGetMonthlyTokenUsage,
}));
vi.mock("@/lib/settings", () => ({
  getMonthlyReviewLimitDefault: mockGetMonthlyReviewLimitDefault,
}));

import AdminPage from "@/app/admin/page";

const users: User[] = [
  {
    id: "pending_1_id",
    clerkUserId: "pending_1",
    email: "pending@example.com",
    accessStatus: "pending",
    role: "user",
    monthlyReviewLimit: null,
    createdAt: new Date("2026-01-04T00:00:00.000Z"),
    updatedAt: new Date("2026-01-04T00:00:00.000Z"),
  },
  {
    id: "active_1_id",
    clerkUserId: "active_1",
    email: "active@example.com",
    accessStatus: "active",
    role: "user",
    monthlyReviewLimit: 8,
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
  },
  {
    id: "paused_1_id",
    clerkUserId: "paused_1",
    email: "paused@example.com",
    accessStatus: "paused",
    role: "user",
    monthlyReviewLimit: null,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  },
  {
    id: "denied_1_id",
    clerkUserId: "denied_1",
    email: "denied@example.com",
    accessStatus: "denied",
    role: "admin",
    monthlyReviewLimit: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

function mockUserRows(rows: User[]) {
  const query = {
    from: vi.fn(),
    orderBy: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.orderBy.mockResolvedValue(rows);
  mockDb.select.mockReturnValue(query);
}

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRows(users);
    mockGetMonthlyReviewLimitDefault.mockResolvedValue(3);
    mockCountClaudeReviewsThisMonth.mockImplementation((id: string) =>
      Promise.resolve(id === "active_1_id" ? 2 : 0),
    );
    mockGetEffectiveLimit.mockImplementation((user: User) =>
      Promise.resolve(user.monthlyReviewLimit ?? 3),
    );
    mockGetMonthlyTokenUsage.mockResolvedValue({
      totalTokens: 0,
      totalCostUsd: 0,
    });
  });

  it("renders users with status-specific actions and quota limits", async () => {
    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Administración" }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(screen.getByText("active@example.com")).toBeInTheDocument();
    expect(screen.getByText("paused@example.com")).toBeInTheDocument();
    expect(screen.getByText("denied@example.com")).toBeInTheDocument();

    const pendingRow = screen.getByText("pending@example.com").closest("tr");
    const activeRow = screen.getByText("active@example.com").closest("tr");
    const pausedRow = screen.getByText("paused@example.com").closest("tr");
    const deniedRow = screen.getByText("denied@example.com").closest("tr");

    expect(pendingRow).not.toBeNull();
    expect(activeRow).not.toBeNull();
    expect(pausedRow).not.toBeNull();
    expect(deniedRow).not.toBeNull();

    expect(within(pendingRow!).getByText("Aprobar")).toBeInTheDocument();
    expect(within(pendingRow!).getByText("Rechazar")).toBeInTheDocument();
    expect(within(activeRow!).getByText("Suspender")).toBeInTheDocument();
    expect(within(activeRow!).getByText("2 / 8")).toBeInTheDocument();
    expect(within(pausedRow!).getByText("Reactivar")).toBeInTheDocument();
    expect(within(deniedRow!).getByText("Rehabilitar")).toBeInTheDocument();
  });

  it("filters the table to pending users", async () => {
    render(await AdminPage({ searchParams: Promise.resolve({ filter: "pending" }) }));

    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
    expect(screen.queryByText("active@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("paused@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("denied@example.com")).not.toBeInTheDocument();
    expect(mockCountClaudeReviewsThisMonth).toHaveBeenCalledOnce();
  });
});
