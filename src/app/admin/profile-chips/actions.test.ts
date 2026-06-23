import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProfileChip,
  createProfileChipSection,
  deleteProfileChip,
  deleteProfileChipSection,
  updateProfileChip,
  updateProfileChipSection,
} from "@/app/admin/profile-chips/actions";

const { mockDb, mockGetCurrentUser, mockRevalidatePath } = vi.hoisted(() => ({
  mockDb: {
    delete: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }
  return data;
}

function mockInsert() {
  const insert = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  mockDb.insert.mockReturnValue(insert);
  return insert;
}

function mockUpdate() {
  const update = {
    set: vi.fn(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  update.set.mockReturnValue(update);
  mockDb.update.mockReturnValue(update);
  return update;
}

function mockDelete() {
  const del = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockDb.delete.mockReturnValue(del);
  return del;
}

describe("admin profile chip actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ role: "admin" });
  });

  it("requires an admin user", async () => {
    mockGetCurrentUser.mockResolvedValue({ role: "user" });

    await expect(createProfileChipSection(form({ title: "Objetivos" }))).rejects.toThrow(
      "No autorizado",
    );
  });

  it("creates and updates sections with normalized values", async () => {
    const insert = mockInsert();
    await createProfileChipSection(form({ title: "  Objetivos  ", sortOrder: "3" }));

    expect(insert.values).toHaveBeenCalledWith({
      title: "Objetivos",
      sortOrder: 3,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/profile-chips");

    const update = mockUpdate();
    await updateProfileChipSection(
      form({ id: "section_1", title: " Riesgo ", sortOrder: "bad" }),
    );

    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Riesgo",
        sortOrder: 0,
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("validates section and chip payloads", async () => {
    await expect(createProfileChipSection(form({ title: " " }))).rejects.toThrow(
      "Título requerido",
    );
    await expect(
      updateProfileChipSection(form({ id: "", title: " " })),
    ).rejects.toThrow("Datos inválidos");
    await expect(
      createProfileChip(form({ sectionId: "section_1", label: "", insertText: "" })),
    ).rejects.toThrow("Datos inválidos");
    await expect(
      updateProfileChip(form({ id: "chip_1", label: " ", insertText: "Texto" })),
    ).rejects.toThrow("Datos inválidos");
  });

  it("creates, updates, and deletes chips", async () => {
    const insert = mockInsert();
    await createProfileChip(
      form({
        sectionId: "section_1",
        label: " Horizonte ",
        insertText: "  Horizonte: 10 años  ",
        sortOrder: "2",
      }),
    );

    expect(insert.values).toHaveBeenCalledWith({
      sectionId: "section_1",
      label: "Horizonte",
      insertText: "Horizonte: 10 años",
      sortOrder: 2,
      isActive: true,
    });

    const update = mockUpdate();
    await updateProfileChip(
      form({
        id: "chip_1",
        label: "Liquidez",
        insertText: "Mantener caja",
        sortOrder: "NaN",
        isActive: "on",
      }),
    );
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Liquidez",
        insertText: "Mantener caja",
        sortOrder: 0,
        isActive: true,
      }),
    );

    const deleteSection = mockDelete();
    await deleteProfileChipSection("section_1");
    expect(deleteSection.where).toHaveBeenCalledOnce();

    const deleteChip = mockDelete();
    await deleteProfileChip("chip_1");
    expect(deleteChip.where).toHaveBeenCalledOnce();
  });
});
