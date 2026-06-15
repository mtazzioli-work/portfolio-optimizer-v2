import { describe, expect, it } from "vitest";
import {
  LIQUID_ASSETS_TEMPLATE,
  LIQUID_EDITOR_CATEGORY,
  liquidAssetsFromDb,
} from "@/lib/liquid-assets-template";

describe("liquid asset template helpers", () => {
  it("returns the default template when no persisted data rows exist", () => {
    expect(liquidAssetsFromDb([])).toEqual(LIQUID_ASSETS_TEMPLATE);
    expect(
      liquidAssetsFromDb([
        { category: LIQUID_EDITOR_CATEGORY, label: "Editor text", amountUsd: 0 },
      ]),
    ).toEqual(LIQUID_ASSETS_TEMPLATE);
  });

  it("filters editor rows and maps persisted liquid asset rows", () => {
    expect(
      liquidAssetsFromDb([
        { category: LIQUID_EDITOR_CATEGORY, label: "Editor text", amountUsd: 0 },
        { category: "cash_usd", label: "Efectivo ocioso", amountUsd: 100 },
        { category: "crypto", label: "Crypto", amountUsd: 200 },
      ]),
    ).toEqual([
      { category: "cash_usd", label: "Efectivo ocioso", amountUsd: 100 },
      { category: "crypto", label: "Crypto", amountUsd: 200 },
    ]);
  });
});
