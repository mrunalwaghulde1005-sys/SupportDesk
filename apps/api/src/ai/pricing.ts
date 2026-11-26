export interface ModelPricing {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}

// Gemini Developer API Standard tier prices; source checked 24 November 2026.
export const modelPricing: Readonly<Record<string, ModelPricing>> = {
  "gemini-3.5-flash-lite": { inputUsdPerMillion: 0.3, outputUsdPerMillion: 2.5 },
};

export function estimateCostUsd(
  model: string,
  inputTokens: number | null,
  outputTokens: number | null,
  thinkingTokens: number | null = null,
): number | null {
  const pricing = modelPricing[model];
  if (!pricing || inputTokens === null || outputTokens === null || thinkingTokens === null) return null;
  return (inputTokens * pricing.inputUsdPerMillion +
    (outputTokens + thinkingTokens) * pricing.outputUsdPerMillion) / 1_000_000;
}
