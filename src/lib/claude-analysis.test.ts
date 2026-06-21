import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisResultSchema, runClaudeAnalysis } from "@/lib/claude-analysis";
import { minimalAnalysisResult } from "../../tests/fixtures/analysis-result";

const { mockGenerateText, mockAnthropic } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
  mockAnthropic: vi.fn((modelId: string) => ({ modelId })),
}));

vi.mock("ai", () => ({
  generateText: mockGenerateText,
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: mockAnthropic,
}));

describe("AnalysisResultSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("runs Claude analysis and parses fenced JSON responses", async () => {
    mockGenerateText.mockResolvedValue({
      text: `\`\`\`json
${JSON.stringify(minimalAnalysisResult())}
\`\`\``,
      usage: { inputTokens: undefined, outputTokens: 20, totalTokens: undefined },
      response: { modelId: undefined },
    });

    const result = await runClaudeAnalysis("Analizá este portfolio");

    expect(mockAnthropic).toHaveBeenCalledWith("claude-sonnet-4-5");
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: "claude-sonnet-4-5" },
        prompt: expect.stringContaining("Analizá este portfolio"),
      }),
    );
    expect(result.result.topDestinations[0].ticker).toBe("VTI");
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(20);
    expect(result.totalTokens).toBe(0);
    expect(result.modelId).toBe("claude-sonnet-4-5");
  });

  it("returns provided token usage and model id", async () => {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify(minimalAnalysisResult()),
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      response: { modelId: "claude-test-model" },
    });

    const result = await runClaudeAnalysis("Analizá este portfolio");

    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(20);
    expect(result.totalTokens).toBe(30);
    expect(result.modelId).toBe("claude-test-model");
  });
});
