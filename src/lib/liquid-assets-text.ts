import { z } from "zod";
import {
  LIQUID_ASSETS_TEMPLATE,
  type LiquidAssetEntry,
} from "@/lib/liquid-assets-template";

export const LIQUID_CATEGORIES = [
  "real_estate",
  "crypto",
  "stablecoins",
  "liquid_for_investing",
  "cash_usd",
] as const;

const MAX_LIQUID_ENTRIES = 20;

const LiquidAssetInputSchema = z.object({
  category: z.enum(LIQUID_CATEGORIES),
  label: z.string().min(1).max(120),
  amountUsd: z.number().min(0).max(1_000_000_000),
});

export const LiquidAssetsArraySchema = z
  .array(LiquidAssetInputSchema)
  .max(MAX_LIQUID_ENTRIES);

const LABEL_TO_CATEGORY: Record<string, (typeof LIQUID_CATEGORIES)[number]> = {
  "inmuebles / bienes raíces": "real_estate",
  "crypto (fuera del broker)": "crypto",
  stablecoins: "stablecoins",
  "efectivo disponible para invertir": "liquid_for_investing",
  "efectivo ocioso": "cash_usd",
};

function parseUsdAmount(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "").replace(/usd/gi, "").trim();
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function serializeLiquidAssetsForEditing(
  entries: LiquidAssetEntry[],
): string {
  const lines = entries.map(
    (e) => `- ${e.label}: $${e.amountUsd.toLocaleString("en-US")} USD`,
  );

  return `ACTIVOS LÍQUIDOS

Declará activos fuera del broker para contexto de asignación en tus reviews.

${lines.join("\n")}

NOTAS:
(opcional)`.trim();
}

export function getDefaultLiquidAssetsText(): string {
  return serializeLiquidAssetsForEditing(LIQUID_ASSETS_TEMPLATE);
}

export function parseLiquidAssetsFromEditing(
  text: string,
): { ok: true; entries: LiquidAssetEntry[] } | { ok: false; error: string } {
  const entries: LiquidAssetEntry[] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^-\s*(.+?):\s*\$?(.+?)\s*(?:USD)?\s*$/i);
    if (!match) continue;

    const label = match[1].trim();
    const category = LABEL_TO_CATEGORY[label.toLowerCase()];
    if (!category) continue;

    const amountUsd = parseUsdAmount(match[2]);
    if (amountUsd === null) {
      return {
        ok: false,
        error: `Monto inválido en la línea: "${line.trim()}"`,
      };
    }

    entries.push({ category, label, amountUsd });
  }

  if (entries.length === 0) {
    return {
      ok: false,
      error:
        "No se encontraron categorías válidas. Usá el formato: - Efectivo ocioso: $0 USD",
    };
  }

  const parsed = LiquidAssetsArraySchema.safeParse(entries);
  if (!parsed.success) {
    return { ok: false, error: "Datos de activos líquidos inválidos." };
  }

  const templateLabels = new Map(
    LIQUID_ASSETS_TEMPLATE.map((e) => [e.category, e.label]),
  );
  const complete = LIQUID_CATEGORIES.map((category) => {
    const found = parsed.data.find((e) => e.category === category);
    return (
      found ?? {
        category,
        label: templateLabels.get(category) ?? category,
        amountUsd: 0,
      }
    );
  });

  return { ok: true, entries: complete };
}
