/**
 * MeshLink — Packet Type Definitions
 *
 * Defines the typed packet structure used across the entire mesh network.
 * The destinationId is always the FINAL destination (end-to-end).
 * The transport-level recipient (next hop) is determined by the router.
 */

import { type PacketType } from '../config/defaults.js';

/**
 * Core mesh packet structure.
 * Every packet in the network conforms to this interface.
 */
export interface MeshPacket {
  /** Protocol version — must match PROTOCOL_VERSION */
  version: number;

  /** Unique message identifier (UUID v4) */
  messageId: string;

  /** Originating node ID — set once at creation, never changed */
  sourceId: string;

  /** Final destination node ID — stays constant across all hops */
  destinationId: string;

  /** Packet type: DATA, RREQ, RREP, RERR, ACK */
  type: PacketType;

  /** Remaining hop limit — decremented at each forwarding node */
  ttl: number;

  /** Number of hops traversed so far */
  hopCount: number;

  /** Message content (for DATA packets) */
  payload: string;

  /** Timestamp of packet creation (ISO 8601) */
  timestamp: string;
}

/**
 * Route Request extension fields.
 * Attached when type === 'RREQ'.
 */
export interface RreqPacket extends MeshPacket {
  type: 'RREQ';
  /** Unique route request identifier */
  requestId: string;
  /** The destination node being sought */
  requestedDestId: string;
}

/**
 * Route Reply extension fields.
 * Attached when type === 'RREP'.
 */
export interface RrepPacket extends MeshPacket {
  type: 'RREP';
  /** The route request ID this is replying to */
  requestId: string;
  /** The destination that was found */
  requestedDestId: string;
  /** Total hop count of the discovered route */
  routeHopCount: number;
}

/**
 * Create a new data packet.
 */
export function createDataPacket(
  sourceId: string,
  destinationId: string,
  payload: string,
  ttl: number,
  messageId: string,
): MeshPacket {
  return {
    version: 1,
    messageId,
    sourceId,
    destinationId,
    type: 'DATA',
    ttl,
    hopCount: 0,
    payload,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a UUID v4 using Node.js crypto.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
