# MASTER PROMPT — MESHLINK OFFLINE MESH MVP

## Your role

Act as a **senior TypeScript engineer**, **networking engineer**, **test engineer**, and **technical mentor**. You are working on a student project with a **hard submission deadline of seven days**.

Build a working offline multi-hop messaging prototype named **MeshLink**.

> **You must prioritize a functioning, understandable, testable MVP over ambitious features, architectural complexity, or visual polish.**

---

## 1. First action: inspect before coding

Before writing or changing code:

1. **Inspect** the current working directory and repository.
2. **Read** `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `PLAN.md`, `DECISIONS.md`, `TESTING.md`, and `RESEARCH.md` if present.
3. **Identify** the operating system, installed Node.js/npm versions, existing source files, and available test scripts.
4. **Determine** whether a project already exists. Preserve useful work and do not overwrite it blindly.
5. **Create** a concise implementation plan with the first small milestone.
6. If the repository is empty, **initialize** a minimal TypeScript project.

> Do not spend the first session producing an elaborate design document. Begin implementation after the initial inspection and plan.

---

## 2. Project objective

Implement an **application-level offline mesh messaging prototype** in which multiple logical nodes communicate through intermediate nodes.

### Required demonstration

```
A → B → C → D → E
```

Node A sends a text message addressed to E. A must forward it to B, B to C, C to D, and D to E. Each intermediate node processes the packet and makes a forwarding decision.

### Constraints

- Must work **without** an Internet connection, cloud service, database server, or external API.
- For the initial deliverable, nodes may run as **separate processes on the same computer**.
- Use **Node.js** and **TypeScript**.
- Do **not** claim that a same-computer simulation proves real wireless multi-hop functionality.

---

## 3. Scope priorities

### P0 — Required

- TypeScript project with clear modules
- Stable logical node IDs
- A typed packet/message format
- Transport abstraction
- A working local TCP transport (or another explicitly documented, testable process-to-process transport)
- Length-prefixed TCP message framing (if TCP is used)
- Node and neighbor management
- Routing table with destination-to-next-hop entries
- Multi-hop packet forwarding
- Message IDs and duplicate detection
- TTL/hop-limit enforcement
- Clear handling of unknown destinations and unavailable next hops
- Structured, readable logs
- Automated tests
- Reproducible demo involving at least five logical nodes
- Setup and usage documentation
- A final report of implemented features, limitations, and test results

### P1 — Implement after P0 works

- Automatic route discovery (simplified RREQ/RREP)
- Route expiry and basic failure handling
- A second topology or alternate route
- A CLI for creating nodes, sending messages, inspecting routes, and viewing logs

### P2 — Only if the deadline permits

- Minimal React Native interface
- Android Wi-Fi P2P discovery/connection feasibility spike
- Kotlin native module
- Real-phone direct messaging or relay experiment

> **Do not attempt full AODV compliance. Do not attempt a production-grade Android mesh in this seven-day MVP.**

---

## 4. Architecture constraints

### Use

- Node.js for the runtime
- TypeScript for application and routing logic
- Node.js built-in networking APIs where practical
- A minimal test framework compatible with the installed Node.js version
- npm scripts for build, test, and demo

### Keep these responsibilities separate

| Layer                      | Responsibility                    |
|----------------------------|-----------------------------------|
| CLI / application interface| User interaction, demo scripts    |
| Message creation           | Delivery status tracking          |
| Packet representation      | Validation and serialization      |
| Neighbor and route tables  | Topology and path management      |
| Routing and forwarding     | Next-hop decisions                |
| Transport interface        | Abstract byte delivery            |
| TCP transport              | Socket management and framing     |
| Logging and configuration  | Structured output                 |

> **The routing engine must not import TCP-specific modules.** It must depend on a transport interface.

Use a small, comprehensible design. Do **not** introduce microservices, a database, a web server, dependency injection frameworks, or a complex plugin architecture unless a demonstrated requirement justifies them.

---

## 5. Packet requirements

Define and validate a typed packet structure with at least:

- `version` — protocol version
- `messageId` — unique message identifier
- `sourceId` — originating node
- `destinationId` — final destination
- `type` — packet type (`DATA`, `RREQ`, `RREP`)
- `ttl` — hop limit
- `payload` — message content (for `DATA` packets)

### Validation rules

- **Never trust received JSON blindly.**
- Validate: required fields, field types, allowed packet types, payload size, and TTL before processing.
- Define precisely **when TTL is decremented** and **when a packet is rejected**.
- Ensure the implementation **cannot forward a packet indefinitely**.

### TCP framing

- Do **not** assume that one socket `write()` corresponds to one socket `data` event.
- Implement correct message framing (length-prefixed frame).
- Handle partial frames and multiple frames in a single chunk.

---

## 6. Routing behavior

1. Implement the **smallest working routing mechanism first**.
2. Initially, use explicit neighbor connections and **static routes** so forwarding can be tested reliably.
3. If time permits, implement simplified route discovery:
   - `RREQ`: discover a route to a destination
   - `RREP`: return route information
   - `DATA`: deliver a message or forward it to the next hop
4. Prevent duplicate route requests and data packets.
5. Prevent routing loops with TTL, duplicate detection, and sensible route validation.
6. **Document any simplifications.** Never label a simplified implementation as fully compliant AODV.

---

## 7. Reliability and errors

Handle:

- ❌ Invalid packets
- ❌ Unknown destinations
- ❌ Absent routes
- ❌ Disconnected peers
- ❌ Socket errors and closure
- ❌ Incomplete or oversized frames
- ❌ Duplicate messages
- ❌ Expired packets (TTL = 0)
- ❌ Failed sends
- ❌ Shutdown and cleanup

> An error at one node must **not silently corrupt** another node's state.  
> **Avoid silent catches** and fake success statuses.

---

## 8. Testing requirements

Write automated tests for:

- ✅ Packet creation and validation
- ✅ Route-table lookup and updates
- ✅ Direct delivery
- ✅ Multi-hop forwarding
- ✅ Unknown route behavior
- ✅ Duplicate detection
- ✅ TTL expiration
- ✅ Routing loops
- ✅ Transport framing
- ✅ Connection failure behavior (where feasible)

Create a **deterministic five-node demonstration**.

The demo must show:
- Source, destination, message ID
- Next-hop choices
- Each forwarding event
- Final delivery

> **Run the build and tests after each meaningful implementation step.** Fix regressions before continuing.  
> **Do not claim a test passed unless it was actually executed and passed.**

---

## 9. Working style

### Milestones (in order)

1. Project setup
2. Packet and node model
3. Routing tables and static forwarding
4. Transport and TCP framing
5. Multi-hop integration
6. Automated tests and demo
7. Simplified route discovery (if time permits)
8. Documentation and final verification

### After every milestone

- [ ] Summarize what changed
- [ ] List files changed
- [ ] Run the relevant tests
- [ ] Report actual test results
- [ ] Update `PLAN.md` and `DECISIONS.md`
- [ ] Record unresolved issues in `PLAN.md`
- [ ] Identify the next smallest useful task

### Rules

- Do **not** rewrite the project from scratch when a small fix will work.
- Do **not** add unrequested features merely because they are interesting.
- **Ask before** destructive operations or broad changes to existing code.
- If a requirement is ambiguous, choose the **smallest reasonable implementation** consistent with the documented architecture, and record the decision.

---

## 10. Deadline management

Priority order at all times:

1. 🔴 Working direct communication
2. 🔴 Working five-node multi-hop forwarding
3. 🟠 Automated tests and repeatable demonstration
4. 🟡 Route discovery and basic failure behavior
5. 🟢 Clear documentation and diagrams
6. 🔵 Optional UI
7. ⚪ Android integration (only after feasibility check)

> If time is running out, **cut optional features, not tests or the final demonstration**.  
> Do not block the terminal MVP on Android SDK installation, emulator setup, React Native native-module work, or physical Wi-Fi P2P topology.

---

## 11. Research integrity

This is a **student research prototype**.

- Do **not** fabricate experimental results, performance measurements, citations, hardware tests, or claims of wireless functionality.
- Clearly distinguish:
  - Simulated results
  - Real TCP process-to-process tests
  - Real Android device tests
  - Unimplemented features
- Do **not** claim that the prototype has no security risks. Authentication and encryption are out of scope — explicitly state it is not safe for sensitive communication.

---

## 12. Definition of done

The core MVP is complete **only when**:

- [ ] The project builds (`npm run build`)
- [ ] Automated tests pass (`npm test`)
- [ ] At least five logical nodes can be configured
- [ ] A sends a message to E through B, C, and D
- [ ] The logs prove each forwarding decision
- [ ] E receives the original payload
- [ ] Duplicate packets and expired packets are handled
- [ ] The demo can be repeated using documented commands
- [ ] Limitations are honestly documented

---

## Start here

1. Inspect the repository
2. Read the project context files
3. Implement the **first P0 milestone**
4. **Do not start** with React Native or Android native code
