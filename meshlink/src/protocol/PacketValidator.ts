/**
 * MeshLink — Packet Validator
 *
 * Validates incoming packets before they enter the routing pipeline.
 * NEVER trust received JSON blindly.
 */

import { type MeshPacket } from './Packet.js';
import {
  PROTOCOL_VERSION,
  MAX_TTL,
  MAX_PAYLOAD_SIZE,
  PACKET_TYPES,
  type PacketType,
} from '../config/defaults.js';

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a parsed object as a MeshPacket.
 * Returns { valid: true } or { valid: false, error: "reason" }.
 */
export function validatePacket(data: unknown): ValidationResult {
  if (data === null || data === undefined || typeof data !== 'object') {
    return { valid: false, error: 'Packet is not an object' };
  }

  const pkt = data as Record<string, unknown>;

  // version
  if (typeof pkt.version !== 'number') {
    return { valid: false, error: 'Missing or invalid "version" field' };
  }
  if (pkt.version !== PROTOCOL_VERSION) {
    return { valid: false, error: `Unsupported protocol version: ${pkt.version}` };
  }

  // messageId
  if (typeof pkt.messageId !== 'string' || pkt.messageId.length === 0) {
    return { valid: false, error: 'Missing or invalid "messageId" field' };
  }

  // sourceId
  if (typeof pkt.sourceId !== 'string' || pkt.sourceId.length === 0) {
    return { valid: false, error: 'Missing or invalid "sourceId" field' };
  }

  // destinationId
  if (typeof pkt.destinationId !== 'string' || pkt.destinationId.length === 0) {
    return { valid: false, error: 'Missing or invalid "destinationId" field' };
  }

  // type
  if (typeof pkt.type !== 'string') {
    return { valid: false, error: 'Missing or invalid "type" field' };
  }
  if (!(PACKET_TYPES as readonly string[]).includes(pkt.type)) {
    return { valid: false, error: `Unknown packet type: "${pkt.type}"` };
  }

  // ttl
  if (typeof pkt.ttl !== 'number' || !Number.isInteger(pkt.ttl)) {
    return { valid: false, error: 'Missing or invalid "ttl" field (must be integer)' };
  }
  if (pkt.ttl < 0) {
    return { valid: false, error: `TTL is negative: ${pkt.ttl}` };
  }
  if (pkt.ttl > MAX_TTL) {
    return { valid: false, error: `TTL exceeds maximum (${MAX_TTL}): ${pkt.ttl}` };
  }

  // hopCount
  if (typeof pkt.hopCount !== 'number' || !Number.isInteger(pkt.hopCount) || pkt.hopCount < 0) {
    return { valid: false, error: 'Missing or invalid "hopCount" field' };
  }

  // payload
  if (typeof pkt.payload !== 'string') {
    return { valid: false, error: 'Missing or invalid "payload" field' };
  }
  const payloadBytes = Buffer.byteLength(pkt.payload, 'utf-8');
  if (payloadBytes > MAX_PAYLOAD_SIZE) {
    return { valid: false, error: `Payload size (${payloadBytes} bytes) exceeds maximum (${MAX_PAYLOAD_SIZE})` };
  }

  // timestamp
  if (typeof pkt.timestamp !== 'string' || pkt.timestamp.length === 0) {
    return { valid: false, error: 'Missing or invalid "timestamp" field' };
  }

  return { valid: true };
}

/**
 * Parse and validate raw JSON bytes into a MeshPacket.
 * Returns the packet or throws an error.
 */
export function parseAndValidate(jsonString: string): MeshPacket {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error(`Invalid JSON: ${jsonString.slice(0, 100)}`);
  }

  const result = validatePacket(parsed);
  if (!result.valid) {
    throw new Error(`Invalid packet: ${result.error}`);
  }

  return parsed as MeshPacket;
}
