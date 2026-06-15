import { describe, expect, it } from "vitest";
import { getBuenosAiresMonthRange } from "@/lib/quota";

describe("getBuenosAiresMonthRange", () => {
  it("returns UTC instants for the Buenos Aires calendar month", () => {
    const { start, end } = getBuenosAiresMonthRange(
      new Date("2026-06-15T12:00:00.000Z"),
    );

    expect(start.toISOString()).toBe("2026-06-01T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-01T03:00:00.000Z");
  });

  it("handles year rollover in December", () => {
    const { start, end } = getBuenosAiresMonthRange(
      new Date("2026-12-31T23:59:59.000Z"),
    );

    expect(start.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("uses the Buenos Aires month for UTC times near a boundary", () => {
    const { start, end } = getBuenosAiresMonthRange(
      new Date("2026-07-01T01:00:00.000Z"),
    );

    expect(start.toISOString()).toBe("2026-06-01T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-01T03:00:00.000Z");
  });
});
