export type ParsedPosition = {
  symbol: string;
  isin?: string;
  currency?: string;
  assetCategory?: string;
  subCategory?: string;
  issuerCountryCode?: string;
  position?: number;
  markPrice?: number;
  positionValue?: number;
  costBasisPrice?: number;
};

type ColumnKey =
  | "symbol"
  | "quantity"
  | "markPrice"
  | "costBasisPrice"
  | "positionValue"
  | "currency"
  | "assetCategory"
  | "discriminator";

/** Ordered patterns — first match wins per column key. */
const COLUMN_PATTERNS: Record<ColumnKey, RegExp[]> = {
  symbol: [/^s[íi]mbolo$/i, /^symbol$/i, /^ticker$/i],
  quantity: [
    /^actual cantidad$/i,
    /^cantidad$/i,
    /^quantity$/i,
    /^qty$/i,
    /^position$/i,
    /^shares$/i,
  ],
  markPrice: [
    /^actual precio$/i,
    /^precio de cierre$/i,
    /^close price$/i,
    /^mark price$/i,
    /^markprice$/i,
    /^precio$/i,
    /^price$/i,
  ],
  costBasisPrice: [
    /^precio de coste$/i,
    /^cost price$/i,
    /^cost basis price$/i,
    /^anterior precio$/i,
  ],
  positionValue: [
    /^valor$/i,
    /^value$/i,
    /^position value$/i,
    /^market value$/i,
    /^valor de mercado$/i,
  ],
  currency: [/^divisa$/i, /^currency$/i, /^moneda$/i],
  assetCategory: [/^categor[íi]a de activo$/i, /^asset category$/i],
  discriminator: [/^datadiscriminator$/i],
};

const IB_SECTION_PRIORITY = [
  /posiciones abiertas|open positions/i,
  /valoraci[oó]n al mercado|mark-to-market|mtm|performance summary/i,
  /tenencias|holdings/i,
];

export function parseCSV(text: string): ParsedPosition[] {
  if (isIBActivityReport(text)) {
    return parseIBActivityReport(text);
  }

  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]).map((h) =>
    h.trim().replace(/^"|"$/g, ""),
  );
  const cols = mapColumns(header);
  if (cols.symbol < 0) return [];

  return lines
    .slice(1)
    .map((line) => {
      const vals = alignRowToHeaders(parseCsvLine(line), header.length);
      return rowToPosition(vals, cols);
    })
    .filter(isValidPosition);
}

function isIBActivityReport(text: string): boolean {
  const firstLine = text.trim().split(/\r?\n/)[0];
  const cols = parseCsvLine(firstLine);
  if (cols.length < 2) return false;
  const second = cols[1].replace(/^"|"$/g, "").trim();
  return second === "Header" || second === "Data";
}

function parseIBActivityReport(text: string): ParsedPosition[] {
  const lines = text.trim().split(/\r?\n/);

  const sectionHeaders: Record<string, string[]> = {};
  const sectionData: Record<string, string[][]> = {};

  for (const line of lines) {
    const cols = parseCsvLine(line).map((c) => c.replace(/^"|"$/g, "").trim());
    if (cols.length < 3) continue;

    const sectionName = cols[0];
    const rowType = cols[1];

    if (rowType === "Header") {
      if (!sectionHeaders[sectionName]) {
        sectionHeaders[sectionName] = cols.slice(2);
      }
    } else if (rowType === "Data") {
      if (!sectionData[sectionName]) sectionData[sectionName] = [];
      sectionData[sectionName].push(cols.slice(2));
    }
  }

  const isinMap = buildIsinMap(sectionHeaders, sectionData);
  const sectionNames = Object.keys(sectionHeaders);

  const orderedSections = [...sectionNames].sort(
    (a, b) => sectionPriority(a) - sectionPriority(b),
  );

  for (const sectionName of orderedSections) {
    const headers = sectionHeaders[sectionName];
    const rows = sectionData[sectionName] ?? [];
    const cols = mapColumns(headers);
    if (cols.symbol < 0 || cols.quantity < 0) continue;

    const results = rows
      .map((row) => {
        const aligned = alignRowToHeaders(row, headers.length);
        if (
          cols.discriminator >= 0 &&
          aligned[cols.discriminator] !== "Summary"
        ) {
          return null;
        }
        return rowToPosition(aligned, cols, isinMap);
      })
      .filter((r): r is ParsedPosition => r !== null && isValidPosition(r));

    if (results.length > 0) return results;
  }

  return [];
}

function sectionPriority(name: string): number {
  const idx = IB_SECTION_PRIORITY.findIndex((re) => re.test(name));
  return idx >= 0 ? idx : IB_SECTION_PRIORITY.length;
}

function buildIsinMap(
  sectionHeaders: Record<string, string[]>,
  sectionData: Record<string, string[][]>,
): Record<string, string> {
  const isinMap: Record<string, string> = {};

  for (const sectionName of Object.keys(sectionHeaders)) {
    if (!/instrumento financiero|financial instrument/i.test(sectionName)) {
      continue;
    }

    const headers = sectionHeaders[sectionName];
    const rows = sectionData[sectionName] ?? [];
    const symIdx = findColumn(headers, COLUMN_PATTERNS.symbol);
    const isinIdx = headers.findIndex((h) =>
      /id\. de seguridad|security id/i.test(h),
    );

    if (symIdx >= 0 && isinIdx >= 0) {
      for (const row of rows) {
        const sym = row[symIdx];
        const isin = row[isinIdx];
        if (sym && isin) isinMap[sym] = isin;
      }
    }
    break;
  }

  return isinMap;
}

function mapColumns(headers: string[]): Record<ColumnKey, number> {
  const result = {} as Record<ColumnKey, number>;
  for (const key of Object.keys(COLUMN_PATTERNS) as ColumnKey[]) {
    result[key] = findColumn(headers, COLUMN_PATTERNS[key]);
  }
  return result;
}

function findColumn(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function rowToPosition(
  row: string[],
  cols: Record<ColumnKey, number>,
  isinMap: Record<string, string> = {},
): ParsedPosition {
  const get = (idx: number) =>
    idx >= 0 ? row[idx]?.replace(/^"|"$/g, "").trim() : undefined;

  const symbol = get(cols.symbol) ?? "";
  const position = toNum(get(cols.quantity));
  const markPrice = toNum(get(cols.markPrice));
  let positionValue = toNum(get(cols.positionValue));

  if (positionValue === undefined && position !== undefined && markPrice !== undefined) {
    positionValue = position * markPrice;
  }

  return {
    symbol,
    isin: isinMap[symbol],
    currency: get(cols.currency),
    assetCategory: get(cols.assetCategory),
    position,
    markPrice,
    positionValue,
    costBasisPrice: toNum(get(cols.costBasisPrice)),
  };
}

function isValidPosition(row: ParsedPosition): boolean {
  if (!row.symbol || /^total$/i.test(row.symbol)) return false;
  if (row.assetCategory && /^total/i.test(row.assetCategory)) return false;
  if (row.position === 0) return false;
  return true;
}

function toNum(raw: string | undefined): number | undefined {
  if (!raw || raw === "--" || raw === "-") return undefined;
  const normalized = raw.replace(/,/g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : undefined;
}

/** Re-align rows where thousand separators were split into extra columns. */
function alignRowToHeaders(row: string[], headerCount: number): string[] {
  if (row.length <= headerCount) {
    while (row.length < headerCount) row.push("");
    return row.slice(0, headerCount);
  }

  const result: string[] = [];
  let i = 0;

  while (i < row.length && result.length < headerCount) {
    let val = row[i];
    const remainingData = row.length - i - 1;
    const remainingSlots = headerCount - result.length - 1;

    while (
      i + 1 < row.length &&
      remainingData > remainingSlots &&
      /^\d{1,3}$/.test(val) &&
      /^\d{3}(\.\d+)?$/.test(row[i + 1])
    ) {
      val += row[++i];
    }

    result.push(val);
    i++;
  }

  while (result.length < headerCount) result.push("");
  return result.slice(0, headerCount);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}
