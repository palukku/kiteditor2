#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="$(pwd)"
ALLOC_DIR="$HOME/.superset"
ALLOC_FILE="$ALLOC_DIR/port-allocations.json"
LOCK_DIR="$ALLOC_DIR/port-allocations.lock"

echo "==> Tearing down Superset workspace in $WORKSPACE_DIR"

# 1. Stop any running dev server or background processes for this workspace
if [ -f "$WORKSPACE_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$WORKSPACE_DIR/.env" 2>/dev/null || true
  set +a
fi

stop_pids() {
  local pids="$1"
  if [ -z "$pids" ]; then
    return 0
  fi
  for pid in $pids; do
    if [ "$pid" != "$$" ] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  sleep 0.3
  for pid in $pids; do
    if [ "$pid" != "$$" ] && kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done
}

# Stop processes matching this workspace path
WORKSPACE_PIDS="$(
  {
    pgrep -f "$WORKSPACE_DIR/editor/server.mjs" 2>/dev/null || true
    pgrep -f "$WORKSPACE_DIR/dist/serve.mjs" 2>/dev/null || true
  } | sort -u
)"
if [ -n "$WORKSPACE_PIDS" ]; then
  stop_pids "$WORKSPACE_PIDS"
  echo "  ✓ Stopped workspace server process(es)"
fi

# Also stop any process bound to this workspace's allocated PORT / DIST_PORT
if command -v lsof >/dev/null 2>&1; then
  for p in "${PORT:-}" "${DIST_PORT:-}"; do
    if [ -n "$p" ]; then
      PORT_PIDS="$(lsof -tiTCP:"$p" -sTCP:LISTEN 2>/dev/null || true)"
      if [ -n "$PORT_PIDS" ]; then
        stop_pids "$PORT_PIDS"
        echo "  ✓ Stopped process listening on port $p"
      fi
    fi
  done
fi

# 2. Release port allocation in ~/.superset/port-allocations.json
if [ -f "$ALLOC_FILE" ]; then
  waited=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    if [ "$waited" -ge 10 ]; then
      rm -rf "$LOCK_DIR" 2>/dev/null || true
      break
    fi
    sleep 1
    waited=$((waited + 1))
  done

  node - "$ALLOC_FILE" "$WORKSPACE_DIR" <<'EOF' || true
const fs = require("node:fs");
const [allocFile, workspace] = process.argv.slice(2);
try {
  const allocations = JSON.parse(fs.readFileSync(allocFile, "utf8"));
  if (allocations && typeof allocations === "object" && workspace in allocations) {
    const freed = allocations[workspace];
    delete allocations[workspace];
    fs.writeFileSync(allocFile + ".tmp", JSON.stringify(allocations, null, 2) + "\n");
    fs.renameSync(allocFile + ".tmp", allocFile);
    console.log(`  ✓ Released allocated port ${freed}`);
  }
} catch {}
EOF

  rm -rf "$LOCK_DIR" 2>/dev/null || true
fi

echo "==> Workspace teardown complete!"
