import { describe, expect, it } from "vitest";
import { buildSignals, ema, rsi } from "@/lib/indicators";

describe("technical indicators", () => {
  it("computes exponential moving averages", () => {
    expect(ema([], 6)).toEqual([]);
    expect(ema([10, 20, 30], 2).map((n) => Number(n.toFixed(4)))).toEqual([
      10, 16.6667, 25.5556,
    ]);
  });

  it("returns NaN RSI values until there is enough history", () => {
    const values = rsi([1, 2, 3], 14);
    expect(values).toHaveLength(3);
    expect(values.every(Number.isNaN)).toBe(true);
  });

  it("computes RSI gains and losses using Wilder smoothing", () => {
    const values = rsi([1, 2, 3, 2, 4, 5], 3).map((n) =>
      Number.isNaN(n) ? n : Number(n.toFixed(2)),
    );

    expect(values.slice(0, 3).every(Number.isNaN)).toBe(true);
    expect(values[3]).toBe(66.67);
    expect(values[4]).toBe(83.33);
    expect(values[5]).toBe(87.88);
  });

  it("builds trend and crossover rows from monthly bars", () => {
    const rows = buildSignals([
      { date: "2026-01", close: 10 },
      { date: "2026-02", close: 9 },
      { date: "2026-03", close: 8 },
      { date: "2026-04", close: 20 },
    ]);

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ date: "2026-01", close: 10, cross: 0 });
    expect(rows.some((row) => row.cross === 1 || row.cross === -1)).toBe(true);
    expect(rows.every((row) => typeof row.trendUp === "boolean")).toBe(true);
  });
});
