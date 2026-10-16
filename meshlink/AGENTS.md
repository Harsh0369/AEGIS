# Agent Instructions — MeshLink

## Project context

Read **PROJECT.md**, **ARCHITECTURE.md**, **PLAN.md**, **DECISIONS.md**, **TESTING.md**, and **RESEARCH.md** before making substantial changes.

**MASTER_PROMPT.md** contains the initial implementation instructions.

---

## Mandatory rules

1. **Preserve the working CLI MVP** and ensure all 114 core tests and 5-node demo pass after every change.
2. **Inspect existing code** before editing it; do not create duplicate routing engines.
3. Use **TypeScript** and **Node.js** for the core implementation; mobile UI is built in React/TypeScript with native Android SDK transport.
4. Keep **routing independent** of transport-specific code.
5. Keep the architecture **small and understandable**.
6. **Prioritize strictly:** P0 (CLI works + Android builds) → P1 (2-phone direct offline connection) → P2 (router integration) → P3 (3-phone relay). Do not begin P4 before P0-P2 are verified.
7. **Physical-Device Testing Rules:**
   - Never claim a physical phone test passed unless it was actually run on real hardware via ADB.
   - Always distinguish automated mock/unit test results from real physical phone connectivity results.
   - If multi-hop topology fails on physical phones due to Wi-Fi Direct Group Owner limitations, document the limitation honestly rather than simulating success.
8. **Never claim** a feature is implemented or tested without evidence.
9. **Run relevant tests** after changes and report failures honestly.
10. **Update PLAN.md and ANDROID_PLAN.md** with completed tasks, current status, blockers, and next actions.
11. **Record** important architectural decisions in **DECISIONS.md**.
12. **Update documentation** when commands, interfaces, behavior, or limitations change.
13. **Never fabricate** research citations, experimental measurements, or device-test results.
14. **Ask before** destructive operations, deleting existing work, or performing broad rewrites.
15. **Do not add unnecessary dependencies**.
16. **Do not leave placeholder implementations** presented as working features.

---

## Coding rules

- Enable TypeScript **strict mode** where feasible.
- Prefer **explicit interfaces and types**.
- **Validate all incoming packets**.
- Use **descriptive error messages**.
- Keep functions **focused and small**.
- Avoid `any` unless justified and documented.
- Avoid **global mutable state** when a node instance can own its state.
- Add **tests for routing and protocol behavior**.
- Handle **socket errors, shutdown, and resource cleanup**.
- **Never treat a TCP write as a complete message boundary**.
- Do not hard-code successful delivery when a route or connection is missing.

---

## Git discipline

- **Commit after every passing milestone** with a descriptive message.
- Use the format: `milestone(N): <short description>` for milestone commits.
- Tag working states: `git tag milestone-N` after each milestone.
- Never commit code that doesn't compile.

---

## Milestone completion report

After every milestone, report:

| Field                 | Description                                |
|-----------------------|--------------------------------------------|
| **Implemented**       | Functionality completed                    |
| **Files changed**     | List of created or modified files          |
| **Commands executed** | Build/test commands run                    |
| **Test results**      | Actual pass/fail output                    |
| **Known limitations** | What doesn't work yet                      |
| **Current blockers**  | Issues preventing progress                 |
| **Next three tasks**  | Immediate next actions                     |

Keep the plan and decision log current so a fresh coding session can resume safely.
