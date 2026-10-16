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

1. **Active Target:** Demonstrate genuine offline messaging and multi-hop forwarding on physical Android hardware across incremental milestones (P0 UI & Build → P1 Direct Connectivity → P2 Routing Engine Integration → P3 Multi-Phone Relay).
2. **Tested Fallback:** Retain the fully verified, 114-test terminal-based prototype simulating 5-node A ↔ B ↔ C ↔ D ↔ E multi-hop mesh.

---

## Target audience

Student project evaluators who need to:

- See a **working implementation** (physical Android app and terminal simulation)
- Understand its **architecture** (protocol separation from physical transport)
- **Reproduce** the demonstration easily via USB (`adb install`) or CLI (`npm run demo`)

---

## Current Roadmap & Milestones

| Priority | Milestone | Status | Key Deliverable |
|:---|:---|:---|:---|
| **P0 (CLI)** | Core Multi-Hop Mesh (Node.js/TS) | **COMPLETED** | 114 tests passing; 5-node A→B→C→D→E demo |
| **P0 (App)** | Android UI & Installable Build | **COMPLETED** | React UI with Node ID, Destination, Message list, Diagnostic log, and valid `app-debug.apk` |
| **P1** | Two-Phone Offline Connectivity | **NEXT** | Direct offline communication between two physical phones via Android SDK transport |
| **P2** | Routing Engine Integration | **PLANNED** | Android transport wired to shared TypeScript protocol & router |
| **P3** | Three-Phone Physical Relay | **PLANNED** | Multi-hop A → B → C forwarding through intermediate phone |

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
