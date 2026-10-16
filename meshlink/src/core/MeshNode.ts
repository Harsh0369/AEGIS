/**
 * MeshLink — Mesh Node
 *
 * The main orchestrator that ties together:
 * - Router (forwarding decisions)
 * - Transport (TCP communication)
 * - MessageManager (outgoing messages)
 * - Logger (per-node logging)
 *
 * This is the primary public API for creating and managing a mesh node.
 */

import { type NodeConfig } from './Node.js';
import { MessageManager } from './MessageManager.js';
import { Router, type ProcessResult } from '../routing/Router.js';
import { TcpTransport } from '../transport/TcpTransport.js';
import { Logger, LogLevel } from '../logging/Logger.js';
import { type MeshPacket } from '../protocol/Packet.js';

/** Callback invoked when a message is delivered to this node */
export type MessageDeliveryCallback = (packet: MeshPacket) => void;

export class MeshNode {
  readonly nodeId: string;
  readonly router: Router;
  readonly transport: TcpTransport;
  readonly messageManager: MessageManager;
  readonly logger: Logger;

  private deliveryCallback: MessageDeliveryCallback | null = null;
  private started = false;

  constructor(config: NodeConfig, logLevel: LogLevel = LogLevel.INFO) {
    this.nodeId = config.nodeId;
    this.logger = new Logger(config.nodeId, logLevel);

    // Create router with its own tables
    this.router = new Router(config.nodeId, this.logger);

    // Create transport
    this.transport = new TcpTransport(config.host, config.port, this.logger);

    // Connect router to transport
    this.router.setTransport(this.transport);

    // Create message manager
    this.messageManager = new MessageManager(config.nodeId, this.logger);

    // Register neighbors and their endpoints
    for (const neighbor of config.neighbors) {
      this.router.neighborTable.addNeighbor(neighbor.nodeId);
      this.transport.addPeer(neighbor.nodeId, neighbor.host, neighbor.port);
    }

    // Configure static routes
    for (const route of config.routes) {
      this.router.routeTable.addRoute(route.destination, route.nextHop, route.hopCount);
    }

    // Wire up transport → router for incoming packets
    this.transport.onPacket((peerId: string, packet: MeshPacket) => {
      // Fire and forget — the router handles everything
      this.router.processPacket(peerId, packet).catch((err) => {
        this.logger.error(`Error processing packet: ${err}`);
      });
    });

    // Wire up peer disconnect events
    this.transport.onPeerDisconnect((peerId: string) => {
      this.router.neighborTable.markDisconnected(peerId);
    });

    // Wire up delivery handler
    this.router.onDelivery((packet: MeshPacket) => {
      if (this.deliveryCallback) {
        this.deliveryCallback(packet);
      }
    });
  }

  /**
   * Set a callback for when messages are delivered to this node.
   */
  onMessage(callback: MessageDeliveryCallback): void {
    this.deliveryCallback = callback;
  }

  /**
   * Start the node (begin listening for connections).
   */
  async start(): Promise<void> {
    if (this.started) return;
    await this.transport.start();
    this.started = true;
    this.logger.info(`Node started`);
  }

  /**
   * Send a text message to a destination node.
   */
  async sendMessage(destinationId: string, payload: string): Promise<ProcessResult> {
    const packet = this.messageManager.createMessage(destinationId, payload);
    const result = await this.router.originatePacket(packet);

    if (result.action === 'forwarded' || result.action === 'delivered') {
      this.messageManager.markSent(packet.messageId);
    } else {
      this.messageManager.markFailed(packet.messageId, result.reason);
    }

    return result;
  }

  /**
   * Stop the node and release all resources.
   */
  async stop(): Promise<void> {
    if (!this.started) return;
    this.router.destroy();
    await this.transport.close();
    this.started = false;
    this.logger.info(`Node stopped`);
  }

  /**
   * Display the current routing table.
   */
  displayRoutes(): void {
    this.logger.info(`Routing table:\n${this.router.routeTable.toDisplayString()}`);
  }

  /**
   * Display the current neighbor table.
   */
  displayNeighbors(): void {
    const neighbors = this.router.neighborTable.getConnectedNeighbors();
    this.logger.info(`Neighbors: [${neighbors.join(', ')}]`);
  }
}
