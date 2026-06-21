import { describe, expect, it } from "vitest";
import { buildSignals, ema, rsi } from "@/lib/indicators";

describe("indicators", () => {
  it("computes ema", () => {
    const values = [1, 2, 3, 4, 5];
    const result = ema(values, 3);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe(1);
    expect(result[4]).toBeGreaterThan(result[0]);
    expect(ema([], 3)).toEqual([]);
  });

  it("computes rsi", () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 + i);
    const result = rsi(values, 14);
    expect(result[19]).toBeGreaterThan(50);
    expect(Number.isNaN(result[0])).toBe(true);
    expect(rsi([1, 2, 3], 14).every(Number.isNaN)).toBe(true);
  });

  it("builds signals with crosses", () => {
    const bars = Array.from({ length: 20 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, "0")}-01`,
      close: 100 + i * (i % 3 === 0 ? -2 : 3),
    }));

    const signals = buildSignals(bars);
    expect(signals.length).toBe(bars.length);
    expect(signals[0]).toMatchObject({
      ema6: expect.any(Number),
      ema10: expect.any(Number),
      trendUp: expect.any(Boolean),
      cross: expect.any(Number),
    });
    expect(buildSignals([])).toEqual([]);
  });
});
