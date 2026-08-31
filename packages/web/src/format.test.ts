import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatTokenCount } from './format';

describe('formatTokenCount', () => {
  it('renders raw counts below one thousand', () => {
    assert.strictEqual(formatTokenCount(0), '0');
    assert.strictEqual(formatTokenCount(950), '950');
  });

  it('compacts thousands, millions, and billions to one decimal', () => {
    assert.strictEqual(formatTokenCount(1234), '1.2K');
    assert.strictEqual(formatTokenCount(1_500_000), '1.5M');
    assert.strictEqual(formatTokenCount(2_500_000_000), '2.5B');
  });
});
