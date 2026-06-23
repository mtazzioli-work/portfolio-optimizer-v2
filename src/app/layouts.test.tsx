import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const { mockGetCurrentUser, mockHeaders, mockRedirect, mockUsePathname } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockHeaders: vi.fn(),
  mockRedirect: vi.fn(),
  mockUsePathname: vi.fn(),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "geist-sans" }),
  Geist_Mono: () => ({ variable: "geist-mono" }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  usePathname: mockUsePathname,
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/components/access-guard", () => ({
  AccessGuard: ({
    children,
    user,
  }: {
    children: React.ReactNode;
    user: User;
  }) => <div data-access-status={user.accessStatus}>{children}</div>,
}));
vi.mock("@/components/nav-sidebar", () => ({
  NavSidebar: ({ accessStatus, role }: Pick<User, "accessStatus" | "role">) => (
    <nav data-role={role} data-status={accessStatus} />
  ),
}));
vi.mock("@/components/user-menu", () => ({
  UserMenu: ({ email }: { email: string }) => (
    <div data-email={email} data-testid="user-menu" />
  ),
}));

import AppLayout from "@/app/(app)/layout";
import AdminLayout from "@/app/admin/layout";
import RootLayout, { metadata } from "@/app/layout";

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

describe("layouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    mockGetCurrentUser.mockResolvedValue(user);
    mockHeaders.mockResolvedValue(new Headers({ "x-pathname": "/" }));
    mockUsePathname.mockReturnValue("/admin");
  });

  it("exports app metadata", () => {
    expect(metadata).toMatchObject({
      title: "Portfolio Optimizer v2",
      description: expect.stringContaining("Seguimiento de portfolio"),
    });
  });

  it("renders the application shell and disclaimer footer", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Root child</main>
      </RootLayout>,
    );

    expect(markup).toContain('lang="es-419"');
    expect(markup).toContain("Root child");
    expect(markup).toContain("No constituye asesoramiento financiero");
  });

  it("redirects app layout visitors without a user to sign-in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(
      AppLayout({ children: <p>Protected child</p> }),
    ).rejects.toThrow("redirect:/sign-in");
  });

  it("renders app chrome for authenticated users", async () => {
    render(await AppLayout({ children: <p>Protected child</p> }));

    expect(screen.getByText("Protected child")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu")).toHaveAttribute(
      "data-email",
      user.email,
    );
    expect(screen.getByRole("navigation")).toHaveAttribute("data-status", "active");
  });

  it("redirects non-admin visitors away from admin layout", async () => {
    await expect(AdminLayout({ children: <p>Admin child</p> })).rejects.toThrow(
      "redirect:/",
    );
  });

  it("redirects anonymous admin visitors to sign-in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(AdminLayout({ children: <p>Admin child</p> })).rejects.toThrow(
      "redirect:/sign-in",
    );
  });

  it("renders admin chrome for admins", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...user, role: "admin" });

    render(await AdminLayout({ children: <p>Admin child</p> }));

    expect(screen.getByText("Admin child")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Administración de usuarios" }),
    ).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByTestId("user-menu")).toHaveAttribute(
      "data-email",
      user.email,
    );
  });
});
