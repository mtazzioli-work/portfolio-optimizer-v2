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

import {
  ForgotPasswordForm,
  ResetPasswordForm,
  SignInForm,
  SignUpForm,
} from "@/components/auth-forms";

function mockActionState(state: AuthActionState = {}, pending = false) {
  mockUseActionState.mockReturnValue([state, vi.fn(), pending]);
}

describe("auth forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActionState();
  });

  it("renders sign-in fields and navigation links", () => {
    render(<SignInForm />);

    expect(
      screen.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }))
      .toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "Registrate" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("renders sign-up policy hints and pending submit label", () => {
    mockActionState({}, true);

    render(<SignUpForm />);

    expect(screen.getByRole("heading", { name: "Crear cuenta" })).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("minlength", "12");
    expect(screen.getByText(/Mínimo 12 caracteres/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Creando cuenta…" })).toBeDisabled();
  });

  it("shows forgot-password success state and hides repeat submissions", () => {
    mockActionState({ success: "Revisá tu email" });

    render(<ForgotPasswordForm />);

    expect(screen.getByText("Revisá tu email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a iniciar sesión" }),
    ).toHaveAttribute("href", "/sign-in");
  });

  it("renders reset-password hidden token and errors", () => {
    mockActionState({ error: "Enlace inválido" });

    const { container } = render(<ResetPasswordForm token="reset-token" />);

    expect(screen.getByText("Enlace inválido")).toBeInTheDocument();
    expect(
      container.querySelector<HTMLInputElement>('input[name="token"]')?.value,
    ).toBe("reset-token");
    expect(screen.getByRole("button", { name: "Restablecer contraseña" }))
      .toBeEnabled();
  });
});
