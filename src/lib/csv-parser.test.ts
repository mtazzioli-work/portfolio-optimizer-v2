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

  it("prioritizes IB open positions and enriches ISIN from instrument data", () => {
    const ibCsv = `"Other Section","Header","Symbol","Quantity","Mark Price"
"Other Section","Data","IGNORED","99","1"
"Financial Instrument Information","Header","Symbol","Security ID"
"Financial Instrument Information","Data","AAPL","US0378331005"
"Open Positions","Header","DataDiscriminator","Symbol","Quantity","Mark Price","Position Value"
"Open Positions","Data","Detail","MSFT","1","100","100"
"Open Positions","Data","Summary","AAPL","2","150","300"`;

    const rows = parseCSV(ibCsv);

    expect(rows).toEqual([
      expect.objectContaining({
        symbol: "AAPL",
        isin: "US0378331005",
        position: 2,
        positionValue: 300,
      }),
    ]);
  });

  it("handles split thousands separators and placeholder numbers", () => {
    const csv = `Symbol,Quantity,Mark Price,Position Value,Asset Category
VTI,1,234.5,50,61,725,ETF
CASH,--,-,abc,Total Assets
BND,3,--,--,Bond`;

    const rows = parseCSV(csv);

    expect(rows).toEqual([
      expect.objectContaining({
        symbol: "VTI",
        position: 1234.5,
        markPrice: 50,
        positionValue: 61725,
      }),
      expect.objectContaining({
        symbol: "BND",
        position: 3,
        markPrice: undefined,
        positionValue: undefined,
      }),
    ]);
  });

  it("returns empty for IB reports without valid position sections", () => {
    const ibCsv = `"Statement","Header","Name","Value"
"Statement","Data","Account","DU123"
"Open Positions","Header","Symbol","Mark Price"
"Open Positions","Data","AAPL","150"`;

    expect(parseCSV(ibCsv)).toEqual([]);
  });
});
