# MeshLink — MVP Architecture

## 1. Architectural principle

**Separate the logical mesh protocol from the physical/process transport.**

- The **routing engine** decides which logical neighbor should receive a packet.
- The **transport implementation** moves bytes to that neighbor.

The initial MVP uses Node.js and TypeScript. It does not require Android, a GUI, a cloud service, or Internet access.

---

## 2. Logical architecture

```
┌───────────────────────┐
│    CLI / Demo         │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│   Message Manager     │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│  Packet Model &       │
│  Validation           │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│  Router / Forwarder   │
│  ├── Neighbor Table   │
│  ├── Route Table      │
│  └── Duplicate Cache  │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│  Transport Interface  │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│  TCP Transport        │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│  Neighbor Process     │
└───────────────────────┘
```

Each node owns its own:
- Node ID
- Routing state
- Neighbor information
- Duplicate cache

---

## 3. Source layout

```
src/
  cli/
    main.ts                  # CLI entry point and demo runner
  core/
    Node.ts                  # Node configuration types
    MeshNode.ts              # Main node orchestrator
    MessageManager.ts        # Message creation and delivery tracking
  protocol/
    Packet.ts                # Packet type definitions
    PacketValidator.ts       # Incoming packet validation
    FrameCodec.ts            # Length-prefixed TCP framing
  routing/
    Router.ts                # Routing and forwarding logic
    RouteTable.ts            # Destination → next-hop mapping
    NeighborTable.ts         # Direct neighbor management
    DuplicateCache.ts        # Message ID deduplication
  transport/
    Transport.ts             # Transport interface (abstract)
    TcpTransport.ts          # TCP implementation of transport
  logging/
    Logger.ts                # Structured, per-node logging
  config/
    defaults.ts              # Default configuration values

tests/
  protocol/
    packet.test.ts           # Packet creation and validation tests
    frame-codec.test.ts      # Framing edge cases
  routing/
    route-table.test.ts      # Route lookup and update tests
    duplicate-cache.test.ts  # Duplicate detection tests
    router.test.ts           # Forwarding logic tests
  transport/
    tcp-transport.test.ts    # TCP framing and connection tests
  integration/
    direct-delivery.test.ts  # A → B delivery
    three-node.test.ts       # A → B → C forwarding
    five-node.test.ts        # A → B → C → D → E forwarding
    error-cases.test.ts      # Unknown routes, loops, TTL expiry

examples/
  five-node-demo.ts          # Repeatable five-node demonstration
```

> Adjust the layout when useful, but **retain the separation of responsibilities**.

---

## 4. Packet model

### Data packet fields

| Field           | Type     | Description                           |
|-----------------|----------|---------------------------------------|
| `version`       | `number` | Protocol version (initially `1`)      |
| `messageId`     | `string` | Unique message identifier (UUID)      |
| `sourceId`      | `string` | Originating node ID                   |
| `destinationId` | `string` | Final destination node ID             |
| `type`          | `string` | Packet type: `DATA`, `RREQ`, `RREP`  |
| `ttl`           | `number` | Remaining hop limit                   |
| `payload`       | `string` | Message content (for `DATA` packets)  |
| `hopCount`      | `number` | Number of hops traversed so far       |

### Routing control extensions (P1)

| Field              | Type     | Description                     |
|--------------------|----------|---------------------------------|
| `requestId`        | `string` | Route request identifier        |
| `requestedDestId`  | `string` | Destination being sought        |

### Rules

- Use explicit TypeScript types.
- Use **JSON serialization** initially for debugging and simplicity.
- **Validate all received packets** before routing them.
- The `destinationId` remains the **final destination** across every hop. The transport recipient is the **next hop**, which changes at each node.

---

## 5. Node model

Each node has:

| Component          | Purpose                                    |
|--------------------|--------------------------------------------|
| Logical ID         | Persistent identity within the network     |
| Neighbor table     | Directly connected peers                   |
| Route table        | Destination → next-hop mapping             |
| Duplicate cache    | Previously seen message IDs                |
| Transport instance | TCP socket management                      |
| Packet receiver    | Incoming packet handler                    |
| Router             | Forwarding decision engine                 |
| Logger             | Per-node structured logging                |

> **Node identity is not the same as an IP address or TCP port.**

---

## 6. Routing table

A route entry contains:

| Field        | Type                  | Description                    |
|--------------|-----------------------|--------------------------------|
| `destination`| `string`              | Target node ID                 |
| `nextHop`    | `string`              | Immediate neighbor to forward  |
| `hopCount`   | `number`              | Distance in hops               |
| `state`      | `'active' \| 'stale'` | Route validity                 |
| `expiresAt`  | `number \| undefined` | Optional TTL for the route     |

### Example: routing table at node A

| Destination | Next hop | Hop count |
|-------------|----------|-----------|
| B           | B        | 1         |
| C           | B        | 2         |
| D           | B        | 3         |
| E           | B        | 4         |

> The routing engine must **not** assume that all nodes have the same routing table.

---

## 7. Forwarding algorithm

```
1. Validate the packet
2. Check whether TTL > 0
3. Check the duplicate cache
4. Record the message ID in the duplicate cache
5. If destinationId === localNodeId → DELIVER the payload
6. Else → look up next hop in the route table
7. If no route → LOG error, drop packet
8. Decrement TTL
9. If TTL === 0 after decrement → LOG expiry, drop packet
10. Send the packet to the next hop via the transport interface
11. LOG the forwarding decision
```

> **Define and test the TTL boundary** carefully so that a packet cannot be forwarded indefinitely.

---

## 8. Transport interface

```typescript
interface Transport {
  /** Send a packet to a specific peer */
  send(peerId: string, packet: MeshPacket): Promise<void>;

  /** Register a handler for incoming packets */
  onPacket(handler: (peerId: string, packet: MeshPacket) => void): void;

  /** Register a handler for peer disconnection */
  onPeerDisconnect(handler: (peerId: string) => void): void;

  /** Start listening for connections */
  start(): Promise<void>;

  /** Gracefully shut down */
  close(): Promise<void>;
}
```

> Adapt the interface as needed for the chosen implementation.
>
> **The router must not import Node.js TCP socket classes.**
>
> The TCP transport maps a logical peer ID to a local endpoint in the simulation. The mapping is configuration, not the permanent node identity.

---

## 9. TCP framing

TCP provides a **byte stream**. It does not preserve application message boundaries.

### Length-prefixed frame format

```
┌──────────────────┬────────────────────────────┐
│  4 bytes (BE)    │  N bytes                   │
│  payload length  │  JSON-encoded packet       │
└──────────────────┴────────────────────────────┘
```

The decoder must handle:
- ✅ Partial frames (data arrives in chunks)
- ✅ Multiple frames received together
- ✅ Malformed length headers
- ✅ Oversized frames (reject above configurable max)
- ✅ Connection closure during an incomplete frame

---

## 10. Simplified route discovery (P1)

Only **after static multi-hop forwarding works**, add route discovery if time allows.

### Control packet types

| Type   | Purpose                              |
|--------|--------------------------------------|
| `RREQ` | Route request — broadcast to find a path |
| `RREP` | Route reply — unicast back the discovered path |
| `DATA` | Data delivery — forwarded hop-by-hop |

### Rules

- Avoid forwarding a duplicate route request repeatedly.
- Add **request identifiers**, **hop limits**, and **route validation**.
- This is an educational AODV-like design, **not** a claim of full AODV conformance.

---

## 11. Android architecture & mobile flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Android Mobile App                     │
├─────────────────────────────────────────────────────────────┤
│  React UI (mobile/src/App.tsx)                              │
│  - Node ID Banner & Topology Quick-Pick (Node-A...Node-E)   │
│  - Message Input & Conversation Thread                      │
│  - Connection Status Badge                                  │
│  - Live Diagnostic Event Log Console                        │
├─────────────────────────────────────────────────────────────┤
│  Mesh State Manager (mobile/src/state/MeshStateManager.ts)  │
│  - Packet Creation & Validation (MeshPacket Schema)         │
│  - In-Memory Message Tracking (queued/sent/delivered)       │
│  - Structured Diagnostic Event Pipeline                     │
├─────────────────────────────────────────────────────────────┤
│  Native Bridge (com.meshlink.MeshBridge)                    │
│  - Bidirectional JS-to-Kotlin Bridge via @JavascriptInterface│
├─────────────────────────────────────────────────────────────┤
│  Android Direct Transport (AndroidDirectTransport.kt)        │
│  - Native Bridge Interface to Android OS                     │
│  - In P0: Validates packet pipeline and local loopback      │
│  - In P1: Dispatches frames over Wi-Fi Direct socket/BLE     │
├─────────────────────────────────────────────────────────────┤
│  Android OS Layer                                           │
│  - WifiP2pManager (Wi-Fi Direct) / Local TCP ServerSocket    │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Safeguards:
1. **Preserved Core CLI:** The Node.js terminal prototype and its 114 automated tests remain completely intact in `src/` and `tests/`.
2. **Unified Packet Protocol:** The mobile app's packet schema is 1:1 identical to `MeshPacket` in [`src/protocol/Packet.ts`](file:///c:/Users/harsh/OneDrive/Desktop/AEGIS/meshlink/src/protocol/Packet.ts).
3. **Pluggable Transport Contract:** The routing engine depends only on the abstract [`Transport`](file:///c:/Users/harsh/OneDrive/Desktop/AEGIS/meshlink/src/transport/Transport.ts) interface.
4. **Standalone Packaging:** The mobile UI assets are bundled into `mobile/android/app/src/main/assets/web/` so the APK runs self-contained without needing an active development laptop or bundler.

---

## 12. Storage

Persistent storage is **not required** for the initial MVP. Use in-memory state unless message history persistence is explicitly required for submission.

> Do not introduce SQLite just for architectural completeness.

---

## 13. Security limitation

The initial prototype does **not** provide authentication, encryption, or protection against malicious peers. It must **not** be represented as safe for sensitive real-world communication.
