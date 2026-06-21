import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AnalysisResultSchema,
  runClaudeAnalysis,
} from "@/lib/claude-analysis";
import { minimalAnalysisResult } from "../../tests/fixtures/analysis-result";

const mockGenerateText = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateText: mockGenerateText,
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (modelId: string) => modelId,
}));

describe("AnalysisResultSchema", () => {
  it("accepts a valid analysis result", () => {
    const parsed = AnalysisResultSchema.parse(minimalAnalysisResult());
    expect(parsed.topDestinations[0].ticker).toBe("VTI");
  });

  it("rejects invalid actions", () => {
    const invalid = minimalAnalysisResult({
      sellHoldWatch: [
        {
          symbol: "X",
          action: "BUY" as never,
          technicalReason: ["x"],
        },
      ],
    });

    expect(() => AnalysisResultSchema.parse(invalid)).toThrow();
  });
});

describe("runClaudeAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs Claude and parses a raw JSON analysis result", async () => {
    const analysis = minimalAnalysisResult();
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify(analysis),
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
      response: { modelId: "claude-sonnet-4-5" },
    });

    const result = await runClaudeAnalysis("Analizá este portfolio");

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-5",
        prompt: expect.stringContaining("Analizá este portfolio"),
      }),
    );
    expect(result).toEqual({
      result: analysis,
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      modelId: "claude-sonnet-4-5",
    });
  });

  it("strips markdown fences and falls back for missing usage metadata", async () => {
    const analysis = minimalAnalysisResult();
    mockGenerateText.mockResolvedValue({
      text: `\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``,
      usage: {},
      response: {},
    });

    const result = await runClaudeAnalysis("prompt");

    expect(result.result.topDestinations[0]?.ticker).toBe("VTI");
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
    expect(result.totalTokens).toBe(0);
    expect(result.modelId).toBe("claude-sonnet-4-5");
  });

  it("rejects invalid model JSON", async () => {
    mockGenerateText.mockResolvedValue({
      text: "{invalid",
      usage: {},
      response: {},
    });

    await expect(runClaudeAnalysis("prompt")).rejects.toThrow();
  });
});
