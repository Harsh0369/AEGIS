/**
 * MeshLink — Neighbor Table
 *
 * Tracks directly connected peers (neighbors).
 * A neighbor is a node reachable via a single transport hop.
 */

import { Logger } from '../logging/Logger.js';

/** Neighbor connection state */
export type NeighborState = 'connected' | 'disconnected';

/** A neighbor entry */
export interface NeighborEntry {
  /** Neighbor's logical node ID */
  nodeId: string;
  /** Connection state */
  state: NeighborState;
  /** When this neighbor was first registered */
  registeredAt: number;
  /** When the state last changed */
  lastStateChange: number;
}

export class NeighborTable {
  private readonly neighbors: Map<string, NeighborEntry> = new Map();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a neighbor (mark as connected).
   */
  addNeighbor(nodeId: string): void {
    const now = Date.now();
    const existing = this.neighbors.get(nodeId);

    if (existing) {
      existing.state = 'connected';
      existing.lastStateChange = now;
      this.logger.debug(`Neighbor reconnected: ${nodeId}`);
    } else {
      this.neighbors.set(nodeId, {
        nodeId,
        state: 'connected',
        registeredAt: now,
        lastStateChange: now,
      });
      this.logger.debug(`Neighbor added: ${nodeId}`);
    }
  }

  /**
   * Mark a neighbor as disconnected.
   */
  markDisconnected(nodeId: string): void {
    const entry = this.neighbors.get(nodeId);
    if (entry) {
      entry.state = 'disconnected';
      entry.lastStateChange = Date.now();
      this.logger.debug(`Neighbor disconnected: ${nodeId}`);
    }
  }

  /**
   * Remove a neighbor entirely.
   */
  removeNeighbor(nodeId: string): boolean {
    const deleted = this.neighbors.delete(nodeId);
    if (deleted) {
      this.logger.debug(`Neighbor removed: ${nodeId}`);
    }
    return deleted;
  }

  /**
   * Check if a neighbor is connected.
   */
  isConnected(nodeId: string): boolean {
    const entry = this.neighbors.get(nodeId);
    return entry !== undefined && entry.state === 'connected';
  }

  /**
   * Check if a node is a registered neighbor (any state).
   */
  hasNeighbor(nodeId: string): boolean {
    return this.neighbors.has(nodeId);
  }

  /**
   * Get all connected neighbor IDs.
   */
  getConnectedNeighbors(): string[] {
    return Array.from(this.neighbors.values())
      .filter(n => n.state === 'connected')
      .map(n => n.nodeId);
  }

  /**
   * Get all neighbor entries.
   */
  getAllNeighbors(): NeighborEntry[] {
    return Array.from(this.neighbors.values());
  }

  /**
   * Get the total number of registered neighbors.
   */
  get size(): number {
    return this.neighbors.size;
  }

  /**
   * Clear all neighbors.
   */
  clear(): void {
    this.neighbors.clear();
  }
}
