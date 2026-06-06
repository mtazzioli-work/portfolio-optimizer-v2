import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDrizzle, mockNeon } = vi.hoisted(() => ({
  mockDrizzle: vi.fn(),
  mockNeon: vi.fn(),
}));

vi.mock("@neondatabase/serverless", () => ({
  neon: mockNeon,
}));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: mockDrizzle,
}));

async function loadDbModule() {
  vi.resetModules();
  return import("@/db");
}

describe("db initializer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DATABASE_URL;
  });

  it("throws a clear error when DATABASE_URL is missing", async () => {
    const { getDb } = await loadDbModule();

    expect(() => getDb()).toThrow("DATABASE_URL is not set");
    expect(mockNeon).not.toHaveBeenCalled();
  });

  it("creates and caches the Neon Drizzle client lazily", async () => {
    process.env.DATABASE_URL = "postgres://example";
    const sqlClient = {};
    const dbClient = { select: vi.fn() };
    mockNeon.mockReturnValue(sqlClient);
    mockDrizzle.mockReturnValue(dbClient);
    const { getDb } = await loadDbModule();

    expect(getDb()).toBe(dbClient);
    expect(getDb()).toBe(dbClient);
    expect(mockNeon).toHaveBeenCalledOnce();
    expect(mockNeon).toHaveBeenCalledWith("postgres://example");
    expect(mockDrizzle).toHaveBeenCalledOnce();
    expect(mockDrizzle).toHaveBeenCalledWith(sqlClient, {
      schema: expect.any(Object),
    });
  });

  it("binds function properties through the db proxy", async () => {
    process.env.DATABASE_URL = "postgres://example";
    const dbClient = {
      marker: "db-client",
      select: vi.fn(function select(this: { marker: string }) {
        return this.marker;
      }),
    };
    mockNeon.mockReturnValue({});
    mockDrizzle.mockReturnValue(dbClient);
    const { db } = await loadDbModule();

    expect(db.select()).toBe("db-client");
  });
});
