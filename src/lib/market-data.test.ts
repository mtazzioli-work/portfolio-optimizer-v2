import { describe, expect, it } from "vitest";
import { candidateSymbols } from "@/lib/market-data";

describe("candidateSymbols", () => {
  it("uses overrides before built-in and raw symbol candidates", () => {
    expect(candidateSymbols("cspx", { CSPX: "CSPX.TEST" })).toEqual(["CSPX.TEST"]);
  });

  it("includes known provider aliases and the uppercase raw symbol", () => {
    expect(candidateSymbols("cspx")).toEqual(["CSPX.L", "SXR8.DE", "CSPX"]);
  });

  it("falls back to the uppercase raw symbol for unknown tickers", () => {
    expect(candidateSymbols("abc")).toEqual(["ABC"]);
  });
});
