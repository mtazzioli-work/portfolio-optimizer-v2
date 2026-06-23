import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeniedPage from "@/app/(app)/denied/page";
import WaitingPage from "@/app/(app)/waiting/page";
import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/page";
import SignInPage from "@/app/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/sign-up/[[...sign-up]]/page";
import PasswordSettingsPage from "@/app/(app)/settings/password/page";

vi.mock("@/components/auth-forms", () => ({
  ForgotPasswordForm: () => <form data-testid="forgot-password-form" />,
  ResetPasswordForm: ({ token }: { token: string }) => (
    <form data-testid="reset-password-form">
      <input name="token" readOnly value={token} />
    </form>
  ),
  SignInForm: () => <form data-testid="sign-in-form" />,
  SignUpForm: () => <form data-testid="sign-up-form" />,
}));
vi.mock("@/components/change-password-form", () => ({
  ChangePasswordForm: () => <form data-testid="change-password-form" />,
}));

describe("static app pages", () => {
  it.each([
    [DeniedPage, "Acceso denegado", "Tu solicitud de acceso fue rechazada"],
  ])("renders %s", (Page, heading, copy) => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(copy))).toBeInTheDocument();
  });

  it("renders waiting guidance link to investment profile settings", () => {
    render(<WaitingPage />);

    expect(
      screen.getByRole("heading", { name: "Cuenta pendiente" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "perfil de inversión" })).toHaveAttribute(
      "href",
      "/settings/investment-profile",
    );
  });

  it("renders sign-in reset feedback and sign-up form shells", async () => {
    const { rerender } = render(
      await SignInPage({ searchParams: Promise.resolve({ reset: "1" }) }),
    );

    expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
    expect(screen.getByText(/Tu contraseña fue restablecida/)).toBeInTheDocument();

    rerender(<SignUpPage />);

    expect(screen.getByTestId("sign-up-form")).toBeInTheDocument();
  });

  it("renders forgot-password and reset-password shells", async () => {
    const { container, rerender } = render(<ForgotPasswordPage />);

    expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();

    rerender(
      await ResetPasswordPage({
        searchParams: Promise.resolve({ token: "reset-token" }),
      }),
    );

    expect(screen.getByTestId("reset-password-form")).toBeInTheDocument();
    expect(
      container.querySelector<HTMLInputElement>('input[name="token"]')?.value,
    ).toBe("reset-token");
  });

  it("renders an invalid reset-link state without a token", async () => {
    render(await ResetPasswordPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Enlace inválido" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Solicitar un enlace nuevo" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("renders the password settings shell", () => {
    render(<PasswordSettingsPage />);

    expect(screen.getByRole("heading", { name: "Contraseña" })).toBeInTheDocument();
    expect(screen.getByTestId("change-password-form")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Solicitá un enlace de restablecimiento" }),
    ).toHaveAttribute("href", "/forgot-password");
  });
});
