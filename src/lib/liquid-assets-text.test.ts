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

  it("rejects malformed numeric amounts", () => {
    const result = parseLiquidAssetsFromEditing("- Efectivo ocioso: $. USD");

    expect(result).toEqual({
      ok: false,
      error: 'Monto inválido en la línea: "- Efectivo ocioso: $. USD"',
    });
  });

  it("treats blank amounts as zero", () => {
    const result = parseLiquidAssetsFromEditing("- Efectivo ocioso: $   USD");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entries.find((e) => e.category === "cash_usd")?.amountUsd).toBe(
        0,
      );
    }
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
