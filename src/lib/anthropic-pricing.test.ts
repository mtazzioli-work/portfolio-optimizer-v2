import { afterEach, describe, expect, it, vi } from "vitest";
import { estimateCostUsd } from "@/lib/anthropic-pricing";

describe("estimateCostUsd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses default Claude pricing per million tokens", () => {
    expect(estimateCostUsd(1_000_000, 1_000_000)).toBe(18);
    expect(estimateCostUsd(0, 0)).toBe(0);
  });

  it("supports non-negative environment overrides", () => {
    vi.stubEnv("ANTHROPIC_INPUT_PRICE_PER_M", "2.5");
    vi.stubEnv("ANTHROPIC_OUTPUT_PRICE_PER_M", "10");

    expect(estimateCostUsd(2_000_000, 500_000)).toBe(10);
  });

  it("falls back when environment overrides are invalid", () => {
    vi.stubEnv("ANTHROPIC_INPUT_PRICE_PER_M", "-1");
    vi.stubEnv("ANTHROPIC_OUTPUT_PRICE_PER_M", "not-a-number");

    expect(estimateCostUsd(1_000_000, 1_000_000)).toBe(18);
  });
});
