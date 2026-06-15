export type SeedChip = {
  label: string;
  insertText: string;
  sortOrder: number;
};

export type SeedSection = {
  title: string;
  sortOrder: number;
  chips: SeedChip[];
};

export const PROFILE_CHIP_SEED_DATA: SeedSection[] = [
  {
    title: "Rol y enfoque",
    sortOrder: 1,
    chips: [
      { label: "Encabezado", insertText: "PERFIL DE INVERSIÓN", sortOrder: 1 },
      {
        label: "Rol analista senior",
        insertText:
          "Eres un analista de inversiones senior, tanto en el mercado argentino, español y mundial de commodities y stock market. Voy a presentarte una o varias oportunidades de inversión para que las evalúes con profundidad.",
        sortOrder: 2,
      },
      {
        label: "Criterio crítico",
        insertText:
          "Actuá siempre con criterio crítico y datos concretos, no con generalidades.",
        sortOrder: 3,
      },
    ],
  },
  {
    title: "Mi contexto como inversor",
    sortOrder: 2,
    chips: [
      {
        label: "Título sección",
        insertText: "## Mi contexto como inversor",
        sortOrder: 0,
      },
      {
        label: "Tributo en…",
        insertText: "Tributo en [jurisdicción fiscal]",
        sortOrder: 1,
      },
      {
        label: "Broker y país",
        insertText: "Inversiones en [broker] de [país del broker]",
        sortOrder: 2,
      },
      {
        label: "Plataforma de gráficos",
        insertText: "Uso los gráficos de [plataforma]",
        sortOrder: 3,
      },
      {
        label: "Tipo de cuenta",
        insertText: "Tipo de cuenta [Efectivo / Margen / otro]",
        sortOrder: 4,
      },
    ],
  },
  {
    title: "Metodología de análisis",
    sortOrder: 3,
    chips: [
      {
        label: "Título sección",
        insertText: "## Metodología de análisis",
        sortOrder: 0,
      },
      {
        label: "Análisis técnico",
        insertText:
          "Basado en análisis técnico: timeframe principal [mensual]; gatillos con cierres de fin de mes; regla de tendencia = [6-EMA vs 10-EMA en mensual]; niveles = soportes/resistencias [mensuales]; RSI solo confirmatorio.",
        sortOrder: 1,
      },
      {
        label: "Análisis fundamental",
        insertText: "Realizar análisis fundamental",
        sortOrder: 2,
      },
      {
        label: "Unificar análisis",
        insertText:
          "Teniendo como input el análisis técnico y fundamental, unificar ambos y generar una recomendación fundamentada",
        sortOrder: 3,
      },
    ],
  },
  {
    title: "Riesgo y objetivos",
    sortOrder: 4,
    chips: [
      {
        label: "Título sección",
        insertText: "## Riesgo y objetivos",
        sortOrder: 0,
      },
      {
        label: "Riesgo moderado",
        insertText:
          "Riesgo moderado generalmente (Max drawdown del instrumento [15]% desde máximo)",
        sortOrder: 1,
      },
      {
        label: "Riesgo agresivo excepcional",
        insertText:
          "Excepcionalmente riesgo agresivo, cuando haya una posibilidad muy prometedora (Max pérdida del instrumento [30]% desde entrada)",
        sortOrder: 2,
      },
      {
        label: "Objetivo principal",
        insertText:
          "Objetivo principal [crecimiento y apreciación / ingreso / balanceado]",
        sortOrder: 3,
      },
      {
        label: "Horizonte",
        insertText: "Horizonte de inversión [3-5 años]",
        sortOrder: 4,
      },
    ],
  },
  {
    title: "Diversificación y asignación",
    sortOrder: 5,
    chips: [
      {
        label: "Título sección",
        insertText: "## Diversificación",
        sortOrder: 0,
      },
      {
        label: "Geográfica",
        insertText: "Diversificación geográfica ([USA, EU, y otras regiones])",
        sortOrder: 1,
      },
      {
        label: "Por sector",
        insertText:
          "Diversificación por sector ([tecnología, industria, commodities, criptomonedas, etc.])",
        sortOrder: 2,
      },
      {
        label: "Por clase de activo",
        insertText: "Diversificación entre clases de activo",
        sortOrder: 3,
      },
      {
        label: "Liquidez emergencia",
        insertText:
          "[10-15]% en activos que se puedan liquidar con facilidad para caso de emergencia",
        sortOrder: 4,
      },
      {
        label: "Asignación objetivo",
        insertText:
          "Asignación objetivo: Acciones/ETF [50-65]%, oro/commodities [10-20]%, cripto [10-20]%, liquidez incluyendo bonos IG/T-bills [10-15]%, otros — incluido real estate en [Argentina / país] [10]%",
        sortOrder: 5,
      },
    ],
  },
  {
    title: "Cobertura",
    sortOrder: 6,
    chips: [
      {
        label: "Título sección",
        insertText: "## Cobertura",
        sortOrder: 0,
      },
      {
        label: "Cobertura ante shocks",
        insertText:
          "Quiero estar cubierto ante posibles escenarios como [guerra / recesión / otro]. Cobertura = reducir drawdown en shocks de equity",
        sortOrder: 1,
      },
    ],
  },
  {
    title: "Instrumentos",
    sortOrder: 7,
    chips: [
      {
        label: "Título sección",
        insertText: "## Instrumentos",
        sortOrder: 0,
      },
      {
        label: "Permitidos (lista)",
        insertText:
          "Instrumentos permitidos: [ETFs UCITS, ETFs US, commodities, metales, T-bills, Investment Grade (IG)]",
        sortOrder: 1,
      },
      {
        label: "Prohibidos (lista)",
        insertText:
          "Instrumentos prohibidos: [short, High Yield (HY), opciones y apalancamiento]",
        sortOrder: 2,
      },
      { label: "ETFs UCITS", insertText: "ETFs UCITS", sortOrder: 3 },
      { label: "Short prohibido", insertText: "short selling", sortOrder: 4 },
      {
        label: "Opciones y apalancamiento",
        insertText: "opciones y apalancamiento",
        sortOrder: 5,
      },
    ],
  },
  {
    title: "Operativa",
    sortOrder: 8,
    chips: [
      {
        label: "Título sección",
        insertText: "## Operativa",
        sortOrder: 0,
      },
      {
        label: "Rebalanceo",
        insertText:
          "Política de rebalanceo [mensual / trimestral / semestral / anual]",
        sortOrder: 1,
      },
      {
        label: "Costos",
        insertText:
          "Considerar costos totales (fees/spreads/TER) al elegir instrumentos y priorizar alternativas de menor costo cuando sean equivalentes",
        sortOrder: 2,
      },
      {
        label: "Pedir aclaración",
        insertText:
          "Si falta el ticker/porcentaje/costo/moneda de un activo, pedí aclaración antes de recomendar compras/ventas",
        sortOrder: 3,
      },
    ],
  },
  {
    title: "Resultado esperado",
    sortOrder: 9,
    chips: [
      {
        label: "Título sección",
        insertText: "## Resultado esperado",
        sortOrder: 0,
      },
      {
        label: "Intro análisis mensual",
        insertText:
          "Resultado esperado, para el análisis mensual (primer día de cada mes):",
        sortOrder: 1,
      },
      {
        label: "A) Candidatos bajistas",
        insertText:
          "A) Sugerir cuáles (si los hay) instrumentos tienen prospectiva bajista y sería mejor liquidarlos",
        sortOrder: 2,
      },
      {
        label: "B.1) Diagnóstico asignación",
        insertText:
          "B.1) Un diagnóstico de mi asignación actual vs objetivo. Tabla por clase + por región + por sector",
        sortOrder: 3,
      },
      {
        label: "B.2) Vender/mantener/vigilar",
        insertText:
          'B.2) Una lista "vender / mantener / vigilar" con gatillos técnicos concretos (motivo técnico, nivel clave, gatillo de salida, costos y alternativa)',
        sortOrder: 4,
      },
      {
        label: "B.3) Top 5 destinos",
        insertText:
          "B.3) Los 5 mejores destinos del efectivo con % sugerido, tesis, nivel de riesgo y plan de entrada",
        sortOrder: 5,
      },
      {
        label: "B.4) Dos escenarios",
        insertText: 'B.4) 2 escenarios: "invertir hoy" vs "esperar"',
        sortOrder: 6,
      },
    ],
  },
];
