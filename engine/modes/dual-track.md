# Dual-Track Verification Mode (双轨模式)

> Historical model: Ming Grand Secretariat + Directorate, Spartan Diarchy, Liao

## Pattern

Two independent chains process the same task in parallel.
Results are compared. Agreement = high confidence. Divergence = escalate.

## Execution Flow

```
User → Coordinator
         │
         ├─ Track A: Agent A (Opus) produces solution
         ├─ Track B: Agent B (Codex/MiMo) produces solution independently
         │
         └─ Compare:
              ├─ AGREE → accept solution
              ├─ MINOR DIFF → merge best parts
              └─ DISAGREE → escalate to User or third agent
```

## CC Implementation

- Track A = `Agent(model="opus")` with worktree isolation
- Track B = `codex:rescue` or `cn:mimo` (different model family)
- Comparison = main CC session evaluates both outputs
- Key: tracks must use uncorrelated models for maximum divergence detection

## When to Use

- Security-critical code changes
- Complex refactors where subtle bugs are likely
- When you want N-version programming style verification
