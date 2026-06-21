import { describe, expect, it } from "vitest";
import { AnalysisResultSchema } from "@/lib/claude-analysis";
import { minimalAnalysisResult } from "../../tests/fixtures/analysis-result";

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
