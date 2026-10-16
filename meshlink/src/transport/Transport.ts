/**
 * MeshLink — Transport Interface
 *
 * Abstract interface that the Router depends on.
 * Decouples routing logic from transport implementation (TCP, Android Wi-Fi P2P, etc.).
 *
 * The Router NEVER imports net, dgram, or any platform-specific API.
 * It only uses this interface.
 */

import { type MeshPacket } from '../protocol/Packet.js';

/** Handler for incoming packets */
export type PacketHandler = (peerId: string, packet: MeshPacket) => void;

/** Handler for peer disconnection */
export type DisconnectHandler = (peerId: string) => void;

/**
 * Transport interface.
 * Any transport implementation (TCP, mock, Android native) must implement this.
 */
export interface Transport {
  /** Send a packet to a specific peer by logical node ID */
  send(peerId: string, packet: MeshPacket): Promise<void>;

  /** Register a handler for incoming packets */
  onPacket(handler: PacketHandler): void;

  /** Register a handler for peer disconnection events */
  onPeerDisconnect(handler: DisconnectHandler): void;

  /** Start listening for incoming connections */
  start(): Promise<void>;

  /** Gracefully shut down the transport */
  close(): Promise<void>;
}
