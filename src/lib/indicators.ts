/**
 * Technical indicator calculations ported from ibkr_monthly_ema_signals_yahoo.py
 */

export function ema(values: number[], span: number): number[] {
  if (values.length === 0) return [];
  const alpha = 2 / (span + 1);
  const result: number[] = [];
  result[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    result[i] = alpha * values[i] + (1 - alpha) * result[i - 1];
  }
  return result;
}

export function rsi(values: number[], period = 14): number[] {
  if (values.length < period + 1) return values.map(() => NaN);
  const result: number[] = new Array(values.length).fill(NaN);

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export type MonthlyBar = {
  date: string;
  close: number;
};

export type SignalRow = MonthlyBar & {
  ema6: number;
  ema10: number;
  rsi14: number;
  trendUp: boolean;
  cross: number;
};

export function buildSignals(bars: MonthlyBar[]): SignalRow[] {
  if (bars.length === 0) return [];
  const closes = bars.map((b) => b.close);
  const ema6Values = ema(closes, 6);
  const ema10Values = ema(closes, 10);
  const rsi14Values = rsi(closes, 14);

  return bars.map((bar, i) => {
    const trendUp = ema6Values[i] > ema10Values[i];
    const prevTrendUp = i > 0 ? ema6Values[i - 1] > ema10Values[i - 1] : trendUp;
    const cross =
      i === 0 ? 0 : trendUp && !prevTrendUp ? 1 : !trendUp && prevTrendUp ? -1 : 0;

    return {
      ...bar,
      ema6: ema6Values[i],
      ema10: ema10Values[i],
      rsi14: rsi14Values[i],
      trendUp,
      cross,
    };
  });
}

export type LatestSignal = {
  symbol: string;
  providerSymbol: string;
  lastMonthEnd: string;
  closeAdj: number;
  ema6: number;
  ema10: number;
  rsi14: number;
  trendUp: boolean;
  lastCross: number;
};
