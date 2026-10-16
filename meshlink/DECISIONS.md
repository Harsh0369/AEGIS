# MeshLink — Architecture Decision Log

> New decisions should include: **ID**, **context**, **decision**, **reason**, **consequences**, **status**.
>
> **Do not silently reverse an accepted decision.** Record the change and explain why it is necessary.

---

## D001 — Terminal prototype before mobile UI

| Field        | Value |
|--------------|-------|
| **Context**  | One-week deadline with both terminal and mobile requirements discussed |
| **Decision** | Build and test the networking core using Node.js and TypeScript before starting React Native |
| **Reason**   | A one-week deadline makes the mobile build pipeline and native integration risky |
| **Consequences** | Mobile UI is P2; terminal demo is the primary deliverable |
| **Status**   | ✅ Accepted |

---

## D002 — TypeScript for the mesh core

| Field        | Value |
|--------------|-------|
| **Context**  | Language choice for the core implementation |
| **Decision** | Use TypeScript for packets, routing, node management, and the CLI |
| **Reason**   | Shared language, explicit types, easy testing, and compatibility with a future React Native application |
| **Consequences** | Requires a build step; all source is `.ts` |
| **Status**   | ✅ Accepted |

---

## D003 — Transport-independent routing

| Field        | Value |
|--------------|-------|
| **Context**  | Coupling between routing logic and transport mechanism |
| **Decision** | The router depends on a `Transport` interface rather than TCP or Android-specific APIs |
| **Reason**   | Routing should be testable independently and reusable with future transports |
| **Consequences** | Router module never imports `net`, `dgram`, or Android APIs |
| **Status**   | ✅ Accepted |

---

## D004 — Static routes before route discovery

| Field        | Value |
|--------------|-------|
| **Context**  | Order of routing feature implementation |
| **Decision** | Establish working multi-hop forwarding using explicit routes before adding RREQ/RREP |
| **Reason**   | Minimizes debugging complexity; validates forwarding logic independently |
| **Consequences** | Day 1–3 use preconfigured routing tables |
| **Status**   | ✅ Accepted |

---

## D005 — TCP as the initial transport

| Field        | Value |
|--------------|-------|
| **Context**  | Choice of inter-process communication mechanism |
| **Decision** | Use Node.js TCP (`net` module) for process-to-process communication |
| **Reason**   | Provides realistic socket semantics for testing actual network I/O locally |
| **Caveat**   | TCP requires application-level framing; local TCP ≠ wireless communication |
| **Status**   | ✅ Accepted |

---

## D006 — JSON packet representation

| Field        | Value |
|--------------|-------|
| **Context**  | Serialization format for mesh packets |
| **Decision** | Use JSON for the initial packet representation |
| **Reason**   | Readability and debugging speed |
| **Caveat**   | Validate every incoming packet; implement length-prefixed framing for TCP |
| **Status**   | ✅ Accepted |

---

## D007 — No database initially

| Field        | Value |
|--------------|-------|
| **Context**  | Persistence requirements |
| **Decision** | Use in-memory routing and duplicate-cache state. Add persistent message history only if required |
| **Reason**   | Reduce scope and dependencies |
| **Consequences** | All state is lost on node restart |
| **Status**   | ✅ Accepted |

---

## D008 — Android is a stretch goal

| Field        | Value |
|--------------|-------|
| **Context**  | Android Wi-Fi P2P and React Native scope |
| **Decision** | Do not make Wi-Fi P2P or React Native a prerequisite for the terminal MVP |
| **Reason**   | Standard Wi-Fi P2P does not automatically establish an arbitrary multi-hop topology |
| **Consequences** | Android work only begins after P0 is stable |
| **Status**   | ✅ Accepted |

---

## D009 — Honest terminology

| Field        | Value |
|--------------|-------|
| **Context**  | Claims about protocol compliance |
| **Decision** | Describe route discovery as "simplified AODV-like behavior" unless full protocol conformance is implemented and verified |
| **Reason**   | Avoid overstating technical achievements in a student project |
| **Consequences** | All documentation and reports must use qualified language |
| **Status**   | ✅ Accepted |

---

## D010 — Length-prefixed TCP framing

| Field        | Value |
|--------------|-------|
| **Context**  | TCP message boundary handling |
| **Decision** | Use 4-byte big-endian length prefix for all TCP messages |
| **Reason**   | Simple, well-understood, handles partial reads and concatenated writes |
| **Consequences** | `FrameCodec` is required for all TCP I/O; max frame size must be enforced |
| **Status**   | ✅ Accepted |

---

## D011 — Node.js built-in test runner

| Field        | Value |
|--------------|-------|
| **Context**  | Test framework selection |
| **Decision** | Use Node.js built-in test runner (`node:test`) if Node.js ≥ 18; fall back to a minimal framework otherwise |
| **Reason**   | Zero dependencies for testing; ships with Node.js |
| **Consequences** | Tests use `node:test` and `node:assert`; no Jest/Mocha dependency |
| **Status**   | ✅ Accepted (verify Node.js version at setup) |

---

## Future decisions

_Record new decisions below using the same format._
