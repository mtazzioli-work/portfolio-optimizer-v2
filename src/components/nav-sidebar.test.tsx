import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavSidebar } from "@/components/nav-sidebar";

const mockUsePathname = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

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

describe("NavSidebar", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("marks the current route as active", () => {
    render(<NavSidebar accessStatus="active" role="user" />);

    expect(screen.getByRole("link", { name: "Panel" })).toHaveClass(
      "bg-zinc-900",
    );
    expect(screen.getByRole("link", { name: "Subir snapshot" })).not.toHaveClass(
      "bg-zinc-900",
    );
  });

  it("shows only waiting-safe navigation for pending users", () => {
    render(<NavSidebar accessStatus="pending" role="user" />);

    expect(screen.getByRole("link", { name: "Panel" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Perfil de inversión" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Subir snapshot" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Revisiones" }),
    ).not.toBeInTheDocument();
  });

  it("lets paused users read history and reviews without upload access", () => {
    render(<NavSidebar accessStatus="paused" role="user" />);

    expect(screen.getByRole("link", { name: "Revisiones" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Subir snapshot" }),
    ).not.toBeInTheDocument();
  });

  it("shows admin navigation only for admins", () => {
    const { rerender } = render(
      <NavSidebar accessStatus="active" role="user" />,
    );

    expect(
      screen.queryByRole("button", { name: /Administración/ }),
    ).not.toBeInTheDocument();

    rerender(<NavSidebar accessStatus="pending" role="admin" />);

    fireEvent.click(screen.getByRole("button", { name: /Administración/ }));

    expect(
      screen.getByRole("link", { name: "Administración de usuarios" }),
    ).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("uses prefix matching for nested active routes", () => {
    mockUsePathname.mockReturnValue("/settings/investment-profile");

    render(<NavSidebar accessStatus="active" role="user" />);

    expect(screen.getByRole("link", { name: "Perfil de inversión" })).toHaveClass(
      "bg-zinc-900",
    );
  });
});
