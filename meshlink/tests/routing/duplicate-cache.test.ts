/**
 * MeshLink — Duplicate Cache Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DuplicateCache } from '../../src/routing/DuplicateCache.js';

describe('DuplicateCache', () => {
  let cache: DuplicateCache;

  beforeEach(() => {
    cache = new DuplicateCache(5000); // 5 second TTL for tests
  });

  it('should accept first occurrence of a message ID', () => {
    assert.equal(cache.isDuplicate('msg-001'), false);
  });

  it('should reject second occurrence of a message ID', () => {
    cache.isDuplicate('msg-001');
    assert.equal(cache.isDuplicate('msg-001'), true);
  });

  it('should accept different message IDs independently', () => {
    assert.equal(cache.isDuplicate('msg-001'), false);
    assert.equal(cache.isDuplicate('msg-002'), false);
    assert.equal(cache.isDuplicate('msg-003'), false);
  });

  it('should track size', () => {
    assert.equal(cache.size, 0);
    cache.isDuplicate('msg-001');
    cache.isDuplicate('msg-002');
    assert.equal(cache.size, 2);
  });

  it('should clear all entries', () => {
    cache.isDuplicate('msg-001');
    cache.isDuplicate('msg-002');
    cache.clear();
    assert.equal(cache.size, 0);
    // After clear, same IDs should be accepted again
    assert.equal(cache.isDuplicate('msg-001'), false);
  });

  it('should check without recording via hasSeen', () => {
    assert.equal(cache.hasSeen('msg-001'), false);
    cache.isDuplicate('msg-001');
    assert.equal(cache.hasSeen('msg-001'), true);
    assert.equal(cache.hasSeen('msg-999'), false);
  });

  it('should purge expired entries', () => {
    // Use a very short TTL
    const shortCache = new DuplicateCache(1); // 1ms TTL
    shortCache.isDuplicate('msg-old');

    // Wait a tiny bit for the entry to expire
    const start = Date.now();
    while (Date.now() - start < 10) { /* busy wait */ }

    const purged = shortCache.purgeExpired();
    assert.equal(purged, 1);
    assert.equal(shortCache.size, 0);
  });

  it('should treat expired entries as new', () => {
    const shortCache = new DuplicateCache(1);
    shortCache.isDuplicate('msg-001');

    const start = Date.now();
    while (Date.now() - start < 10) { /* busy wait */ }

    // Should be treated as new after expiry
    assert.equal(shortCache.isDuplicate('msg-001'), false);
  });

  it('should destroy cleanly', () => {
    cache.startCleanup(100);
    cache.isDuplicate('msg-001');
    cache.destroy();
    assert.equal(cache.size, 0);
  });
});
