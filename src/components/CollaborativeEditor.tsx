'use client'

import { useEffect, useState, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, User, LogOut, Code } from 'lucide-react'
import { io } from 'socket.io-client'

interface User {
  id: string
  username: string
  color: string
  cursor: { line: number; column: number } | null
}

interface CursorPosition {
  userId: string
  username: string
  color: string
  position: { line: number; column: number }
}

interface CollaborativeEditorProps {
  roomId: string
  username: string
  onLeave: () => void
}

export default function CollaborativeEditor({ roomId, username, onLeave }: CollaborativeEditorProps) {
  const [document, setDocument] = useState('// Welcome to the collaborative code editor!\n// Start typing and see real-time collaboration in action.\n')
  const [users, setUsers] = useState<User[]>([])
  const [cursors, setCursors] = useState<CursorPosition[]>([])
  const [version, setVersion] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  
  const editorRef = useRef<any>(null)
  const socketRef = useRef<any>(null)

  useEffect(() => {
    // Connect to WebSocket server
    // Never use PORT in the URL, always use XTransformPort
    // DO NOT change the path, it is used by Caddy to forward the request to the correct port
    socketRef.current = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to code editor server')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from code editor server')
    })

    socket.on('room-joined', (data: any) => {
      setDocument(data.document)
      setVersion(data.version)
      setUsers(data.users)
    })

    socket.on('user-joined', (data: any) => {
      setUsers(prev => [...prev, data.user])
    })

    socket.on('user-left', (data: any) => {
      setUsers(prev => prev.filter(user => user.id !== data.userId))
      setCursors(prev => prev.filter(cursor => cursor.userId !== data.userId))
    })

    socket.on('operation', (data: any) => {
      if (data.document) {
        setDocument(data.document)
        setVersion(data.version)
      }
    })

    socket.on('cursor-update', (cursorData: CursorPosition) => {
      setCursors(prev => {
        const existing = prev.find(c => c.userId === cursorData.userId)
        if (existing) {
          return prev.map(c => c.userId === cursorData.userId ? cursorData : c)
        } else {
          return [...prev, cursorData]
        }
      })
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [roomId, username])

  const handleEditorChange = (value: string | undefined) => {
    if (!value || !socketRef.current || !isConnected) return

    // Synchronize full document content with other users
    socketRef.current.emit('document-sync', {
      roomId,
      document: value,
      version: version + 1
    })

    setDocument(value)
    setVersion(v => v + 1)
  }

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    editor.onDidChangeCursorPosition((e: any) => {
      if (!socketRef.current || !isConnected) return
      const position = e.position
      socketRef.current.emit('cursor-position', {
        roomId,
        position
      })
    })
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Collaborative Editor</h1>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Room: {roomId.slice(0, 8).toUpperCase()}
            </Badge>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onLeave}>
              <LogOut className="h-4 w-4 mr-2" />
              Leave Room
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Code Editor</CardTitle>
            </CardHeader>
            <CardContent className="h-full p-0">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={document}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  selectOnLineNumbers: true,
                  matchBrackets: 'always',
                  autoIndent: 'advanced',
                  formatOnPaste: true,
                  formatOnType: true
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-background">
          <div className="p-4 space-y-4">
            {/* Connected Users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Connected Users ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback 
                        style={{ backgroundColor: user.color }}
                        className="text-white text-xs"
                      >
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.username}</p>
                      {user.cursor && (
                        <p className="text-xs text-gray-500">
                          Line {user.cursor.line}, Col {user.cursor.column}
                        </p>
                      )}
                    </div>
                    {user.id === socketRef.current?.id && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">
                    No users connected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cursors */}
            {cursors.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Active Cursors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cursors.map((cursor) => (
                    <div key={cursor.userId} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cursor.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{cursor.username}</p>
                        <p className="text-xs text-gray-500">
                          Line {cursor.position.line}, Col {cursor.position.column}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Document Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Document Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Version:</span>
                  <span className="text-sm font-medium">{version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lines:</span>
                  <span className="text-sm font-medium">{document.split('\n').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Characters:</span>
                  <span className="text-sm font-medium">{document.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}