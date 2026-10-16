/**
 * MeshLink — Router
 *
 * The core routing and forwarding engine.
 * Decides whether to deliver locally or forward to the next hop.
 *
 * IMPORTANT: This module does NOT import any transport-specific code (net, dgram, etc.).
 * It depends on the Transport interface defined in transport/Transport.ts.
 */

import { type MeshPacket } from '../protocol/Packet.js';
import { validatePacket } from '../protocol/PacketValidator.js';
import { RouteTable } from './RouteTable.js';
import { NeighborTable } from './NeighborTable.js';
import { DuplicateCache } from './DuplicateCache.js';
import { Logger } from '../logging/Logger.js';
import type { Transport } from '../transport/Transport.js';

/** Callback invoked when a message is delivered to this node */
export type DeliveryHandler = (packet: MeshPacket) => void;

/** Result of processing a packet */
export type ProcessResult =
  | { action: 'delivered' }
  | { action: 'forwarded'; nextHop: string }
  | { action: 'dropped'; reason: string };

export class Router {
  readonly nodeId: string;
  readonly routeTable: RouteTable;
  readonly neighborTable: NeighborTable;
  readonly duplicateCache: DuplicateCache;
  private readonly logger: Logger;
  private transport: Transport | null = null;
  private deliveryHandler: DeliveryHandler | null = null;

  constructor(
    nodeId: string,
    logger: Logger,
    routeTable?: RouteTable,
    neighborTable?: NeighborTable,
    duplicateCache?: DuplicateCache,
  ) {
    this.nodeId = nodeId;
    this.logger = logger;
    this.routeTable = routeTable ?? new RouteTable(logger);
    this.neighborTable = neighborTable ?? new NeighborTable(logger);
    this.duplicateCache = duplicateCache ?? new DuplicateCache();
    this.duplicateCache.startCleanup();
  }

  /**
   * Attach a transport to this router.
   * The router will use this transport to send packets.
   */
  setTransport(transport: Transport): void {
    this.transport = transport;
  }

  /**
   * Set the handler for locally delivered messages.
   */
  onDelivery(handler: DeliveryHandler): void {
    this.deliveryHandler = handler;
  }

  /**
   * Process an incoming packet through the full forwarding pipeline.
   *
   * Pipeline:
   * 1. Validate packet structure
   * 2. Check TTL > 0
   * 3. Check duplicate cache
   * 4. If destination is us → deliver
   * 5. Otherwise → look up next hop → decrement TTL → forward
   */
  async processPacket(fromPeerId: string, packet: MeshPacket): Promise<ProcessResult> {
    // Step 1: Validate
    const validation = validatePacket(packet);
    if (!validation.valid) {
      this.logger.warn(`Invalid packet from ${fromPeerId}: ${validation.error}`);
      return { action: 'dropped', reason: `validation failed: ${validation.error}` };
    }

    // Step 2: Check TTL
    if (packet.ttl <= 0) {
      this.logger.warn(`Packet ${packet.messageId} dropped: TTL expired`, {
        from: fromPeerId,
        src: packet.sourceId,
        dst: packet.destinationId,
        ttl: packet.ttl,
      });
      return { action: 'dropped', reason: 'TTL expired' };
    }

    // Step 3: Check duplicate
    if (this.duplicateCache.isDuplicate(packet.messageId)) {
      this.logger.debug(`Duplicate packet ${packet.messageId} suppressed`, {
        from: fromPeerId,
      });
      return { action: 'dropped', reason: 'duplicate' };
    }

    // Step 4: Local delivery?
    if (packet.destinationId === this.nodeId) {
      this.logger.info(
        `✓ Delivered ${packet.messageId}: "${packet.payload}"`,
        {
          from: packet.sourceId,
          hops: packet.hopCount,
        }
      );
      if (this.deliveryHandler) {
        this.deliveryHandler(packet);
      }
      return { action: 'delivered' };
    }

    // Step 5: Forward to next hop
    const nextHop = this.routeTable.getNextHop(packet.destinationId);
    if (!nextHop) {
      this.logger.warn(
        `No route to ${packet.destinationId} for packet ${packet.messageId}`,
        { src: packet.sourceId }
      );
      return { action: 'dropped', reason: `no route to ${packet.destinationId}` };
    }

    // Decrement TTL and increment hop count
    const forwardedPacket: MeshPacket = {
      ...packet,
      ttl: packet.ttl - 1,
      hopCount: packet.hopCount + 1,
    };

    // Check TTL after decrement
    if (forwardedPacket.ttl <= 0) {
      this.logger.warn(
        `Packet ${packet.messageId} dropped after TTL decrement`,
        { dst: packet.destinationId, nextHop }
      );
      return { action: 'dropped', reason: 'TTL expired after decrement' };
    }

    // Send via transport
    if (!this.transport) {
      this.logger.error(`No transport attached — cannot forward ${packet.messageId}`);
      return { action: 'dropped', reason: 'no transport' };
    }

    try {
      this.logger.info(
        `Forwarding ${packet.messageId} → ${nextHop}`,
        {
          dst: packet.destinationId,
          ttl: forwardedPacket.ttl,
        }
      );
      await this.transport.send(nextHop, forwardedPacket);
      return { action: 'forwarded', nextHop };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to forward ${packet.messageId} to ${nextHop}: ${errMsg}`
      );
      return { action: 'dropped', reason: `send failed: ${errMsg}` };
    }
  }

  /**
   * Originate a new packet from this node.
   * This is used when this node is the SOURCE (not forwarding).
   * The duplicate cache records the ID, and TTL is NOT decremented at origin.
   */
  async originatePacket(packet: MeshPacket): Promise<ProcessResult> {
    // Record in duplicate cache to prevent echoes
    this.duplicateCache.isDuplicate(packet.messageId);

    // Check if destination is ourselves
    if (packet.destinationId === this.nodeId) {
      this.logger.info(`Self-delivery: ${packet.messageId}`);
      if (this.deliveryHandler) {
        this.deliveryHandler(packet);
      }
      return { action: 'delivered' };
    }

    // Look up next hop
    const nextHop = this.routeTable.getNextHop(packet.destinationId);
    if (!nextHop) {
      this.logger.warn(`No route to ${packet.destinationId}`);
      return { action: 'dropped', reason: `no route to ${packet.destinationId}` };
    }

    if (!this.transport) {
      this.logger.error('No transport attached');
      return { action: 'dropped', reason: 'no transport' };
    }

    try {
      this.logger.info(
        `Sending ${packet.messageId} → ${nextHop}`,
        {
          dst: packet.destinationId,
          ttl: packet.ttl,
          payload: packet.payload.slice(0, 50),
        }
      );
      await this.transport.send(nextHop, packet);
      return { action: 'forwarded', nextHop };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send ${packet.messageId}: ${errMsg}`);
      return { action: 'dropped', reason: `send failed: ${errMsg}` };
    }
  }

  /**
   * Destroy the router and release resources.
   */
  destroy(): void {
    this.duplicateCache.destroy();
  }
}
