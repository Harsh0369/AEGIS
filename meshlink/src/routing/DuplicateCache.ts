/**
 * MeshLink — Duplicate Cache
 *
 * Prevents processing the same message more than once.
 * Uses message IDs with time-based expiry.
 */

import {
  DUPLICATE_CACHE_TTL_MS,
  DUPLICATE_CACHE_CLEANUP_INTERVAL_MS,
} from '../config/defaults.js';

export class DuplicateCache {
  /** messageId → timestamp when the ID was first seen */
  private readonly seen: Map<string, number> = new Map();
  private readonly ttlMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(ttlMs: number = DUPLICATE_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Start periodic cleanup of expired entries.
   */
  startCleanup(intervalMs: number = DUPLICATE_CACHE_CLEANUP_INTERVAL_MS): void {
    this.stopCleanup();
    this.cleanupTimer = setInterval(() => this.purgeExpired(), intervalMs);
    // Allow the process to exit even if this timer is still active
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop periodic cleanup.
   */
  stopCleanup(): void {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Check if a message ID has been seen before.
   * If it hasn't, record it and return false (not a duplicate).
   * If it has, return true (duplicate).
   *
   * @returns true if the message is a duplicate
   */
  isDuplicate(messageId: string): boolean {
    const now = Date.now();

    const seenAt = this.seen.get(messageId);
    if (seenAt !== undefined) {
      // Check if the entry has expired
      if (now - seenAt > this.ttlMs) {
        // Entry expired — treat as new
        this.seen.set(messageId, now);
        return false;
      }
      return true;
    }

    // Not seen before — record it
    this.seen.set(messageId, now);
    return false;
  }

  /**
   * Check if a message ID has been seen (without recording it).
   */
  hasSeen(messageId: string): boolean {
    const seenAt = this.seen.get(messageId);
    if (seenAt === undefined) return false;
    if (Date.now() - seenAt > this.ttlMs) return false;
    return true;
  }

  /**
   * Remove expired entries from the cache.
   */
  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;

    for (const [id, timestamp] of this.seen) {
      if (now - timestamp > this.ttlMs) {
        this.seen.delete(id);
        purged++;
      }
    }

    return purged;
  }

  /**
   * Get the number of entries in the cache.
   */
  get size(): number {
    return this.seen.size;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.seen.clear();
  }

  /**
   * Destroy the cache and stop cleanup.
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}
