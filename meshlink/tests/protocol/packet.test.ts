/**
 * MeshLink — Packet Validation Tests
 *
 * Tests packet creation and validation logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDataPacket, generateId } from '../../src/protocol/Packet.js';
import { validatePacket, parseAndValidate } from '../../src/protocol/PacketValidator.js';
import { PROTOCOL_VERSION, MAX_PAYLOAD_SIZE, MAX_TTL } from '../../src/config/defaults.js';

describe('Packet creation', () => {
  it('should create a valid data packet', () => {
    const id = generateId();
    const pkt = createDataPacket('A', 'E', 'Hello', 10, id);

    assert.equal(pkt.version, PROTOCOL_VERSION);
    assert.equal(pkt.messageId, id);
    assert.equal(pkt.sourceId, 'A');
    assert.equal(pkt.destinationId, 'E');
    assert.equal(pkt.type, 'DATA');
    assert.equal(pkt.ttl, 10);
    assert.equal(pkt.hopCount, 0);
    assert.equal(pkt.payload, 'Hello');
    assert.ok(pkt.timestamp.length > 0);
  });

  it('should generate unique message IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    assert.equal(ids.size, 100);
  });
});

describe('Packet validation', () => {
  function validPacket(): Record<string, unknown> {
    return {
      version: PROTOCOL_VERSION,
      messageId: generateId(),
      sourceId: 'A',
      destinationId: 'E',
      type: 'DATA',
      ttl: 10,
      hopCount: 0,
      payload: 'Hello',
      timestamp: new Date().toISOString(),
    };
  }

  it('should accept a valid data packet', () => {
    const result = validatePacket(validPacket());
    assert.equal(result.valid, true);
  });

  it('should reject null', () => {
    const result = validatePacket(null);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('not an object'));
  });

  it('should reject undefined', () => {
    const result = validatePacket(undefined);
    assert.equal(result.valid, false);
  });

  it('should reject non-object', () => {
    const result = validatePacket('not a packet');
    assert.equal(result.valid, false);
  });

  it('should reject missing version', () => {
    const pkt = validPacket();
    delete pkt.version;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('version'));
  });

  it('should reject wrong protocol version', () => {
    const pkt = validPacket();
    pkt.version = 99;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('Unsupported protocol version'));
  });

  it('should reject missing messageId', () => {
    const pkt = validPacket();
    delete pkt.messageId;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('messageId'));
  });

  it('should reject empty messageId', () => {
    const pkt = validPacket();
    pkt.messageId = '';
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
  });

  it('should reject missing sourceId', () => {
    const pkt = validPacket();
    delete pkt.sourceId;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('sourceId'));
  });

  it('should reject missing destinationId', () => {
    const pkt = validPacket();
    delete pkt.destinationId;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('destinationId'));
  });

  it('should reject unknown packet type', () => {
    const pkt = validPacket();
    pkt.type = 'INVALID_TYPE';
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('Unknown packet type'));
  });

  it('should reject missing TTL', () => {
    const pkt = validPacket();
    delete pkt.ttl;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('ttl'));
  });

  it('should reject negative TTL', () => {
    const pkt = validPacket();
    pkt.ttl = -1;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('negative'));
  });

  it('should reject TTL exceeding maximum', () => {
    const pkt = validPacket();
    pkt.ttl = MAX_TTL + 1;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('exceeds maximum'));
  });

  it('should reject non-integer TTL', () => {
    const pkt = validPacket();
    pkt.ttl = 5.5;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
  });

  it('should reject missing hopCount', () => {
    const pkt = validPacket();
    delete pkt.hopCount;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('hopCount'));
  });

  it('should reject missing payload', () => {
    const pkt = validPacket();
    delete pkt.payload;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('payload'));
  });

  it('should reject oversized payload', () => {
    const pkt = validPacket();
    pkt.payload = 'x'.repeat(MAX_PAYLOAD_SIZE + 1);
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('Payload size'));
  });

  it('should reject missing timestamp', () => {
    const pkt = validPacket();
    delete pkt.timestamp;
    const result = validatePacket(pkt);
    assert.equal(result.valid, false);
    assert.ok(result.error?.includes('timestamp'));
  });

  it('should accept valid RREQ type', () => {
    const pkt = validPacket();
    pkt.type = 'RREQ';
    const result = validatePacket(pkt);
    assert.equal(result.valid, true);
  });

  it('should accept valid RREP type', () => {
    const pkt = validPacket();
    pkt.type = 'RREP';
    const result = validatePacket(pkt);
    assert.equal(result.valid, true);
  });

  it('should accept TTL of 0', () => {
    const pkt = validPacket();
    pkt.ttl = 0;
    const result = validatePacket(pkt);
    assert.equal(result.valid, true);
  });
});

describe('parseAndValidate', () => {
  it('should parse valid JSON into a MeshPacket', () => {
    const pkt = createDataPacket('A', 'B', 'test', 5, generateId());
    const json = JSON.stringify(pkt);
    const parsed = parseAndValidate(json);
    assert.deepEqual(parsed, pkt);
  });

  it('should throw on invalid JSON', () => {
    assert.throws(() => parseAndValidate('not json'), /Invalid JSON/);
  });

  it('should throw on invalid packet structure', () => {
    assert.throws(() => parseAndValidate('{"foo":"bar"}'), /Invalid packet/);
  });
});
