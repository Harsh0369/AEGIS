/**
 * MeshLink — CLI Entry Point
 *
 * Provides a simple command-line interface for running demos and inspecting the mesh.
 * Usage:
 *   node dist/src/cli/main.js demo     — Run the five-node demo
 *   node dist/src/cli/main.js          — Show usage
 */

const args = process.argv.slice(2);
const command = args[0];

async function showUsage(): Promise<void> {
  console.log(`
MeshLink — Offline Mesh Messaging

Usage:
  npm run demo                      Run the five-node demonstration
  npm test                          Run all automated tests
  npm run test:unit                 Run unit tests only
  npm run test:integration          Run integration tests only
  npm run build                     Build the TypeScript project

Commands:
  demo      Run the five-node A→B→C→D→E demonstration
  help      Show this help message

For more information, see README.md
`);
}

async function main(): Promise<void> {
  switch (command) {
    case 'demo': {
      // Dynamically import the demo
      await import('../../examples/five-node-demo.js');
      break;
    }
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      await showUsage();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      await showUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
