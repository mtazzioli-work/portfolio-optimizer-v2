import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const BulletFieldSchema = z.union([z.string(), z.array(z.string())]);

const EntryPlanStructuredSchema = z.object({
  strategy: z.enum(["dca", "limit", "market", "lump_sum"]),
  summary: z.string(),
  tranches: z
    .array(
      z.object({
        pctOfAllocation: z.number(),
        timing: z.string(),
      }),
    )
    .optional(),
  limitPrice: z.string().optional(),
});

export const EntryPlanSchema = z.union([EntryPlanStructuredSchema, z.string()]);
export type EntryPlan = z.infer<typeof EntryPlanSchema>;
export type EntryPlanStructured = z.infer<typeof EntryPlanStructuredSchema>;

const BearishCandidateSchema = z.object({
  symbol: z.string(),
  reason: BulletFieldSchema,
  keyLevel: z.string(),
  exitTrigger: z.string(),
  estimatedExitCost: z.string(),
  alternative: z.string(),
});

const AllocationRowSchema = z.object({
  category: z.string(),
  currentPct: z.number(),
  targetMin: z.number(),
  targetMax: z.number(),
  status: z.enum(["OK", "UNDERWEIGHT", "OVERWEIGHT"]),
  comment: z.string().optional(),
});

const RegionRowSchema = z.object({
  region: z.string(),
  currentPct: z.number(),
  comment: z.string().optional(),
});

const SectorRowSchema = z.object({
  sector: z.string(),
  currentPct: z.number(),
  comment: z.string().optional(),
});

const SellHoldWatchSchema = z.object({
  symbol: z.string(),
  action: z.enum(["SELL", "HOLD", "WATCH"]),
  technicalReason: BulletFieldSchema,
  keyLevel: z.string().optional(),
  exitTrigger: z.string().optional(),
  estimatedExitCost: z.string().optional(),
});

const TopDestinationSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  suggestedPct: z.number(),
  role: z.enum(["growth", "defensive", "hedge", "income"]),
  riskLevel: z.number(),
  liquidity: z.enum(["high", "medium", "low"]),
  ter: z.string().optional(),
  entryPlan: EntryPlanSchema,
  thesis: BulletFieldSchema,
  isNew: z.boolean(),
});

const ScenarioAllocationSchema = z.object({
  ticker: z.string(),
  amountUsd: z.number(),
  pctOfCash: z.number().optional(),
  rationale: BulletFieldSchema,
});

const ScenarioSchema = z.object({
  name: z.string(),
  description: BulletFieldSchema,
  allocation: z.array(ScenarioAllocationSchema),
  expectedOutcome: BulletFieldSchema,
  mainRisk: BulletFieldSchema,
});

export const AnalysisResultSchema = z.object({
  bearishCandidates: z.array(BearishCandidateSchema),
  allocationDiagnosis: z.object({
    byAssetClass: z.array(AllocationRowSchema),
    byRegion: z.array(RegionRowSchema),
    bySector: z.array(SectorRowSchema),
    summary: BulletFieldSchema,
  }),
  sellHoldWatch: z.array(SellHoldWatchSchema),
  topDestinations: z.array(TopDestinationSchema),
  scenarios: z.object({
    investToday: ScenarioSchema,
    wait: ScenarioSchema,
  }),
  overallAssessment: BulletFieldSchema,
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type BulletField = z.infer<typeof BulletFieldSchema>;

export type ClaudeAnalysisResult = {
  result: AnalysisResult;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  modelId: string;
};

const JSON_SCHEMA_HINT = `
Respondé ÚNICAMENTE con un objeto JSON crudo (sin markdown, sin bloques de código, sin explicación).

IDIOMA: Todo texto legible para el usuario debe estar en español latinoamericano (categorías, regiones, sectores, comentarios, nombres de escenarios). Los enums JSON (SELL, HOLD, OK, growth, etc.) permanecen en inglés.

Usá arrays de strings (3–6 bullets concisos y accionables) para: overallAssessment, allocationDiagnosis.summary, reason, technicalReason, thesis, description, expectedOutcome, mainRisk, rationale.

El JSON debe coincidir exactamente con esta estructura:
{
  "bearishCandidates": [{ "symbol": "", "reason": ["bullet1"], "keyLevel": "", "exitTrigger": "", "estimatedExitCost": "", "alternative": "" }],
  "allocationDiagnosis": {
    "byAssetClass": [{ "category": "", "currentPct": 0, "targetMin": 0, "targetMax": 0, "status": "OK|UNDERWEIGHT|OVERWEIGHT", "comment": "" }],
    "byRegion": [{ "region": "", "currentPct": 0, "comment": "" }],
    "bySector": [{ "sector": "", "currentPct": 0, "comment": "" }],
    "summary": ["bullet1", "bullet2"]
  },
  "sellHoldWatch": [{ "symbol": "", "action": "SELL|HOLD|WATCH", "technicalReason": ["bullet"], "keyLevel": "", "exitTrigger": "", "estimatedExitCost": "" }],
  "topDestinations": [{
    "ticker": "", "name": "", "suggestedPct": 0, "role": "growth|defensive|hedge|income",
    "riskLevel": 1, "liquidity": "high|medium|low", "ter": "",
    "entryPlan": {
      "strategy": "dca|limit|market|lump_sum",
      "summary": "texto corto en español",
      "tranches": [{ "pctOfAllocation": 25, "timing": "Mes 1" }],
      "limitPrice": "opcional"
    },
    "thesis": ["bullet1"], "isNew": true
  }],
  "scenarios": {
    "investToday": {
      "name": "", "description": ["bullet"],
      "allocation": [{ "ticker": "", "amountUsd": 0, "pctOfCash": 0, "rationale": ["bullet"] }],
      "expectedOutcome": ["bullet"], "mainRisk": ["bullet"]
    },
    "wait": {
      "name": "", "description": ["bullet"],
      "allocation": [],
      "expectedOutcome": ["bullet"], "mainRisk": ["bullet"]
    }
  },
  "overallAssessment": ["bullet1", "bullet2"]
}

Reglas para entryPlan: si strategy es "dca", tranches es obligatorio y los pctOfAllocation deben sumar 100.
Reglas para topDestinations: suggestedPct debe sumar ~100 entre los 5 destinos.
Reglas para investToday.allocation: amountUsd debe ser consistente con suggestedPct × efectivo disponible.`;

const SYSTEM_PROMPT =
  "Sos un analista de portafolios experto. DEBÉS responder con un único objeto JSON crudo y nada más. Sin bloques markdown, sin explicación — solo el JSON.";

export async function runClaudeAnalysis(
  prompt: string,
): Promise<ClaudeAnalysisResult> {
  const { text, usage, response } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    prompt: prompt + "\n\n" + JSON_SCHEMA_HINT,
  });

  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const result = AnalysisResultSchema.parse(parsed);

  return {
    result,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
    modelId: response.modelId ?? "claude-sonnet-4-5",
  };
}
