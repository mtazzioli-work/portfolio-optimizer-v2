import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb } from "../../tests/helpers/db-mock";

const mockDb = createMockDb();
const { db, setSelectResult } = mockDb;

vi.mock("@/db", () => ({ db }));

describe("snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSelectResult([]);
  });

  it("throws when portfolio is missing", async () => {
    const { saveSnapshot } = await import("@/lib/snapshots");
    await expect(
      saveSnapshot("user_1", [{ symbol: "AAPL", positionValue: 100 }], "csv"),
    ).rejects.toThrow(/portfolio/i);
  });

  it("saves snapshot and positions", async () => {
    setSelectResult([{ id: "portfolio-1", userId: "user_1" }]);
    const { saveSnapshot } = await import("@/lib/snapshots");
    const id = await saveSnapshot(
      "user_1",
      [
        { symbol: "AAPL", position: 1, positionValue: 100 },
        { symbol: "MSFT", position: 2, positionValue: 200 },
      ],
      "text",
    );
    expect(id).toBe("generated-id");
    expect(db.insert).toHaveBeenCalled();
    expect(db.update).toHaveBeenCalled();
  });
});
