import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const BearishCandidateSchema = z.object({
  symbol: z.string(),
  reason: z.string(),
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
  technicalReason: z.string(),
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
  entryPlan: z.string(),
  thesis: z.string(),
  isNew: z.boolean(),
});

const ScenarioSchema = z.object({
  name: z.string(),
  description: z.string(),
  allocation: z.array(
    z.object({ ticker: z.string(), amount: z.string(), rationale: z.string() }),
  ),
  expectedOutcome: z.string(),
  mainRisk: z.string(),
});

export const AnalysisResultSchema = z.object({
  bearishCandidates: z.array(BearishCandidateSchema),
  allocationDiagnosis: z.object({
    byAssetClass: z.array(AllocationRowSchema),
    byRegion: z.array(RegionRowSchema),
    bySector: z.array(SectorRowSchema),
    summary: z.string(),
  }),
  sellHoldWatch: z.array(SellHoldWatchSchema),
  topDestinations: z.array(TopDestinationSchema),
  scenarios: z.object({
    investToday: ScenarioSchema,
    wait: ScenarioSchema,
  }),
  overallAssessment: z.string(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

const JSON_SCHEMA_HINT = `
Respond ONLY with a raw JSON object (no markdown, no code fences, no explanation).
The JSON must match this structure exactly:
{
  "bearishCandidates": [{ "symbol": "", "reason": "", "keyLevel": "", "exitTrigger": "", "estimatedExitCost": "", "alternative": "" }],
  "allocationDiagnosis": {
    "byAssetClass": [{ "category": "", "currentPct": 0, "targetMin": 0, "targetMax": 0, "status": "OK|UNDERWEIGHT|OVERWEIGHT", "comment": "" }],
    "byRegion": [{ "region": "", "currentPct": 0, "comment": "" }],
    "bySector": [{ "sector": "", "currentPct": 0, "comment": "" }],
    "summary": ""
  },
  "sellHoldWatch": [{ "symbol": "", "action": "SELL|HOLD|WATCH", "technicalReason": "", "keyLevel": "", "exitTrigger": "", "estimatedExitCost": "" }],
  "topDestinations": [{ "ticker": "", "name": "", "suggestedPct": 0, "role": "growth|defensive|hedge|income", "riskLevel": 1, "liquidity": "high|medium|low", "ter": "", "entryPlan": "", "thesis": "", "isNew": true }],
  "scenarios": {
    "investToday": { "name": "", "description": "", "allocation": [{ "ticker": "", "amount": "", "rationale": "" }], "expectedOutcome": "", "mainRisk": "" },
    "wait": { "name": "", "description": "", "allocation": [{ "ticker": "", "amount": "", "rationale": "" }], "expectedOutcome": "", "mainRisk": "" }
  },
  "overallAssessment": ""
}`;

export async function runClaudeAnalysis(prompt: string): Promise<AnalysisResult> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-5"),
    system:
      "You are an expert portfolio analyst. You MUST respond with a single raw JSON object and nothing else. No markdown code fences, no explanation — just the JSON.",
    prompt: prompt + "\n\n" + JSON_SCHEMA_HINT,
  });

  const cleaned = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  return AnalysisResultSchema.parse(parsed);
}
