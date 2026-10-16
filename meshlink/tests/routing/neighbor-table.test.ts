/**
 * MeshLink — Neighbor Table Tests
 *
 * Tests neighbor registration, state management, and queries.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NeighborTable } from '../../src/routing/NeighborTable.js';
import { Logger, LogLevel } from '../../src/logging/Logger.js';

describe('NeighborTable', () => {
  let table: NeighborTable;

  beforeEach(() => {
    const logger = new Logger('test', LogLevel.ERROR);
    table = new NeighborTable(logger);
  });

  it('should start empty', () => {
    assert.equal(table.size, 0);
    assert.deepEqual(table.getConnectedNeighbors(), []);
    assert.deepEqual(table.getAllNeighbors(), []);
  });

  it('should add a neighbor as connected', () => {
    table.addNeighbor('A');
    assert.equal(table.size, 1);
    assert.ok(table.hasNeighbor('A'));
    assert.ok(table.isConnected('A'));
  });

  it('should add multiple neighbors', () => {
    table.addNeighbor('A');
    table.addNeighbor('B');
    table.addNeighbor('C');
    assert.equal(table.size, 3);
    const connected = table.getConnectedNeighbors();
    assert.ok(connected.includes('A'));
    assert.ok(connected.includes('B'));
    assert.ok(connected.includes('C'));
  });

  it('should mark a neighbor as disconnected', () => {
    table.addNeighbor('A');
    assert.ok(table.isConnected('A'));

    table.markDisconnected('A');
    assert.ok(!table.isConnected('A'));
    // Still registered, just not connected
    assert.ok(table.hasNeighbor('A'));
  });

  it('should handle disconnecting unknown neighbor gracefully', () => {
    // Should not throw
    table.markDisconnected('unknown');
    assert.equal(table.size, 0);
  });

  it('should reconnect a disconnected neighbor', () => {
    table.addNeighbor('A');
    table.markDisconnected('A');
    assert.ok(!table.isConnected('A'));

    table.addNeighbor('A'); // re-add = reconnect
    assert.ok(table.isConnected('A'));
    assert.equal(table.size, 1); // still 1, not 2
  });

  it('should remove a neighbor entirely', () => {
    table.addNeighbor('A');
    const removed = table.removeNeighbor('A');
    assert.ok(removed);
    assert.ok(!table.hasNeighbor('A'));
    assert.equal(table.size, 0);
  });

  it('should return false when removing non-existent neighbor', () => {
    const removed = table.removeNeighbor('Z');
    assert.ok(!removed);
  });

  it('should return only connected neighbors from getConnectedNeighbors', () => {
    table.addNeighbor('A');
    table.addNeighbor('B');
    table.addNeighbor('C');
    table.markDisconnected('B');

    const connected = table.getConnectedNeighbors();
    assert.equal(connected.length, 2);
    assert.ok(connected.includes('A'));
    assert.ok(!connected.includes('B'));
    assert.ok(connected.includes('C'));
  });

  it('should return all neighbors from getAllNeighbors', () => {
    table.addNeighbor('A');
    table.addNeighbor('B');
    table.markDisconnected('B');

    const all = table.getAllNeighbors();
    assert.equal(all.length, 2);

    const nodeIds = all.map(n => n.nodeId);
    assert.ok(nodeIds.includes('A'));
    assert.ok(nodeIds.includes('B'));

    const bEntry = all.find(n => n.nodeId === 'B')!;
    assert.equal(bEntry.state, 'disconnected');
  });

  it('should report isConnected=false for unknown neighbor', () => {
    assert.ok(!table.isConnected('Z'));
  });

  it('should report hasNeighbor=false for unknown neighbor', () => {
    assert.ok(!table.hasNeighbor('Z'));
  });

  it('should clear all neighbors', () => {
    table.addNeighbor('A');
    table.addNeighbor('B');
    table.addNeighbor('C');
    assert.equal(table.size, 3);

    table.clear();
    assert.equal(table.size, 0);
    assert.ok(!table.hasNeighbor('A'));
  });

  it('should track neighbor entry timestamps', () => {
    table.addNeighbor('A');
    const all = table.getAllNeighbors();
    const entry = all[0]!;

    assert.equal(entry.nodeId, 'A');
    assert.equal(entry.state, 'connected');
    assert.ok(typeof entry.registeredAt === 'number');
    assert.ok(typeof entry.lastStateChange === 'number');
    assert.ok(entry.registeredAt > 0);
    assert.ok(entry.lastStateChange >= entry.registeredAt);
  });
});
