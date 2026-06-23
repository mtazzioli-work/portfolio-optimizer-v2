import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
} from "@/components/auth-forms";

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

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/app/auth/actions", () => ({
  completePasswordReset: vi.fn(),
  requestPasswordReset: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

describe("auth forms", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([{}, vi.fn(), false]);
  });

  it("renders sign-in inputs, links, and errors", () => {
    mockUseActionState.mockReturnValueOnce([
      { error: "Credenciales inválidas" },
      vi.fn(),
      false,
    ]);

    render(<SignInForm />);

    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByText("Credenciales inválidas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Registrate" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("renders sign-up with password requirements and pending state", () => {
    mockUseActionState.mockReturnValueOnce([{}, vi.fn(), true]);

    render(<SignUpForm />);

    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "minlength",
      "12",
    );
    expect(screen.getByLabelText("Confirmar contraseña")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByRole("button", { name: "Creando cuenta…" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });

  it("renders forgot password success without the email input", () => {
    mockUseActionState.mockReturnValueOnce([
      { success: "Revisá tu casilla de email" },
      vi.fn(),
      false,
    ]);

    render(<ForgotPasswordForm />);

    expect(
      screen.getByRole("heading", { name: "Restablecer contraseña" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Revisá tu casilla de email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toHaveAttribute("href", "/sign-in");
  });

  it("renders reset password hidden token and pending submit", () => {
    mockUseActionState.mockReturnValueOnce([{}, vi.fn(), true]);

    const { container } = render(<ResetPasswordForm token="reset-token" />);

    expect(
      screen.getByRole("heading", { name: "Nueva contraseña" }),
    ).toBeInTheDocument();
    expect(
      container.querySelector<HTMLInputElement>('input[name="token"]')?.value,
    ).toBe("reset-token");
    expect(
      screen.getByRole("button", { name: "Guardando…" }),
    ).toBeDisabled();
  });
});
