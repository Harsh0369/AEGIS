/**
 * MeshLink Mobile — State Manager
 *
 * Coordinates mobile UI state, packet creation, validation,
 * message tracking, and structured diagnostic logging.
 */

import {
  type MeshPacket,
  type DisplayMessage,
  type DiagnosticLog,
  createDataPacket,
} from '../types/Packet.js';

export class MeshStateManager {
  private nodeId: string = 'Node-A';
  private destinationId: string = 'Node-B';
  private connectionStatus: string = 'Offline — Standalone Ready (P0)';
  private messages: DisplayMessage[] = [];
  private logs: DiagnosticLog[] = [];
  private listeners: Set<() => void> = new Set();

  constructor(initialNodeId: string = 'Node-A', initialDestId: string = 'Node-B') {
    this.nodeId = initialNodeId;
    this.destinationId = initialDestId;
    this.addLog('INFO', `Initialized MeshLink Mobile Node: ${this.nodeId}`);
    this.addLog('INFO', `Current Transport: Local Standalone Loopback (P0 Milestone)`);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  getNodeId(): string {
    return this.nodeId;
  }

  setNodeId(id: string): void {
    const trimmed = id.trim().toUpperCase();
    if (trimmed && trimmed !== this.nodeId) {
      const oldId = this.nodeId;
      this.nodeId = trimmed;
      this.addLog('INFO', `Node ID changed: ${oldId} → ${this.nodeId}`);
      this.notify();
    }
  }

  getDestinationId(): string {
    return this.destinationId;
  }

  setDestinationId(id: string): void {
    const trimmed = id.trim().toUpperCase();
    if (trimmed && trimmed !== this.destinationId) {
      this.destinationId = trimmed;
      this.addLog('ROUTE', `Destination updated to: ${this.destinationId}`);
      this.notify();
    }
  }

  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  setConnectionStatus(status: string): void {
    this.connectionStatus = status;
    this.addLog('INFO', `Connection state changed: ${status}`);
    this.notify();
  }

  getMessages(): DisplayMessage[] {
    return [...this.messages];
  }

  getLogs(): DiagnosticLog[] {
    return [...this.logs];
  }

  sendMessage(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) {
      this.addLog('WARN', 'Cannot send empty message');
      return false;
    }

    if (this.nodeId === this.destinationId) {
      this.addLog('WARN', `Source and Destination are identical (${this.nodeId}). Self-routing suppressed.`);
    }

    // Create protocol-compliant packet
    const packet = createDataPacket(this.nodeId, this.destinationId, trimmed, 10);

    const displayMsg: DisplayMessage = {
      packet,
      status: 'sent',
      isOutbound: true,
    };

    this.messages.push(displayMsg);

    this.addLog(
      'INFO',
      `[Created Packet] id=${packet.messageId.substring(0, 8)}... src=${packet.sourceId} dst=${packet.destinationId} ttl=${packet.ttl} payload="${packet.payload}"`,
    );

    this.addLog(
      'ROUTE',
      `[Route Evaluation] Next-hop lookup for dst=${packet.destinationId} (P0: stored locally, P1 will dispatch over direct link)`,
    );

    this.notify();
    return true;
  }

  receiveSimulatedMessage(packet: MeshPacket): void {
    const displayMsg: DisplayMessage = {
      packet,
      status: 'delivered',
      isOutbound: false,
    };

    this.messages.push(displayMsg);
    this.addLog(
      'INFO',
      `[Delivered Packet] id=${packet.messageId.substring(0, 8)}... from=${packet.sourceId} hops=${packet.hopCount} payload="${packet.payload}"`,
    );
    this.notify();
  }

  addLog(level: 'INFO' | 'WARN' | 'ERROR' | 'ROUTE', message: string): void {
    const log: DiagnosticLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };

    this.logs.unshift(log); // newest first
    if (this.logs.length > 100) {
      this.logs.pop();
    }
    this.notify();
  }

  clearLogs(): void {
    this.logs = [];
    this.notify();
  }

  clearMessages(): void {
    this.messages = [];
    this.notify();
  }
}
