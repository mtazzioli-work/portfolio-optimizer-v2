import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeniedPage from "@/app/(app)/denied/page";
import HistoryPage from "@/app/(app)/history/page";
import PortfolioUploadPage from "@/app/(app)/portfolio/upload/page";
import PasswordSettingsPage from "@/app/(app)/settings/password/page";
import WaitingPage from "@/app/(app)/waiting/page";
import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/page";
import SignInPage from "@/app/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/sign-up/[[...sign-up]]/page";

const {
  mockGetCurrentUser,
  mockGetLiquidAssetsForUser,
  mockHasInvestmentProfile,
  mockRedirect,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockGetLiquidAssetsForUser: vi.fn(),
  mockHasInvestmentProfile: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/auth-forms", () => ({
  ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
  ResetPasswordForm: ({ token }: { token: string }) => (
    <div data-testid="reset-password-form">{token}</div>
  ),
  SignInForm: () => <div data-testid="sign-in-form" />,
  SignUpForm: () => <div data-testid="sign-up-form" />,
}));
vi.mock("@/components/change-password-form", () => ({
  ChangePasswordForm: () => <div data-testid="change-password-form" />,
}));
vi.mock("@/components/portfolio/portfolio-upload-workspace", () => ({
  PortfolioUploadWorkspace: ({
    canEditLiquid,
    editorText,
    hasInvestmentProfile,
  }: {
    canEditLiquid: boolean;
    editorText: string;
    hasInvestmentProfile: boolean;
  }) => (
    <div
      data-can-edit-liquid={String(canEditLiquid)}
      data-has-profile={String(hasInvestmentProfile)}
      data-testid="portfolio-upload-workspace"
    >
      CSV {editorText}
    </div>
  ),
}));
vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/liquid-assets", () => ({
  getLiquidAssetsForUser: mockGetLiquidAssetsForUser,
  getLiquidAssetsEditorText: () => "ARS: 100000",
  upsertLiquidAssets: vi.fn(),
}));
vi.mock("@/lib/investment-profile", () => ({
  userHasSavedInvestmentProfile: mockHasInvestmentProfile,
}));
vi.mock("@/app/(app)/reviews/actions", () => ({
  requestReviewAction: vi.fn(),
}));

describe("static app pages", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockResolvedValue({
      id: "app_user_123",
      accessStatus: "active",
      role: "user",
      email: "user@example.com",
    });
    mockGetLiquidAssetsForUser.mockResolvedValue([]);
    mockHasInvestmentProfile.mockResolvedValue(true);
    mockRedirect.mockReset();
  });

  it("redirects the legacy history route to the dashboard", () => {
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });

    expect(() => HistoryPage()).toThrow("redirect:/");
  });

  it.each([
    [DeniedPage, "Acceso denegado", "Tu solicitud de acceso fue rechazada"],
    [PasswordSettingsPage, "Contraseña", "Cambiá tu contraseña"],
  ])("renders %s", (Page, heading, copy) => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(copy))).toBeInTheDocument();
  });

  it("renders the portfolio upload workspace and CSV state", async () => {
    render(await PortfolioUploadPage());

    expect(
      screen.getByRole("heading", { name: "Subir snapshot" }),
    ).toBeInTheDocument();
    const workspace = screen.getByTestId("portfolio-upload-workspace");

    expect(within(workspace).getByText(/CSV/)).toBeInTheDocument();
    expect(workspace).toHaveAttribute(
      "data-has-profile",
      "true",
    );
  });

  it("renders waiting guidance links", () => {
    render(<WaitingPage />);

    expect(
      screen.getByRole("heading", { name: "Cuenta pendiente" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "perfil de inversión" })).toHaveAttribute(
      "href",
      "/settings/investment-profile",
    );
  });

  it("renders auth form shells", async () => {
    const { rerender } = render(
      await SignInPage({ searchParams: Promise.resolve({ reset: "1" }) }),
    );

    expect(screen.getByTestId("sign-in-form")).toBeInTheDocument();
    expect(screen.getByText(/Tu contraseña fue restablecida/)).toBeInTheDocument();

    rerender(<SignUpPage />);

    expect(screen.getByTestId("sign-up-form")).toBeInTheDocument();
  });

  it("renders forgot and reset password states", async () => {
    const { rerender } = render(<ForgotPasswordPage />);

    expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();

    rerender(
      await ResetPasswordPage({
        searchParams: Promise.resolve({ token: "reset-token" }),
      }),
    );
    expect(screen.getByTestId("reset-password-form")).toHaveTextContent(
      "reset-token",
    );

    rerender(
      await ResetPasswordPage({
        searchParams: Promise.resolve({}),
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Enlace inválido" }),
    ).toBeInTheDocument();
  });
});
