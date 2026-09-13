import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as path from 'path';
import * as os from 'os';
import { estimateCost, approximateTokens, PricingEngine } from '../src/pricing';

describe('Pricing Engine', () => {
  beforeEach(() => {
    // Isolate unit tests from user's live home directory ~/.prompttracker/pricing.json
    const nonExistentTestCache = path.join(os.tmpdir(), `test-pricing-${Date.now()}.json`);
    PricingEngine.resetInstance(new PricingEngine(nonExistentTestCache));
  });

  it('approximates token count accurately from string length (1 token per 4 chars)', () => {
    assert.strictEqual(approximateTokens(''), 0);
    assert.strictEqual(approximateTokens('abcd'), 1);
    assert.strictEqual(approximateTokens('abcdefgh'), 2);
    assert.strictEqual(approximateTokens('abcdefghi'), 3);
  });

  it('calculates cost for gemini-3.7-flash', () => {
    const tokens = { input: 1_000_000, output: 1_000_000, total: 2_000_000 };
    const cost = estimateCost('gemini-3.7-flash', tokens);
    // input: $0.15, output: $0.60 -> Total: $0.75
    assert.strictEqual(cost, 0.75);
  });

  it('calculates cost for claude-3-7-sonnet', () => {
    const tokens = { input: 1_000_000, output: 1_000_000, total: 2_000_000 };
    const cost = estimateCost('claude-3-7-sonnet', tokens);
    // input: $3.00, output: $15.00 -> Total: $18.00
    assert.strictEqual(cost, 18.0);
  });
});
