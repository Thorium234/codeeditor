#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  Collaborative Code Editor - Quick Setup"
echo "============================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }

check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "ERROR: $1 is not installed. Please install it first."
    exit 1
  fi
}

echo ""
echo "[1/5] Checking prerequisites..."
check_command bun
check_command node
info "bun found: $(bun --version)"
info "node found: $(node --version)"

echo ""
echo "[2/5] Installing main project dependencies..."
if [ -d "node_modules" ]; then
  warn "node_modules exists, skipping install (remove node_modules to force reinstall)"
else
  bun install
fi
info "Dependencies ready"

echo ""
echo "[3/5] Setting up database..."
export DATABASE_URL="file:$(pwd)/db/custom.db"
mkdir -p db
bun run db:push 2>/dev/null || true
info "Database initialized (SQLite: db/custom.db)"

# ── Find first available port ──
find_port() {
  local base="$1"
  local port="$base"
  while lsof -ti :"$port" &>/dev/null; do
    port=$((port + 1))
  done
  echo "$port"
}

NEXT_PORT=$(find_port 3000)
WS_PORT=$(find_port 3004)

# ── Mini-service ──
echo ""
echo "[4/5] Starting code editor WebSocket service..."
cd mini-services/code-editor-service

if [ -d "node_modules" ]; then
  warn "node_modules exists, skipping install"
else
  bun install
fi

PORT="$WS_PORT" bun run dev &
SERVICE_PID=$!
cd "$SCRIPT_DIR"

for i in $(seq 1 15); do
  if lsof -ti :"$WS_PORT" &>/dev/null; then
    info "Code editor service running on port $WS_PORT (PID: $SERVICE_PID)"
    break
  fi
  if [ "$i" -eq 15 ]; then
    warn "WebSocket service may not have started, continuing..."
  fi
  sleep 1
done

# ── Next.js dev server ──
echo ""
echo "[5/5] Starting Next.js development server..."
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "  ${GREEN}App:${NC}       http://localhost:${NEXT_PORT}"
echo -e "  ${GREEN}WS-Service:${NC} port ${WS_PORT}"
echo -e "  ${GREEN}Press Ctrl+C${NC} to stop all services"
echo -e "${GREEN}============================================${NC}"
echo ""

PORT="$NEXT_PORT" bun run dev &
NEXT_PID=$!

cleanup() {
  echo ""
  echo "Shutting down services..."
  kill "$SERVICE_PID" 2>/dev/null || true
  kill "$NEXT_PID" 2>/dev/null || true
  wait "$SERVICE_PID" 2>/dev/null || true
  wait "$NEXT_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

wait
