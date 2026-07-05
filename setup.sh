#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  Collaborative Code Editor - Quick Setup"
echo "============================================"

# Check prerequisites
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
echo "  ✓ bun found: $(bun --version)"
echo "  ✓ node found: $(node --version)"

# Install dependencies
echo ""
echo "[2/5] Installing main project dependencies..."
bun install
echo "  ✓ Dependencies installed"

# Setup database
echo ""
echo "[3/5] Setting up database..."
bun run db:push 2>/dev/null || true
echo "  ✓ Database initialized (SQLite: db/custom.db)"

# Install and start mini-services
echo ""
echo "[4/5] Starting code editor WebSocket service..."
cd mini-services/code-editor-service
bun install
# Kill any existing process on port 3004
lsof -ti :3004 2>/dev/null | xargs kill -9 2>/dev/null || true
bun run dev &
SERVICE_PID=$!
cd "$SCRIPT_DIR"

# Wait for WebSocket service to be ready
for i in $(seq 1 15); do
  if lsof -ti :3004 &>/dev/null; then
    echo "  ✓ Code editor service running on port 3004 (PID: $SERVICE_PID)"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo "  ⚠ WebSocket service may not have started, continuing..."
  fi
  sleep 1
done

# Start Next.js dev server
echo ""
echo "[5/5] Starting Next.js development server..."
echo ""
echo "============================================"
echo "  App:       http://localhost:3000"
echo "  WS-Service: port 3004"
echo "  Press Ctrl+C to stop all services"
echo "============================================"
echo ""

bun run dev &
NEXT_PID=$!

# Trap to clean up background processes
cleanup() {
  echo ""
  echo "Shutting down services..."
  kill "$SERVICE_PID" 2>/dev/null || true
  kill "$NEXT_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

# Wait for either process
wait
