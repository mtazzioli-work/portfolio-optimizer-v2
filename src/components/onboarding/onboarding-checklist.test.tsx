import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import type { OnboardingStep } from "@/lib/onboarding";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: "Perfil listo",
    description: "Completaste tu perfil",
    href: "/settings/investment-profile",
    ctaLabel: "Editar perfil",
    status: "complete",
  },
  {
    id: 2,
    title: "Subir snapshot",
    description: "Cargá tu cartera",
    href: "/portfolio/upload",
    ctaLabel: "Subir archivo",
    status: "available",
  },
  {
    id: 3,
    title: "Solicitar review",
    description: "Pedí una revisión",
    href: "/reviews",
    ctaLabel: "Ir a reviews",
    status: "locked",
    lockedReason: "Primero subí un snapshot",
  },
];

describe("OnboardingChecklist", () => {
  it("renders progress, active links, and locked reasons", () => {
    render(<OnboardingChecklist steps={steps} />);

    expect(screen.getByRole("heading", { name: "Guía de inicio" })).toBeInTheDocument();
    expect(screen.getByText("1 de 3 pasos completados")).toBeInTheDocument();
    expect(screen.getByText("Perfil listo")).toBeInTheDocument();
    expect(screen.getByText("Primero subí un snapshot")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Subir archivo →" })).toHaveAttribute(
      "href",
      "/portfolio/upload",
    );
    expect(screen.queryByRole("link", { name: "Ir a reviews →" })).not.toBeInTheDocument();
  });
});
