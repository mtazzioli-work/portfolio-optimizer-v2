import { describe, expect, it } from "vitest";
import {
  getDefaultLiquidAssetsText,
  parseLiquidAssetsFromEditing,
  serializeLiquidAssetsForEditing,
} from "@/lib/liquid-assets-text";

describe("liquid-assets-text", () => {
  it("serializes and parses liquid assets", () => {
    const text = getDefaultLiquidAssetsText();
    expect(text).toContain("ACTIVOS LÍQUIDOS");

    const parsed = parseLiquidAssetsFromEditing(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.entries.length).toBeGreaterThan(0);
    }
  });

  it("rejects amounts above schema limit", () => {
    const result = parseLiquidAssetsFromEditing(
      "- Efectivo ocioso: $9999999999 USD",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects empty valid categories", () => {
    const result = parseLiquidAssetsFromEditing("sin categorías válidas");
    expect(result.ok).toBe(false);
  });

  it("round-trips custom entries", () => {
    const entries = [
      {
        category: "cash_usd" as const,
        label: "Efectivo ocioso",
        amountUsd: 1000,
      },
    ];
    const text = serializeLiquidAssetsForEditing(entries);
    const parsed = parseLiquidAssetsFromEditing(text);
    expect(parsed.ok).toBe(true);
  });
});
