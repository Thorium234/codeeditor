# Code Editor WebSocket Service

A collaborative code editor WebSocket service using Socket.IO.

## Features

- Real-time collaborative code editing
- Room-based collaboration
- Operational Transformation for conflict resolution
- User cursor tracking and presence
- WebSocket connections on port 3004

## Quick Start

### Development Mode
```bash
bun run dev
```

### Production Mode
```bash
bash deploy.sh
```

### Manual Start
```bash
nohup node index.js > service.log 2>&1 &
```

## Service Configuration

- **Port**: 3004
- **WebSocket Path**: `/`
- **CORS**: Enabled for all origins
- **Ping Timeout**: 60 seconds
- **Ping Interval**: 25 seconds

## Monitoring

Check if service is running:
```bash
lsof -i :3004
```

View logs:
```bash
tail -f service.log
```

Stop service:
```bash
kill <PID>
```

## Dependencies

- socket.io: WebSocket library
- uuid: Unique ID generation
- Node.js runtime

## Deployment Scripts

- `deploy.sh`: Complete deployment script
- `production-start.sh`: Production startup script
- `start-service.sh`: Basic service startup script
