import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb } from "../../tests/helpers/db-mock";

const mockGetSession = vi.fn();
const mockDb = createMockDb();
const { db, setSelectResult, selectChain } = mockDb;

vi.mock("@/lib/auth", () => ({
  getSessionFromCookies: () => mockGetSession(),
}));
vi.mock("@/db", () => ({ db }));

describe("users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.select.mockReturnValue(selectChain);
    setSelectResult([]);
    mockGetSession.mockResolvedValue(null);
  });

  it("returns null without session", async () => {
    const { getCurrentUser } = await import("@/lib/users");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns existing db user when session matches", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1", sessionVersion: 0 });
    setSelectResult([
      {
        id: "user-1",
        email: "user@example.com",
        role: "user",
        accessStatus: "active",
        sessionVersion: 0,
      },
    ]);
    const { getCurrentUser } = await import("@/lib/users");
    const user = await getCurrentUser();
    expect(user?.email).toBe("user@example.com");
  });

  it("returns null when session version is stale", async () => {
    mockGetSession.mockResolvedValue({ userId: "user-1", sessionVersion: 0 });
    setSelectResult([
      {
        id: "user-1",
        email: "user@example.com",
        role: "user",
        accessStatus: "active",
        sessionVersion: 1,
      },
    ]);
    const { getCurrentUser } = await import("@/lib/users");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("loads user by id", async () => {
    setSelectResult([
      {
        id: "user-1",
        email: "user@example.com",
        role: "user",
        accessStatus: "active",
        sessionVersion: 0,
      },
    ]);
    const { getDbUser } = await import("@/lib/users");
    const user = await getDbUser("user-1");
    expect(user?.email).toBe("user@example.com");
  });

  it("returns null when user id is missing", async () => {
    setSelectResult([]);
    const { getDbUser } = await import("@/lib/users");

    await expect(getDbUser("missing")).resolves.toBeNull();
  });
});
