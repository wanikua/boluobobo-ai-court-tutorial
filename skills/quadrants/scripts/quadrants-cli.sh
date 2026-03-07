#!/bin/bash
# Quadrants CLI — Openclaw integration
# Usage: bash quadrants-cli.sh <action> [args...]

set -euo pipefail

API_URL="${QUADRANTS_API_URL:-https://quadrants.ch}"
API_KEY="${QUADRANTS_API_KEY:-}"
SERVICE_ENDPOINT="${API_URL}/api/service"

if [ -z "$API_KEY" ]; then
  echo "Error: QUADRANTS_API_KEY not set"
  echo "Set it in TOOLS.md or export QUADRANTS_API_KEY=<key>"
  exit 1
fi

call_api() {
  local payload="$1"
  curl -s -X POST "$SERVICE_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "$payload"
}

ACTION="${1:-help}"
shift || true

case "$ACTION" in
  projects)
    call_api '{"action":"projects"}'
    ;;

  tasks)
    PROJECT_ID="${1:?Error: projectId required}"
    call_api "{\"action\":\"tasks\",\"projectId\":\"$PROJECT_ID\"}"
    ;;

  priority)
    call_api '{"action":"priority"}'
    ;;

  create)
    PROJECT_ID="${1:?Error: projectId required}"
    DESCRIPTION="${2:?Error: description required}"
    URGENCY="${3:-50}"
    IMPORTANCE="${4:-50}"
    call_api "{\"action\":\"create\",\"projectId\":\"$PROJECT_ID\",\"description\":$(echo "$DESCRIPTION" | jq -Rs .),\"urgency\":$URGENCY,\"importance\":$IMPORTANCE}"
    ;;

  bulk-create)
    PROJECT_ID="${1:?Error: projectId required}"
    TASKS_JSON="${2:?Error: tasks JSON required}"
    call_api "{\"action\":\"bulk-create\",\"projectId\":\"$PROJECT_ID\",\"tasks\":$TASKS_JSON}"
    ;;

  complete)
    TASK_ID="${1:?Error: taskId required}"
    call_api "{\"action\":\"complete\",\"taskId\":$TASK_ID}"
    ;;

  update)
    TASK_ID="${1:?Error: taskId required}"
    UPDATES="${2:?Error: updates JSON required}"
    call_api "{\"action\":\"update\",\"taskId\":$TASK_ID,\"updates\":$UPDATES}"
    ;;

  delete)
    TASK_ID="${1:?Error: taskId required}"
    call_api "{\"action\":\"delete\",\"taskId\":$TASK_ID}"
    ;;

  overview)
    PROJECT_ID="${1:?Error: projectId required}"
    call_api "{\"action\":\"overview\",\"projectId\":\"$PROJECT_ID\"}"
    ;;

  help|*)
    echo "Quadrants CLI — Manage tasks on the Eisenhower Matrix"
    echo ""
    echo "Usage: quadrants-cli.sh <action> [args...]"
    echo ""
    echo "Actions:"
    echo "  projects                              List all projects"
    echo "  tasks <projectId>                     List tasks for a project"
    echo "  priority                              Top priority tasks"
    echo "  create <projectId> <desc> [urg] [imp] Create a task"
    echo "  bulk-create <projectId> <json>        Bulk create tasks"
    echo "  complete <taskId>                     Complete a task"
    echo "  update <taskId> <json>                Update a task"
    echo "  delete <taskId>                       Delete a task"
    echo "  overview <projectId>                  Project overview"
    ;;
esac
