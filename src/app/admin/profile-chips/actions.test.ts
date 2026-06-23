import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const { dbCalls, mockDb, mockGetCurrentUser, mockRevalidatePath } = vi.hoisted(
  () => ({
    dbCalls: [] as Array<{ operation: string; value: unknown }>,
    mockDb: {
      delete: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
    mockGetCurrentUser: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }),
);

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

import {
  createProfileChip,
  createProfileChipSection,
  deleteProfileChip,
  deleteProfileChipSection,
  updateProfileChip,
  updateProfileChipSection,
} from "@/app/admin/profile-chips/actions";

const adminUser: User = {
  id: "admin-id",
  email: "admin@example.com",
  passwordHash: "hash",
  sessionVersion: 0,
  accessStatus: "active",
  role: "admin",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createInsertBuilder() {
  const builder = {
    values: vi.fn((value: unknown) => {
      dbCalls.push({ operation: "insert.values", value });
      return Promise.resolve();
    }),
  };
  return builder;
}

function createUpdateBuilder() {
  const builder = {
    set: vi.fn((value: unknown) => {
      dbCalls.push({ operation: "update.set", value });
      return builder;
    }),
    where: vi.fn(() => {
      dbCalls.push({ operation: "update.where", value: undefined });
      return Promise.resolve();
    }),
  };
  return builder;
}

function createDeleteBuilder() {
  const builder = {
    where: vi.fn(() => {
      dbCalls.push({ operation: "delete.where", value: undefined });
      return Promise.resolve();
    }),
  };
  return builder;
}

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("admin profile chip actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.length = 0;
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockDb.insert.mockImplementation(() => createInsertBuilder());
    mockDb.update.mockImplementation(() => createUpdateBuilder());
    mockDb.delete.mockImplementation(() => createDeleteBuilder());
  });

  it("rejects non-admin users before mutating profile chips", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...adminUser, role: "user" });

    await expect(
      createProfileChipSection(formData({ title: "Riesgo" })),
    ).rejects.toThrow("No autorizado");

    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("creates a section with trimmed title and normalized sort order", async () => {
    await createProfileChipSection(
      formData({ title: "  Riesgo  ", sortOrder: "not-a-number" }),
    );

    expect(dbCalls[0]).toEqual({
      operation: "insert.values",
      value: { title: "Riesgo", sortOrder: 0 },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/profile-chips");
  });

  it("updates a section and rejects invalid section form data", async () => {
    await updateProfileChipSection(
      formData({ id: "section-id", title: " Liquidez ", sortOrder: "4" }),
    );

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({ title: "Liquidez", sortOrder: 4 }),
    });

    await expect(
      updateProfileChipSection(formData({ id: "section-id", title: " " })),
    ).rejects.toThrow("Datos inválidos");
  });

  it("deletes a section and revalidates the admin chip page", async () => {
    await deleteProfileChipSection("section-id");

    expect(dbCalls[0]).toEqual({
      operation: "delete.where",
      value: undefined,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/profile-chips");
  });

  it("creates a chip as active with trimmed content", async () => {
    await createProfileChip(
      formData({
        sectionId: "section-id",
        label: "  Horizonte  ",
        insertText: "  [horizonte]  ",
        sortOrder: "2",
      }),
    );

    expect(dbCalls[0]).toEqual({
      operation: "insert.values",
      value: {
        sectionId: "section-id",
        label: "Horizonte",
        insertText: "[horizonte]",
        sortOrder: 2,
        isActive: true,
      },
    });
  });

  it("updates a chip checkbox state and validates required chip data", async () => {
    await updateProfileChip(
      formData({
        id: "chip-id",
        label: " Objetivo ",
        insertText: " [objetivo] ",
        sortOrder: "3",
        isActive: "on",
      }),
    );

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({
        label: "Objetivo",
        insertText: "[objetivo]",
        sortOrder: 3,
        isActive: true,
      }),
    });

    await expect(
      updateProfileChip(formData({ id: "chip-id", label: "", insertText: "" })),
    ).rejects.toThrow("Datos inválidos");
  });

  it("deletes individual chips", async () => {
    await deleteProfileChip("chip-id");

    expect(dbCalls[0]).toEqual({
      operation: "delete.where",
      value: undefined,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/profile-chips");
  });
});
