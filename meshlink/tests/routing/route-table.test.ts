/**
 * MeshLink — Route Table Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RouteTable } from '../../src/routing/RouteTable.js';
import { Logger, LogLevel } from '../../src/logging/Logger.js';

describe('RouteTable', () => {
  let table: RouteTable;

  beforeEach(() => {
    table = new RouteTable(new Logger('test-rt', LogLevel.ERROR));
  });

  it('should add and lookup a route', () => {
    table.addRoute('E', 'B', 4);
    assert.equal(table.getNextHop('E'), 'B');
  });

  it('should return undefined for unknown destination', () => {
    assert.equal(table.getNextHop('Z'), undefined);
  });

  it('should replace an existing route', () => {
    table.addRoute('E', 'B', 4);
    table.addRoute('E', 'C', 3);
    assert.equal(table.getNextHop('E'), 'C');
  });

  it('should remove a route', () => {
    table.addRoute('E', 'B', 4);
    assert.equal(table.removeRoute('E'), true);
    assert.equal(table.getNextHop('E'), undefined);
  });

  it('should return false when removing non-existent route', () => {
    assert.equal(table.removeRoute('Z'), false);
  });

  it('should invalidate a route', () => {
    table.addRoute('E', 'B', 4);
    table.invalidateRoute('E');
    assert.equal(table.getNextHop('E'), undefined);
  });

  it('should check active route existence', () => {
    table.addRoute('E', 'B', 4);
    assert.equal(table.hasActiveRoute('E'), true);
    assert.equal(table.hasActiveRoute('Z'), false);
  });

  it('should return all active routes', () => {
    table.addRoute('B', 'B', 1);
    table.addRoute('C', 'B', 2);
    table.addRoute('D', 'B', 3);
    table.invalidateRoute('C');

    const active = table.getAllRoutes();
    assert.equal(active.length, 2);
    assert.ok(active.some(r => r.destination === 'B'));
    assert.ok(active.some(r => r.destination === 'D'));
  });

  it('should handle route expiry', () => {
    table.addRoute('E', 'B', 4, Date.now() - 1000); // Already expired
    assert.equal(table.getNextHop('E'), undefined);
  });

  it('should return route for non-expired entry', () => {
    table.addRoute('E', 'B', 4, Date.now() + 60_000); // Expires in 60s
    assert.equal(table.getNextHop('E'), 'B');
  });

  it('should track size correctly', () => {
    assert.equal(table.size, 0);
    table.addRoute('B', 'B', 1);
    table.addRoute('C', 'B', 2);
    assert.equal(table.size, 2);
    table.clear();
    assert.equal(table.size, 0);
  });

  it('should get full route entry', () => {
    table.addRoute('E', 'B', 4);
    const entry = table.getRoute('E');
    assert.ok(entry);
    assert.equal(entry.destination, 'E');
    assert.equal(entry.nextHop, 'B');
    assert.equal(entry.hopCount, 4);
    assert.equal(entry.state, 'active');
  });

  it('should produce display string', () => {
    table.addRoute('E', 'B', 4);
    const display = table.toDisplayString();
    assert.ok(display.includes('E'));
    assert.ok(display.includes('B'));
  });

  it('should produce empty display for empty table', () => {
    const display = table.toDisplayString();
    assert.ok(display.includes('empty'));
  });
});
