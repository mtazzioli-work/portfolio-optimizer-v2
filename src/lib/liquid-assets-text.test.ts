import { describe, expect, it } from "vitest";
import {
  LIQUID_CATEGORIES,
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

  it("returns a complete category set when parsing partial input", () => {
    const parsed = parseLiquidAssetsFromEditing(
      "- Efectivo ocioso: $1,250 USD\n- Categoría desconocida: $99 USD",
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.entries.map((entry) => entry.category)).toEqual(
        LIQUID_CATEGORIES,
      );
      expect(
        parsed.entries.find((entry) => entry.category === "cash_usd")?.amountUsd,
      ).toBe(1250);
      expect(
        parsed.entries.find((entry) => entry.category === "real_estate")?.amountUsd,
      ).toBe(0);
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
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Monto inválido");
    }
  });

  it("treats empty amounts as zero", () => {
    const result = parseLiquidAssetsFromEditing("- Efectivo ocioso: $ USD");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.entries.find((entry) => entry.category === "cash_usd")?.amountUsd,
      ).toBe(0);
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
