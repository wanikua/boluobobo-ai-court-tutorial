---
name: quadrants
description: Manage Quadrants tasks and projects via natural language. Use when the user wants to create, view, complete, or organize tasks on the Eisenhower Matrix. Supports listing projects, adding tasks (single or bulk), viewing priority tasks, completing tasks, and getting project overviews. Triggers on mentions of "quadrants", "tasks", "to-do", "eisenhower", "priority matrix", or task management requests.
---

# Quadrants Skill

Manage tasks on the Quadrants Eisenhower Matrix (quadrants.ch) from Openclaw.

## Setup

Requires env vars in the skill config or TOOLS.md:
- `QUADRANTS_API_URL` — Base URL (default: `https://quadrants.ch`)
- `QUADRANTS_API_KEY` — Service API key for authenticated access

## Available Commands

Use the `scripts/quadrants-cli.sh` script for all operations:

```bash
# List projects
bash skills/quadrants/scripts/quadrants-cli.sh projects

# Get project tasks (with project ID)
bash skills/quadrants/scripts/quadrants-cli.sh tasks <projectId>

# Get priority tasks (top 5 across all projects)
bash skills/quadrants/scripts/quadrants-cli.sh priority

# Create a task
bash skills/quadrants/scripts/quadrants-cli.sh create <projectId> "<description>" <urgency> <importance>

# Bulk create tasks (JSON array)
bash skills/quadrants/scripts/quadrants-cli.sh bulk-create <projectId> '<json-tasks>'

# Complete a task
bash skills/quadrants/scripts/quadrants-cli.sh complete <taskId>

# Update a task
bash skills/quadrants/scripts/quadrants-cli.sh update <taskId> '{"urgency": 80, "importance": 90}'

# Delete a task
bash skills/quadrants/scripts/quadrants-cli.sh delete <taskId>

# Get project overview (summary with quadrant distribution)
bash skills/quadrants/scripts/quadrants-cli.sh overview <projectId>
```

## Quadrant Reference

The Eisenhower Matrix has 4 quadrants based on urgency (0-100) and importance (0-100):

| Quadrant | Urgency | Importance | Action |
|----------|---------|------------|--------|
| Q1: Do First | High (>50) | High (>50) | Urgent + Important → Do immediately |
| Q2: Schedule | Low (≤50) | High (>50) | Not Urgent + Important → Plan for later |
| Q3: Delegate | High (>50) | Low (≤50) | Urgent + Not Important → Delegate |
| Q4: Eliminate | Low (≤50) | Low (≤50) | Not Urgent + Not Important → Drop it |

## Task Format for Bulk Create

```json
[
  {"description": "Fix login bug", "urgency": 90, "importance": 85},
  {"description": "Update docs", "urgency": 30, "importance": 70}
]
```

## Integration with Openclaw

### Heartbeat Check
Add to HEARTBEAT.md to periodically check priority tasks:
```
Check Quadrants priority tasks and remind user of urgent items
```

### Cron Reminder
Schedule daily task briefings via cron jobs.

### Natural Language Mapping
When users say things like:
- "加个任务" / "add a task" → `create`
- "今天做什么" / "what should I do today" → `priority`
- "完成了" / "done" / "mark complete" → `complete`
- "看看项目" / "show projects" → `projects`
- "任务概览" → `overview`

Infer urgency/importance from context when not specified:
- Bug fixes, deadlines → high urgency
- Strategy, planning → high importance, low urgency
- Nice-to-have → low both
