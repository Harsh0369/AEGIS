# MeshLink — Seven-Day Execution Plan

> **Deadline rule:** The seven-day schedule is a maximum time budget, not a reason to delay a working MVP. At every checkpoint, preserve a runnable version.

---

## Day 1 — Setup and direct messaging

- [ ] Inspect the environment and existing repository
- [ ] Initialize Node.js and TypeScript project
- [ ] Add `build`, `test`, and `demo` npm scripts
- [ ] Define node IDs and packet types
- [ ] Implement the `FrameCodec` (length-prefixed framing)
- [ ] Implement two-node communication via TCP
- [ ] Confirm a message is sent and received
- [ ] Commit working state

**Exit criterion:** Two logical nodes exchange a valid message over TCP with correct framing.

---

## Day 2 — Packet protocol and forwarding

- [ ] Implement `PacketValidator` with strict field checking
- [ ] Implement `NeighborTable` and `RouteTable`
- [ ] Implement next-hop selection in `Router`
- [ ] Implement forwarding logic (receive → lookup → forward)
- [ ] Configure a three-node topology: A → B → C
- [ ] Verify message delivery through B

**Exit criterion:** A message reaches C through B using explicit routes.

---

## Day 3 — Five-node network

- [ ] Configure A ↔ B ↔ C ↔ D ↔ E topology
- [ ] Implement UUID-based message IDs
- [ ] Add `DuplicateCache` with TTL-based expiry
- [ ] Add TTL/hop-limit enforcement in the forwarding path
- [ ] Add per-node structured logging
- [ ] Verify full A → B → C → D → E delivery
- [ ] Test invalid-packet handling

**Exit criterion:** A message reaches E through all three intermediate nodes. Duplicates and expired packets are handled.

---

## Day 4 — Integration and failure tests

- [ ] Test unknown destinations → controlled error
- [ ] Test missing/disconnected next hops → controlled failure
- [ ] Test duplicate packets → suppressed
- [ ] Test expired packets (TTL = 0) → dropped
- [ ] Test routing loops → TTL prevents infinite forwarding
- [ ] Test TCP framing edge cases (split, merged, malformed, oversized)
- [ ] Create a repeatable five-node demo script
- [ ] All core tests pass

**Exit criterion:** Core test suite passes. Demo is repeatable with a single command.

---

## Day 5 — Optional route discovery and research check

- [ ] **Only if Day 4 exit criterion met:** Implement simplified RREQ/RREP
- [ ] Otherwise: improve error handling, edge case coverage, and test reliability
- [ ] Review Wi-Fi P2P research papers for report context
- [ ] Document why simulated multi-hop ≠ Android multi-hop
- [ ] Optional: small feasibility test on physical devices (do not risk core)

**Exit criterion:** A stable, well-documented core MVP.

---

## Day 6 — Demonstration and polish

### Path A: Safer submission (default)

- [ ] Improve CLI commands and interactive experience
- [ ] Improve log formatting and readability
- [ ] Create a demonstration script with narrated output
- [ ] Capture actual terminal output as evidence
- [ ] Create ASCII/Mermaid architecture diagram
- [ ] Write usage documentation

### Path B: Only if core is rock-solid

- [ ] Minimal UI or Android connectivity spike
- [ ] Keep it fully separate from the core
- [ ] Do not sacrifice passing tests

**Exit criterion:** The project is demonstrable without manual code edits.

---

## Day 7 — Freeze and submit

- [ ] Clean install: `rm -rf node_modules && npm install`
- [ ] Full build: `npm run build`
- [ ] Full test suite: `npm test`
- [ ] Run five-node demo: `npm run demo`
- [ ] Verify README setup instructions on a clean terminal
- [ ] Document actual test results and known limitations
- [ ] Capture evidence (terminal output screenshots)
- [ ] Prepare final report and presentation
- [ ] **Feature freeze** before submission

**Exit criterion:** A reproducible, working submission with honest documentation.

---

## Current status

| Field             | Value                                         |
|-------------------|-----------------------------------------------|
| **Current milestone** | Project initialization                    |
| **Completed**     | —                                             |
| **Current blockers** | None yet (pending environment inspection)  |
| **Next 3 actions** | 1. Inspect environment and Node.js version<br>2. Initialize TypeScript project<br>3. Implement two-node TCP communication |

---

## Completed milestones

_Update this section as milestones are completed._

| Milestone | Date | Notes |
|-----------|------|-------|
| —         | —    | —     |

---

## Scope-cutting rule

If the project falls behind schedule:

1. ~~Cut Android integration~~ (cut first)
2. ~~Cut React Native UI~~
3. ~~Cut automatic route discovery~~
4. **Keep:** five-node forwarding, tests, logs, and documentation
5. **Never cut:** the final demonstration or fabricate test results
