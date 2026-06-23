import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";

const { mockDb, mockGetCurrentUser, mockRevalidatePath, dbCalls } = vi.hoisted(
  () => ({
    mockDb: {
      update: vi.fn(),
      insert: vi.fn(),
    },
    mockGetCurrentUser: vi.fn(),
    mockRevalidatePath: vi.fn(),
    dbCalls: [] as Array<{ operation: string; value: unknown }>,
  }),
);

vi.mock("@/db", () => ({ db: mockDb }));
vi.mock("@/lib/users", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

import {
  updateMonthlyReviewLimitDefault,
  updateUserAccessStatus,
  updateUserMonthlyReviewLimit,
  updateUserMonthlyReviewLimitFromForm,
} from "@/app/admin/actions";

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

function createInsertBuilder() {
  const builder = {
    values: vi.fn((value: unknown) => {
      dbCalls.push({ operation: "insert.values", value });
      return builder;
    }),
    onConflictDoUpdate: vi.fn((value: unknown) => {
      dbCalls.push({ operation: "insert.onConflictDoUpdate", value });
      return Promise.resolve();
    }),
  };
  return builder;
}

function formDataWithLimit(value: string) {
  const formData = new FormData();
  formData.set("limit", value);
  return formData;
}

describe("admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbCalls.length = 0;
    mockGetCurrentUser.mockResolvedValue(adminUser);
    mockDb.update.mockImplementation(() => createUpdateBuilder());
    mockDb.insert.mockImplementation(() => createInsertBuilder());
  });

  it("rejects non-admin users before mutating data", async () => {
    mockGetCurrentUser.mockResolvedValue({ ...adminUser, role: "user" });

    await expect(updateUserAccessStatus("user_123", "active")).rejects.toThrow(
      "No autorizado",
    );
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("updates a user's access status and revalidates the admin page", async () => {
    await updateUserAccessStatus("user_123", "paused");

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({ accessStatus: "paused" }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("updates a user's explicit monthly review limit", async () => {
    await updateUserMonthlyReviewLimit("user_123", 8);

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({ monthlyReviewLimit: 8 }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("upserts the default monthly review limit from form data", async () => {
    await updateMonthlyReviewLimitDefault(formDataWithLimit("5.9"));

    expect(dbCalls[0]).toEqual({
      operation: "insert.values",
      value: expect.objectContaining({ value: "5" }),
    });
    expect(dbCalls[1]).toEqual({
      operation: "insert.onConflictDoUpdate",
      value: expect.objectContaining({
        set: expect.objectContaining({ value: "5" }),
      }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it.each(["-1", "not-a-number"])(
    "rejects invalid default monthly review limits: %s",
    async (limit) => {
      await expect(
        updateMonthlyReviewLimitDefault(formDataWithLimit(limit)),
      ).rejects.toThrow("Límite inválido");
      expect(mockDb.insert).not.toHaveBeenCalled();
    },
  );

  it("converts blank per-user review limits to null", async () => {
    await updateUserMonthlyReviewLimitFromForm("user_123", formDataWithLimit(""));

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({ monthlyReviewLimit: null }),
    });
  });

  it("floors per-user review limits from form data", async () => {
    await updateUserMonthlyReviewLimitFromForm(
      "user_123",
      formDataWithLimit("7.8"),
    );

    expect(dbCalls[0]).toEqual({
      operation: "update.set",
      value: expect.objectContaining({ monthlyReviewLimit: 7 }),
    });
  });

  it.each(["-1", "not-a-number"])(
    "rejects invalid per-user review limits: %s",
    async (limit) => {
      await expect(
        updateUserMonthlyReviewLimitFromForm("user_123", formDataWithLimit(limit)),
      ).rejects.toThrow("Límite inválido");
      expect(mockDb.update).not.toHaveBeenCalled();
    },
  );
});
