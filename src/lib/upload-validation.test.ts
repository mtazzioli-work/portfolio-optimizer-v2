import { describe, expect, it } from "vitest";
import {
  assertCsvTextSize,
  assertPositionCount,
  MAX_CSV_BYTES,
  MAX_POSITIONS,
  validateCsvFile,
} from "@/lib/upload-validation";

describe("upload-validation", () => {
  it("accepts valid csv files", () => {
    const file = new File(["a,b\n1,2"], "portfolio.csv", { type: "text/csv" });
    expect(() => validateCsvFile(file)).not.toThrow();
  });

  it("rejects oversized files", () => {
    const file = new File(["x"], "big.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: MAX_CSV_BYTES + 1 });
    expect(() => validateCsvFile(file)).toThrow(/demasiado grande/i);
  });

  it("rejects invalid mime and extension", () => {
    const file = new File(["x"], "data.bin", { type: "application/octet-stream" });
    expect(() => validateCsvFile(file)).toThrow(/inválido/i);
  });

  it("limits pasted csv text size", () => {
    const big = "a".repeat(MAX_CSV_BYTES + 1);
    expect(() => assertCsvTextSize(big)).toThrow(/demasiado grande/i);
    expect(() => assertCsvTextSize("symbol,quantity\nAAPL,1")).not.toThrow();
  });

  it("validates position counts", () => {
    expect(() => assertPositionCount(0)).toThrow(/No se encontraron/i);
    expect(() => assertPositionCount(MAX_POSITIONS + 1)).toThrow(/Demasiadas/i);
    expect(() => assertPositionCount(10)).not.toThrow();
  });
});
