#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="$(pwd)"

# Load workspace .env if present
if [ -f "$WORKSPACE_DIR/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$WORKSPACE_DIR/.env"
  set +a
fi

PORT="${PORT:-4173}"

# Ensure the chosen port is free; if busy, pick the next free port pair
PORT="$(
  node - "$PORT" <<'EOF'
const net = require("node:net");
const startPort = Number(process.argv[2]) || 4173;

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, "127.0.0.1");
  });
}

(async () => {
  let candidate = startPort;
  while (!(await isPortFree(candidate))) {
    candidate += 2;
  }
  process.stdout.write(String(candidate));
})();
EOF
)"

DIST_PORT=$((PORT + 1))
export PORT DIST_PORT

# Keep .superset/ports.json in sync with the active port
if [ -d "$WORKSPACE_DIR/.superset" ]; then
  cat > "$WORKSPACE_DIR/.superset/ports.json" <<EOF
{
  "ports": [
    { "port": $PORT, "label": "KITEditor Dev Server" },
    { "port": $DIST_PORT, "label": "Built App Server (dist)" }
  ]
}
EOF
fi

echo "==> Starting KITEditor dev server on http://${HOST:-127.0.0.1}:$PORT"
exec node "$WORKSPACE_DIR/editor/server.mjs"
