'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import RoomSelector from '@/components/RoomSelector'
import CollaborativeEditor from '@/components/CollaborativeEditor'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

type AppState = 'room-selection' | 'connecting' | 'editor' | 'error'

interface ConnectionInfo {
  roomId: string
  username: string
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>('room-selection')
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null)
  const [error, setError] = useState<string>('')

  const handleCreateRoom = async (roomName: string, username: string) => {
    setAppState('connecting')
    setError('')
    
    try {
      // For demo purposes, we'll simulate room creation
      // In a real implementation, you might want to validate room names
      // or check room availability
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate a room ID (in real app, this would come from server)
      const roomId = Math.random().toString(36).substr(2, 9).toUpperCase()
      
      setConnectionInfo({
        roomId,
        username
      })
      
      setAppState('editor')
    } catch (err) {
      setError('Failed to create room. Please try again.')
      setAppState('room-selection')
    }
  }

  const handleJoinRoom = async (roomId: string, username: string) => {
    setAppState('connecting')
    setError('')
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Validate room ID format
      if (!roomId || roomId.length < 6) {
        throw new Error('Invalid room ID')
      }
      
      setConnectionInfo({
        roomId,
        username
      })
      
      setAppState('editor')
    } catch (err) {
      setError('Failed to join room. Please check the room ID and try again.')
      setAppState('room-selection')
    }
  }

  const handleLeaveRoom = () => {
    setConnectionInfo(null)
    setAppState('room-selection')
    setError('')
  }

  const renderContent = () => {
    switch (appState) {
      case 'room-selection':
        return (
          <RoomSelector 
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
          />
        )
        
      case 'connecting':
        return (
          <div className="container mx-auto p-4 max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Setting up your collaborative session...
                </p>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <p className="text-sm text-gray-500">Initializing connection</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )
        
      case 'editor':
        if (!connectionInfo) return null
        return (
          <CollaborativeEditor
            roomId={connectionInfo.roomId}
            username={connectionInfo.username}
            onLeave={handleLeaveRoom}
          />
        )
        
      case 'error':
        return (
          <div className="container mx-auto p-4 max-w-md">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button onClick={() => setAppState('room-selection')}>
                Back to Room Selection
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {renderContent()}
    </div>
  )
}