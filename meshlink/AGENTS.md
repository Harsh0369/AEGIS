# Agent Instructions — MeshLink

## Project context

Read **PROJECT.md**, **ARCHITECTURE.md**, **PLAN.md**, **DECISIONS.md**, **TESTING.md**, and **RESEARCH.md** before making substantial changes.

**MASTER_PROMPT.md** contains the initial implementation instructions.

---

## Mandatory rules

1. **Preserve the seven-day deadline** and prioritize a working terminal MVP.
2. **Inspect existing code** before editing it.
3. Use **TypeScript** and **Node.js** for the core implementation.
4. Keep **routing independent** of transport-specific code.
5. Keep the initial architecture **small and understandable**.
6. **Do not start** optional Android or React Native work while P0 requirements are failing.
7. **Never claim** a feature is implemented or tested without evidence.
8. **Run relevant tests** after changes and report failures honestly.
9. **Update PLAN.md** with completed tasks, current status, blockers, and next actions.
10. **Record** important architectural decisions in **DECISIONS.md**.
11. **Update documentation** when commands, interfaces, behavior, or limitations change.
12. **Never fabricate** research citations, experimental measurements, or device-test results.
13. **Ask before** destructive operations, deleting existing work, or performing broad rewrites.
14. **Do not add dependencies** without a clear reason.
15. **Do not leave placeholder implementations** presented as working features.

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
