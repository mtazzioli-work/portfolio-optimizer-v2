export const ACTION_LABELS: Record<string, string> = {
  SELL: "Vender",
  HOLD: "Mantener",
  WATCH: "Observar",
};

export const ALLOCATION_STATUS_LABELS: Record<string, string> = {
  OK: "En rango",
  UNDERWEIGHT: "Subponderado",
  OVERWEIGHT: "Sobreponderado",
};

export const ROLE_LABELS: Record<string, string> = {
  growth: "Crecimiento",
  defensive: "Defensivo",
  hedge: "Cobertura",
  income: "Ingresos",
};

export const LIQUIDITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

export const STRATEGY_LABELS: Record<string, string> = {
  dca: "DCA",
  limit: "Orden límite",
  market: "Mercado",
  lump_sum: "Entrada única",
};

export const TRANSLATION_NOTES: Record<string, string> = {
  DCA: "Compra escalonada en el tiempo",
  TER: "Comisión anual del fondo (Total Expense Ratio)",
  RSI: "Índice de fuerza relativa",
  EMA: "Media móvil exponencial",
  ETF: "Fondo cotizado en bolsa",
};

export const REVIEW_GLOSSARY: { term: string; definition: string }[] = [
  { term: "DCA", definition: "Compra escalonada: dividir la inversión en varios tramos en el tiempo." },
  { term: "TER", definition: "Comisión anual que cobra un fondo por administrar el capital." },
  { term: "RSI", definition: "Indicador técnico que mide si un activo está sobrecomprado o sobrevendido." },
  { term: "EMA", definition: "Media móvil que da más peso a los precios recientes." },
];

export function labelForEnum(
  map: Record<string, string>,
  value: string,
): string {
  return map[value] ?? value;
}

export function translationNoteForTerm(term: string): string | null {
  return TRANSLATION_NOTES[term.toUpperCase()] ?? TRANSLATION_NOTES[term] ?? null;
}
