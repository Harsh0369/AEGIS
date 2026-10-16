/**
 * MeshLink — TCP Transport Implementation
 *
 * Implements the Transport interface using Node.js TCP sockets.
 * Handles:
 * - Listening for incoming connections
 * - Outgoing connections to peers
 * - Length-prefixed framing (via FrameCodec)
 * - Peer ID mapping (logical node ID → host:port)
 * - Connection lifecycle and cleanup
 */

import * as net from 'node:net';
import { type MeshPacket } from '../protocol/Packet.js';
import { parseAndValidate } from '../protocol/PacketValidator.js';
import { encodeFrame, FrameDecoder } from '../protocol/FrameCodec.js';
import { type Transport, type PacketHandler, type DisconnectHandler } from './Transport.js';
import { Logger } from '../logging/Logger.js';
import { TCP_CONNECT_TIMEOUT_MS } from '../config/defaults.js';

/** Mapping of a logical peer ID to a TCP endpoint */
export interface PeerEndpoint {
  host: string;
  port: number;
}

/** Internal state for a connected peer */
interface PeerConnection {
  peerId: string;
  socket: net.Socket;
  decoder: FrameDecoder;
  isOutbound: boolean;
}

export class TcpTransport implements Transport {
  private readonly localHost: string;
  private readonly localPort: number;
  private readonly logger: Logger;
  private readonly peerEndpoints: Map<string, PeerEndpoint> = new Map();
  private readonly connections: Map<string, PeerConnection> = new Map();
  private server: net.Server | null = null;

  private packetHandler: PacketHandler | null = null;
  private disconnectHandler: DisconnectHandler | null = null;

  /** Track sockets pending identification (inbound connections where we don't know the peer ID yet) */
  private readonly pendingSockets: Set<net.Socket> = new Set();

  constructor(
    localHost: string,
    localPort: number,
    logger: Logger,
  ) {
    this.localHost = localHost;
    this.localPort = localPort;
    this.logger = logger;
  }

  /**
   * Register a peer's endpoint for outbound connections.
   */
  addPeer(peerId: string, host: string, port: number): void {
    this.peerEndpoints.set(peerId, { host, port });
    this.logger.debug(`Peer endpoint registered: ${peerId} → ${host}:${port}`);
  }

  onPacket(handler: PacketHandler): void {
    this.packetHandler = handler;
  }

  onPeerDisconnect(handler: DisconnectHandler): void {
    this.disconnectHandler = handler;
  }

  /**
   * Start the TCP server to accept incoming connections.
   */
  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.handleIncomingConnection(socket);
      });

      this.server.on('error', (err) => {
        this.logger.error(`Server error: ${err.message}`);
        reject(err);
      });

      this.server.listen(this.localPort, this.localHost, () => {
        this.logger.info(`Listening on ${this.localHost}:${this.localPort}`);
        resolve();
      });
    });
  }

  /**
   * Send a packet to a specific peer.
   * Creates an outbound connection if one doesn't exist.
   */
  async send(peerId: string, packet: MeshPacket): Promise<void> {
    let conn = this.connections.get(peerId);

    if (!conn || conn.socket.destroyed) {
      conn = await this.connectToPeer(peerId);
    }

    const json = JSON.stringify(packet);
    const frame = encodeFrame(json);

    return new Promise<void>((resolve, reject) => {
      conn!.socket.write(frame, (err) => {
        if (err) {
          this.logger.error(`Write error to ${peerId}: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Gracefully shut down the transport.
   */
  async close(): Promise<void> {
    // Close all connections
    for (const [peerId, conn] of this.connections) {
      conn.socket.destroy();
      this.connections.delete(peerId);
    }

    // Destroy pending sockets
    for (const socket of this.pendingSockets) {
      socket.destroy();
    }
    this.pendingSockets.clear();

    // Close the server
    if (this.server) {
      return new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.logger.info('Transport closed');
          resolve();
        });
      });
    }
  }

  /**
   * Handle an incoming TCP connection.
   * We don't know the peer ID yet — we learn it from the first packet's sourceId.
   */
  private handleIncomingConnection(socket: net.Socket): void {
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    this.logger.debug(`Incoming connection from ${remoteAddr}`);
    this.pendingSockets.add(socket);

    const decoder = new FrameDecoder();
    let identifiedPeerId: string | null = null;

    socket.on('data', (chunk: Buffer) => {
      let frames: string[];
      try {
        frames = decoder.push(chunk);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Frame error from ${identifiedPeerId ?? remoteAddr}: ${errMsg}`);
        socket.destroy();
        return;
      }

      for (const frame of frames) {
        try {
          const packet = parseAndValidate(frame);

          // Identify the peer from the first packet if not yet identified
          if (identifiedPeerId === null) {
            identifiedPeerId = this.identifyPeer(packet, socket);
            if (identifiedPeerId) {
              this.pendingSockets.delete(socket);
              // Store the connection if we don't already have one
              if (!this.connections.has(identifiedPeerId)) {
                this.connections.set(identifiedPeerId, {
                  peerId: identifiedPeerId,
                  socket,
                  decoder,
                  isOutbound: false,
                });
              }
            }
          }

          if (this.packetHandler && identifiedPeerId) {
            this.packetHandler(identifiedPeerId, packet);
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Invalid packet from ${identifiedPeerId ?? remoteAddr}: ${errMsg}`
          );
        }
      }
    });

    socket.on('error', (err) => {
      this.logger.debug(`Socket error (${identifiedPeerId ?? remoteAddr}): ${err.message}`);
    });

    socket.on('close', () => {
      this.pendingSockets.delete(socket);
      if (identifiedPeerId) {
        // Only remove if this is the same socket we stored
        const stored = this.connections.get(identifiedPeerId);
        if (stored && stored.socket === socket) {
          this.connections.delete(identifiedPeerId);
        }
        if (this.disconnectHandler) {
          this.disconnectHandler(identifiedPeerId);
        }
        this.logger.debug(`Connection closed: ${identifiedPeerId}`);
      }
    });
  }

  /**
   * Identify which peer ID this connection belongs to.
   * We look up the source in our peer endpoints to figure out who connected.
   * For inbound connections, we use the sourceId from the packet
   * and check if it's a registered peer.
   */
  private identifyPeer(packet: MeshPacket, _socket: net.Socket): string | null {
    // The packet has a sourceId — check if it matches a registered peer
    // For forwarded packets, the sourceId is the original source, not the direct sender.
    // We need to find which registered peer could have sent this.
    // In our simulation, we check if the sourceId itself is a peer,
    // OR if any peer's route could explain this packet.
    // Simplest approach: check all registered peers to see which one
    // we don't already have a connection from, and whose endpoint matches.

    // First, try: is the sourceId a registered peer?
    if (this.peerEndpoints.has(packet.sourceId) && !this.connections.has(packet.sourceId)) {
      return packet.sourceId;
    }

    // For forwarded packets, we need another approach.
    // Check all registered peers without connections to find a match.
    // In a linear topology, an inbound connection is likely from a neighbor
    // we haven't connected to outbound yet.
    for (const [peerId] of this.peerEndpoints) {
      if (!this.connections.has(peerId)) {
        return peerId;
      }
    }

    // Fallback: use the sourceId even though it might be the original source
    return packet.sourceId;
  }

  /**
   * Create an outbound connection to a peer.
   */
  private async connectToPeer(peerId: string): Promise<PeerConnection> {
    const endpoint = this.peerEndpoints.get(peerId);
    if (!endpoint) {
      throw new Error(`No endpoint registered for peer: ${peerId}`);
    }

    return new Promise<PeerConnection>((resolve, reject) => {
      const socket = net.createConnection(
        { host: endpoint.host, port: endpoint.port },
        () => {
          this.logger.debug(`Connected to ${peerId} (${endpoint.host}:${endpoint.port})`);

          const decoder = new FrameDecoder();
          const conn: PeerConnection = {
            peerId,
            socket,
            decoder,
            isOutbound: true,
          };

          this.connections.set(peerId, conn);

          // Set up data handler for responses on this outbound connection
          socket.on('data', (chunk: Buffer) => {
            let frames: string[];
            try {
              frames = decoder.push(chunk);
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              this.logger.error(`Frame error from ${peerId}: ${errMsg}`);
              socket.destroy();
              return;
            }

            for (const frame of frames) {
              try {
                const packet = parseAndValidate(frame);
                if (this.packetHandler) {
                  this.packetHandler(peerId, packet);
                }
              } catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Invalid packet from ${peerId}: ${errMsg}`);
              }
            }
          });

          resolve(conn);
        }
      );

      // Timeout
      socket.setTimeout(TCP_CONNECT_TIMEOUT_MS, () => {
        socket.destroy();
        reject(new Error(`Connection to ${peerId} timed out`));
      });

      socket.on('error', (err) => {
        this.logger.debug(`Connection error to ${peerId}: ${err.message}`);
        reject(err);
      });

      socket.on('close', () => {
        const stored = this.connections.get(peerId);
        if (stored && stored.socket === socket) {
          this.connections.delete(peerId);
        }
        if (this.disconnectHandler) {
          this.disconnectHandler(peerId);
        }
      });
    });
  }

  /**
   * Check if a peer is currently connected.
   */
  isConnected(peerId: string): boolean {
    const conn = this.connections.get(peerId);
    return conn !== undefined && !conn.socket.destroyed;
  }

  /**
   * Get the number of active connections.
   */
  get connectionCount(): number {
    return this.connections.size;
  }
}
