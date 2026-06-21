export const LIQUID_EDITOR_CATEGORY = "__editor__" as const;

export type LiquidAssetEntry = {
  category: string;
  label: string;
  amountUsd: number;
};

export const LIQUID_ASSETS_TEMPLATE: LiquidAssetEntry[] = [
  { category: "real_estate", label: "Inmuebles / bienes raíces", amountUsd: 0 },
  { category: "crypto", label: "Crypto (fuera del broker)", amountUsd: 0 },
  { category: "stablecoins", label: "Stablecoins", amountUsd: 0 },
  {
    category: "liquid_for_investing",
    label: "Efectivo disponible para invertir",
    amountUsd: 0,
  },
  { category: "cash_usd", label: "Efectivo ocioso", amountUsd: 0 },
];

export function liquidAssetsFromDb(
  rows: { category: string; label: string; amountUsd: number }[],
): LiquidAssetEntry[] {
  const dataRows = rows.filter((r) => r.category !== LIQUID_EDITOR_CATEGORY);
  if (dataRows.length === 0) return LIQUID_ASSETS_TEMPLATE;
  return dataRows.map((r) => ({
    category: r.category,
    label: r.label,
    amountUsd: r.amountUsd,
  }));
}
