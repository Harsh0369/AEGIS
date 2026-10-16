/**
 * MeshLink — Route Table
 *
 * Maps destination node IDs to next-hop routing entries.
 * Supports static route configuration and future dynamic updates.
 */

import { Logger } from '../logging/Logger.js';

/** A single route entry */
export interface RouteEntry {
  /** Final destination node ID */
  destination: string;
  /** Immediate next-hop neighbor */
  nextHop: string;
  /** Number of hops to the destination */
  hopCount: number;
  /** Route validity state */
  state: 'active' | 'stale';
  /** Optional expiration timestamp (ms since epoch). 0 = never expires */
  expiresAt: number;
}

export class RouteTable {
  /** destination → RouteEntry */
  private readonly routes: Map<string, RouteEntry> = new Map();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Add or update a route.
   * Replaces any existing route to the same destination.
   */
  addRoute(
    destination: string,
    nextHop: string,
    hopCount: number = 1,
    expiresAt: number = 0,
  ): void {
    const entry: RouteEntry = {
      destination,
      nextHop,
      hopCount,
      state: 'active',
      expiresAt,
    };
    this.routes.set(destination, entry);
    this.logger.debug(`Route added: ${destination} → ${nextHop}`, { hopCount });
  }

  /**
   * Look up the next hop for a given destination.
   * Returns undefined if no active route exists.
   */
  getNextHop(destination: string): string | undefined {
    const entry = this.routes.get(destination);
    if (!entry) return undefined;

    // Check expiry
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      this.logger.debug(`Route to ${destination} expired`);
      entry.state = 'stale';
      return undefined;
    }

    if (entry.state !== 'active') return undefined;

    return entry.nextHop;
  }

  /**
   * Get the full route entry for a destination.
   */
  getRoute(destination: string): RouteEntry | undefined {
    return this.routes.get(destination);
  }

  /**
   * Remove a route to a specific destination.
   */
  removeRoute(destination: string): boolean {
    const deleted = this.routes.delete(destination);
    if (deleted) {
      this.logger.debug(`Route removed: ${destination}`);
    }
    return deleted;
  }

  /**
   * Mark a route as stale (e.g., after a link failure).
   */
  invalidateRoute(destination: string): void {
    const entry = this.routes.get(destination);
    if (entry) {
      entry.state = 'stale';
      this.logger.debug(`Route invalidated: ${destination}`);
    }
  }

  /**
   * Check if a route exists and is active.
   */
  hasActiveRoute(destination: string): boolean {
    return this.getNextHop(destination) !== undefined;
  }

  /**
   * Get all active routes (for debugging/display).
   */
  getAllRoutes(): RouteEntry[] {
    return Array.from(this.routes.values()).filter(r => r.state === 'active');
  }

  /**
   * Get the total number of routes (including stale).
   */
  get size(): number {
    return this.routes.size;
  }

  /**
   * Clear all routes.
   */
  clear(): void {
    this.routes.clear();
  }

  /**
   * Format the routing table for display.
   */
  toDisplayString(): string {
    const entries = this.getAllRoutes();
    if (entries.length === 0) return '  (empty)';
    const lines = entries.map(
      (e) => `  ${e.destination} → ${e.nextHop} (hops: ${e.hopCount})`
    );
    return lines.join('\n');
  }
}
