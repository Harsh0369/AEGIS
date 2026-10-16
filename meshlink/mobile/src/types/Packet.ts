/**
 * MeshLink Mobile — Packet Type Definitions
 *
 * Aligns 1:1 with core protocol packet definitions in src/protocol/Packet.ts.
 */

export type PacketType = 'DATA' | 'RREQ' | 'RREP' | 'RERR' | 'ACK';

export interface MeshPacket {
  version: number;
  messageId: string;
  sourceId: string;
  destinationId: string;
  type: PacketType;
  ttl: number;
  hopCount: number;
  payload: string;
  timestamp: string;
}

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export interface DisplayMessage {
  packet: MeshPacket;
  status: MessageStatus;
  isOutbound: boolean;
}

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'ROUTE';
  message: string;
}

export function createDataPacket(
  sourceId: string,
  destinationId: string,
  payload: string,
  ttl: number = 10,
): MeshPacket {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const timestamp = Date.now().toString(36);
  const messageId = `msg-${timestamp}-${randomSuffix}`;

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
