export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000_000) {
    return (tokens / 1_000_000_000).toFixed(1) + 'B';
  }
  if (tokens >= 1_000_000) {
    return (tokens / 1_000_000).toFixed(1) + 'M';
  }
  if (tokens >= 1_000) {
    return (tokens / 1_000).toFixed(1) + 'K';
  }
  return (tokens || 0).toString();
}

export function formatTokens(tokens: number, isEstimated?: boolean): string {
  const formatted = formatTokenCount(tokens);
  return isEstimated ? `~${formatted}` : formatted;
}

export function formatTokensWithProvenance(tokens: number, isEstimated?: boolean, source?: string): { text: string; badge: string; isEstimated: boolean } {
  const text = formatTokenCount(tokens);
  let badge = 'Exact';
  if (isEstimated || source === 'estimated_heuristic') {
    badge = 'Calculated';
  } else if (source === 'calculated_tokenizer') {
    badge = 'Tokenizer';
  }
  return {
    text: isEstimated ? `~${text}` : text,
    badge,
    isEstimated: !!isEstimated
  };
}

export function formatCost(cost: number): string {
  return '$' + (cost || 0).toFixed(4);
}
