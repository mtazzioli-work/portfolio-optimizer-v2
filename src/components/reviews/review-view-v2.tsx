import type { ReactNode } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BulletText } from "@/components/reviews/bullet-text";
import { type AnalysisResult } from "@/lib/claude-analysis";
import { buildOrderChecklist } from "@/lib/review-checklist";
import type { Position } from "@/db/schema";
import type { LiquidSummary } from "@/lib/analysis-prompt";
import {
  ACTION_LABELS,
  ALLOCATION_STATUS_LABELS,
  LIQUIDITY_LABELS,
  REVIEW_GLOSSARY,
  ROLE_LABELS,
  labelForEnum,
  translationNoteForTerm,
} from "@/lib/i18n/labels";
import {
  amountsDifferMoreThan,
  computeDestinationAmount,
  computeTotalPortfolioUsd,
  formatUsd,
  resolveEntryTranches,
  roundingResidue,
} from "@/lib/review-amounts";

const ACTION_STYLES: Record<string, string> = {
  SELL: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  HOLD: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  WATCH: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

const STATUS_STYLES: Record<string, string> = {
  OK: "text-green-700 dark:text-green-400",
  UNDERWEIGHT: "text-amber-700 dark:text-amber-400",
  OVERWEIGHT: "text-red-700 dark:text-red-400",
};

type Props = {
  result: AnalysisResult;
  liquidSummary: LiquidSummary;
  snapshotCapturedAt: Date | null;
  snapshotTotalValueUsd: number | null;
  positions: Position[];
  reviewCreatedAt: Date;
};

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-medium text-zinc-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TermWithNote({ term, children }: { term: string; children: ReactNode }) {
  const note = translationNoteForTerm(term);
  return (
    <span>
      {children}
      {note && (
        <span className="mt-0.5 block text-xs text-zinc-500">{note}</span>
      )}
    </span>
  );
}

function computeGapUsd(
  row: { currentPct: number; targetMin: number; targetMax: number; status: string },
  totalPortfolioUsd: number,
): string {
  if (row.status === "OK" || totalPortfolioUsd <= 0) return "—";
  const targetMid = (row.targetMin + row.targetMax) / 2;
  const deltaPct = row.status === "UNDERWEIGHT"
    ? targetMid - row.currentPct
    : row.currentPct - targetMid;
  const deltaUsd = Math.round((deltaPct / 100) * totalPortfolioUsd);
  const sign = row.status === "UNDERWEIGHT" ? "+" : "−";
  return `${sign}${formatUsd(deltaUsd)}`;
}

export function ReviewViewV2({
  result,
  liquidSummary,
  snapshotCapturedAt,
  snapshotTotalValueUsd,
  positions,
  reviewCreatedAt,
}: Props) {
  const liquidForInvesting = liquidSummary.liquidForInvesting;
  const totalPortfolioUsd = computeTotalPortfolioUsd(
    snapshotTotalValueUsd,
    liquidSummary,
  );

  const pctSum = result.topDestinations.reduce((s, d) => s + d.suggestedPct, 0);
  const destAmounts = result.topDestinations.map((d) =>
    computeDestinationAmount(liquidForInvesting, d.suggestedPct),
  );
  const assignedTotal = destAmounts.reduce((a, b) => a + b, 0);
  const pctGap = 100 - pctSum;
  const usdUnassigned = liquidForInvesting - assignedTotal;

  const sellCount = result.sellHoldWatch.filter((r) => r.action === "SELL").length;
  const watchCount = result.sellHoldWatch.filter((r) => r.action === "WATCH").length;
  const overweight = result.allocationDiagnosis.byAssetClass.find(
    (r) => r.status === "OVERWEIGHT" || r.status === "UNDERWEIGHT",
  );

  const checklist = buildOrderChecklist(
    result,
    liquidForInvesting,
    positions,
    reviewCreatedAt,
  );

  const scenarioMismatch = result.scenarios.investToday.allocation.some((a) => {
    const dest = result.topDestinations.find(
      (d) => d.ticker.toUpperCase() === a.ticker.toUpperCase(),
    );
    if (!dest) return false;
    const uiAmount = computeDestinationAmount(liquidForInvesting, dest.suggestedPct);
    return amountsDifferMoreThan(a.amountUsd, uiAmount, 5);
  });

  const navLinks = [
    { id: "resumen", label: "Resumen" },
    { id: "evaluacion", label: "Evaluación" },
    { id: "destinos", label: "Destinos" },
    { id: "escenarios", label: "Escenarios" },
    { id: "checklist", label: "Checklist" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p>
          <span className="font-medium">Efectivo disponible para invertir:</span>{" "}
          {formatUsd(liquidForInvesting)}
          {snapshotCapturedAt && (
            <>
              {" "}
              · <span className="font-medium">Snapshot:</span>{" "}
              {format(snapshotCapturedAt, "d MMM yyyy", { locale: es })}
            </>
          )}
          {snapshotTotalValueUsd != null && (
            <>
              {" "}
              · <span className="font-medium">Portafolio total:</span>{" "}
              {formatUsd(totalPortfolioUsd)}
            </>
          )}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        {navLinks.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            className="rounded-full border border-zinc-200 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {l.label}
          </a>
        ))}
      </nav>

      <Section id="resumen" title="Resumen de acciones">
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {sellCount > 0 && (
            <li>
              {sellCount} posición{sellCount > 1 ? "es" : ""} sugerida
              {sellCount > 1 ? "s" : ""} para <strong>vender</strong>
            </li>
          )}
          {watchCount > 0 && (
            <li>
              {watchCount} en <strong>observación</strong>
            </li>
          )}
          {overweight && (
            <li>
              Principal desbalance: {overweight.category} (
              {labelForEnum(ALLOCATION_STATUS_LABELS, overweight.status)})
            </li>
          )}
          <li>
            Capital a desplegar: {formatUsd(liquidForInvesting)} en{" "}
            {result.topDestinations.length} destinos
          </li>
          <li>Escenario sugerido: {result.scenarios.investToday.name}</li>
        </ul>
      </Section>

      <div
        id="evaluacion"
        className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 className="text-sm font-medium text-zinc-500">Evaluación general</h2>
        <div className="mt-2">
          <BulletText value={result.overallAssessment} />
        </div>
      </div>

      <Section title={`Candidatos bajistas (${result.bearishCandidates.length})`}>
        {result.bearishCandidates.length === 0 ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            Sin candidatos bajistas en este momento.
          </p>
        ) : (
          <div className="space-y-3">
            {result.bearishCandidates.map((c, i) => (
              <div
                key={i}
                className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
              >
                <p className="font-semibold">{c.symbol}</p>
                <BulletText
                  value={c.reason}
                  className="mt-1 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Nivel clave: {c.keyLevel} · Disparador: {c.exitTrigger}
                </p>
                {c.estimatedExitCost && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                    Costo estimado de salida: {c.estimatedExitCost}
                  </p>
                )}
                <p className="mt-1 text-xs">
                  <span className="font-medium">Alternativa:</span> {c.alternative}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Diagnóstico de asignación">
        <BulletText value={result.allocationDiagnosis.summary} />
        <h3 className="pt-2 text-sm font-medium">Por clase de activo</h3>
        <DataTable
          headers={["Clase", "Actual %", "Objetivo", "Estado", "Brecha", "Comentario"]}
          rows={result.allocationDiagnosis.byAssetClass.map((r) => [
            r.category,
            `${r.currentPct.toFixed(1)}%`,
            `${r.targetMin.toFixed(0)}–${r.targetMax.toFixed(0)}%`,
            <span key="s" className={STATUS_STYLES[r.status]}>
              {labelForEnum(ALLOCATION_STATUS_LABELS, r.status)}
            </span>,
            computeGapUsd(r, totalPortfolioUsd),
            r.comment ?? "—",
          ])}
        />
        <h3 className="pt-2 text-sm font-medium">Por región</h3>
        <DataTable
          headers={["Región", "Actual %", "Comentario"]}
          rows={result.allocationDiagnosis.byRegion.map((r) => [
            r.region,
            `${r.currentPct.toFixed(1)}%`,
            r.comment ?? "—",
          ])}
        />
        <h3 className="pt-2 text-sm font-medium">Por sector</h3>
        <DataTable
          headers={["Sector", "Actual %", "Comentario"]}
          rows={result.allocationDiagnosis.bySector.map((r) => [
            r.sector,
            `${r.currentPct.toFixed(1)}%`,
            r.comment ?? "—",
          ])}
        />
      </Section>

      <Section title="Vender / Mantener / Observar">
        {(["SELL", "WATCH", "HOLD"] as const).map((action) => {
          const items = result.sellHoldWatch.filter((r) => r.action === action);
          if (items.length === 0) return null;
          return (
            <div key={action} className="space-y-2">
              <h3 className="text-sm font-medium">
                {labelForEnum(ACTION_LABELS, action)} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.symbol}</span>
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[r.action]}`}
                      >
                        {labelForEnum(ACTION_LABELS, r.action)}
                      </span>
                    </div>
                    <BulletText
                      value={r.technicalReason}
                      className="mt-2 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400"
                    />
                    <p className="mt-2 text-xs text-zinc-500">
                      Nivel clave: {r.keyLevel ?? "—"} · Disparador:{" "}
                      {r.exitTrigger ?? "—"}
                    </p>
                    {r.estimatedExitCost && r.action === "SELL" && (
                      <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                        Costo estimado de salida: {r.estimatedExitCost}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Section>

      <Section id="destinos" title="Top destinos de inversión">
        {pctSum < 95 || pctSum > 105 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
            Asignado {pctSum.toFixed(0)}% del efectivo disponible
            {pctGap > 0
              ? ` — faltan ${formatUsd(Math.max(0, usdUnassigned))} sin asignar`
              : ` — excede en ${formatUsd(Math.abs(usdUnassigned))}`}
          </p>
        ) : null}

        <div className="space-y-3">
          {result.topDestinations.map((d, i) => {
            const destAmount = computeDestinationAmount(
              liquidForInvesting,
              d.suggestedPct,
            );
            const resolved = resolveEntryTranches(
              d.entryPlan,
              destAmount,
              reviewCreatedAt,
            );
            const trancheAmounts = resolved?.tranches.map((t) => t.amountUsd) ?? [];
            const residue =
              trancheAmounts.length > 0
                ? roundingResidue(trancheAmounts, destAmount)
                : 0;

            return (
              <div
                key={i}
                className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    #{i + 1} {d.ticker}
                  </span>
                  <span className="text-zinc-500">{d.name}</span>
                  {d.isNew && (
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      Nuevo
                    </span>
                  )}
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {d.suggestedPct.toFixed(0)}% del efectivo disponible ·{" "}
                    {formatUsd(destAmount)}
                  </span>
                </div>
                <BulletText value={d.thesis} className="mt-2 list-disc space-y-1 pl-5" />
                <p className="mt-2 text-xs text-zinc-500">
                  Rol: {labelForEnum(ROLE_LABELS, d.role)} · Riesgo: {d.riskLevel}/5 ·
                  Liquidez: {labelForEnum(LIQUIDITY_LABELS, d.liquidity)}
                  {d.ter && (
                    <>
                      {" "}
                      · <TermWithNote term="TER">TER: {d.ter}</TermWithNote>
                    </>
                  )}
                </p>

                {resolved ? (
                  <div className="mt-3 rounded bg-zinc-50 p-2 dark:bg-zinc-900">
                    <p className="text-xs font-medium">
                      <TermWithNote term="DCA">
                        Plan de entrada · {resolved.strategyLabel}
                      </TermWithNote>
                    </p>
                    <p className="text-xs text-zinc-500">{resolved.summary}</p>
                    <ul className="mt-2 space-y-1 text-xs">
                      {resolved.tranches.map((t) => (
                        <li key={t.index}>
                          Tramo {t.index} ({t.pctOfAllocation}%): {formatUsd(t.amountUsd)}{" "}
                          — {t.timing}
                          {t.suggestedDate && (
                            <span className="text-zinc-500">
                              {" "}
                              (sugerido: {t.suggestedDate})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs font-medium">
                      Total de esta posición: {formatUsd(destAmount)}
                    </p>
                    {residue !== 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {formatUsd(Math.abs(residue))} sin asignar por redondeo
                      </p>
                    )}
                  </div>
                ) : typeof d.entryPlan === "string" ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Entrada: {d.entryPlan} (montos de tramos no calculables)
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="escenarios" title="Escenarios">
        {scenarioMismatch && (
          <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300">
            Los montos del escenario &quot;Invertir hoy&quot; difieren más del 5%
            respecto al cálculo desde destinos.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {[result.scenarios.investToday, result.scenarios.wait].map((s, i) => (
            <div
              key={i}
              className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
            >
              <p className="font-semibold">{s.name}</p>
              <BulletText
                value={s.description}
                className="mt-1 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400"
              />
              {s.allocation.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {s.allocation.map((a, j) => {
                    const dest = result.topDestinations.find(
                      (d) => d.ticker.toUpperCase() === a.ticker.toUpperCase(),
                    );
                    const uiAmount = dest
                      ? computeDestinationAmount(liquidForInvesting, dest.suggestedPct)
                      : null;
                    return (
                      <li
                        key={j}
                        className="rounded bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900"
                      >
                        <span className="font-medium">{a.ticker}</span>
                        {" · "}
                        {formatUsd(a.amountUsd)}
                        {a.pctOfCash != null && ` (${a.pctOfCash.toFixed(0)}%)`}
                        {uiAmount != null &&
                          amountsDifferMoreThan(a.amountUsd, uiAmount, 5) && (
                            <span className="text-orange-600 dark:text-orange-400">
                              {" "}
                              · UI: {formatUsd(uiAmount)}
                            </span>
                          )}
                        <BulletText
                          value={a.rationale}
                          className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-zinc-500"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-3 text-xs">
                <span className="font-medium">Resultado esperado:</span>
                <BulletText
                  value={s.expectedOutcome}
                  className="mt-1 list-disc space-y-0.5 pl-4"
                />
              </div>
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                <span className="font-medium">Riesgo principal:</span>
                <BulletText
                  value={s.mainRisk}
                  className="mt-1 list-disc space-y-0.5 pl-4"
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="checklist" title="Checklist de órdenes">
        {checklist.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin órdenes sugeridas.</p>
        ) : (
          <DataTable
            headers={["Ticker", "Acción", "Monto", "Timing", "Origen"]}
            rows={checklist.map((row) => [
              row.ticker,
              <span
                key="a"
                className={
                  row.action === "VENTA"
                    ? "font-medium text-red-700 dark:text-red-400"
                    : "font-medium text-green-700 dark:text-green-400"
                }
              >
                {row.action}
              </span>,
              <span key="m">
                {row.amountLabel}
                {row.warning && (
                  <span className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">
                    {row.warning}
                  </span>
                )}
              </span>,
              row.timing,
              row.origin,
            ])}
          />
        )}
      </Section>

      <section className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500">Glosario</h2>
        <dl className="mt-2 space-y-2">
          {REVIEW_GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="font-medium">{g.term}</dt>
              <dd className="text-xs text-zinc-500">{g.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
