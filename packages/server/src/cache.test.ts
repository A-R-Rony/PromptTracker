import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SessionCache } from './cache';
import { makeSession } from './testHelpers';

describe('SessionCache (10s TTL with force refresh)', () => {
  it('invokes the provider on first get', async () => {
    let scans = 0;
    const cache = new SessionCache(async () => {
      scans++;
      return [makeSession({ id: 'a' })];
    });

    const sessions = await cache.get();
    assert.strictEqual(sessions.length, 1);
    assert.strictEqual(scans, 1);
  });

  it('returns cached sessions without re-scanning within the TTL', async () => {
    let scans = 0;
    const cache = new SessionCache(async () => {
      scans++;
      return [makeSession({ id: 'a' })];
    });

    await cache.get();
    await cache.get();
    await cache.get();
    assert.strictEqual(scans, 1);
  });

  it('re-scans once the TTL has expired', async () => {
    let clock = 1_000_000;
    let scans = 0;
    const cache = new SessionCache(
      async () => {
        scans++;
        return [makeSession({ id: String(scans) })];
      },
      { now: () => clock }
    );

    await cache.get();
    clock += 9_999;
    await cache.get();
    assert.strictEqual(scans, 1);

    clock += 2;
    const sessions = await cache.get();
    assert.strictEqual(scans, 2);
    assert.strictEqual(sessions[0].id, '2');
  });

  it('honours a custom ttlMs', async () => {
    let clock = 0;
    let scans = 0;
    const cache = new SessionCache(
      async () => {
        scans++;
        return [];
      },
      { ttlMs: 100, now: () => clock }
    );

    await cache.get();
    clock += 99;
    await cache.get();
    assert.strictEqual(scans, 1);

    clock += 2;
    await cache.get();
    assert.strictEqual(scans, 2);
  });

  it('bypasses the TTL when force=true', async () => {
    let scans = 0;
    const cache = new SessionCache(async () => {
      scans++;
      return [makeSession({ id: String(scans) })];
    });

    await cache.get();
    const sessions = await cache.get(true);
    assert.strictEqual(scans, 2);
    assert.strictEqual(sessions[0].id, '2');
  });

  it('shares a single provider call across concurrent gets while a scan is in flight', async () => {
    let scans = 0;
    let releaseScan: (() => void) | undefined;
    const cache = new SessionCache(async () => {
      scans++;
      await new Promise<void>(resolve => { releaseScan = resolve; });
      return [makeSession({ id: 'a' })];
    });

    const first = cache.get();
    const second = cache.get();
    const third = cache.get();
    releaseScan!();
    const results = await Promise.all([first, second, third]);

    assert.strictEqual(scans, 1);
    assert.strictEqual(results.length, 3);
  });
});
