import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthActionState } from "@/app/auth/actions";

const mockUseActionState = vi.hoisted(() => vi.fn());

vi.mock("react", async (importActual) => {
  const actual = await importActual<typeof import("react")>();
  return {
    ...actual,
    useActionState: mockUseActionState,
  };
});
vi.mock("@/app/auth/actions", () => ({ changePassword: vi.fn() }));

import { ChangePasswordForm } from "@/components/change-password-form";

function mockActionState(state: AuthActionState = {}, pending = false) {
  mockUseActionState.mockReturnValue([state, vi.fn(), pending]);
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActionState();
  });

  it("renders current, new, and confirmation password fields", () => {
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
      "minlength",
      "12",
    );
    expect(screen.getByText(/Mínimo 12 caracteres/)).toBeInTheDocument();
  });

  it("renders action errors and pending state", () => {
    mockActionState({ error: "La contraseña actual es incorrecta" }, true);

    render(<ChangePasswordForm />);

    expect(screen.getByText("La contraseña actual es incorrecta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });
});
