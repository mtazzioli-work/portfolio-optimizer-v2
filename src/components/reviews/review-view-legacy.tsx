import type { ReactNode } from "react";

/** Formato de result JSON anterior a presentation v2. */
export type LegacyAnalysisResult = {
  overallAssessment: string;
  bearishCandidates: {
    symbol: string;
    reason: string;
    keyLevel: string;
    exitTrigger: string;
    estimatedExitCost?: string;
    alternative: string;
  }[];
  allocationDiagnosis: {
    summary: string;
    byAssetClass: {
      category: string;
      currentPct: number;
      targetMin: number;
      targetMax: number;
      status: string;
      comment?: string;
    }[];
    byRegion: { region: string; currentPct: number; comment?: string }[];
    bySector: { sector: string; currentPct: number; comment?: string }[];
  };
  sellHoldWatch: {
    symbol: string;
    action: string;
    technicalReason: string;
    keyLevel?: string;
    exitTrigger?: string;
    estimatedExitCost?: string;
  }[];
  topDestinations: {
    ticker: string;
    name: string;
    suggestedPct: number;
    role: string;
    riskLevel: number;
    liquidity: string;
    ter?: string;
    entryPlan: string;
    thesis: string;
    isNew?: boolean;
  }[];
  scenarios: {
    investToday: LegacyScenario;
    wait: LegacyScenario;
  };
};

type LegacyScenario = {
  name: string;
  description: string;
  allocation: { ticker: string; amount: string; rationale: string }[];
  expectedOutcome: string;
  mainRisk: string;
};

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

type Props = { result: LegacyAnalysisResult };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
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
            <tr
              key={i}
              className="border-b border-zinc-100 dark:border-zinc-800"
            >
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

export function ReviewViewLegacy({ result }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        Review generada con versión anterior del formato de presentación.
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500">Evaluación general</h2>
        <p className="mt-2 text-sm leading-relaxed">{result.overallAssessment}</p>
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
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{c.reason}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Nivel clave: {c.keyLevel} · Disparador: {c.exitTrigger} ·
                  Alternativa: {c.alternative}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Diagnóstico de asignación">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {result.allocationDiagnosis.summary}
        </p>
        <h3 className="pt-2 text-sm font-medium">Por clase de activo</h3>
        <DataTable
          headers={["Clase", "Actual %", "Objetivo", "Estado", "Comentario"]}
          rows={result.allocationDiagnosis.byAssetClass.map((r) => [
            r.category,
            `${r.currentPct.toFixed(1)}%`,
            `${r.targetMin.toFixed(0)}–${r.targetMax.toFixed(0)}%`,
            <span key="s" className={STATUS_STYLES[r.status]}>
              {r.status}
            </span>,
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
        <DataTable
          headers={["Símbolo", "Acción", "Razón técnica", "Nivel clave", "Disparador"]}
          rows={result.sellHoldWatch.map((r) => [
            r.symbol,
            <span
              key="a"
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[r.action] ?? ""}`}
            >
              {r.action}
            </span>,
            r.technicalReason,
            r.keyLevel ?? "—",
            r.exitTrigger ?? "—",
          ])}
        />
      </Section>

      <Section title="Top destinos de inversión">
        <div className="space-y-3">
          {result.topDestinations.map((d, i) => (
            <div
              key={i}
              className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  #{i + 1} {d.ticker}
                </span>
                <span className="text-zinc-500">{d.name}</span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                  {d.suggestedPct.toFixed(0)}% del efectivo
                </span>
              </div>
              <p className="mt-2">{d.thesis}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Rol: {d.role} · Riesgo: {d.riskLevel}/5 · Liquidez: {d.liquidity}
                {d.ter ? ` · TER: ${d.ter}` : ""} · Entrada: {d.entryPlan}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Escenarios">
        <div className="grid gap-4 md:grid-cols-2">
          {[result.scenarios.investToday, result.scenarios.wait].map((s, i) => (
            <div
              key={i}
              className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700"
            >
              <p className="font-semibold">{s.name}</p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">{s.description}</p>
              <ul className="mt-3 space-y-2">
                {s.allocation.map((a, j) => (
                  <li key={j} className="rounded bg-zinc-50 px-2 py-1.5 dark:bg-zinc-900">
                    <span className="font-medium">{a.ticker}</span> · {a.amount}
                    <p className="text-xs text-zinc-500">{a.rationale}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs">
                <span className="font-medium">Resultado esperado:</span> {s.expectedOutcome}
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                <span className="font-medium">Riesgo principal:</span> {s.mainRisk}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
