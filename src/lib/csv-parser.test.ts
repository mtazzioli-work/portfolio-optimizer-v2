import { describe, expect, it } from "vitest";
import { parseCSV } from "@/lib/csv-parser";

describe("parseCSV", () => {
  it("parses simple csv headers", () => {
    const csv = `Symbol,Quantity,Mark Price,Position Value
AAPL,10,150,1500
MSFT,5,300,1500`;

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].symbol).toBe("AAPL");
    expect(rows[0].position).toBe(10);
    expect(rows[0].markPrice).toBe(150);
    expect(rows[0].positionValue).toBe(1500);
  });

  it("parses spanish column names", () => {
    const csv = `Símbolo,Cantidad,Precio,Valor
GGAL,100,1000,100000`;

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe("GGAL");
  });

  it("filters zero positions and totals", () => {
    const csv = `Symbol,Quantity
TOTAL,0
AAPL,0
VTI,10`;

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe("VTI");
  });

  it("returns empty for invalid csv", () => {
    expect(parseCSV("only-header")).toEqual([]);
    expect(parseCSV("x\ny")).toEqual([]);
  });

  it("computes position value when missing", () => {
    const csv = `Symbol,Quantity,Mark Price
VTI,2,100`;

    const rows = parseCSV(csv);
    expect(rows[0].positionValue).toBe(200);
  });

  it("parses IB activity report format", () => {
    const ibCsv = `"Posiciones abiertas","Header","Símbolo","Cantidad","Precio","Valor"
"Posiciones abiertas","Data","AAPL","10","150","1500"
"Posiciones abiertas","Data","MSFT","5","300","1500"`;

    const rows = parseCSV(ibCsv);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.symbol === "AAPL")).toBe(true);
  });
});
