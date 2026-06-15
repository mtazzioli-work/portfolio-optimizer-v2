import { describe, expect, it } from "vitest";
import { parseCSV } from "@/lib/csv-parser";

describe("parseCSV", () => {
  it("parses a simple generic CSV and derives market value when absent", () => {
    const rows = parseCSV(`Symbol,Quantity,Mark Price,Cost Basis Price,Currency,Asset Category
AAPL,10,200,150,USD,Stocks
Total,10,200,150,USD,Total
CASH,0,1,1,USD,Cash`);

    expect(rows).toEqual([
      {
        symbol: "AAPL",
        isin: undefined,
        currency: "USD",
        assetCategory: "Stocks",
        position: 10,
        markPrice: 200,
        positionValue: 2_000,
        costBasisPrice: 150,
      },
    ]);
  });

  it("handles quoted numbers and split thousands separators", () => {
    const rows = parseCSV(`Ticker,Market Value
SPY,"1,234.56"
QQQ,2,345.67`);

    expect(rows.map((r) => [r.symbol, r.positionValue])).toEqual([
      ["SPY", 1_234.56],
      ["QQQ", 2_345.67],
    ]);
  });

  it("returns an empty list when the symbol column or data rows are missing", () => {
    expect(parseCSV("Quantity,Price\n1,2")).toEqual([]);
    expect(parseCSV("Symbol\n")).toEqual([]);
  });

  it("parses Interactive Brokers activity report sections with ISIN data", () => {
    const rows = parseCSV(`Instrumento financiero,Header,Símbolo,ID. de seguridad
Instrumento financiero,Data,CSPX,IE00B5BMR087
Posiciones abiertas,Header,DataDiscriminator,Símbolo,Actual Cantidad,Actual Precio,Valor,Divisa,Categoría de activo
Posiciones abiertas,Data,Summary,CSPX,2,500,1000,USD,ETF
Posiciones abiertas,Data,Lot,CSPX,1,500,500,USD,ETF`);

    expect(rows).toEqual([
      expect.objectContaining({
        symbol: "CSPX",
        isin: "IE00B5BMR087",
        position: 2,
        markPrice: 500,
        positionValue: 1_000,
        currency: "USD",
        assetCategory: "ETF",
      }),
    ]);
  });
});
