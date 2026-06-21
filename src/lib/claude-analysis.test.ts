import { describe, expect, it, vi } from "vitest";
import { AnalysisResultSchema, runClaudeAnalysis } from "@/lib/claude-analysis";
import { minimalAnalysisResult } from "../../tests/fixtures/analysis-result";

const { anthropicMock, generateTextMock } = vi.hoisted(() => ({
  anthropicMock: vi.fn(() => ({ provider: "anthropic", modelId: "test-model" })),
  generateTextMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: generateTextMock,
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: anthropicMock,
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

  it("runs Claude analysis and parses fenced JSON", async () => {
    const analysis = minimalAnalysisResult();
    generateTextMock.mockResolvedValueOnce({
      text: `\`\`\`json\n${JSON.stringify(analysis)}\n\`\`\``,
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
      response: { modelId: "claude-test" },
    });

    const result = await runClaudeAnalysis("Analyze this portfolio");

    expect(anthropicMock).toHaveBeenCalledWith("claude-sonnet-4-5");
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("Analyze this portfolio"),
      }),
    );
    expect(result).toEqual({
      result: analysis,
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      modelId: "claude-test",
    });
  });

  it("defaults usage metadata when the provider omits it", async () => {
    const analysis = minimalAnalysisResult();
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify(analysis),
      usage: {},
      response: {},
    });

    await expect(runClaudeAnalysis("Analyze this portfolio")).resolves.toEqual({
      result: analysis,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      modelId: "claude-sonnet-4-5",
    });
  });

  it("rejects invalid model JSON", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({ topDestinations: [] }),
      usage: {},
      response: {},
    });

    await expect(runClaudeAnalysis("Analyze this portfolio")).rejects.toThrow();
  });
});
