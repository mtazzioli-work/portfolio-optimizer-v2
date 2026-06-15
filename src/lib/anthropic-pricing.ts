const DEFAULT_INPUT_PRICE_PER_M = 3;
const DEFAULT_OUTPUT_PRICE_PER_M = 15;

function pricePerM(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  const inputPrice = pricePerM("ANTHROPIC_INPUT_PRICE_PER_M", DEFAULT_INPUT_PRICE_PER_M);
  const outputPrice = pricePerM(
    "ANTHROPIC_OUTPUT_PRICE_PER_M",
    DEFAULT_OUTPUT_PRICE_PER_M,
  );
  return (
    (inputTokens / 1_000_000) * inputPrice +
    (outputTokens / 1_000_000) * outputPrice
  );
}
