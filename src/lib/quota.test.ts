import { describe, expect, it } from "vitest";
import { getBuenosAiresMonthRange } from "@/lib/quota";

describe("quota", () => {
  it("returns month boundaries in Buenos Aires timezone", () => {
    const { start, end } = getBuenosAiresMonthRange(
      new Date("2026-03-15T15:00:00Z"),
    );

    expect(start.toISOString()).toContain("2026-03-01");
    expect(end.toISOString()).toContain("2026-04-01");
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it("handles december rollover", () => {
    const { start, end } = getBuenosAiresMonthRange(
      new Date("2026-12-20T12:00:00Z"),
    );

    expect(start.toISOString()).toContain("2026-12-01");
    expect(end.toISOString()).toContain("2027-01-01");
  });
});
