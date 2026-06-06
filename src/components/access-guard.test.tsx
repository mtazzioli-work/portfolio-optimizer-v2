import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessGuard } from "@/components/access-guard";
import type { User } from "@/db/schema";

const { mockReplace, mockUsePathname } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockUsePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
  useRouter: () => ({ replace: mockReplace }),
}));

const user: User = {
  clerkUserId: "user_123",
  email: "user@example.com",
  accessStatus: "active",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("AccessGuard", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("renders children when the user may access the current path", () => {
    render(
      <AccessGuard user={user}>
        <p>Allowed content</p>
      </AccessGuard>,
    );

    expect(screen.getByText("Allowed content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects denied users to the denied page", async () => {
    mockUsePathname.mockReturnValue("/portfolio/upload");

    render(
      <AccessGuard user={{ ...user, accessStatus: "denied" }}>
        <p>Denied content</p>
      </AccessGuard>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/denied"));
  });

  it("redirects pending users to the waiting page for protected paths", async () => {
    mockUsePathname.mockReturnValue("/portfolio/upload");

    render(
      <AccessGuard user={{ ...user, accessStatus: "pending" }}>
        <p>Pending content</p>
      </AccessGuard>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/waiting"));
  });

  it("redirects other disallowed states back to the dashboard", async () => {
    mockUsePathname.mockReturnValue("/portfolio/upload");

    render(
      <AccessGuard user={{ ...user, accessStatus: "paused" }}>
        <p>Paused content</p>
      </AccessGuard>,
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("does not redirect pending users while they are already on waiting-safe routes", () => {
    mockUsePathname.mockReturnValue("/settings/investment-profile");

    render(
      <AccessGuard user={{ ...user, accessStatus: "pending" }}>
        <p>Settings content</p>
      </AccessGuard>,
    );

    expect(screen.getByText("Settings content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
