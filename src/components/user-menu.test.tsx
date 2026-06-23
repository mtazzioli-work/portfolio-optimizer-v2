import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "@/components/user-menu";

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
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      role={role}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/app/auth/actions", () => ({
  signOut: vi.fn(),
}));

describe("UserMenu", () => {
  it("shows email, initials, and menu actions", () => {
    render(<UserMenu email="maria.garcia@example.com" />);

    const trigger = screen.getByRole("button");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("MG")).toBeInTheDocument();
    expect(screen.getByText("maria.garcia@example.com")).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cambiar contraseña" })).toHaveAttribute(
      "href",
      "/settings/password",
    );
    expect(screen.getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("closes when Escape is pressed or a menu link is clicked", () => {
    render(<UserMenu email="demo@example.com" />);

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Cambiar contraseña" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
