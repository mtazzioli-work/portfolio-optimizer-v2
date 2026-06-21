import { describe, expect, it } from "vitest";
import {
  LIQUID_ASSETS_TEMPLATE,
  LIQUID_EDITOR_CATEGORY,
  liquidAssetsFromDb,
} from "@/lib/liquid-assets-template";

describe("liquid-assets-template", () => {
  it("returns template when db rows are empty", () => {
    expect(liquidAssetsFromDb([])).toEqual(LIQUID_ASSETS_TEMPLATE);
  });

  it("filters editor category rows", () => {
    const rows = [
      { category: "cash_usd", label: "Cash", amountUsd: 100 },
      { category: LIQUID_EDITOR_CATEGORY, label: "editor", amountUsd: 0 },
    ];
    expect(liquidAssetsFromDb(rows)).toEqual([
      { category: "cash_usd", label: "Cash", amountUsd: 100 },
    ]);
  });
});
