# MeshLink — Offline Mesh Messaging

> Application-level multi-hop messaging prototype built with TypeScript and Node.js.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run the five-node demo
npm run demo
```

## Demonstration Topology

```
A ←→ B ←→ C ←→ D ←→ E
```

Node A sends a message to Node E through intermediate nodes B, C, and D. Each node makes an independent forwarding decision.

## Project Structure

```
meshlink/
├── AGENTS.md              # Agent behavioral rules
├── PROJECT.md             # Goals and scope
├── ARCHITECTURE.md        # Components and packet flow
├── PLAN.md                # Seven-day execution plan
├── DECISIONS.md           # Architecture decision log
├── TESTING.md             # Test requirements and acceptance
├── RESEARCH.md            # Research context and limitations
├── MASTER_PROMPT.md       # Coding agent instructions
├── src/
│   ├── cli/               # CLI entry point and demo
│   ├── core/              # Node orchestration and messaging
│   ├── protocol/          # Packet types, validation, framing
│   ├── routing/           # Router, route table, neighbors, dedup
│   ├── transport/         # Transport interface and TCP impl
│   ├── logging/           # Structured per-node logging
│   └── config/            # Default configuration
├── tests/
│   ├── protocol/          # Packet and framing tests
│   ├── routing/           # Route table and forwarding tests
│   ├── transport/         # TCP transport tests
│   └── integration/       # Multi-node integration tests
├── examples/              # Demo scripts
└── evidence/              # Test output and screenshots
```

## Documentation

- [Project Definition](./PROJECT.md)
- [Architecture](./ARCHITECTURE.md)
- [Execution Plan](./PLAN.md)
- [Decisions](./DECISIONS.md)
- [Testing](./TESTING.md)
- [Research Context](./RESEARCH.md)

## Limitations

- This is a student research prototype.
- Local TCP simulation does not prove real wireless multi-hop.
- No authentication or encryption is implemented.
- See [RESEARCH.md](./RESEARCH.md) for full limitations.

## License

Academic project — not for production use.
