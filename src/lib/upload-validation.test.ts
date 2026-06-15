import { describe, expect, it } from "vitest";
import {
  MAX_CSV_BYTES,
  MAX_POSITIONS,
  assertPositionCount,
  validateCsvFile,
} from "@/lib/upload-validation";

function file(name: string, type: string, size: number): File {
  const candidate = new File(["x"], name, { type });
  Object.defineProperty(candidate, "size", { value: size });
  return candidate;
}

describe("upload validation", () => {
  it("accepts CSV file names and common CSV MIME types", () => {
    expect(() => validateCsvFile(file("portfolio.csv", "", 100))).not.toThrow();
    expect(() => validateCsvFile(file("portfolio.txt", "text/csv", 100))).not.toThrow();
    expect(() =>
      validateCsvFile(file("portfolio.xls", "application/vnd.ms-excel", 100)),
    ).not.toThrow();
  });

  it("rejects oversized or non-CSV uploads", () => {
    expect(() =>
      validateCsvFile(file("portfolio.csv", "text/csv", MAX_CSV_BYTES + 1)),
    ).toThrow("El archivo CSV es demasiado grande");

    expect(() => validateCsvFile(file("portfolio.pdf", "application/pdf", 100))).toThrow(
      "Tipo de archivo inválido",
    );
  });

  it("enforces position count bounds", () => {
    expect(() => assertPositionCount(1)).not.toThrow();
    expect(() => assertPositionCount(MAX_POSITIONS)).not.toThrow();
    expect(() => assertPositionCount(0)).toThrow("No se encontraron posiciones");
    expect(() => assertPositionCount(MAX_POSITIONS + 1)).toThrow("Demasiadas posiciones");
  });
});
