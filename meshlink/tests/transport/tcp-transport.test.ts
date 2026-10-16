/**
 * MeshLink — TCP Transport Tests
 *
 * Tests actual TCP communication with length-prefixed framing.
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TcpTransport } from '../../src/transport/TcpTransport.js';
import { Logger, LogLevel } from '../../src/logging/Logger.js';
import { createDataPacket, generateId, type MeshPacket } from '../../src/protocol/Packet.js';

const HOST = '127.0.0.1';
let portCounter = 10000;
function nextPort(): number {
  return portCounter++;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('TcpTransport', () => {
  const transports: TcpTransport[] = [];

  function createTransport(nodeId: string): { transport: TcpTransport; port: number } {
    const port = nextPort();
    const logger = new Logger(nodeId, LogLevel.ERROR);
    const transport = new TcpTransport(HOST, port, logger);
    transports.push(transport);
    return { transport, port };
  }

  afterEach(async () => {
    for (const t of transports) {
      try { await t.close(); } catch { /* ignore */ }
    }
    transports.length = 0;
  });

  it('should start and listen on a port', async () => {
    const { transport } = createTransport('server');
    await transport.start();
    // If no error, the server is listening
  });

  it('should send a packet between two transports', async () => {
    const { transport: tA, port: portA } = createTransport('A');
    const { transport: tB, port: portB } = createTransport('B');

    // Register peers
    tA.addPeer('B', HOST, portB);
    tB.addPeer('A', HOST, portA);

    const received: MeshPacket[] = [];
    tB.onPacket((_peerId, pkt) => { received.push(pkt); });
    tB.onPeerDisconnect(() => {});

    await tA.start();
    await tB.start();

    // A sends to B
    const pkt = createDataPacket('A', 'B', 'Hello B', 10, generateId());
    tA.onPacket(() => {});
    tA.onPeerDisconnect(() => {});
    await tA.send('B', pkt);

    await sleep(300);

    assert.equal(received.length, 1, 'B should have received the packet');
    assert.equal(received[0]!.payload, 'Hello B');
    assert.equal(received[0]!.sourceId, 'A');
    assert.equal(received[0]!.destinationId, 'B');
  });

  it('should handle multiple messages', async () => {
    const { transport: tA, port: portA } = createTransport('senderM');
    const { transport: tB, port: portB } = createTransport('receiverM');

    tA.addPeer('receiverM', HOST, portB);
    tB.addPeer('senderM', HOST, portA);

    const received: MeshPacket[] = [];
    tB.onPacket((_peerId, pkt) => { received.push(pkt); });
    tB.onPeerDisconnect(() => {});
    tA.onPacket(() => {});
    tA.onPeerDisconnect(() => {});

    await tA.start();
    await tB.start();

    // Send 5 messages rapidly
    for (let i = 0; i < 5; i++) {
      const pkt = createDataPacket('senderM', 'receiverM', `msg-${i}`, 10, generateId());
      await tA.send('receiverM', pkt);
    }

    await sleep(500);

    assert.equal(received.length, 5, 'Should receive all 5 messages');
    for (let i = 0; i < 5; i++) {
      assert.equal(received[i]!.payload, `msg-${i}`);
    }
  });

  it('should throw when sending to unknown peer', async () => {
    const { transport: tA } = createTransport('loner');
    tA.onPacket(() => {});
    tA.onPeerDisconnect(() => {});
    await tA.start();

    const pkt = createDataPacket('loner', 'nobody', 'hello?', 10, generateId());
    await assert.rejects(
      () => tA.send('nobody', pkt),
      /No endpoint registered/
    );
  });

  it('should report connection count', async () => {
    const { transport: tA, port: portA } = createTransport('countA');
    const { transport: tB, port: portB } = createTransport('countB');

    tA.addPeer('countB', HOST, portB);
    tB.addPeer('countA', HOST, portA);
    tA.onPacket(() => {});
    tA.onPeerDisconnect(() => {});
    tB.onPacket(() => {});
    tB.onPeerDisconnect(() => {});

    await tA.start();
    await tB.start();

    assert.equal(tA.connectionCount, 0);

    const pkt = createDataPacket('countA', 'countB', 'hi', 10, generateId());
    await tA.send('countB', pkt);
    await sleep(200);

    assert.equal(tA.connectionCount, 1);
  });
});
