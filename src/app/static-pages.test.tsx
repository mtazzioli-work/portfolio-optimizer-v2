import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeniedPage from "@/app/(app)/denied/page";
import HistoryPage from "@/app/(app)/history/page";
import PortfolioUploadPage from "@/app/(app)/portfolio/upload/page";
import ReviewsPage from "@/app/(app)/reviews/page";
import LiquidAssetsPage from "@/app/(app)/settings/liquid-assets/page";
import WaitingPage from "@/app/(app)/waiting/page";
import SignInPage from "@/app/sign-in/[[...sign-in]]/page";
import SignUpPage from "@/app/sign-up/[[...sign-up]]/page";

vi.mock("@clerk/nextjs", () => ({
  SignIn: (props: Record<string, unknown>) => (
    <div data-path={props.path as string} data-testid="sign-in" />
  ),
  SignUp: (props: Record<string, unknown>) => (
    <div data-path={props.path as string} data-testid="sign-up" />
  ),
}));

describe("static app pages", () => {
  it.each([
    [HistoryPage, "Historial", "Próximamente: gráficos"],
    [ReviewsPage, "Reviews", "Próximamente: listado"],
    [LiquidAssetsPage, "Activos líquidos", "Próximamente: declará"],
    [DeniedPage, "Acceso denegado", "Tu solicitud de acceso fue rechazada"],
  ])("renders %s", (Page, heading, copy) => {
    render(<Page />);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(copy))).toBeInTheDocument();
  });

  it("renders the portfolio upload placeholder and CSV tab", () => {
    render(<PortfolioUploadPage />);

    expect(
      screen.getByRole("heading", { name: "Subir snapshot" }),
    ).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText(/Implementación del parser/)).toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: "activos líquidos" })).toHaveAttribute(
      "href",
      "/settings/liquid-assets",
    );
  });

  it("renders Clerk sign-in and sign-up shells with path routing", () => {
    const { rerender } = render(<SignInPage />);

    expect(screen.getByTestId("sign-in")).toHaveAttribute("data-path", "/sign-in");

    rerender(<SignUpPage />);

    expect(screen.getByTestId("sign-up")).toHaveAttribute("data-path", "/sign-up");
  });
});
