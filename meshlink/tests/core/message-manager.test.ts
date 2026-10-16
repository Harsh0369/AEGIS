/**
 * MeshLink — Message Manager Tests
 *
 * Tests message creation, status tracking, and retrieval.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MessageManager, type MessageStatus } from '../../src/core/MessageManager.js';
import { Logger, LogLevel } from '../../src/logging/Logger.js';

describe('MessageManager', () => {
  let manager: MessageManager;

  beforeEach(() => {
    const logger = new Logger('test-node', LogLevel.ERROR);
    manager = new MessageManager('test-node', logger);
  });

  it('should start with no messages', () => {
    assert.deepEqual(manager.getAllMessages(), []);
  });

  it('should create a data packet', () => {
    const pkt = manager.createMessage('B', 'Hello B');

    assert.equal(pkt.sourceId, 'test-node');
    assert.equal(pkt.destinationId, 'B');
    assert.equal(pkt.payload, 'Hello B');
    assert.equal(pkt.type, 'DATA');
    assert.ok(pkt.messageId.length > 0);
    assert.ok(pkt.ttl > 0);
  });

  it('should track created message as pending', () => {
    const pkt = manager.createMessage('B', 'Hello B');
    const record = manager.getMessage(pkt.messageId);

    assert.ok(record);
    assert.equal(record!.status, 'pending');
    assert.equal(record!.messageId, pkt.messageId);
    assert.equal(record!.destinationId, 'B');
    assert.equal(record!.payload, 'Hello B');
    assert.ok(record!.createdAt.length > 0);
  });

  it('should mark a message as sent', () => {
    const pkt = manager.createMessage('B', 'Hello B');
    manager.markSent(pkt.messageId);

    const record = manager.getMessage(pkt.messageId);
    assert.equal(record!.status, 'sent');
    assert.ok(record!.sentAt);
  });

  it('should mark a message as failed', () => {
    const pkt = manager.createMessage('B', 'Hello B');
    manager.markFailed(pkt.messageId, 'no route');

    const record = manager.getMessage(pkt.messageId);
    assert.equal(record!.status, 'failed');
    assert.equal(record!.error, 'no route');
  });

  it('should generate unique message IDs', () => {
    const pkt1 = manager.createMessage('B', 'msg1');
    const pkt2 = manager.createMessage('C', 'msg2');
    assert.notEqual(pkt1.messageId, pkt2.messageId);
  });

  it('should track multiple messages', () => {
    manager.createMessage('B', 'msg1');
    manager.createMessage('C', 'msg2');
    manager.createMessage('D', 'msg3');

    const all = manager.getAllMessages();
    assert.equal(all.length, 3);
  });

  it('should allow custom TTL', () => {
    const pkt = manager.createMessage('B', 'Hello B', 5);
    assert.equal(pkt.ttl, 5);
  });

  it('should return undefined for unknown message ID', () => {
    const record = manager.getMessage('nonexistent-id');
    assert.equal(record, undefined);
  });

  it('should handle markSent for unknown ID gracefully', () => {
    // Should not throw
    manager.markSent('unknown-id');
  });

  it('should handle markFailed for unknown ID gracefully', () => {
    // Should not throw
    manager.markFailed('unknown-id', 'error');
  });

  it('should set sourceId to node ID on created packets', () => {
    const pkt = manager.createMessage('X', 'test');
    assert.equal(pkt.sourceId, 'test-node');
  });
});
