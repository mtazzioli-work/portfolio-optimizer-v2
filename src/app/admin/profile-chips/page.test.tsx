import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminProfileChipsPage from "@/app/admin/profile-chips/page";

const mockListAllProfileChipSections = vi.hoisted(() => vi.fn());

vi.mock("@/lib/profile-chips", () => ({
  listAllProfileChipSections: mockListAllProfileChipSections,
}));
vi.mock("@/app/admin/profile-chips/actions", () => ({
  createProfileChip: vi.fn(),
  createProfileChipSection: vi.fn(),
  deleteProfileChip: vi.fn(),
  deleteProfileChipSection: vi.fn(),
  updateProfileChip: vi.fn(),
  updateProfileChipSection: vi.fn(),
}));

describe("AdminProfileChipsPage", () => {
  beforeEach(() => {
    mockListAllProfileChipSections.mockResolvedValue([
      {
        id: "section_1",
        title: "Objetivos",
        sortOrder: 2,
        chips: [
          {
            id: "chip_1",
            label: "Horizonte largo",
            insertText: "Horizonte: 10 años",
            sortOrder: 1,
            isActive: true,
          },
        ],
      },
    ]);
  });

  it("renders section and chip management forms", async () => {
    render(await AdminProfileChipsPage());

    expect(
      screen.getByRole("heading", { name: "Chips de perfil" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nueva sección" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Objetivos")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Horizonte largo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Horizonte: 10 años")).toBeInTheDocument();

    const chipForm = screen.getByDisplayValue("Horizonte largo").closest("form");
    expect(chipForm).not.toBeNull();
    expect(within(chipForm!).getByRole("checkbox", { name: "Activo" })).toBeChecked();
    expect(within(chipForm!).getByRole("button", { name: "Eliminar" })).toHaveAttribute(
      "type",
      "submit",
    );
    expect(screen.getByRole("button", { name: "Agregar chip" })).toBeInTheDocument();
  });
});
