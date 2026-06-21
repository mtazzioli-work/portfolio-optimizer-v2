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

  it("preserves quoted commas inside cells", () => {
    const csv = `Symbol,Quantity,Mark Price
"BRK,B",2,350`;

    const rows = parseCSV(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe("BRK,B");
  });

  it("realigns unquoted thousands separators split into extra columns", () => {
    const csv = `Symbol,Position Value,Currency
AAPL,1,234.56,USD`;

    const rows = parseCSV(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: "AAPL",
      positionValue: 1234.56,
      currency: "USD",
    });
  });

  it("skips non-summary IB discriminator rows", () => {
    const ibCsv = `"Open Positions","Header","Symbol","Quantity","DataDiscriminator"
"Open Positions","Data","TRADE","10","Trade"
"Open Positions","Data","AAPL","5","Summary"`;

    const rows = parseCSV(ibCsv);

    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe("AAPL");
  });

  it("uses higher-priority IB sections before holdings", () => {
    const ibCsv = `"Tenencias","Header","Símbolo","Cantidad","Precio","Valor"
"Tenencias","Data","OLD","10","1","10"
"Posiciones abiertas","Header","Símbolo","Cantidad","Precio","Valor"
"Posiciones abiertas","Data","AAPL","3","100","300"`;

    const rows = parseCSV(ibCsv);

    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe("AAPL");
  });

  it("maps ISIN values from IB financial instrument sections", () => {
    const ibCsv = `"Instrumento financiero","Header","Símbolo","ID. de seguridad"
"Instrumento financiero","Data","AAPL","US0378331005"
"Posiciones abiertas","Header","Símbolo","Cantidad","Precio","Valor"
"Posiciones abiertas","Data","AAPL","3","100","300"`;

    const rows = parseCSV(ibCsv);

    expect(rows[0]).toMatchObject({
      symbol: "AAPL",
      isin: "US0378331005",
    });
  });

  it("returns empty when an IB report has no valid position section", () => {
    const ibCsv = `"Saldos","Header","Cuenta","Valor"
"Saldos","Data","DU123","1000"`;

    expect(parseCSV(ibCsv)).toEqual([]);
  });

  it("supports alternate aliases and filters total asset-category rows", () => {
    const csv = `Ticker,Qty,Close Price,Cost basis price,Asset Category
VTI,4,100,90,ETF
BND,1,--,-,Total Bonds`;

    const rows = parseCSV(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: "VTI",
      position: 4,
      markPrice: 100,
      costBasisPrice: 90,
    });
  });

  it("supports additional quantity aliases", () => {
    const csv = `Ticker,Shares,Price
VTI,3,100`;

    const rows = parseCSV(csv);

    expect(rows[0]).toMatchObject({
      symbol: "VTI",
      position: 3,
      markPrice: 100,
      positionValue: 300,
    });
  });

  it("pads sparse rows and leaves invalid numeric cells undefined", () => {
    const csv = `Symbol,Quantity,Mark Price,Position Value,Currency
AAPL,2
MSFT,abc,100,,USD`;

    const rows = parseCSV(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      symbol: "AAPL",
      position: 2,
      markPrice: undefined,
      positionValue: undefined,
      currency: "",
    });
    expect(rows[1]).toMatchObject({
      symbol: "MSFT",
      position: undefined,
      markPrice: 100,
      currency: "USD",
    });
  });

  it("handles IB reports when financial instrument metadata is incomplete", () => {
    const ibCsv = `"Financial Instrument","Header","Description","Security ID"
"Ignored","Data"
"Financial Instrument","Data","Apple","US0378331005"
"Open Positions","Header","Symbol","Quantity","Mark Price","Position Value"
"Open Positions","Data","AAPL","1","100","100"`;

    const rows = parseCSV(ibCsv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      symbol: "AAPL",
      isin: undefined,
    });
  });

  it("ignores financial instrument sections without data rows", () => {
    const ibCsv = `"Financial Instrument","Header","Symbol","Security ID"
"Open Positions","Header","Symbol","Quantity","Mark Price","Position Value"
"Open Positions","Data","AAPL","1","100","100"`;

    const rows = parseCSV(ibCsv);

    expect(rows[0]).toMatchObject({
      symbol: "AAPL",
      isin: undefined,
    });
  });

  it("continues past valid IB sections that have no data rows", () => {
    const ibCsv = `"Open Positions","Header","Symbol","Quantity","Mark Price","Position Value"
"Holdings","Header","Symbol","Quantity","Mark Price","Position Value"
"Holdings","Data","AAPL","1","100","100"`;

    const rows = parseCSV(ibCsv);

    expect(rows).toHaveLength(1);
    expect(rows[0].symbol).toBe("AAPL");
  });
});
