# Checks & Balances Mode (制衡模式)

> Historical model: Tang Three Departments, Roman Republic, Venice, US Federal

## Pattern

Three-stage pipeline: Draft → Review → Execute.
Drafter and reviewer are different agents (different models preferred).
Rejection triggers structured feedback loop.

## Execution Flow

```
User → Coordinator
         │
         ├─ 1. Draft: Agent A (Opus/Codex) produces solution
         │
         ├─ 2. Review: Agent B (Codex:review) evaluates
         │     ├─ PASS → proceed to execute
         │     └─ REJECT (with reasons) → return to Draft (max 3 rounds)
         │
         └─ 3. Execute: Agent C applies the approved solution
```

## CC Implementation

- Draft = `Agent(model="opus")` or `codex:rescue`
- Review = `Agent(model="opus")` with review prompt, or `codex:adversarial-review`
- Execute = main CC session applies changes
- Cross-model diversity: Claude drafts → Codex reviews, or vice versa
- Structured rejection: reviewer must specify {legality, feasibility, consistency}

## When to Use

- Code changes that need quality assurance
- Architecture decisions with long-term impact
- Any task where errors are costly to reverse
