import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { ChatRoom, ChatMessage } from '@/services/types/frontend/chat'
import { getTokenFromStore } from '@/utils/api'

import { useAppSelector } from '@/store/hooks'

export const useChat = () => {
  // Get current user from auth state
  const authState = useAppSelector((state: any) => state.authReducer || {})
  const { user: currentUser, token: authTokenFromStore } = authState
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitialized = useRef(false)
  const lastFetchedRoom = useRef<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const currentRoomRef = useRef<ChatRoom | null>(null)
  const currentUserRef = useRef<any>(null)
  const fetchRoomsRef = useRef<(() => Promise<void>) | null>(null)
  const roomsRef = useRef<ChatRoom[]>([]) // Track rooms in ref for socket reconnection

  // Helper function to get auth token with multiple fallbacks
  const getAuthToken = useCallback((): string | null => {
    // First try from Redux store (most reliable)
    let authToken = authTokenFromStore || getTokenFromStore()
    
    // If still no token, try getting from localStorage directly
    if (!authToken && typeof window !== 'undefined') {
      try {
        const persistData = localStorage.getItem('persist:noldam-root')
        if (persistData) {
          const parsed = JSON.parse(persistData)
          // Try authReducer format
          if (parsed.authReducer) {
            const authReducer = typeof parsed.authReducer === 'string' 
              ? JSON.parse(parsed.authReducer) 
              : parsed.authReducer
            authToken = authReducer.token || null
          }
          // Try auth format (fallback)
          if (!authToken && parsed.auth) {
            const authData = typeof parsed.auth === 'string'
              ? JSON.parse(parsed.auth)
              : parsed.auth
            authToken = authData.token || null
          }
        }
      } catch (e) {
        // Silent fail
      }
    }
    
    return authToken
  }, [authTokenFromStore])

  // Keep refs in sync with state
  useEffect(() => {
    currentRoomRef.current = currentRoom
  }, [currentRoom])

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  useEffect(() => {
    roomsRef.current = rooms
  }, [rooms])

  // Initialize socket connection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const authToken = getAuthToken()
    if (!authToken) return

    // Connect to socket server with reconnection enabled
    // Configuration that works reliably in both local and production environments
    // Determine socket URL: use env var if set, otherwise use current origin
    // In production, ensure we use the correct protocol (https if available)
    const getSocketUrl = () => {
      if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        return process.env.NEXT_PUBLIC_SOCKET_URL
      }
      // Use current origin (works for both localhost and production)
      const origin = window.location.origin
      // Ensure we use the same protocol as the page
      return origin
    }

    const socketUrl = getSocketUrl()

    const socket = io(socketUrl, {
      path: '/api/socket',
      auth: {
        token: authToken
      },
      // Try polling first in production (more reliable), websocket first in dev
      // Socket.IO will automatically fallback if one fails
      transports: window.location.hostname === 'localhost' 
        ? ['websocket', 'polling'] 
        : ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      // Increased timeout for production (network latency)
      timeout: 45000, // 45 seconds for production
      // Force new connection to avoid stale connections
      forceNew: false,
      // Upgrade transport automatically (polling -> websocket if available)
      upgrade: true,
      // Enable auto-connect
      autoConnect: true,
      // Add extra options for production reliability
      rememberUpgrade: true,
      // Use secure connection if page is HTTPS
      secure: window.location.protocol === 'https:',
      // Reject unauthorized connections
      rejectUnauthorized: false
    })

    socket.on('connect', () => {
      setError(null)
      
      // After connection, ensure we're in the current room if one is open
      if (currentRoomRef.current?.id && socketRef.current) {
        socketRef.current.emit('join', { roomId: currentRoomRef.current.id })
      }

      // CRITICAL FIX: Re-join all rooms after reconnection
      // This ensures we receive messages even after disconnection
      // Use a small delay to ensure rooms state is updated
      setTimeout(() => {
        if (fetchRoomsRef.current && socketRef.current) {
          fetchRoomsRef.current().then(() => {
            // After fetching rooms, join all active rooms
            // The fetchRooms will update the rooms state, then we join them
            setTimeout(() => {
              if (socketRef.current) {
                // Get current rooms from ref (always up-to-date)
                const currentRooms = roomsRef.current
                if (currentRooms.length > 0) {
                  currentRooms.forEach((room) => {
                    socketRef.current?.emit('join', { roomId: room.id })
                  })
                }
              }
            }, 200)
          })
        }
      }, 500)
    })

    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server disconnected the socket, reconnect manually
        socket.connect()
      }
      // Will automatically reconnect due to reconnection: true
    })

    socket.on('reconnect', (attemptNumber) => {
      setError(null)
      
      // Re-join current room after reconnection
      if (currentRoomRef.current?.id && socketRef.current) {
        socketRef.current.emit('join', { roomId: currentRoomRef.current.id })
      }
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err)
      console.error('[Socket] Error details:', {
        message: err.message,
        type: (err as any).type,
        description: (err as any).description,
        context: (err as any).context,
        url: socketUrl,
        socketId: socket.id,
        connected: socket.connected,
        active: socketRef.current?.active,
        hasToken: !!authToken,
        tokenLength: authToken?.length
      })
      
      // Handle "server error" specifically
      if (err.message === 'server error' || err.message?.includes('server error')) {
        console.error('[Socket] ⚠️ SERVER ERROR - Possible causes:')
        console.error('[Socket] 1. Authentication failed - Check if token is valid')
        console.error('[Socket] 2. CORS issue - Check NEXT_PUBLIC_APP_URL matches your domain')
        console.error('[Socket] 3. Socket server not running with Socket.IO (use: npm run start:socket)')
        console.error('[Socket] 4. Database connection issue on server')
        console.error('[Socket] 5. JWT_SECRET mismatch between client and server')
        console.error('[Socket] Current URL:', socketUrl)
        console.error('[Socket] Expected CORS origin:', process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'Not set')
      }
      
      // Don't set error for timeout during reconnection attempts
      // The socket will automatically retry
      if (err.message === 'timeout' || err.message?.includes('timeout')) {
        console.error('[Socket] ⚠️ TIMEOUT ERROR - Possible causes:')
        console.error('[Socket] 1. Socket server not running (use: npm run start:socket)')
        console.error('[Socket] 2. Firewall/proxy blocking WebSocket connections')
        console.error('[Socket] 3. Socket endpoint not accessible:', `${socketUrl}/api/socket`)
        console.error('[Socket] 4. CORS configuration issue')
        
        // Socket is still trying to reconnect, don't show error yet
        if (socketRef.current?.active) {
          return
        }
      }
      
      // Check if it's a network error (common in production)
      if (err.message?.includes('NetworkError') || err.message?.includes('Failed to fetch')) {
        console.error('[Socket] Network error - check if socket server is running and accessible')
        console.error('[Socket] Make sure production uses: npm run start:socket (not npm run start)')
        console.error('[Socket] Test socket endpoint:', `${socketUrl}/api/socket`)
      }
      
      // Only show error if socket is not actively trying to reconnect
      if (!socketRef.current?.active) {
        setError('Failed to connect to chat server. Please refresh the page.')
      }
    })

    // Listen for new messages (from other users only)
    socket.on('message:new', (message: ChatMessage) => {
      const messageRoomId = String(message.roomId || '')
      const normalizedSenderId = message.sender?.id !== undefined && message.sender?.id !== null ? String(message.sender.id) : ''
      const isCurrentRoom = currentRoomRef.current?.id === messageRoomId
      const currentUserId = currentUserRef.current?.id || currentUserRef.current?.userId || currentUserRef.current?.uid || currentUserRef.current?.userUuid
      const normalizedCurrentUserId = currentUserId !== undefined && currentUserId !== null ? String(currentUserId) : ''
      const normalizedMessageId = message.id !== undefined && message.id !== null ? String(message.id) : ''
      const isFromCurrentUser = normalizedSenderId && normalizedSenderId === normalizedCurrentUserId
      
      // Don't increment unread count for messages from current user
      if (isFromCurrentUser) {
        return
      }
      
      // Add message to current room's messages if viewing that room
      if (isCurrentRoom) {
        setMessages(prev => {
          // Check if message already exists (avoid duplicates)
          if (prev.some(m => {
            const normalizedExistingId = m.id !== undefined && m.id !== null ? String(m.id) : ''
            if (normalizedExistingId && normalizedMessageId && normalizedExistingId === normalizedMessageId) {
              return true
            }
            if (m.tempId && message.tempId && m.tempId === message.tempId) {
              return true
            }
            return false
          })) {
            return prev
          }
          
          // Add new message and sort by timestamp
          const updated = [...prev, message]
          return updated.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })
      }

      // CRITICAL FIX: Update room's last message and increment unread count IMMEDIATELY
      // This ensures the count updates in real-time without page refresh
      setRooms(prev => {
        const roomExists = prev.some(room => room.id === messageRoomId)
        
        if (!roomExists) {
          // Room doesn't exist in list - this is a NEW chat or reactivated chat
          // Immediately add it to the list with unread count = 1
          // Then refresh from server to get full room data
          const newRoom: ChatRoom = {
            id: messageRoomId,
            type: 'user', // Default to user, will be updated by server
            user: {
              id: String(message.sender.id),
              nickname: message.sender.nickname || 'Unknown',
              avatar: message.sender.avatar || '',
              isOnline: message.sender.isOnline || false,
              lastSeen: message.sender.lastSeen || new Date().toISOString(),
              level: message.sender.level || 1
            },
            lastMessage: message,
            unreadCount: 1, // New message = 1 unread
            lastActivity: message.timestamp || new Date().toISOString(),
            isActive: true,
            isMessageRequest: false // Will be updated by server
          }
          
          // Add new room to the list immediately
          const updatedWithNewRoom = [...prev, newRoom]
          
          // Sort by lastActivity (most recent first)
          const sorted = updatedWithNewRoom.sort((a, b) => {
            const timeA = new Date(a.lastActivity || a.lastMessage?.timestamp || 0).getTime()
            const timeB = new Date(b.lastActivity || b.lastMessage?.timestamp || 0).getTime()
            return timeB - timeA
          })
          
          // Then refresh from server to get accurate data (room type, message request status, etc.)
          setTimeout(() => {
            if (fetchRoomsRef.current) {
              fetchRoomsRef.current()
            }
          }, 500) // Small delay to ensure server has updated
          
          return sorted
        }
        
        // Room exists - update it with new message and increment unread count
        const updated = prev.map(room => {
          if (room.id === messageRoomId) {
            // Always increment unread count if NOT viewing this room
            const currentUnreadCount = room.unreadCount || 0
            const newUnreadCount = isCurrentRoom ? 0 : currentUnreadCount + 1
            
            // CRITICAL: Return a completely new object to force React re-render
            // Create a new object with all properties spread to ensure React detects the change
            const updatedRoom = {
              ...room,
              id: room.id, // Keep same id
              lastMessage: message,
              lastActivity: message.timestamp || new Date().toISOString(),
              unreadCount: newUnreadCount // This is the key - increment count
            }
            
            return updatedRoom
          }
          // Return new object for other rooms too (to ensure array reference changes)
          return { ...room }
        })

        // Sort by lastActivity (most recent first)
        const sorted = [...updated].sort((a, b) => {
          const timeA = new Date(a.lastActivity || a.lastMessage?.timestamp || 0).getTime()
          const timeB = new Date(b.lastActivity || b.lastMessage?.timestamp || 0).getTime()
          return timeB - timeA
        })
        
        return sorted
      })
    })

    // Listen for sent message confirmation (only for sender)
    socket.on('message:sent', (message: ChatMessage) => {
      const normalizedMessageId = message.id !== undefined && message.id !== null ? String(message.id) : ''
      
      setMessages(prev => {
        // Remove temp message if exists, or any message with same content/timestamp (to prevent duplicates)
        const filtered = prev.filter(m => {
          // Keep messages that don't match this one
          if (m.tempId && message.tempId && m.tempId === message.tempId) {
            return false // Remove matching temp message
          }
          const normalizedExistingId = m.id !== undefined && m.id !== null ? String(m.id) : ''
          if (normalizedExistingId && normalizedMessageId && normalizedExistingId === normalizedMessageId) {
            return false // Remove if same id (already exists)
          }
          // Check for duplicate by content and timestamp (within 2 seconds)
          if (m.content === message.content && 
              Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 2000) {
            // If it's a temp message, remove it
            if (m.tempId) {
              return false
            }
          }
          return true
        })
        
        // Check if message already exists (by id) before adding
        const alreadyExists = filtered.some(m => {
          const normalizedExistingId = m.id !== undefined && m.id !== null ? String(m.id) : ''
          return normalizedExistingId && normalizedMessageId && normalizedExistingId === normalizedMessageId
        })
        if (alreadyExists) {
          return filtered
        }
        
        // Add the confirmed message
        const updated = [...filtered, { ...message, tempId: undefined, id: normalizedMessageId || message.id }]
        
        // Sort by timestamp
        return updated.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      })
      
      // Update room's last message for sender's own message
      setRooms(prev => {
        const messageRoomId = String(message.roomId || '')
        const updated = prev.map(room => {
          if (room.id === messageRoomId) {
            return {
              ...room,
              lastMessage: message,
              lastActivity: message.timestamp || new Date().toISOString(),
              unreadCount: 0 // Sender's own message doesn't count as unread
            }
          }
          return room
        })
        
        // Sort by lastActivity
        return updated.sort((a, b) => {
          const timeA = new Date(a.lastActivity || a.lastMessage?.timestamp || 0).getTime()
          const timeB = new Date(b.lastActivity || b.lastMessage?.timestamp || 0).getTime()
          return timeB - timeA
        })
      })

      // Only refresh rooms if this was a message request (to move it to main chats)
      // Check if current room was a message request before sending
      const wasMessageRequest = currentRoomRef.current?.isMessageRequest
      if (wasMessageRequest) {
        // Only refresh if it was a message request, and use a delay to avoid interrupting chat
        setTimeout(() => {
          fetchRooms()
        }, 2000)
      }
    })

    // Listen for room updates (last message, activity changes)
    socket.on('room:updated', (data: { roomId: string; lastMessage: ChatMessage; lastActivity: string; senderId?: string }) => {
      const currentUserId = currentUserRef.current?.id || currentUserRef.current?.userId || currentUserRef.current?.uid || currentUserRef.current?.userUuid
      const isFromCurrentUser = data.senderId && String(data.senderId) === String(currentUserId)
      const isCurrentRoom = data.roomId === currentRoomRef.current?.id
      
      setRooms(prev => {
        const roomExists = prev.some(room => room.id === data.roomId)
        
        if (!roomExists) {
          // Room doesn't exist in list - message:new should have already added it
          // But if it didn't, refresh from server
          setTimeout(() => {
            if (fetchRoomsRef.current) {
              fetchRoomsRef.current()
            }
          }, 300)
          return prev
        }
        
        // CRITICAL FIX: Update room but preserve unread count from message:new
        // message:new fires first and increments, room:updated fires second
        // We should preserve the incremented count from message:new
        const updated = prev.map(room => {
          if (room.id === data.roomId) {
            const currentUnreadCount = room.unreadCount || 0
            
            // CRITICAL: Preserve the unread count that message:new already incremented
            // Only reset to 0 if viewing the room or if it's from current user
            // Otherwise, keep the incremented count from message:new
            let newUnreadCount = currentUnreadCount
            
            if (isCurrentRoom || isFromCurrentUser) {
              newUnreadCount = 0
            } else {
              // IMPORTANT: Don't decrement or reset - message:new already incremented it
              // If count is 0, it means message:new hasn't fired yet, so increment it
              if (currentUnreadCount === 0) {
                newUnreadCount = 1
              }
              // Otherwise, keep the incremented count (don't change it)
            }
            
            // Force React re-render by creating completely new object
            return {
              ...room,
              lastMessage: data.lastMessage,
              lastActivity: data.lastActivity,
              unreadCount: newUnreadCount
            }
          }
          // Return new object for other rooms to ensure array reference changes
          return { ...room }
        })

        // Sort by lastActivity (most recent first)
        const sorted = [...updated].sort((a, b) => {
          const timeA = new Date(a.lastActivity || a.lastMessage?.timestamp || 0).getTime()
          const timeB = new Date(b.lastActivity || b.lastMessage?.timestamp || 0).getTime()
          return timeB - timeA
        })
        
        return sorted
      })
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, []) // Keep dependency array empty - socket should only connect once

  // Join room when current room changes and mark as read
  useEffect(() => {
    // Always call the hook, handle conditions inside
    if (!socketRef.current || !currentRoom?.id) {
      // Cleanup if room becomes null
      return
    }

    const roomId = currentRoom.id
    socketRef.current.emit('join', { roomId })
    
    // Mark room as read when opening it
    socketRef.current.emit('message:read', { roomId })
    
    // Clear unread count for current room
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          unreadCount: 0
        }
      }
      return room
    }))
    
    return () => {
      if (socketRef.current && roomId) {
        socketRef.current.emit('leave', { roomId })
      }
    }
  }, [currentRoom?.id])

  // Fetch chat rooms
  const fetchRooms = useCallback(async () => {
    // Don't fetch rooms on login page
    if (typeof window !== 'undefined' && window.location.pathname === '/login') {
      return
    }
    
    setLoading(true)
    try {
      // Get token from Redux store
      const authToken = getAuthToken()
      
      if (!authToken) {
        setError('Authentication required. Please log in.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/chat/rooms', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch rooms: ${response.status}`)
      }
      
      const data = await response.json()
      const fetchedRooms = data.rooms || []
      
      // CRITICAL FIX: Merge server data with local state to preserve real-time unread counts
      // Server might have stale unread counts, so we preserve local increments
      setRooms(prev => {
        // Create a map of current rooms by ID for quick lookup
        const prevRoomsMap = new Map(prev.map(room => [room.id, room]))
        
        // Merge fetched rooms with local state
        const mergedRooms = fetchedRooms.map((serverRoom: ChatRoom) => {
          const localRoom = prevRoomsMap.get(serverRoom.id)
          
          // If we have a local room with a higher unread count, preserve it
          // This handles cases where socket incremented the count but server hasn't updated yet
          if (localRoom && localRoom.unreadCount !== undefined) {
            const localUnread = localRoom.unreadCount || 0
            const serverUnread = serverRoom.unreadCount || 0
            
            // Use the higher count (local is more up-to-date for real-time updates)
            // But if server has a higher count, it means we missed some updates, so use server
            const preservedUnreadCount = Math.max(localUnread, serverUnread)
            
            return {
              ...serverRoom,
              unreadCount: preservedUnreadCount,
              // Preserve local lastMessage if it's newer
              lastMessage: localRoom.lastMessage && serverRoom.lastMessage
                ? (new Date(localRoom.lastMessage.timestamp) > new Date(serverRoom.lastMessage.timestamp)
                  ? localRoom.lastMessage
                  : serverRoom.lastMessage)
                : localRoom.lastMessage || serverRoom.lastMessage
            }
          }
          
          return serverRoom
        })
        
        // Add any local rooms that aren't in server response (shouldn't happen, but safety check)
        fetchedRooms.forEach((serverRoom: ChatRoom) => {
          prevRoomsMap.delete(serverRoom.id)
        })
        
        // Add any remaining local rooms (new rooms added by socket that server doesn't know about yet)
        const remainingLocalRooms = Array.from(prevRoomsMap.values())
        const allRooms = [...mergedRooms, ...remainingLocalRooms]
        
        // Sort rooms by lastActivity (most recent first)
        const sortedRooms = allRooms.sort((a: ChatRoom, b: ChatRoom) => {
          const timeA = new Date(a.lastActivity || a.lastMessage?.timestamp || 0).getTime()
          const timeB = new Date(b.lastActivity || b.lastMessage?.timestamp || 0).getTime()
          return timeB - timeA
        })
        
        return sortedRooms
      })
      
      fetchRoomsRef.current = fetchRooms // Store in ref for socket handlers
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rooms')
    } finally {
      setLoading(false)
    }
  }, [])

  // Track if we're currently fetching to prevent duplicate calls
  const isFetchingMessages = useRef(false)

  // Fetch messages for a specific room
  const fetchMessages = useCallback(async (roomId: string, type: 'user' | 'group') => {
    // Check if we're already fetching messages for this room
    const roomKey = `${roomId}-${type}`
    if (isFetchingMessages.current && lastFetchedRoom.current === roomKey) {
      return
    }
    
    isFetchingMessages.current = true
    lastFetchedRoom.current = roomKey
    setLoading(true)
    try {
      // Get token from Redux store
      const authToken = getAuthToken()
      
      if (!authToken) {
        setError('Authentication required. Please log in.')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/chat/messages?roomId=${roomId}&type=${type}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch messages: ${response.status}`)
      }
      
      const data = await response.json()
      const fetchedMessages = data.messages || []
      
      // Sort messages by timestamp
      const sortedMessages = fetchedMessages.sort((a: ChatMessage, b: ChatMessage) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      
      // Merge with existing messages (preserve optimistic updates)
      setMessages(prev => {
        // Get all temp messages (optimistic updates not yet confirmed)
        const tempMessages = prev.filter(m => m.tempId)
        
        // Combine: existing confirmed messages (from API) + temp messages
        const allMessages = [...sortedMessages, ...tempMessages]
        
        // Remove duplicates by id
        const uniqueMessages = allMessages.reduce((acc: ChatMessage[], msg: ChatMessage) => {
          const normalizedMsgId = msg.id !== undefined && msg.id !== null ? String(msg.id) : ''
          if (!acc.find((m: ChatMessage) => {
            const normalizedExistingId = m.id !== undefined && m.id !== null ? String(m.id) : ''
            if (normalizedExistingId && normalizedMsgId && normalizedExistingId === normalizedMsgId) {
              return true
            }
            return Boolean(m.tempId && msg.tempId && m.tempId === msg.tempId)
          })) {
            acc.push({ ...msg, id: normalizedMsgId || msg.id })
          }
          return acc
        }, [] as ChatMessage[])
        
        // Sort by timestamp
        return uniqueMessages.sort((a: ChatMessage, b: ChatMessage) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      })
      
      // Mark room as read (clear unread count) when fetching messages
      setRooms(prev => prev.map(room => {
        if (room.id === roomId) {
          return {
            ...room,
            unreadCount: 0,
            lastMessage: sortedMessages[sortedMessages.length - 1] || room.lastMessage
          }
        }
        return room
      }))
      
      // Emit read receipt via socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:read', { roomId })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
    } finally {
      setLoading(false)
      isFetchingMessages.current = false
    }
  }, []) // Remove loading dependency - it causes infinite loops

  // Send message via WebSocket or HTTP fallback
  const sendMessage = useCallback(async (
    content: string,
    roomId: string,
    options?: {
      type?: 'text' | 'image' | 'file' | 'club'
      attachmentUrl?: string
      fileName?: string
      fileSize?: number
      clubMeetingId?: number
      replyToId?: number
    }
  ) => {
    if (!content.trim() && !options?.attachmentUrl && !options?.clubMeetingId) return
    
    const tempId = `temp-${Date.now()}`
    const type = options?.type || 'text'

    // Optimistic update
    const optimisticMessage: ChatMessage = {
      id: tempId,
      tempId,
      content: content || '',
      type,
      attachmentUrl: options?.attachmentUrl,
      fileName: options?.fileName,
      fileSize: options?.fileSize,
      clubMeeting: options?.clubMeetingId ? undefined : undefined, // Will be populated by server
      sender: {
        id: String(currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid || 'currentUser'),
        nickname: currentUser?.nickname || '나',
        avatar: currentUser?.profileImage || currentUser?.avatar || '/images/avatars/1.png',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        level: 1 // TODO: Get actual level from CommunityRating
      },
      timestamp: new Date().toISOString(),
      isRead: false
    }
    
    setMessages(prev => {
      // Check if message already exists (prevent duplicates)
      if (prev.some(m => m.tempId === tempId || (m.content === content && Math.abs(new Date(m.timestamp).getTime() - new Date().getTime()) < 1000))) {
        return prev
      }
      return [...prev, optimisticMessage]
    })

    // Try WebSocket first, fallback to HTTP
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', {
        roomId: parseInt(roomId),
        tempId,
        content,
        type,
        attachmentUrl: options?.attachmentUrl,
        fileName: options?.fileName,
        fileSize: options?.fileSize,
        clubMeetingId: options?.clubMeetingId,
        replyToId: options?.replyToId
      })
    } else {
      // HTTP fallback
      try {
        const authToken = getAuthToken()
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          },
          body: JSON.stringify({
            roomId: parseInt(roomId),
            content,
            type,
            attachmentUrl: options?.attachmentUrl,
            fileName: options?.fileName,
            fileSize: options?.fileSize,
            clubMeetingId: options?.clubMeetingId,
            replyToId: options?.replyToId
          })
        })

        if (!response.ok) throw new Error('Failed to send message')
        const data = await response.json()

        // Replace optimistic message with real one
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.tempId !== tempId && msg.id !== data.message.id)
          return [...filtered, { ...data.message, tempId: undefined }].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })

        // Only refresh rooms if this was a message request (to move it to main chats)
        // Check if current room was a message request before sending
        const wasMessageRequest = currentRoomRef.current?.isMessageRequest
        if (wasMessageRequest) {
          // Only refresh if it was a message request, and use a delay to avoid interrupting chat
          setTimeout(() => {
            fetchRooms()
          }, 2000)
        }
      } catch (err) {
        // Remove optimistic message on error
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.tempId !== tempId)
          return filtered.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })
        setError(err instanceof Error ? err.message : 'Failed to send message')
      }
    }
  }, [fetchRooms])

  // Send attachment (image/file)
  const sendAttachment = useCallback(async (file: File, kind: 'image' | 'file', roomId: string) => {
    if (!file) return

    try {
      let attachmentUrl: string | undefined = undefined

      if (kind === 'image') {
        // Upload image to server first to get a permanent URL
        const authToken = getAuthToken()
        if (!authToken) {
          setError('Authentication required to upload images')
          return
        }

        const formData = new FormData()
        formData.append('image', file)

        const uploadResponse = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          setError(errorData.reason || 'Failed to upload image')
          return
        }

        const uploadData = await uploadResponse.json()
        if (uploadData.success && uploadData.data?.imageUrl) {
          attachmentUrl = uploadData.data.imageUrl
        } else {
          setError('Failed to upload image: Invalid response')
          return
        }
      } else if (kind === 'file') {
        // Upload file to server first to get a permanent URL
        const authToken = getAuthToken()
        if (!authToken) {
          setError('Authentication required to upload files')
          return
        }

        const formData = new FormData()
        formData.append('file', file)

        const uploadResponse = await fetch('/api/upload/file', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          setError(errorData.reason || 'Failed to upload file')
          return
        }

        const uploadData = await uploadResponse.json()
        if (uploadData.success && uploadData.data?.fileUrl) {
          attachmentUrl = uploadData.data.fileUrl
        } else {
          setError('Failed to upload file: Invalid response')
          return
        }
      }

      // Send message with the server URL (not blob URL)
      await sendMessage(
        kind === 'image' ? '' : file.name,
        roomId,
        {
          type: kind,
          attachmentUrl: attachmentUrl,
          fileName: file.name,
          fileSize: file.size
        }
      )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to upload and send attachment')
    }
  }, [sendMessage, getAuthToken])

  // Send club link card
  const sendClubLink = useCallback(async (club: { id: number; name: string; avatar?: string }, roomId: string) => {
    // Send message with club data for optimistic update
    const tempId = `temp-${Date.now()}`
    
    // Create optimistic message with club meeting data
    const optimisticMessage: ChatMessage = {
      id: tempId,
      tempId,
      content: club.name,
      type: 'club',
      clubMeeting: {
        id: String(club.id),
        name: club.name,
        image: club.avatar || '',
        meetingTime: new Date().toISOString() // Will be updated by server
      },
      sender: {
        id: String(currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid || 'currentUser'),
        nickname: currentUser?.nickname || '나',
        avatar: currentUser?.profileImage || currentUser?.avatar || '/images/avatars/1.png',
        isOnline: true,
        lastSeen: new Date().toISOString(),
        level: 1
      },
      timestamp: new Date().toISOString(),
      isRead: false
    }
    
    // Add optimistic message immediately
    setMessages(prev => {
      if (prev.some(m => m.tempId === tempId)) {
        return prev
      }
      return [...prev, optimisticMessage]
    })
    
    // Send via socket or HTTP
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', {
        roomId: parseInt(roomId),
        content: club.name,
        type: 'club',
        clubMeetingId: club.id
      })
    } else {
      // HTTP fallback
      try {
        const authToken = getAuthToken()
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          },
          body: JSON.stringify({
            roomId: parseInt(roomId),
            content: club.name,
            type: 'club',
            clubMeetingId: club.id
          })
        })
        
        if (!response.ok) throw new Error('Failed to send message')
        const data = await response.json()
        
        // Replace optimistic message with real one
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.tempId !== tempId && msg.id !== data.message.id)
          return [...filtered, { ...data.message, tempId: undefined }].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })
      } catch (err) {
        // Remove optimistic message on error
        setMessages(prev => {
          const filtered = prev.filter(msg => msg.tempId !== tempId)
          return filtered.sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
        })
        setError(err instanceof Error ? err.message : 'Failed to send message')
      }
    }
  }, [currentUser])

  // Block user
  const blockUser = useCallback(async (userId: string) => {
    try {
      const authToken = getAuthToken()
      const response = await fetch('/api/chat/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({ userId: parseInt(userId) })
      })

      if (!response.ok) throw new Error('Failed to block user')
      
      // Refresh rooms to get updated block status (rooms API now includes blocked status)
      fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block user')
    }
  }, [])

  // Unblock user
  const unblockUser = useCallback(async (userId: string) => {
    try {
      const authToken = getAuthToken()
      const response = await fetch(`/api/chat/block?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      })

      if (!response.ok) throw new Error('Failed to unblock user')
      
      // Refresh rooms to get updated block status
      fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock user')
    }
  }, [])

  // Check if user is blocked
  const checkBlockStatus = useCallback(async (userId: string): Promise<{ isBlocked: boolean; blockedBy?: number }> => {
    try {
      const authToken = getAuthToken()
      const response = await fetch(`/api/chat/block?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      })

      if (!response.ok) return { isBlocked: false }
      
      const data = await response.json()
      return {
        isBlocked: data.isBlocked || false,
        blockedBy: data.blockedBy || undefined
      }
    } catch (err) {
      return { isBlocked: false }
    }
  }, [])

  // Leave chat
  const leaveChat = useCallback(async (roomId: string) => {
    try {
      const authToken = getAuthToken()
      const response = await fetch(`/api/chat/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
      })

      if (!response.ok) throw new Error('Failed to leave chat')
      
      // Remove room from list
      setRooms(prev => prev.filter(room => room.id !== roomId))
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null)
        setMessages([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave chat')
    }
  }, [currentRoom])

  // Kick users from group
  const kickUsers = useCallback(async (roomId: string, userIds: string[]) => {
    try {
      const authToken = getAuthToken()
      const response = await fetch(`/api/chat/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({ userIds: userIds.map(id => parseInt(id)) })
      })

      if (!response.ok) throw new Error('Failed to kick users')
      
      // Refresh rooms to get updated member list
      fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to kick users')
    }
  }, [fetchRooms])

  useEffect(() => {
    // Only fetch rooms once when the hook is first initialized
    if (!hasInitialized.current) {
      hasInitialized.current = true
      fetchRooms()
    }
  }, [fetchRooms])

  // Periodically refresh rooms to catch any missed updates (fallback for when socket fails)
  useEffect(() => {
    // Always set up the interval, check socket inside
    const interval = setInterval(() => {
      // Refresh rooms every 60 seconds as fallback (only if socket is disconnected)
      if (!socketRef.current?.connected) {
        fetchRooms()
      }
    }, 60000) // Refresh every 60 seconds as fallback
    
    return () => clearInterval(interval)
  }, [fetchRooms])

  return {
    rooms,
    currentRoom,
    messages,
    loading,
    error,
    setCurrentRoom,
    fetchMessages,
    sendMessage,
    sendAttachment,
    sendClubLink,
    blockUser,
    unblockUser,
    checkBlockStatus,
    leaveChat,
    kickUsers,
    clearError: () => setError(null),
    refreshRooms: () => {
      hasInitialized.current = false
      fetchRooms()
    },
    refreshMessages: (roomId: string, type: 'user' | 'group') => {
      lastFetchedRoom.current = null
      fetchMessages(roomId, type)
    }
  }
}
