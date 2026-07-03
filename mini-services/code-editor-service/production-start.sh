#!/bin/bash
# Production deployment script for WebSocket service
echo "🚀 Starting Code Editor WebSocket Service (Production)"

# Cleanup any existing processes
pkill -f "node.*index.js" 2>/dev/null || true
sleep 1

# Set production environment
export NODE_ENV=production

# Start the service
echo "📡 Starting server on port 3004..."
nohup node index.js > production.log 2>&1 &
SERVICE_PID=$!

# Wait for service to initialize
sleep 3

# Verify service is running
if lsof -i :3004 >/dev/null 2>&1; then
    echo "✅ Service started successfully (PID: $SERVICE_PID)"
    echo "📊 Status: Running on port 3004"
    echo "📝 Logs: tail -f production.log"
    echo "🔍 Monitor: lsof -i :3004"
    echo "🛑 Stop: kill $SERVICE_PID"
    echo "🔄 Restart: ./production-start.sh"
else
    echo "❌ Service failed to start"
    echo "📝 Check logs: cat production.log"
    exit 1
fi
