import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordForm } from "@/components/change-password-form";

const { mockUseActionState } = vi.hoisted(() => ({
  mockUseActionState: vi.fn(),
}));

vi.mock("react", async (importActual) => {
  const actual = await importActual<typeof import("react")>();
  return {
    ...actual,
    useActionState: mockUseActionState,
  };
});

vi.mock("@/app/auth/actions", () => ({
  changePassword: vi.fn(),
}));

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([{}, vi.fn(), false]);
  });

  it("renders password inputs and validation hints", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByLabelText("Contraseña actual")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByLabelText("Nueva contraseña")).toHaveAttribute(
      "minlength",
      "12",
    );
    expect(screen.getByLabelText("Confirmar nueva contraseña")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByText(/Mínimo 12 caracteres/)).toBeInTheDocument();
  });

  it("shows errors and disables the submit button while pending", () => {
    mockUseActionState.mockReturnValueOnce([
      { error: "La contraseña actual no coincide" },
      vi.fn(),
      true,
    ]);

    render(<ChangePasswordForm />);

    expect(
      screen.getByText("La contraseña actual no coincide"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });
});
