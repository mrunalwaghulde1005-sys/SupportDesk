import { env } from "../config/env.ts";
import { estimateCostUsd, modelPricing } from "./pricing.ts";

export type ProviderUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  thinking_tokens?: number;
};

export type AiFeature = "suggest_reply" | "categorize_ticket";

export function logUsage(feature: AiFeature, usage?: ProviderUsage, requestId?: string): void {
  const inputTokens = typeof usage?.input_tokens === "number" && Number.isSafeInteger(usage.input_tokens) && usage.input_tokens >= 0 ? usage.input_tokens : null;
  const outputTokens = typeof usage?.output_tokens === "number" && Number.isSafeInteger(usage.output_tokens) && usage.output_tokens >= 0 ? usage.output_tokens : null;
  const totalTokens = typeof usage?.total_tokens === "number" && Number.isSafeInteger(usage.total_tokens) && usage.total_tokens >= 0 ? usage.total_tokens : null;
  const thinkingTokens = typeof usage?.thinking_tokens === "number" && Number.isSafeInteger(usage.thinking_tokens) && usage.thinking_tokens >= 0 ? usage.thinking_tokens : null;
  const pricing = modelPricing[env.GEMINI_MODEL] ?? null;
  console.info(JSON.stringify({
    event: "ai_usage",
    feature,
    requestId: requestId ?? null,
    model: env.GEMINI_MODEL,
    inputTokens,
    outputTokens,
    thinkingTokens,
    totalTokens,
    inputUsdPerMillion: pricing?.inputUsdPerMillion ?? null,
    outputUsdPerMillion: pricing?.outputUsdPerMillion ?? null,
    estimatedCostUsd: estimateCostUsd(env.GEMINI_MODEL, inputTokens, outputTokens, thinkingTokens),
    usageAvailable: inputTokens !== null || outputTokens !== null || totalTokens !== null || thinkingTokens !== null,
  }));
}
