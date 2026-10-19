#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="$(pwd)"
ROOT_DIR="${SUPERSET_ROOT_PATH:-}"

echo "==> Setting up Superset workspace in $WORKSPACE_DIR"

# 1. Copy untracked / gitignored files from $SUPERSET_ROOT_PATH if available
if [ -n "$ROOT_DIR" ] && [ -d "$ROOT_DIR" ] && [ "$ROOT_DIR" != "$WORKSPACE_DIR" ]; then
  if [ -f "$ROOT_DIR/.env" ]; then
    cp "$ROOT_DIR/.env" "$WORKSPACE_DIR/.env"
    echo "  ✓ Copied .env from $ROOT_DIR"
  fi

  if [ -d "$ROOT_DIR/editor/project" ] && [ ! -d "$WORKSPACE_DIR/editor/project" ]; then
    mkdir -p "$WORKSPACE_DIR/editor"
    cp -a "$ROOT_DIR/editor/project" "$WORKSPACE_DIR/editor/project"
    echo "  ✓ Copied editor/project/ from $ROOT_DIR"
  fi

  if [ -f "$ROOT_DIR/AGENT.md" ] && [ ! -f "$WORKSPACE_DIR/AGENT.md" ]; then
    cp "$ROOT_DIR/AGENT.md" "$WORKSPACE_DIR/AGENT.md"
    echo "  ✓ Copied AGENT.md from $ROOT_DIR"
  fi

  # Seed node_modules from root repo to speed up install and support offline workspaces
  if [ -d "$ROOT_DIR/node_modules" ] && [ ! -d "$WORKSPACE_DIR/node_modules" ]; then
    cp -a "$ROOT_DIR/node_modules" "$WORKSPACE_DIR/node_modules"
    echo "  ✓ Seeded node_modules from $ROOT_DIR"
  fi
fi

# 2. Install dependencies
if [ -f "$WORKSPACE_DIR/package.json" ]; then
  echo "==> Installing npm dependencies..."
  if ! npm install --no-package-lock --prefer-offline --no-audit --no-fund; then
    if [ -d "$WORKSPACE_DIR/node_modules" ]; then
      echo "  ! npm install failed, using existing node_modules"
    else
      echo "  ✗ Failed to install dependencies" >&2
      exit 1
    fi
  fi
fi

# 3. Allocate a conflict-free port pair (PORT for KITEditor, DIST_PORT for dist/serve.mjs)
ALLOC_DIR="$HOME/.superset"
ALLOC_FILE="$ALLOC_DIR/port-allocations.json"
LOCK_DIR="$ALLOC_DIR/port-allocations.lock"
mkdir -p "$ALLOC_DIR"

acquire_lock() {
  local waited=0
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    if [ -f "$LOCK_DIR/pid" ]; then
      local pid
      pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
      if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
        rm -rf "$LOCK_DIR" 2>/dev/null || true
        continue
      fi
    fi
    if [ "$waited" -ge 30 ]; then
      echo "  ✗ Timed out waiting for port lock $LOCK_DIR" >&2
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
  printf '%s\n' "$$" > "$LOCK_DIR/pid"
}

release_lock() {
  rm -rf "$LOCK_DIR" 2>/dev/null || true
}

acquire_lock
trap release_lock EXIT

ALLOCATED_PORT="$(
  node - "$ALLOC_FILE" "$WORKSPACE_DIR" <<'EOF'
const fs = require("node:fs");
const net = require("node:net");

const [allocFile, workspace] = process.argv.slice(2);
const BASE_START = 4173;
const STEP = 2;

let allocations = {};
try {
  allocations = JSON.parse(fs.readFileSync(allocFile, "utf8"));
  if (!allocations || typeof allocations !== "object" || Array.isArray(allocations)) {
    allocations = {};
  }
} catch {
  allocations = {};
}

// Prune allocations for workspace directories that no longer exist
for (const dir of Object.keys(allocations)) {
  if (!fs.existsSync(dir)) {
    delete allocations[dir];
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

(async () => {
  const usedByOthers = new Set(
    Object.entries(allocations)
      .filter(([dir]) => dir !== workspace)
      .map(([, port]) => Number(port))
  );

  let candidate = Number(allocations[workspace]) || BASE_START;
  if (candidate < BASE_START) candidate = BASE_START;

  while (
    usedByOthers.has(candidate) ||
    !(await isPortFree(candidate)) ||
    !(await isPortFree(candidate + 1))
  ) {
    candidate += STEP;
  }

  allocations[workspace] = candidate;
  fs.writeFileSync(allocFile + ".tmp", JSON.stringify(allocations, null, 2) + "\n");
  fs.renameSync(allocFile + ".tmp", allocFile);
  process.stdout.write(String(candidate));
})();
EOF
)"

release_lock
trap - EXIT

DIST_PORT=$((ALLOCATED_PORT + 1))
echo "  ✓ Allocated ports: PORT=$ALLOCATED_PORT (KITEditor), DIST_PORT=$DIST_PORT (Built App)"

# 4. Persist PORT and DIST_PORT in workspace .env
touch "$WORKSPACE_DIR/.env"
node - "$WORKSPACE_DIR/.env" "$ALLOCATED_PORT" "$DIST_PORT" <<'EOF'
const fs = require("node:fs");
const [envFile, port, distPort] = process.argv.slice(2);
const lines = fs.existsSync(envFile)
  ? fs.readFileSync(envFile, "utf8").split(/\r?\n/)
  : [];

const filtered = lines.filter(
  (line) => !/^PORT=/.test(line) && !/^DIST_PORT=/.test(line)
);
while (filtered.length > 0 && filtered[filtered.length - 1] === "") {
  filtered.pop();
}
filtered.push(`PORT=${port}`, `DIST_PORT=${distPort}`, "");
fs.writeFileSync(envFile, filtered.join("\n"));
EOF

# 5. Update .superset/ports.json so Superset labels this workspace's ports
cat > "$WORKSPACE_DIR/.superset/ports.json" <<EOF
{
  "ports": [
    { "port": $ALLOCATED_PORT, "label": "KITEditor Dev Server" },
    { "port": $DIST_PORT, "label": "Built App Server (dist)" }
  ]
}
EOF

echo "==> Workspace setup complete!"
