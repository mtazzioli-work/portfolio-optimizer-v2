import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    role,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    role?: string;
  }) => (
    <a href={href} onClick={onClick} role={role}>
      {children}
    </a>
  ),
}));

import { UserMenu } from "@/components/user-menu";

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens account actions with initials derived from the email", () => {
    render(<UserMenu email="marcelo.tazzioli@example.com" />);

    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("MT")).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cambiar contraseña" }))
      .toHaveAttribute("href", "/settings/password");
    expect(screen.getByRole("menuitem", { name: "Cerrar sesión" }))
      .toBeInTheDocument();
  });

  it("closes when pressing Escape or clicking outside", () => {
    render(
      <div>
        <button type="button">Outside</button>
        <UserMenu email="user@example.com" />
      </div>,
    );

    const trigger = screen.getAllByRole("button")[1]!;
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.mouseDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
