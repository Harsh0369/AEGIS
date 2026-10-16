# MeshLink — Testing and Acceptance

## 1. Build verification

| Step | Command | Expected |
|------|---------|----------|
| Build | `npm run build` | Successful TypeScript compilation, zero errors |
| Lint | `npm run lint` (if configured) | No critical warnings |

Record the actual command and result after each run.

---

## 2. Unit tests

### Packet validation

| Test case                        | Expected result          |
|----------------------------------|--------------------------|
| Valid data packet accepted       | ✅ Passes validation     |
| Missing `destinationId`         | ❌ Rejected              |
| Missing `messageId`             | ❌ Rejected              |
| Invalid TTL (≤ 0, non-integer)  | ❌ Rejected              |
| Unknown packet `type`           | ❌ Rejected              |
| Invalid/missing `payload`       | ❌ Rejected              |
| Oversized packet                | ❌ Rejected              |
| Missing `version`               | ❌ Rejected              |
| Missing `sourceId`              | ❌ Rejected              |

### Route table

| Test case                   | Expected result                |
|-----------------------------|--------------------------------|
| Route insertion             | Entry stored correctly         |
| Next-hop lookup (known)     | Returns correct next hop       |
| Unknown destination lookup  | Returns `undefined` / `null`   |
| Route replacement/update    | New entry replaces old         |
| Invalid next hop            | Rejected or handled gracefully |
| Route removal               | Entry deleted                  |

### Duplicate cache

| Test case                   | Expected result                |
|-----------------------------|--------------------------------|
| First packet accepted       | `false` (not a duplicate)      |
| Repeated packet rejected    | `true` (duplicate detected)    |
| Distinct message IDs        | Both accepted                  |
| Cache expiry (if implemented)| Old entries cleared            |

### TTL

| Test case                          | Expected result                 |
|------------------------------------|---------------------------------|
| TTL > 1 → forwarded               | Packet forwarded, TTL decremented |
| TTL = 1 → delivered or dropped     | Correctly handled at boundary   |
| TTL = 0 → dropped                  | Packet rejected/dropped         |
| Cyclic routes → finite forwarding  | Packet dropped after TTL exhaustion |

---

## 3. Integration tests

### Direct delivery: A → B

- **Setup:** A and B are direct neighbors
- **Expected:** B receives and delivers the payload

### Three-node forwarding: A → B → C

- **Setup:** A→B→C topology, static routes
- **Expected:**
  - A selects B as next hop
  - B selects C as next hop
  - C delivers the message
  - Payload is not modified

### Five-node forwarding: A → B → C → D → E

- **Setup:** Linear chain topology, static routes
- **Expected:**
  - All four links are used
  - Each intermediate node forwards the packet
  - E delivers the original message **exactly once**
  - Logs show forwarding decision at each hop

### Unknown destination

- **Setup:** Send to a destination with no route entry
- **Expected:** Documented error or controlled failure. No crash or false delivery confirmation.

### Missing next hop

- **Setup:** Remove or disconnect the configured next hop
- **Expected:** Controlled send failure and diagnostic log

### Duplicate delivery

- **Setup:** Deliver the same packet (same message ID) twice to an intermediate node
- **Expected:** Duplicate suppressed; message forwarded only once

### Routing loop

- **Setup:** Configure A→B→A circular route
- **Expected:** Packet is dropped when TTL expires. No infinite forwarding.

---

## 4. TCP framing tests

| Scenario                              | Expected result              |
|---------------------------------------|------------------------------|
| One complete frame                    | Decoded correctly            |
| One frame split across multiple chunks| Assembled and decoded        |
| Multiple frames in one chunk          | Each frame decoded separately|
| Malformed length header               | Rejected, error logged       |
| Oversized frame                       | Rejected, error logged       |
| Connection closure during a frame     | Handled gracefully           |

> **Do not infer message boundaries from socket `data` events.**

---

## 5. Five-node demo

### Invocation

```bash
npm run demo
```

A single command should start the demonstration.

### Expected log sequence

```
[A] Created message M001 for E: "Hello from A to E"
[A] Route lookup: E → next hop B
[A] Forwarding M001 to B (TTL: 10)
[B] Received M001 from A
[B] Route lookup: E → next hop C
[B] Forwarding M001 to C (TTL: 9)
[C] Received M001 from B
[C] Route lookup: E → next hop D
[C] Forwarding M001 to D (TTL: 8)
[D] Received M001 from C
[D] Route lookup: E → next hop E
[D] Forwarding M001 to E (TTL: 7)
[E] Received M001 from D
[E] ✓ Delivered M001: "Hello from A to E"
```

> The exact log format may differ, but the **actual forwarding path must be visible**.

---

## 6. Final verification checklist

Before submission:

- [ ] Run `npm run build` — compiles without errors
- [ ] Run `npm test` — all automated tests pass
- [ ] Run `npm run demo` — five-node demo completes
- [ ] Verify README commands work on a clean terminal
- [ ] Record any failures honestly
- [ ] Confirm that the tested source matches the submitted source
- [ ] Collect terminal output as evidence

---

## 7. Evidence

Store actual test output or screenshots in the `evidence/` directory.

**Do not:**
- Invent results
- Fabricate expected delivery percentages
- Fabricate latency values
- Fabricate device-test results

> A passing simulation test is **not** evidence of real Android Wi-Fi P2P multi-hop functionality.

---

## 8. Test result log

### 8.1 Automated Unit & Integration Tests (CLI)
| Date | Test Suite / Command | Pass | Fail | Notes |
|:---|:---|:---|:---|:---|
| 2026-10-16 | `npm test` (`dist/tests/**/*.test.js`) | **114** | **0** | 24 suites: PacketValidator, FrameCodec, DuplicateCache, RouteTable, NeighborTable, Router, MessageManager, TcpTransport, multi-hop integration |
| 2026-10-16 | `npm run demo` (5-Node Simulation) | **Pass** | **0** | Verified full roundtrip: A → B → C → D → E and reply E → D → C → B → A |

### 8.2 Android Build Verification
| Date | Build Target | Output Artifact | Result | Notes |
|:---|:---|:---|:---|:---|
| 2026-10-16 | `gradle -p mobile/android assembleDebug` | `app-debug.apk` (3,202,217 bytes) | ✅ **SUCCESS** | Built with Android SDK 35, Gradle 8.13, AGP 8.8.2, Kotlin 2.0.21. Embedded offline React assets in `assets/web/`. |

### 8.3 Physical-Phone Verification (Hardware Tests)
| Date | Device Models | Test Scenario | Verified Result | Notes |
|:---|:---|:---|:---|:---|
| — | Phone A + Phone B | P1 Direct Offline Connection | *Pending P1* | Physical hardware not attached during P0. Simulation verified; hardware test scheduled for Milestone P1. |
| — | Phone A + Phone B + Phone C | P3 Multi-Hop Relay | *Pending P3* | Must verify whether Wi-Fi Direct GO topology permits relaying on real devices without simulation. |

