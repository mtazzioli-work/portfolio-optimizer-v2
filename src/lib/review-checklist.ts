import type { AnalysisResult } from "@/lib/claude-analysis";
import type { Position } from "@/db/schema";
import {
  computeDestinationAmount,
  resolveEntryTranches,
} from "@/lib/review-amounts";

export type ChecklistRow = {
  ticker: string;
  action: "COMPRA" | "VENTA";
  amountUsd: number | null;
  amountLabel: string;
  timing: string;
  origin: string;
  warning?: string;
};

function positionValueBySymbol(
  positions: Position[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of positions) {
    const sym = p.symbol?.toUpperCase();
    if (!sym || (p.positionValue ?? 0) <= 0) continue;
    map.set(sym, (map.get(sym) ?? 0) + (p.positionValue ?? 0));
  }
  return map;
}

export function buildOrderChecklist(
  result: AnalysisResult,
  liquidForInvesting: number,
  positions: Position[],
  reviewCreatedAt: Date,
): ChecklistRow[] {
  const rows: ChecklistRow[] = [];

  result.topDestinations.forEach((dest, destIndex) => {
    const destAmount = computeDestinationAmount(
      liquidForInvesting,
      dest.suggestedPct,
    );
    const resolved = resolveEntryTranches(
      dest.entryPlan,
      destAmount,
      reviewCreatedAt,
    );

    if (resolved) {
      for (const t of resolved.tranches) {
        const timing =
          t.suggestedDate != null
            ? `${t.timing} (sugerido: ${t.suggestedDate})`
            : t.timing;
        rows.push({
          ticker: dest.ticker,
          action: "COMPRA",
          amountUsd: t.amountUsd,
          amountLabel: `USD ${t.amountUsd.toLocaleString("es-419")}`,
          timing,
          origin: `Destino #${destIndex + 1} · tramo ${t.index}`,
        });
      }
    } else {
      rows.push({
        ticker: dest.ticker,
        action: "COMPRA",
        amountUsd: destAmount,
        amountLabel: `USD ${destAmount.toLocaleString("es-419")}`,
        timing: "Ver plan de entrada",
        origin: `Destino #${destIndex + 1}`,
        warning: "Montos de tramos no calculables",
      });
    }
  });

  const posMap = positionValueBySymbol(positions);
  const sellSymbols = new Set<string>();

  for (const item of result.sellHoldWatch) {
    if (item.action !== "SELL") continue;
    const sym = item.symbol.toUpperCase();
    if (sellSymbols.has(sym)) continue;
    sellSymbols.add(sym);

    const pv = posMap.get(sym);
    rows.push({
      ticker: item.symbol,
      action: "VENTA",
      amountUsd: pv ?? null,
      amountLabel:
        pv != null
          ? `USD ${Math.round(pv).toLocaleString("es-419")}`
          : "—",
      timing: "Según disparador",
      origin: "Vender / Mantener / Observar",
      warning:
        pv == null
          ? `Sin posición en el snapshot${item.estimatedExitCost ? ` · hint: ${item.estimatedExitCost}` : ""}`
          : undefined,
    });
  }

  return rows;
}
