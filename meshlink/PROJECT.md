# MeshLink — Project Definition

## Project goal

Build a prototype of an **offline, application-level multi-hop messaging network**.

A node must be able to send a text message to another node that is **not directly connected** to it. Intermediate nodes forward the message using routing information.

**Example:**

```
A → B → C → D → E
```

A sends to E. B, C, and D relay the message. E delivers it.

---

## Primary objective

Demonstrate correct multi-hop routing and forwarding in a **repeatable terminal-based prototype** within one week.

---

## Target audience

Student project evaluators who need to:

- See a **working implementation**
- Understand its **architecture**
- **Reproduce** the demonstration

---

## Required MVP features (P0)

| #  | Feature                                              |
|----|------------------------------------------------------|
| 1  | Five logical nodes                                   |
| 2  | Stable logical node IDs                              |
| 3  | Packet representation and validation                 |
| 4  | Neighbor relationships                               |
| 5  | Routing table and next-hop lookup                    |
| 6  | Multi-hop forwarding                                 |
| 7  | Message IDs and duplicate suppression                |
| 8  | TTL/hop-limit enforcement                            |
| 9  | TCP transport (or equally explicit IPC transport)    |
| 10 | Correct TCP message framing (length-prefixed)        |
| 11 | Readable routing and packet logs                     |
| 12 | Automated tests                                      |
| 13 | Setup instructions and repeatable demo               |
| 14 | Honest limitations documentation                     |

---

## Optional features (P1 / P2)

| Priority | Feature                                     |
|----------|---------------------------------------------|
| P1       | Simplified automatic route discovery        |
| P1       | Alternate paths and basic route recovery    |
| P1       | CLI for live node management                |
| P2       | Minimal React Native GUI                    |
| P2       | Android Wi-Fi P2P feasibility test          |
| P2       | Kotlin native module                        |

> **Optional features must not delay the core MVP.**

---

## Explicit non-goals

- Production-grade AODV compliance
- Guaranteed real-phone multi-hop Wi-Fi P2P
- Encryption and authentication
- Cloud or Internet services
- User accounts
- Voice and video
- Large file transfer
- BLE or Wi-Fi Aware integration
- Large-scale mesh performance claims
- Production battery optimization

---

## Acceptance scenario

### Topology

```
A ←→ B ←→ C ←→ D ←→ E
```

| Node | Connected to |
|------|--------------|
| A    | B            |
| B    | A, C         |
| C    | B, D         |
| D    | C, E         |
| E    | D            |

### Test

1. Send a message from **A** to **E**.
2. Expected path: `A → B → C → D → E`.
3. The destination receives the **original payload exactly once**.
4. Logs show the **forwarding decision at each intermediate node**.

---

## Submission evidence

Provide:

- [ ] Source code
- [ ] Build and test commands
- [ ] Test results
- [ ] A repeatable demo
- [ ] Architecture diagram
- [ ] Known limitations
- [ ] Screenshots or terminal output from actual execution
- [ ] A short explanation of how the packet travels through the network
