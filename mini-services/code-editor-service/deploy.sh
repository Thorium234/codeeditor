#!/bin/bash
# Deployment script for WebSocket service

echo "🚀 Deploying Code Editor WebSocket Service"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Please run as regular user, not root"
    exit 1
fi

# Stop any existing service
echo "🛑 Stopping existing service..."
pkill -f "node.*index.js" 2>/dev/null || true
sleep 2

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# Start the service
echo "🚀 Starting service..."
nohup node index.js > service.log 2>&1 &
SERVICE_PID=$!

# Wait for service to start
sleep 3

# Check if service is running
if lsof -i :3004 >/dev/null 2>&1; then
    echo "✅ Service started successfully (PID: $SERVICE_PID)"
    echo "📡 Running on: http://localhost:3004"
    echo "📝 Logs: tail -f service.log"
    echo "🔍 Status: lsof -i :3004"
    echo "🛑 Stop: kill $SERVICE_PID"
    echo "🔄 Restart: $0"
else
    echo "❌ Service failed to start"
    echo "📝 Check logs: cat service.log"
    exit 1
fi

echo ""
echo "🎯 Service is now running and ready for WebSocket connections!"
