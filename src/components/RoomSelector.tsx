'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Plus } from 'lucide-react'

interface Room {
  id: string
  name: string
  users: Array<{
    id: string
    username: string
    color: string
  }>
}

interface RoomSelectorProps {
  onJoinRoom: (roomId: string, username: string) => void
  onCreateRoom: (roomName: string, username: string) => void
}

export default function RoomSelector({ onJoinRoom, onCreateRoom }: RoomSelectorProps) {
  const [username, setUsername] = useState('')
  const [roomName, setRoomName] = useState('')
  const [roomIdToJoin, setRoomIdToJoin] = useState('')
  const [isCreatingRoom, setIsCreatingRoom] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])

  const handleCreateRoom = () => {
    if (!username.trim() || !roomName.trim()) return
    onCreateRoom(roomName.trim(), username.trim())
    setRoomName('')
    setIsCreatingRoom(false)
  }

  const handleJoinRoom = () => {
    if (!username.trim() || !roomIdToJoin.trim()) return
    onJoinRoom(roomIdToJoin.trim(), username.trim())
    setRoomIdToJoin('')
  }

  const generateRoomId = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Collaborative Code Editor</h1>
        <p className="text-gray-600">Real-time code collaboration with multiple users</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Room */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Name</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name..."
                disabled={isCreatingRoom}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Room Name</label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name..."
                disabled={isCreatingRoom}
              />
            </div>
            <Button 
              onClick={handleCreateRoom}
              disabled={!username.trim() || !roomName.trim() || isCreatingRoom}
              className="w-full"
            >
              Create Room
            </Button>
          </CardContent>
        </Card>

        {/* Join Room */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Existing Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Name</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your name..."
                disabled={!roomIdToJoin}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Room ID</label>
              <div className="flex gap-2">
                <Input
                  value={roomIdToJoin}
                  onChange={(e) => setRoomIdToJoin(e.target.value)}
                  placeholder="Enter room ID..."
                  disabled={!username.trim()}
                />
                <Button 
                  variant="outline"
                  onClick={() => setRoomIdToJoin(generateRoomId())}
                  disabled={!username.trim()}
                >
                  Generate
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleJoinRoom}
              disabled={!username.trim() || !roomIdToJoin.trim()}
              className="w-full"
            >
              Join Room
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium">Create a Room</p>
              <p className="text-sm text-gray-600">Create a new collaboration room with a custom name</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium">Join a Room</p>
              <p className="text-sm text-gray-600">Join an existing room using its unique ID</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
            <div>
              <p className="font-medium">Start Collaborating</p>
              <p className="text-sm text-gray-600">Type in the editor and see changes in real-time from all participants</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}