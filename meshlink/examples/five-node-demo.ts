/**
 * MeshLink — Five-Node Demo
 *
 * Demonstrates multi-hop message delivery across a linear topology:
 *
 *   A ←→ B ←→ C ←→ D ←→ E
 *
 * Node A sends a message to Node E.
 * Expected path: A → B → C → D → E
 *
 * Usage: npm run demo
 */

import { MeshNode } from '../src/core/MeshNode.js';
import { type NodeConfig } from '../src/core/Node.js';
import { LogLevel } from '../src/logging/Logger.js';
import { resetLoggerColors } from '../src/logging/Logger.js';

const HOST = '127.0.0.1';

// Port assignments for each node
const PORTS = {
  A: 9001,
  B: 9002,
  C: 9003,
  D: 9004,
  E: 9005,
};

/**
 * Build the node configurations for a linear topology:
 * A ←→ B ←→ C ←→ D ←→ E
 *
 * Each node has static routes to all destinations via its neighbor
 * in the direction of the destination.
 */
function buildConfigs(): NodeConfig[] {
  const nodeA: NodeConfig = {
    nodeId: 'A',
    host: HOST,
    port: PORTS.A,
    neighbors: [{ nodeId: 'B', host: HOST, port: PORTS.B }],
    routes: [
      { destination: 'B', nextHop: 'B', hopCount: 1 },
      { destination: 'C', nextHop: 'B', hopCount: 2 },
      { destination: 'D', nextHop: 'B', hopCount: 3 },
      { destination: 'E', nextHop: 'B', hopCount: 4 },
    ],
  };

  const nodeB: NodeConfig = {
    nodeId: 'B',
    host: HOST,
    port: PORTS.B,
    neighbors: [
      { nodeId: 'A', host: HOST, port: PORTS.A },
      { nodeId: 'C', host: HOST, port: PORTS.C },
    ],
    routes: [
      { destination: 'A', nextHop: 'A', hopCount: 1 },
      { destination: 'C', nextHop: 'C', hopCount: 1 },
      { destination: 'D', nextHop: 'C', hopCount: 2 },
      { destination: 'E', nextHop: 'C', hopCount: 3 },
    ],
  };

  const nodeC: NodeConfig = {
    nodeId: 'C',
    host: HOST,
    port: PORTS.C,
    neighbors: [
      { nodeId: 'B', host: HOST, port: PORTS.B },
      { nodeId: 'D', host: HOST, port: PORTS.D },
    ],
    routes: [
      { destination: 'A', nextHop: 'B', hopCount: 2 },
      { destination: 'B', nextHop: 'B', hopCount: 1 },
      { destination: 'D', nextHop: 'D', hopCount: 1 },
      { destination: 'E', nextHop: 'D', hopCount: 2 },
    ],
  };

  const nodeD: NodeConfig = {
    nodeId: 'D',
    host: HOST,
    port: PORTS.D,
    neighbors: [
      { nodeId: 'C', host: HOST, port: PORTS.C },
      { nodeId: 'E', host: HOST, port: PORTS.E },
    ],
    routes: [
      { destination: 'A', nextHop: 'C', hopCount: 3 },
      { destination: 'B', nextHop: 'C', hopCount: 2 },
      { destination: 'C', nextHop: 'C', hopCount: 1 },
      { destination: 'E', nextHop: 'E', hopCount: 1 },
    ],
  };

  const nodeE: NodeConfig = {
    nodeId: 'E',
    host: HOST,
    port: PORTS.E,
    neighbors: [{ nodeId: 'D', host: HOST, port: PORTS.D }],
    routes: [
      { destination: 'A', nextHop: 'D', hopCount: 4 },
      { destination: 'B', nextHop: 'D', hopCount: 3 },
      { destination: 'C', nextHop: 'D', hopCount: 2 },
      { destination: 'D', nextHop: 'D', hopCount: 1 },
    ],
  };

  return [nodeA, nodeB, nodeC, nodeD, nodeE];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  resetLoggerColors();

  console.log('\n' + '='.repeat(70));
  console.log('  MeshLink — Five-Node Multi-Hop Mesh Demo');
  console.log('  Topology: A ←→ B ←→ C ←→ D ←→ E');
  console.log('='.repeat(70) + '\n');

  const configs = buildConfigs();
  const nodes: MeshNode[] = [];

  // Create all nodes
  for (const config of configs) {
    const node = new MeshNode(config, LogLevel.INFO);
    nodes.push(node);
  }

  const [nodeA, nodeB, nodeC, nodeD, nodeE] = nodes;

  // Track delivery
  let delivered = false;
  let deliveredPayload = '';

  nodeE!.onMessage((packet) => {
    delivered = true;
    deliveredPayload = packet.payload;
  });

  try {
    // Start all nodes
    console.log('--- Starting all nodes ---\n');
    for (const node of nodes) {
      await node.start();
    }

    // Small delay to let servers bind
    await sleep(500);

    // Display routing tables
    console.log('\n--- Routing Tables ---\n');
    for (const node of nodes) {
      node.displayRoutes();
    }

    console.log('\n--- Sending Message: A → E ---\n');

    // Send message from A to E
    const result = await nodeA!.sendMessage('E', 'Hello from A to E!');

    // Wait for the message to propagate through the network
    await sleep(1500);

    // Results
    console.log('\n--- Results ---\n');

    if (delivered) {
      console.log(`✅ SUCCESS: Message delivered to E`);
      console.log(`   Payload: "${deliveredPayload}"`);
      console.log(`   Send result: ${result.action}`);
    } else {
      console.log(`❌ FAILED: Message was not delivered to E`);
      console.log(`   Send result: ${JSON.stringify(result)}`);
    }

    // Send a second message to show duplicate handling
    console.log('\n--- Second Message: E → A ---\n');

    let deliveredToA = false;
    nodeA!.onMessage((packet) => {
      deliveredToA = true;
      console.log(`   Node A received: "${packet.payload}" from ${packet.sourceId}`);
    });

    await nodeE!.sendMessage('A', 'Reply from E to A!');
    await sleep(1500);

    if (deliveredToA) {
      console.log(`✅ SUCCESS: Reply delivered to A`);
    } else {
      console.log(`❌ FAILED: Reply was not delivered to A`);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('  Demo Complete');
    console.log('  Messages sent: 2');
    console.log(`  A → E: ${delivered ? '✅ Delivered' : '❌ Failed'}`);
    console.log(`  E → A: ${deliveredToA ? '✅ Delivered' : '❌ Failed'}`);
    console.log('='.repeat(70) + '\n');

  } finally {
    // Shutdown all nodes
    console.log('--- Shutting down ---\n');
    for (const node of nodes) {
      await node.stop();
    }
  }
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
