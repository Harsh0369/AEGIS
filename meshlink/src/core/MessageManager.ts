/**
 * MeshLink — Message Manager
 *
 * Creates and tracks messages originating from this node.
 * Provides message delivery status tracking.
 */

import { type MeshPacket, createDataPacket, generateId } from '../protocol/Packet.js';
import { DEFAULT_TTL } from '../config/defaults.js';
import { Logger } from '../logging/Logger.js';

/** Status of a sent message */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

/** Record of a message we originated */
export interface MessageRecord {
  messageId: string;
  destinationId: string;
  payload: string;
  status: MessageStatus;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  error?: string;
}

export class MessageManager {
  private readonly nodeId: string;
  private readonly logger: Logger;
  private readonly messages: Map<string, MessageRecord> = new Map();

  constructor(nodeId: string, logger: Logger) {
    this.nodeId = nodeId;
    this.logger = logger;
  }

  /**
   * Create a new data packet to be sent to a destination.
   */
  createMessage(destinationId: string, payload: string, ttl: number = DEFAULT_TTL): MeshPacket {
    const messageId = generateId();
    const packet = createDataPacket(this.nodeId, destinationId, payload, ttl, messageId);

    const record: MessageRecord = {
      messageId,
      destinationId,
      payload,
      status: 'pending',
      createdAt: packet.timestamp,
    };
    this.messages.set(messageId, record);

    this.logger.info(
      `Created message ${messageId.slice(0, 8)} for ${destinationId}: "${payload}"`,
    );

    return packet;
  }

  /**
   * Mark a message as sent (forwarded to the first hop).
   */
  markSent(messageId: string): void {
    const record = this.messages.get(messageId);
    if (record) {
      record.status = 'sent';
      record.sentAt = new Date().toISOString();
    }
  }

  /**
   * Mark a message as failed.
   */
  markFailed(messageId: string, error: string): void {
    const record = this.messages.get(messageId);
    if (record) {
      record.status = 'failed';
      record.error = error;
    }
  }

  /**
   * Get a message record by ID.
   */
  getMessage(messageId: string): MessageRecord | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Get all message records.
   */
  getAllMessages(): MessageRecord[] {
    return Array.from(this.messages.values());
  }
}
