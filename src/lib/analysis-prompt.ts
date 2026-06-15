import { type Position } from "@/db/schema";
import { profileDefinesOutputFormat } from "@/lib/investment-profile-text";
import { type SymbolAnalysis } from "@/lib/market-data";

export type LiquidSummary = {
  cashUsd: number;
  stablecoins: number;
  crypto: number;
  realEstate: number;
  liquidForInvesting: number;
};

function buildDefaultTaskSection(liquidForInvesting: number): string {
  return `TAREA: Realizá la revisión mensual del portafolio. Usá análisis técnico (señales EMA, RSI) Y fundamental como insumos.

Generá un análisis estructurado con las siguientes secciones. Todo el texto para el usuario en español latinoamericano.

A) CANDIDATOS BAJISTAS: Tenencias con señales bajistas (tendencia bajista, cruce bajista, soporte roto o fundamentales deteriorándose) a considerar para liquidación. Por cada una: razón (técnica + fundamental) como bullets, nivel clave, disparador de salida, costo estimado de salida, alternativa de reemplazo.

B1) DIAGNÓSTICO DE ASIGNACIÓN: Diagnosticá la asignación actual vs objetivos. Incluí:
  - Tabla por clase de activo (actual % vs objetivo min-max, status: OK/UNDERWEIGHT/OVERWEIGHT) — categorías en español
  - Tabla por región geográfica — regiones en español
  - Tabla por sector — sectores en español
  - summary como array de bullets accionables

B2) LISTA VENDER / MANTENER / OBSERVAR: Por cada posición: action (SELL/HOLD/WATCH), razón técnica en bullets, nivel clave, disparador de salida (si aplica), costo estimado de salida.

B3) TOP 5 DESTINOS DE INVERSIÓN: Los 5 mejores instrumentos para desplegar los $${liquidForInvesting.toFixed(0)} USD de efectivo disponible. Por cada uno: ticker, name, suggestedPct (deben sumar ~100%), role, riskLevel (1-5), liquidity, TER si se conoce, entryPlan estructurado (si DCA: tranches con pctOfAllocation que sumen 100 y timing en español), thesis en bullets.

B4) DOS ESCENARIOS:
  - "Invertir hoy": asignar el efectivo ahora según B3 — allocation con amountUsd numérico por ticker
  - "Esperar": condiciones/niveles a observar antes de entrar, riesgo de esperar demasiado — allocation vacío o sin montos fijos

Sé específico con niveles de precio y porcentajes. Referenciá las restricciones del inversor en todo el análisis.`;
}

function buildMinimalTaskSection(): string {
  return `TAREA: Realizá la revisión mensual del portafolio según el formato y las instrucciones definidas en el PERFIL DE INVERSIÓN DEL USUARIO arriba. Usá análisis técnico (señales EMA, RSI) Y fundamental como insumos. Todo el texto para el usuario en español latinoamericano. Sé específico con niveles de precio y porcentajes. Referenciá las restricciones del inversor en todo el análisis.`;
}

export function buildAnalysisPrompt(
  positions: Position[],
  symbolAnalyses: SymbolAnalysis[],
  liquidSummary: LiquidSummary,
  profileEditorText: string,
): string {
  const today = new Date().toISOString().slice(0, 10);

  const analysisMap = new Map(symbolAnalyses.map((a) => [a.symbol, a]));
  const positionRows = positions
    .filter(
      (p) =>
        !p.symbol?.toUpperCase().endsWith(".CNT") && (p.positionValue ?? 0) > 0,
    )
    .map((p) => {
      const a = analysisMap.get(p.symbol ?? "");
      const pnlPct =
        p.costBasisPrice && p.markPrice
          ? (((p.markPrice - p.costBasisPrice) / p.costBasisPrice) * 100).toFixed(1)
          : "N/A";
      const signal = a?.signal;
      const fund = a?.fundamentals;
      const trendLabel = signal
        ? signal.trendUp
          ? signal.lastCross === 1
            ? "CRUCE ALCISTA"
            : "TENDENCIA ALCISTA"
          : signal.lastCross === -1
            ? "CRUCE BAJISTA"
            : "TENDENCIA BAJISTA"
        : "N/A";

      return [
        `Símbolo: ${p.symbol}`,
        `  ISIN: ${p.isin ?? "N/A"} | Moneda: ${p.currency ?? "N/A"} | Categoría: ${p.assetCategory ?? "N/A"}/${p.subCategory ?? "N/A"} | País: ${p.issuerCountryCode ?? "N/A"}`,
        `  Posición: ${p.position?.toFixed(4) ?? "N/A"} unidades | Precio: ${p.markPrice?.toFixed(2) ?? "N/A"} | Valor de mercado: ${p.positionValue?.toFixed(2) ?? "N/A"} ${p.currency ?? ""}`,
        `  Costo base: ${p.costBasisPrice?.toFixed(4) ?? "N/A"} | P&L: ${pnlPct}%`,
        signal
          ? `  Técnico (mensual): ${trendLabel} | EMA6=${signal.ema6.toFixed(2)} EMA10=${signal.ema10.toFixed(2)} | RSI14=${signal.rsi14.toFixed(1)} | Último cierre: ${signal.closeAdj.toFixed(2)} (${signal.lastMonthEnd})`
          : "  Técnico: sin datos",
        fund && (fund.sector || fund.pe)
          ? `  Fundamental: Sector=${fund.sector ?? "N/A"} | Industria=${fund.industry ?? "N/A"} | P/E=${fund.pe?.toFixed(1) ?? "N/A"} | Fwd P/E=${fund.forwardPe?.toFixed(1) ?? "N/A"} | Crec. ingresos=${fund.revenueGrowth != null ? (fund.revenueGrowth * 100).toFixed(1) + "%" : "N/A"} | Márgenes=${fund.profitMargins != null ? (fund.profitMargins * 100).toFixed(1) + "%" : "N/A"}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    });

  const totalInvested = positions.reduce((s, p) => s + (p.positionValue ?? 0), 0);
  const totalPortfolio =
    totalInvested +
    liquidSummary.cashUsd +
    liquidSummary.stablecoins +
    liquidSummary.crypto +
    liquidSummary.realEstate;

  const taskSection = profileDefinesOutputFormat(profileEditorText)
    ? buildMinimalTaskSection()
    : buildDefaultTaskSection(liquidSummary.liquidForInvesting);

  return `
Fecha de hoy: ${today}
Tipo de análisis: Revisión mensual de portafolio (primer día hábil del mes)

PERFIL DE INVERSIÓN DEL USUARIO:
${profileEditorText.trim()}

---
RESUMEN DEL PORTAFOLIO ACTUAL:
- Invertido en acciones/ETFs (IB): ~$${totalInvested.toFixed(0)} USD
- Efectivo disponible para invertir: ~$${liquidSummary.liquidForInvesting.toFixed(0)} USD
- Efectivo ocioso: ~$${liquidSummary.cashUsd.toFixed(0)} USD
- Stablecoins: ~$${liquidSummary.stablecoins.toFixed(0)} USD
- Crypto (fuera del broker): ~$${liquidSummary.crypto.toFixed(0)} USD
- Inmuebles / otros ilíquidos: ~$${liquidSummary.realEstate.toFixed(0)} USD
- PORTAFOLIO TOTAL: ~$${totalPortfolio.toFixed(0)} USD

---
POSICIONES ACTUALES (${positions.filter((p) => (p.positionValue ?? 0) > 0).length} tenencias):

${positionRows.join("\n\n")}

---
${taskSection}
`.trim();
}
