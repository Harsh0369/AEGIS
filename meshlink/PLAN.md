# MeshLink — Execution Plan & Mobile Roadmap

> **Deadline rule:** At every checkpoint, preserve a runnable version. The working CLI MVP remains the rock-solid fallback at all times.

---

## 1. Completed Core Milestones (Days 1–4: CLI MVP)

- [x] **Day 1: Setup and direct messaging**
  - Node.js & TypeScript environment initialized
  - Length-prefixed framing (`FrameCodec`) implemented
  - TCP two-node communication verified
- [x] **Day 2: Packet protocol and forwarding**
  - Strict `PacketValidator` implemented
  - `NeighborTable` and `RouteTable` implemented
  - Three-node forwarding (A → B → C) verified
- [x] **Day 3: Five-node network & reliability**
  - A ↔ B ↔ C ↔ D ↔ E topology configured
  - UUIDv4 message IDs, TTL enforcement, duplicate suppression (`DuplicateCache`)
  - Full multi-hop delivery verified
- [x] **Day 4: Integration and failure test suite**
  - Error cases: unknown destinations, TTL drop, loops, transport failures
  - 114 automated tests passing across 24 test suites
  - Repeatable 5-node demo script verified (`npm run demo`)

**Exit criterion met:** Core CLI MVP is complete, tested, and frozen.

---

## 2. Mobile Integration Roadmap

### [x] Milestone P0 — Android UI & Installable Build (COMPLETED)
- [x] Mobile React/TypeScript UI in `mobile/src/App.tsx` (Node ID, Destination selector, Messages thread, Status badge, Live diagnostic console).
- [x] Self-contained offline assets bundled into `mobile/android/app/src/main/assets/web/`.
- [x] Native Android bridge (`MeshBridge.kt`) and transport scaffold (`AndroidDirectTransport.kt`).
- [x] Android SDK 35 & Gradle 8.13 build verified.
- [x] Installable APK generated at `mobile/android/app/build/outputs/apk/debug/app-debug.apk` (~3.2 MB).
- [x] All 114 CLI tests confirmed passing with zero regressions.

### [ ] Milestone P1 — Two Physical Phones Offline Connectivity (NEXT)
- [ ] Implement direct peer communication using Android SDK native transport (Wi-Fi Direct / Local Hotspot sockets).
- [ ] Handle peer discovery, connection establishment, and frame I/O offline without Internet or cloud servers.
- [ ] Real-device testing checklist with two phones connected via ADB.
- [ ] Verify message transmission from Phone A to Phone B.

### [ ] Milestone P2 — Routing Engine Integration
- [ ] Connect `AndroidDirectTransport` to the shared TypeScript protocol and `Router.ts`.
- [ ] Enforce message IDs, TTL decrements, next-hop forwarding, and duplicate suppression on device.
- [ ] Unit and integration tests for the mobile transport bridge.

### [ ] Milestone P3 — Three-Phone Physical Relay Attempt
- [ ] Attempt smallest genuine physical relay: Phone A → Phone B (relay) → Phone C.
- [ ] Test forwarding and TTL decrementing on intermediate device.
- [ ] Document Wi-Fi Direct Group Owner topology constraints and real-world physical limitations honestly.

### [ ] Milestone P4 — Freeze and Submission Preparation
- [ ] Run all automated tests, CLI demo, and Android build checks.
- [ ] Finalize installation instructions, screenshots, diagnostic logs, and demo script.
- [ ] Prepare presentation and freeze codebase.

---

## 3. Current Status

| Field | Value |
|:---|:---|
| **Current milestone** | Milestone P0 Complete; Ready for Milestone P1 |
| **Completed** | Core CLI MVP (114 tests), 5-Node Demo, Android UI & Installable APK Build |
| **Current blockers** | None. Physical phones needed for P1 device-to-device verification. |
| **Next 3 actions** | 1. Implement P1 Android Direct offline transport (Wi-Fi Direct / Local Sockets)<br>2. Add disconnect handling, timeouts, and socket framing on Android<br>3. Document physical two-phone test procedure |
