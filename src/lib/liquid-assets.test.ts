import { describe, expect, it } from "vitest";
import {
  buildLiquidSummary,
  getLiquidAssetsEditorText,
} from "@/lib/liquid-assets";
import { LIQUID_EDITOR_CATEGORY } from "@/lib/liquid-assets-template";

describe("liquid-assets", () => {
  it("builds liquid summary from rows", () => {
    const summary = buildLiquidSummary([
      { category: "cash_usd", label: "Cash", amountUsd: 1000 },
      { category: "liquid_for_investing", label: "Invest", amountUsd: 5000 },
    ]);

    expect(summary.cashUsd).toBe(1000);
    expect(summary.liquidForInvesting).toBe(5000);
    expect(summary.stablecoins).toBe(0);
  });

  it("returns stored editor notes when present", () => {
    const text = getLiquidAssetsEditorText([
      {
        category: LIQUID_EDITOR_CATEGORY,
        label: "editor",
        amountUsd: 0,
        notes: "custom editor text",
      },
    ]);
    expect(text).toBe("custom editor text");
  });

  it("returns default text for empty rows", () => {
    const text = getLiquidAssetsEditorText([]);
    expect(text).toContain("ACTIVOS LÍQUIDOS");
  });

  it("serializes stored rows when editor notes are blank", () => {
    const text = getLiquidAssetsEditorText([
      {
        category: LIQUID_EDITOR_CATEGORY,
        label: "editor",
        amountUsd: 0,
        notes: "   ",
      },
      {
        category: "cash_usd",
        label: "Efectivo ocioso",
        amountUsd: 250,
      },
    ]);

    expect(text).toContain("- Efectivo ocioso: $250 USD");
  });
});
