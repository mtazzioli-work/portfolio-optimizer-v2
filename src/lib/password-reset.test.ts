import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDelete = vi.fn();
const mockDeleteWhere = vi.fn();
const mockInsert = vi.fn();
const mockInsertValues = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/db", () => ({
  db: {
    delete: mockDelete,
    insert: mockInsert,
    select: mockSelect,
  },
}));

describe("password reset tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWhere.mockResolvedValue(undefined);
    mockInsertValues.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockInsert.mockReturnValue({ values: mockInsertValues });
  });

  it("hashes tokens deterministically", async () => {
    const { hashPasswordResetToken } = await import("@/lib/password-reset");
    const expected = createHash("sha256").update("abc").digest("hex");
    expect(hashPasswordResetToken("abc")).toBe(expected);
  });

  it("creates a token and replaces previous tokens for the user", async () => {
    const { createPasswordResetToken } = await import("@/lib/password-reset");
    const token = await createPasswordResetToken("user-1");

    expect(token.length).toBeGreaterThan(20);
    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
      }),
    );
  });

  it("finds a valid token user id", async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ userId: "user-1" }]),
        }),
      }),
    });

    const { findValidPasswordResetUserId } = await import("@/lib/password-reset");
    await expect(findValidPasswordResetUserId("token")).resolves.toBe("user-1");
  });

  it("returns null for missing or expired tokens", async () => {
    mockSelect.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    });

    const { findValidPasswordResetUserId } = await import("@/lib/password-reset");
    await expect(findValidPasswordResetUserId("token")).resolves.toBeNull();
  });

  it("consumes tokens by deleting their hash", async () => {
    const { consumePasswordResetToken, hashPasswordResetToken } = await import(
      "@/lib/password-reset"
    );

    await consumePasswordResetToken("token");

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockDeleteWhere).toHaveBeenCalledOnce();
    expect(hashPasswordResetToken("token")).toMatch(/^[a-f0-9]{64}$/);
  });
});
