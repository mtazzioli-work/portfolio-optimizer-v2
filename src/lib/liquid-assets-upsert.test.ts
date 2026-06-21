import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultLiquidAssetsText } from "@/lib/liquid-assets-text";
import { createMockDb } from "../../tests/helpers/db-mock";

const mockDb = createMockDb();
const { db } = mockDb;

vi.mock("@/db", () => ({ db }));

describe("liquid-assets upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parse errors", async () => {
    const { upsertLiquidAssets } = await import("@/lib/liquid-assets");
    const result = await upsertLiquidAssets("user_1", "texto inválido");
    expect(result.error).toBeTruthy();
  });

  it("persists parsed liquid assets", async () => {
    const { upsertLiquidAssets } = await import("@/lib/liquid-assets");
    const result = await upsertLiquidAssets("user_1", getDefaultLiquidAssetsText());
    expect(result.error).toBeUndefined();
    expect(db.delete).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });
});
