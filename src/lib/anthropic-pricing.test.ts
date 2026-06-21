import { afterEach, describe, expect, it } from "vitest";
import { estimateCostUsd } from "@/lib/anthropic-pricing";

describe("estimateCostUsd", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("uses default pricing", () => {
    delete process.env.ANTHROPIC_INPUT_PRICE_PER_M;
    delete process.env.ANTHROPIC_OUTPUT_PRICE_PER_M;
    expect(estimateCostUsd(1_000_000, 1_000_000)).toBe(18);
  });

  it("respects custom env pricing", () => {
    process.env.ANTHROPIC_INPUT_PRICE_PER_M = "10";
    process.env.ANTHROPIC_OUTPUT_PRICE_PER_M = "20";
    expect(estimateCostUsd(1_000_000, 0)).toBe(10);
    expect(estimateCostUsd(0, 1_000_000)).toBe(20);
  });
});
