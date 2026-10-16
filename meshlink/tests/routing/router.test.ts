/**
 * MeshLink — Router Tests
 *
 * Tests the routing and forwarding logic using a mock transport.
 * The Router MUST NOT depend on TCP — it uses the Transport interface.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../../src/routing/Router.js';
import { RouteTable } from '../../src/routing/RouteTable.js';
import { NeighborTable } from '../../src/routing/NeighborTable.js';
import { DuplicateCache } from '../../src/routing/DuplicateCache.js';
import { Logger, LogLevel } from '../../src/logging/Logger.js';
import { createDataPacket, generateId, type MeshPacket } from '../../src/protocol/Packet.js';
import type { Transport, PacketHandler, DisconnectHandler } from '../../src/transport/Transport.js';

/** Simple mock transport for testing the router in isolation */
class MockTransport implements Transport {
  public sentPackets: Array<{ peerId: string; packet: MeshPacket }> = [];
  public started = false;
  public closed = false;
  private packetHandler: PacketHandler | null = null;
  public shouldFail = false;

  async send(peerId: string, packet: MeshPacket): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock send failure');
    }
    this.sentPackets.push({ peerId, packet });
  }

  onPacket(handler: PacketHandler): void {
    this.packetHandler = handler;
  }

  onPeerDisconnect(_handler: DisconnectHandler): void {
    // not used in unit tests
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  /** Simulate receiving a packet (for testing) */
  simulateReceive(peerId: string, packet: MeshPacket): void {
    if (this.packetHandler) {
      this.packetHandler(peerId, packet);
    }
  }
}

describe('Router', () => {
  let router: Router;
  let transport: MockTransport;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('test-router', LogLevel.ERROR);
    router = new Router('B', logger);
    transport = new MockTransport();
    router.setTransport(transport);

    // Set up: B is between A and C
    router.neighborTable.addNeighbor('A');
    router.neighborTable.addNeighbor('C');
    router.routeTable.addRoute('A', 'A', 1);
    router.routeTable.addRoute('C', 'C', 1);
    router.routeTable.addRoute('D', 'C', 2);
    router.routeTable.addRoute('E', 'C', 3);
  });

  afterEach(() => {
    router.destroy();
  });

  describe('Local delivery', () => {
    it('should deliver packet addressed to this node', async () => {
      const deliveredPackets: MeshPacket[] = [];
      router.onDelivery((pkt) => { deliveredPackets.push(pkt); });

      const pkt = createDataPacket('A', 'B', 'Hello B', 10, generateId());
      const result = await router.processPacket('A', pkt);

      assert.equal(result.action, 'delivered');
      assert.equal(deliveredPackets.length, 1);
      assert.equal(deliveredPackets[0]!.payload, 'Hello B');
    });
  });

  describe('Forwarding', () => {
    it('should forward packet to next hop', async () => {
      const pkt = createDataPacket('A', 'E', 'Hello E', 10, generateId());
      const result = await router.processPacket('A', pkt);

      assert.equal(result.action, 'forwarded');
      assert.equal((result as { nextHop: string }).nextHop, 'C');
      assert.equal(transport.sentPackets.length, 1);
      assert.equal(transport.sentPackets[0]!.peerId, 'C');
      assert.equal(transport.sentPackets[0]!.packet.ttl, 9); // decremented
      assert.equal(transport.sentPackets[0]!.packet.hopCount, 1); // incremented
    });

    it('should preserve destinationId across hops', async () => {
      const pkt = createDataPacket('A', 'E', 'for E', 10, generateId());
      await router.processPacket('A', pkt);

      assert.equal(transport.sentPackets[0]!.packet.destinationId, 'E');
      assert.equal(transport.sentPackets[0]!.packet.sourceId, 'A');
    });
  });

  describe('TTL enforcement', () => {
    it('should drop packet with TTL = 0', async () => {
      const pkt = createDataPacket('A', 'E', 'expired', 0, generateId());
      const result = await router.processPacket('A', pkt);

      assert.equal(result.action, 'dropped');
      assert.ok((result as { reason: string }).reason.includes('TTL'));
      assert.equal(transport.sentPackets.length, 0);
    });

    it('should drop packet when TTL reaches 0 after decrement', async () => {
      const pkt = createDataPacket('A', 'E', 'almost expired', 1, generateId());
      const result = await router.processPacket('A', pkt);

      assert.equal(result.action, 'dropped');
      assert.ok((result as { reason: string }).reason.includes('TTL'));
      assert.equal(transport.sentPackets.length, 0);
    });

    it('should forward packet with TTL = 2 (becomes 1 after decrement)', async () => {
      const pkt = createDataPacket('A', 'E', 'just enough', 2, generateId());
      const result = await router.processPacket('A', pkt);

      assert.equal(result.action, 'forwarded');
      assert.equal(transport.sentPackets[0]!.packet.ttl, 1);
    });
  });

  describe('Duplicate detection', () => {
    it('should suppress duplicate packets', async () => {
      const id = generateId();
      const pkt1 = createDataPacket('A', 'E', 'first', 10, id);
      const pkt2 = createDataPacket('A', 'E', 'first', 10, id);

      const result1 = await router.processPacket('A', pkt1);
      const result2 = await router.processPacket('A', pkt2);

      assert.equal(result1.action, 'forwarded');
      assert.equal(result2.action, 'dropped');
      assert.ok((result2 as { reason: string }).reason.includes('duplicate'));
      assert.equal(transport.sentPackets.length, 1);
    });

    it('should accept packets with different IDs', async () => {
      const pkt1 = createDataPacket('A', 'E', 'msg1', 10, generateId());
      const pkt2 = createDataPacket('A', 'E', 'msg2', 10, generateId());

      const result1 = await router.processPacket('A', pkt1);
      const result2 = await router.processPacket('A', pkt2);

      assert.equal(result1.action, 'forwarded');
      assert.equal(result2.action, 'forwarded');
      assert.equal(transport.sentPackets.length, 2);
    });
  });

  describe('Unknown destination', () => {
    it('should drop packet with no route', async () => {
      const pkt = createDataPacket('A', 'Z', 'unknown dest', 10, generateId());
      const result = await router.processPacket('A', pkt);

      assert.equal(result.action, 'dropped');
      assert.ok((result as { reason: string }).reason.includes('no route'));
      assert.equal(transport.sentPackets.length, 0);
    });
  });

  describe('Validation', () => {
    it('should drop invalid packet', async () => {
      const badPacket = { foo: 'bar' } as unknown as MeshPacket;
      const result = await router.processPacket('A', badPacket);

      assert.equal(result.action, 'dropped');
      assert.ok((result as { reason: string }).reason.includes('validation'));
    });
  });

  describe('Transport failure', () => {
    it('should handle send failure gracefully', async () => {
      transport.shouldFail = true;
      const pkt = createDataPacket('A', 'E', 'will fail', 10, generateId());
      const result = await router.processPacket('A', pkt);

      assert.equal(result.action, 'dropped');
      assert.ok((result as { reason: string }).reason.includes('send failed'));
    });

    it('should handle missing transport', async () => {
      const noTransportRouter = new Router('X', logger);
      noTransportRouter.routeTable.addRoute('Y', 'Y', 1);

      const pkt = createDataPacket('A', 'Y', 'no transport', 10, generateId());
      const result = await noTransportRouter.processPacket('A', pkt);

      assert.equal(result.action, 'dropped');
      assert.ok((result as { reason: string }).reason.includes('no transport'));
      noTransportRouter.destroy();
    });
  });

  describe('Originate packet', () => {
    it('should send originated packet to first hop', async () => {
      const pkt = createDataPacket('B', 'E', 'from B', 10, generateId());
      const result = await router.originatePacket(pkt);

      assert.equal(result.action, 'forwarded');
      assert.equal(transport.sentPackets.length, 1);
      // TTL is NOT decremented at origin
      assert.equal(transport.sentPackets[0]!.packet.ttl, 10);
    });

    it('should deliver to self', async () => {
      let delivered = false;
      router.onDelivery(() => { delivered = true; });

      const pkt = createDataPacket('B', 'B', 'self', 10, generateId());
      const result = await router.originatePacket(pkt);

      assert.equal(result.action, 'delivered');
      assert.ok(delivered);
    });
  });

  describe('Routing loop prevention', () => {
    it('should prevent infinite forwarding via TTL', async () => {
      // Create a loop: B→C, C→B  for destination Z
      router.routeTable.addRoute('Z', 'C', 1);

      // Simulate multiple hops with decreasing TTL
      let ttl = 5;
      let forwarded = 0;
      while (ttl > 0) {
        const pkt = createDataPacket('A', 'Z', 'loop', ttl, generateId());
        const result = await router.processPacket('A', pkt);
        if (result.action === 'forwarded') {
          forwarded++;
          ttl = transport.sentPackets[transport.sentPackets.length - 1]!.packet.ttl;
        } else {
          break;
        }
      }

      // TTL should eventually prevent forwarding
      assert.ok(forwarded < 10, 'Should stop forwarding before too many hops');
    });
  });
});
