import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { EntryPlan } from "@/lib/claude-analysis";

const LOCALE = "es-419";

export function formatUsd(value: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? 0;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function roundUsd(value: number): number {
  return Math.round(value);
}

export function computeDestinationAmount(
  liquidForInvesting: number,
  suggestedPct: number,
): number {
  return roundUsd((liquidForInvesting * suggestedPct) / 100);
}

export function computeTrancheAmount(
  destinationAmount: number,
  tranchePct: number,
): number {
  return roundUsd((destinationAmount * tranchePct) / 100);
}

export function totalLiquidAssetsUsd(summary: {
  cashUsd: number;
  stablecoins: number;
  crypto: number;
  realEstate: number;
  liquidForInvesting: number;
}): number {
  return (
    summary.cashUsd +
    summary.stablecoins +
    summary.crypto +
    summary.realEstate +
    summary.liquidForInvesting
  );
}

export function computeTotalPortfolioUsd(
  snapshotTotalValueUsd: number | null | undefined,
  liquidSummary: {
    cashUsd: number;
    stablecoins: number;
    crypto: number;
    realEstate: number;
    liquidForInvesting: number;
  },
): number {
  const invested = snapshotTotalValueUsd ?? 0;
  return invested + totalLiquidAssetsUsd(liquidSummary);
}

export function parseTranchePctsFromString(entryPlan: string): number[] | null {
  const matches = [...entryPlan.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
  if (matches.length === 0) return null;
  const pcts = matches.map((m) => Number(m[1]));
  const sum = pcts.reduce((a, b) => a + b, 0);
  if (sum < 90 || sum > 110) return null;
  return pcts;
}

export type ResolvedTranche = {
  index: number;
  pctOfAllocation: number;
  timing: string;
  amountUsd: number;
  suggestedDate: string | null;
};

export function resolveEntryTranches(
  entryPlan: EntryPlan,
  destinationAmountUsd: number,
  reviewCreatedAt: Date,
): { tranches: ResolvedTranche[]; strategyLabel: string; summary: string } | null {
  if (typeof entryPlan === "string") {
    const pcts = parseTranchePctsFromString(entryPlan);
    if (!pcts) return null;
    const tranches = pcts.map((pct, i) => ({
      index: i + 1,
      pctOfAllocation: pct,
      timing: `Tramo ${i + 1}`,
      amountUsd: computeTrancheAmount(destinationAmountUsd, pct),
      suggestedDate: formatSuggestedTrancheDate(reviewCreatedAt, i + 1),
    }));
    return { tranches, strategyLabel: "DCA", summary: entryPlan };
  }

  const strategyLabels: Record<string, string> = {
    dca: "DCA",
    limit: "Límite",
    market: "Mercado",
    lump_sum: "Una sola entrada",
  };

  if (entryPlan.tranches && entryPlan.tranches.length > 0) {
    const tranches = entryPlan.tranches.map((t, i) => ({
      index: i + 1,
      pctOfAllocation: t.pctOfAllocation,
      timing: t.timing,
      amountUsd: computeTrancheAmount(destinationAmountUsd, t.pctOfAllocation),
      suggestedDate: formatSuggestedTrancheDate(reviewCreatedAt, i + 1),
    }));
    return {
      tranches,
      strategyLabel: strategyLabels[entryPlan.strategy] ?? entryPlan.strategy,
      summary: entryPlan.summary,
    };
  }

  if (entryPlan.strategy === "lump_sum" || entryPlan.strategy === "market") {
    return {
      tranches: [
        {
          index: 1,
          pctOfAllocation: 100,
          timing: "Inmediato",
          amountUsd: destinationAmountUsd,
          suggestedDate: formatSuggestedTrancheDate(reviewCreatedAt, 0),
        },
      ],
      strategyLabel: strategyLabels[entryPlan.strategy] ?? entryPlan.strategy,
      summary: entryPlan.summary,
    };
  }

  return null;
}

function formatSuggestedTrancheDate(reviewCreatedAt: Date, monthOffset: number): string | null {
  if (monthOffset === 0) {
    return format(reviewCreatedAt, "d MMM yyyy", { locale: es });
  }
  return format(addDays(reviewCreatedAt, monthOffset * 30), "d MMM yyyy", {
    locale: es,
  });
}

export function roundingResidue(
  amounts: number[],
  expectedTotal: number,
): number {
  return expectedTotal - amounts.reduce((a, b) => a + b, 0);
}

export function amountsDifferMoreThan(
  a: number,
  b: number,
  thresholdPct: number,
): boolean {
  if (b === 0) return a !== 0;
  return Math.abs(a - b) / b > thresholdPct / 100;
}
