import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";
import { DEFAULT_INVESTMENT_PROFILE } from "@/lib/default-investment-profile";

const { mockAuth, mockCurrentUser, mockDb, insertValues } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCurrentUser: vi.fn(),
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  insertValues: [] as Array<{ table: unknown; values: unknown }>,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));

vi.mock("@/db", () => ({ db: mockDb }));

import { getDbUser, getOrCreateUser } from "@/lib/users";

const baseUser: User = {
  clerkUserId: "user_123",
  email: "user@example.com",
  accessStatus: "pending",
  role: "user",
  monthlyReviewLimit: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function mockSelectResults(results: User[][]) {
  const queue = [...results];
  mockDb.select.mockImplementation(() => {
    const query = {
      from: vi.fn(),
      where: vi.fn(),
      limit: vi.fn(),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.limit.mockResolvedValue(queue.shift() ?? []);
    return query;
  });
}

function mockInsertReturning(results: User[][]) {
  const returningQueue = [...results];
  mockDb.insert.mockImplementation((table: unknown) => {
    const builder = {
      values: vi.fn((values: unknown) => {
        insertValues.push({ table, values });
        return builder;
      }),
      onConflictDoNothing: vi.fn(() => builder),
      returning: vi.fn(() => Promise.resolve(returningQueue.shift() ?? [])),
    };
    return builder;
  });
}

describe("users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValues.length = 0;
    delete process.env.BOOTSTRAP_ADMIN_EMAIL;
    mockSelectResults([]);
    mockInsertReturning([]);
  });

  it("fetches a database user by Clerk id", async () => {
    mockSelectResults([[baseUser]]);

    await expect(getDbUser("user_123")).resolves.toEqual(baseUser);
  });

  it("returns null when a database user does not exist", async () => {
    mockSelectResults([[]]);

    await expect(getDbUser("missing")).resolves.toBeNull();
  });

  it("returns null when there is no authenticated Clerk user", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    await expect(getOrCreateUser()).resolves.toBeNull();
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("returns the existing database user for an authenticated Clerk user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockSelectResults([[baseUser]]);

    await expect(getOrCreateUser()).resolves.toEqual(baseUser);
    expect(mockCurrentUser).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("returns null when Clerk has no email for a new authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: null,
      emailAddresses: [],
    });
    mockSelectResults([[]]);

    await expect(getOrCreateUser()).resolves.toBeNull();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("creates a pending user, portfolio, and investment profile for a new user", async () => {
    const created = { ...baseUser, accessStatus: "pending" as const };
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "user@example.com" },
      emailAddresses: [],
    });
    mockSelectResults([[]]);
    mockInsertReturning([[created]]);

    await expect(getOrCreateUser()).resolves.toEqual(created);
    expect(insertValues.map((call) => call.values)).toEqual([
      {
        clerkUserId: "user_123",
        email: "user@example.com",
        accessStatus: "pending",
        role: "user",
      },
      { userId: "user_123" },
      { userId: "user_123", rulesJson: DEFAULT_INVESTMENT_PROFILE },
    ]);
  });

  it("bootstraps the configured admin email as active admin", async () => {
    process.env.BOOTSTRAP_ADMIN_EMAIL = "ADMIN@example.com ";
    const created = {
      ...baseUser,
      email: "admin@example.com",
      accessStatus: "active" as const,
      role: "admin" as const,
    };
    mockAuth.mockResolvedValue({ userId: "admin_123" });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: null,
      emailAddresses: [{ emailAddress: "admin@example.com" }],
    });
    mockSelectResults([[]]);
    mockInsertReturning([[created]]);

    await expect(getOrCreateUser()).resolves.toEqual(created);
    expect(insertValues[0].values).toMatchObject({
      clerkUserId: "admin_123",
      email: "admin@example.com",
      accessStatus: "active",
      role: "admin",
    });
  });

  it("re-fetches the user when insert is skipped by a concurrent create", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "user@example.com" },
      emailAddresses: [],
    });
    mockSelectResults([[], [baseUser]]);
    mockInsertReturning([[]]);

    await expect(getOrCreateUser()).resolves.toEqual(baseUser);
    expect(insertValues).toHaveLength(1);
  });
});
