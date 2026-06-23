import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePathname = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ usePathname: mockUsePathname }));
vi.mock("next/link", () => ({
  default: ({
    children,
    className,
    href,
  }: {
    children: React.ReactNode;
    className?: string;
    href: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

import { AdminSubnav } from "@/components/admin/admin-subnav";

describe("AdminSubnav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/admin");
  });

  it("marks the user admin route as active", () => {
    render(<AdminSubnav />);

    expect(
      screen.getByRole("link", { name: "Administración de usuarios" }),
    ).toHaveClass("font-medium");
    expect(
      screen.getByRole("link", { name: "Chips de perfil de inversión" }),
    ).not.toHaveClass("font-medium");
  });

  it("uses prefix matching for profile chip routes", () => {
    mockUsePathname.mockReturnValue("/admin/profile-chips/new");

    render(<AdminSubnav />);

    expect(
      screen.getByRole("link", { name: "Chips de perfil de inversión" }),
    ).toHaveClass("font-medium");
  });
});
