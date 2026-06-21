import { describe, expect, it } from "vitest";
import {
  assertCsvTextSize,
  assertPositionCount,
  validateCsvFile,
} from "@/lib/upload-validation";
import { parseCSV } from "@/lib/csv-parser";
import { getAccessRedirectPath } from "@/lib/access";

describe("integration: upload pipeline", () => {
  it("parses and validates csv end-to-end", () => {
    const csv = `Symbol,Quantity,Mark Price
AAPL,10,150
MSFT,5,300`;

    assertCsvTextSize(csv);
    const rows = parseCSV(csv);
    assertPositionCount(rows.length);
    expect(rows).toHaveLength(2);
  });

  it("rejects oversized pasted csv", () => {
    const huge = "a".repeat(6 * 1024 * 1024);
    expect(() => assertCsvTextSize(huge)).toThrow();
  });
});

describe("integration: access flow", () => {
  it("redirects restricted users away from sensitive routes", () => {
    expect(getAccessRedirectPath("/portfolio/upload", "pending", "user")).toBe(
      "/waiting",
    );
    expect(getAccessRedirectPath("/portfolio/upload", "active", "user")).toBeNull();
    expect(getAccessRedirectPath("/reviews", "denied", "user")).toBe("/denied");
  });
});

describe("integration: file upload validation", () => {
  it("accepts csv file objects", () => {
    const file = new File(["Symbol,Quantity\nAAPL,1"], "positions.csv", {
      type: "text/csv",
    });
    expect(() => validateCsvFile(file)).not.toThrow();
  });
});
