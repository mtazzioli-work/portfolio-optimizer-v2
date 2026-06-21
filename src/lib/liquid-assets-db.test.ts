import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb } from "../../tests/helpers/db-mock";

const mockDb = createMockDb();
const { db } = mockDb;

vi.mock("@/db", () => ({ db }));

describe("liquid-assets db", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads liquid assets rows for user", async () => {
    db.select.mockImplementation(() => ({
      from: () => ({
        where: () =>
          Promise.resolve([
            { category: "cash_usd", label: "Cash", amountUsd: 50, userId: "u1" },
          ]),
      }),
    }));

    const { getLiquidAssetsForUser } = await import("@/lib/liquid-assets");
    const rows = await getLiquidAssetsForUser("u1");
    expect(rows).toHaveLength(1);
  });
});
