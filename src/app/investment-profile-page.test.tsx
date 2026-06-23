import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";

const {
  mockDb,
  mockGetCurrentUser,
  mockListActiveProfileChipSections,
  mockRedirect,
} = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
  },
  mockGetCurrentUser: vi.fn(),
  mockListActiveProfileChipSections: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("@/lib/profile-chips", () => ({
  listActiveProfileChipSections: mockListActiveProfileChipSections,
}));
vi.mock("@/components/settings/apply-template-form", () => ({
  ApplyTemplateForm: ({
    isActive,
    templateId,
  }: {
    isActive: boolean;
    templateId: string;
  }) => (
    <div
      data-active={String(isActive)}
      data-testid={`template-form-${templateId}`}
    />
  ),
}));
vi.mock("@/components/settings/investment-profile-editor", () => ({
  InvestmentProfileEditor: ({
    canEdit,
    chipSections,
    hasSavedText,
    initialText,
  }: {
    canEdit: boolean;
    chipSections: unknown[];
    hasSavedText: boolean;
    initialText: string;
  }) => (
    <textarea
      data-can-edit={String(canEdit)}
      data-chip-count={String(chipSections.length)}
      data-has-saved-text={String(hasSavedText)}
      data-testid="profile-editor"
      readOnly
      value={initialText}
    />
  ),
}));

import InvestmentProfilePage from "@/app/(app)/settings/investment-profile/page";

const user: User = {
  id: "user-id",
  email: "user@example.com",
  passwordHash: "hash",
  sessionVersion: 0,
  accessStatus: "active",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function mockProfileRows(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.limit.mockResolvedValue(rows);
  mockDb.select.mockReturnValue(query);
}

describe("InvestmentProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    mockGetCurrentUser.mockResolvedValue(user);
    mockListActiveProfileChipSections.mockResolvedValue([]);
    mockProfileRows([]);
  });

  it("redirects anonymous visitors to sign-in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(InvestmentProfilePage()).rejects.toThrow("redirect:/sign-in");
  });

  it("renders default templates and editable default profile when none is stored", async () => {
    render(await InvestmentProfilePage());

    expect(
      screen.getByRole("heading", { name: "Perfil de inversión" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Conservador" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Moderado" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Agresivo" })).toBeInTheDocument();
    expect(screen.getByTestId("profile-editor")).toHaveAttribute(
      "data-can-edit",
      "true",
    );
    expect(screen.getByTestId("profile-editor")).toHaveAttribute(
      "data-has-saved-text",
      "false",
    );
    expect(
      (screen.getByTestId("profile-editor") as HTMLTextAreaElement).value,
    ).toContain("PERFIL DE INVERSIÓN");
  });

  it("marks the active template from the stored profile label", async () => {
    mockProfileRows([
      {
        label: "Estrategia Agresivo",
        rulesJson: {
          ...DEFAULT_INVESTMENT_PROFILE,
          profileEditorText: "Custom profile text",
        },
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]);

    render(await InvestmentProfilePage());

    expect(screen.getByText("Perfil actual:")).toBeInTheDocument();
    expect(screen.getByText("Estrategia Agresivo")).toBeInTheDocument();
    expect(screen.getByTestId("template-form-aggressive")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByTestId("profile-editor")).toHaveValue(
      "Custom profile text",
    );
  });

  it("renders read-only template cards and editor for denied users", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...user, accessStatus: "denied" });

    render(await InvestmentProfilePage());

    expect(screen.queryByTestId("template-form-moderate")).not.toBeInTheDocument();
    expect(screen.getAllByText("Solo lectura")).toHaveLength(3);
    expect(screen.getByTestId("profile-editor")).toHaveAttribute(
      "data-can-edit",
      "false",
    );
  });
});
