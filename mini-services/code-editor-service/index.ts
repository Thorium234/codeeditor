import { createServer } from 'http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

const httpServer = createServer()
const PORT = 3004

const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface User {
  id: string
  username: string
  color: string
  cursor: { line: number; column: number } | null
}

interface Room {
  id: string
  name: string
  users: Map<string, User>
  document: string
  version: number
}

interface Operation {
  id: string
  userId: string
  type: 'insert' | 'delete'
  position: number
  text?: string
  length?: number
  version: number
}

interface CursorPosition {
  userId: string
  position: { line: number; column: number }
}

// Room management
const rooms = new Map<string, Room>()

// User colors for visual distinction
const userColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
]

let colorIndex = 0

const generateUserColor = (): string => {
  const color = userColors[colorIndex % userColors.length]
  colorIndex++
  return color
}

const createRoom = (name: string): Room => {
  const roomId = uuidv4()
  const room: Room = {
    id: roomId,
    name,
    users: new Map(),
    document: '// Welcome to the collaborative code editor!\n// Start typing and see real-time collaboration in action.\n',
    version: 0
  }
  rooms.set(roomId, room)
  return room
}

const joinRoom = (roomId: string, user: User): boolean => {
  const room = rooms.get(roomId)
  if (!room) return false

  room.users.set(user.id, user)
  return true
}

const leaveRoom = (roomId: string, userId: string): void => {
  const room = rooms.get(roomId)
  if (room) {
    room.users.delete(userId)
    if (room.users.size === 0) {
      rooms.delete(roomId)
    }
  }
}

// Operational Transformation Implementation
const applyOperation = (document: string, operation: Operation): string => {
  let newDoc = document
  
  if (operation.type === 'insert' && operation.text) {
    newDoc = 
      document.slice(0, operation.position) + 
      operation.text + 
      document.slice(operation.position)
  } else if (operation.type === 'delete' && operation.length) {
    newDoc = 
      document.slice(0, operation.position) + 
      document.slice(operation.position + operation.length)
  }
  
  return newDoc
}

const transformOperation = (op1: Operation, op2: Operation): Operation => {
  // This is a simplified OT implementation
  // In a production system, you'd need more sophisticated transformation logic
  
  if (op1.position <= op2.position) {
    if (op1.type === 'insert' && op2.type === 'insert') {
      return { ...op1, position: op1.position + (op2.text?.length || 0) }
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      return { ...op1, position: Math.max(op1.position, op2.position - (op2.length || 0)) }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      return { ...op1, position: op1.position + (op2.text?.length || 0) }
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position + (op1.length || 0) <= op2.position) {
        return op1
      } else {
        return { 
          ...op1, 
          position: Math.max(op1.position, op2.position - (op2.length || 0))
        }
      }
    }
  } else {
    // op1.position > op2.position
    if (op1.type === 'insert' && op2.type === 'insert') {
      return op1
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      return { ...op1, position: op1.position - (op2.length || 0) }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      return op1
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      if (op2.position + (op2.length || 0) <= op1.position) {
        return { ...op1, position: op1.position - (op2.length || 0) }
      } else {
        return { 
          ...op1, 
          length: Math.max(0, (op1.length || 0) - (op2.length || 0))
        }
      }
    }
  }
  
  return op1
}

const broadcastOperation = (roomId: string, operation: Operation, excludeUserId?: string): void => {
  const room = rooms.get(roomId)
  if (!room) return

  room.version = operation.version

  // Broadcast to all users in the room except the sender
  room.users.forEach((user, userId) => {
    if (userId !== excludeUserId && user.id !== excludeUserId) {
      // Transform the operation for this user
      const transformedOp = transformOperation(operation, operation) // In real OT, this would be more complex
      
      io.to(userId).emit('operation', {
        operation: transformedOp,
        version: room.version
      })
    }
  })
}

const broadcastCursor = (roomId: string, cursorData: CursorPosition): void => {
  const room = rooms.get(roomId)
  if (!room) return

  // Broadcast cursor position to all other users in the room
  room.users.forEach((user, userId) => {
    if (userId !== cursorData.userId) {
      io.to(userId).emit('cursor-update', {
        userId: cursorData.userId,
        username: user.username,
        color: user.color,
        position: cursorData.position
      })
    }
  })
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  socket.on('create-room', (data: { roomName: string; username: string }) => {
    const { roomName, username } = data
    
    // Create new room
    const room = createRoom(roomName)
    
    // Create user
    const user: User = {
      id: socket.id,
      username,
      color: generateUserColor(),
      cursor: null
    }
    
    // Join user to room
    joinRoom(room.id, user)
    
    // Add user to socket room
    socket.join(room.id)
    
    // Send room info to user
    socket.emit('room-created', {
      roomId: room.id,
      roomName: room.name,
      document: room.document,
      version: room.version
    })
    
    console.log(`Room created: ${room.id} by ${username}`)
  })

  socket.on('join-room', (data: { roomId: string; username: string }) => {
    const { roomId, username } = data
    
    const room = rooms.get(roomId)
    if (!room) {
      socket.emit('error', { message: 'Room not found' })
      return
    }
    
    // Create user
    const user: User = {
      id: socket.id,
      username,
      color: generateUserColor(),
      cursor: null
    }
    
    // Join user to room
    joinRoom(roomId, user)
    
    // Add user to socket room
    socket.join(roomId)
    
    // Send room info to user
    socket.emit('room-joined', {
      roomId,
      roomName: room.name,
      document: room.document,
      version: room.version,
      users: Array.from(room.users.values())
    })
    
    // Notify other users
    socket.to(roomId).emit('user-joined', {
      user,
      message: `${username} joined the collaboration`
    })
    
    console.log(`${username} joined room: ${roomId}`)
  })

  socket.on('operation', (data: { operation: Operation; roomId: string }) => {
    const { operation, roomId } = data
    
    const room = rooms.get(roomId)
    if (!room) return
    
    // Apply operation to room document
    room.document = applyOperation(room.document, operation)
    room.version = operation.version
    
    // Broadcast to other users
    broadcastOperation(roomId, operation, socket.id)
    
    console.log(`Operation applied in room ${roomId}: ${operation.type} at ${operation.position}`)
  })

  socket.on('cursor-position', (data: { roomId: string; position: { line: number; column: number } }) => {
    const { roomId, position } = data
    
    const room = rooms.get(roomId)
    if (!room) return
    
    const user = room.users.get(socket.id)
    if (!user) return
    
    // Update user cursor
    user.cursor = position
    
    // Broadcast cursor position
    broadcastCursor(roomId, {
      userId: socket.id,
      position
    })
  })

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`)
    
    // Find and remove user from all rooms
    rooms.forEach((room, roomId) => {
      const user = room.users.get(socket.id)
      if (user) {
        leaveRoom(roomId, socket.id)
        
        // Notify other users
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          username: user.username,
          message: `${user.username} left the collaboration`
        })
      }
    })
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// Start the server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Code Editor WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('Code Editor server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('Code Editor server closed')
    process.exit(0)
  })
})