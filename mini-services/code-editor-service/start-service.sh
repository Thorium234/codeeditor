#!/bin/bash
# Start the WebSocket service in background
echo "Starting Code Editor WebSocket service..."

# Kill any existing processes on port 3004
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "node.*simple-server.js" 2>/dev/null || true
pkill -f "bun.*index.ts" 2>/dev/null || true

# Start the service
nohup node index.js > service.log 2>&1 &
SERVICE_PID=$!

# Wait a moment for service to start
sleep 2

# Check if service is running
if lsof -i :3004 >/dev/null 2>&1; then
    echo "✅ Service started successfully on port 3004 (PID: $SERVICE_PID)"
    echo "📝 Service logs: service.log"
    echo "🔍 To check status: lsof -i :3004"
    echo "🛑 To stop: kill $SERVICE_PID"
else
    echo "❌ Service failed to start on port 3004"
    echo "📝 Check logs: cat service.log"
    exit 1
fi
