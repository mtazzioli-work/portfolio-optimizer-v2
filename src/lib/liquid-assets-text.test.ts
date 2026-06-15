import { describe, expect, it } from "vitest";
import {
  LIQUID_CATEGORIES,
  getDefaultLiquidAssetsText,
  parseLiquidAssetsFromEditing,
  serializeLiquidAssetsForEditing,
} from "@/lib/liquid-assets-text";
import { LIQUID_ASSETS_TEMPLATE } from "@/lib/liquid-assets-template";

describe("liquid assets editing text", () => {
  it("serializes the template and parses all canonical categories", () => {
    const text = serializeLiquidAssetsForEditing([
      { category: "cash_usd", label: "Efectivo ocioso", amountUsd: 1_000 },
      {
        category: "liquid_for_investing",
        label: "Efectivo disponible para invertir",
        amountUsd: 2_500,
      },
    ]);

    expect(text).toContain("- Efectivo ocioso: $1,000 USD");
    expect(text).toContain("- Efectivo disponible para invertir: $2,500 USD");

    expect(getDefaultLiquidAssetsText()).toContain("ACTIVOS LÍQUIDOS");

    const parsed = parseLiquidAssetsFromEditing(`- Efectivo ocioso: $1,000 USD
- Efectivo disponible para invertir: $2,500 USD
- Stablecoins: $3,000.50 USD
- Crypto (fuera del broker): $4,000 USD
- Inmuebles / bienes raíces: $5,000 USD`);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.entries.map((e) => e.category)).toEqual([...LIQUID_CATEGORIES]);
      expect(parsed.entries.find((e) => e.category === "cash_usd")?.amountUsd).toBe(1_000);
      expect(parsed.entries.find((e) => e.category === "stablecoins")?.amountUsd).toBe(3_000.5);
    }
  });

  it("fills missing categories with zero-valued template rows", () => {
    const parsed = parseLiquidAssetsFromEditing("- Efectivo ocioso: $100 USD");

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.entries).toHaveLength(LIQUID_CATEGORIES.length);
      expect(parsed.entries.find((e) => e.category === "cash_usd")?.amountUsd).toBe(100);
      expect(parsed.entries.find((e) => e.category === "crypto")).toEqual({
        category: "crypto",
        label: LIQUID_ASSETS_TEMPLATE.find((e) => e.category === "crypto")?.label,
        amountUsd: 0,
      });
    }
  });

  it("returns useful errors for invalid or missing liquid asset rows", () => {
    expect(parseLiquidAssetsFromEditing("sin filas reconocidas")).toEqual({
      ok: false,
      error:
        "No se encontraron categorías válidas. Usá el formato: - Efectivo ocioso: $0 USD",
    });

    expect(parseLiquidAssetsFromEditing("- Efectivo ocioso: $abc USD")).toEqual({
      ok: false,
      error: 'Monto inválido en la línea: "- Efectivo ocioso: $abc USD"',
    });

    const tooLarge = parseLiquidAssetsFromEditing(
      "- Efectivo ocioso: $1000000001 USD",
    );
    expect(tooLarge).toEqual({ ok: false, error: "Datos de activos líquidos inválidos." });
  });
});
