export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return (tokens / 1_000_000).toFixed(2) + 'M';
  }
  if (tokens >= 1_000) {
    return (tokens / 1_000).toFixed(1) + 'k';
  }
  return tokens.toLocaleString();
}

export function formatCost(cost: number): string {
  return '$' + (cost || 0).toFixed(4);
}
