# Democratic Council Mode (民主模式)

> Historical model: Athenian Democracy, Mongol Kurultai, Viking Thing, Swiss Confederation

## Pattern

Multiple agents independently produce solutions.
Majority vote or consensus determines the final answer.
Ties broken by critique-and-revote.

## Execution Flow

```
User → Coordinator
         │
         ├─ Agent A (Opus): produces solution independently
         ├─ Agent B (Codex): produces solution independently
         ├─ Agent C (MiMo): produces solution independently
         │
         └─ Vote:
              ├─ MAJORITY AGREES → accept that solution
              ├─ TIE → agents critique each other → revote
              └─ NO CONSENSUS → Coordinator decides
```

## CC Implementation

- Agent A = `Agent(model="opus")`
- Agent B = `codex:rescue` (GPT-5.4)
- Agent C = `cn:mimo` (MiMo, 1M ctx — third model family)
- All three run in parallel for speed
- Coordinator compares outputs, identifies majority position
- Condorcet theorem: if each agent >50% accurate, ensemble → higher accuracy

## When to Use

- Hard problems where no single model excels
- When you want diverse perspectives (different model families)
- Research questions, architecture decisions, tricky bugs
