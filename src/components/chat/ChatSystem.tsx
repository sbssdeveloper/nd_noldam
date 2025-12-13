'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
  Checkbox,
  Chip,
  Paper
} from '@mui/material'
import { ChatRoom, ChatMessage, ChatUser, ChatGroup } from '@/services/types/frontend/chat'
import { useChat } from './useChat'
import { useChat as useChatContext } from '@/components/layout/ChatContext'
import { getTokenFromStore } from '@/utils/api'
import { useAppSelector } from '@/store/hooks'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { getCommunityBadgeDisplay } from '@/utils/badgeUtils'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface ChatSystemProps {
  isOpen: boolean
  onViewChange?: (view: 'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'kick-select' | 'club-select' | 'search' | 'club-host-chat' | 'club-host-options' | 'hidden-requests') => void
  onSearchClick?: () => void // Callback for footer search icon click
  initialRoomId?: string | null // Room ID from URL query params
  initialRoomType?: 'user' | 'group' | null // Room type from URL query params
}

const ChatSystem: React.FC<ChatSystemProps> = ({ isOpen, onViewChange, initialRoomId, initialRoomType }) => {
  // Get current user from auth state
  const authState = useAppSelector((state: any) => (state as any).authReducer || {})
  const { user: currentUser, isAuthenticated, token: authTokenFromStore } = authState
  const router = useRouter()
  const { navigate } = useNavigation()
  const { setHasMessages } = useChatContext()

  // Use chat hook
  const {
    rooms,
    currentRoom,
    messages,
    loading,
    error,
    setCurrentRoom,
    fetchMessages,
    sendMessage,
    // Newly added actions
    sendAttachment,
    sendClubLink,
    blockUser,
    unblockUser,
    checkBlockStatus,
    leaveChat,
    kickUsers,
    refreshRooms
  } = useChat()
  useEffect(() => {
    const hasAnyMessages = rooms.some(room => !!room.lastMessage)
    setHasMessages(hasAnyMessages)
  }, [rooms, setHasMessages])

  // Local state
  const [currentView, setCurrentView] = useState<'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'kick-select' | 'club-select' | 'search' | 'club-host-chat' | 'club-host-options' | 'hidden-requests'>('main')
  const [searchInput, setSearchInput] = useState('') // Input value (not debounced)
  const [searchQuery, setSearchQuery] = useState('') // Actual search query (debounced)
  const [searchLoading, setSearchLoading] = useState(false)

  // Debounce search input
  const debouncedSearchQuery = useDebounce(searchInput, 500)
  const [searchResults, setSearchResults] = useState<{
    messages: Array<{
      id: string
      sender: string
      type: 'user' | 'club'
      participants?: number
      preview: string
      timestamp: string
      highlightedText?: string
      roomId?: string
      messageId?: string
    }>
    chats: Array<{
      id: string
      name: string
      type: 'user' | 'club'
      participants?: number
      preview: string
      timestamp: string
      highlightedText?: string
      roomId?: string
    }>
  }>({
    messages: [],
    chats: []
  })
  const [displayedMessagesCount, setDisplayedMessagesCount] = useState(3)
  const [displayedIndividualChatsCount, setDisplayedIndividualChatsCount] = useState(3)
  const [displayedGroupChatsCount, setDisplayedGroupChatsCount] = useState(3)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [hasMoreIndividualChats, setHasMoreIndividualChats] = useState(false)
  const [hasMoreGroupChats, setHasMoreGroupChats] = useState(false)
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false)
  const [loadingMoreIndividualChats, setLoadingMoreIndividualChats] = useState(false)
  const [loadingMoreGroupChats, setLoadingMoreGroupChats] = useState(false)
  const [showFileOptions, setShowFileOptions] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showKickConfirm, setShowKickConfirm] = useState(false)
  const [showClubHostLeaveConfirm, setShowClubHostLeaveConfirm] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedClub, setSelectedClub] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [meetings, setMeetings] = useState<any[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(false)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)
  const [previousView, setPreviousView] = useState<'user-chat' | 'group-chat' | 'hidden-requests' | null>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)

  const resolveBadgeInfo = useCallback((badge: any): { image: string; label: string } | null => {
    if (!badge) return null

    // If badge already has image info
    if (typeof badge === 'object' && badge.image) {
      return {
        image: badge.image,
        label: badge.label || badge.name || badge.title || 'badge'
      }
    }

    // If badge is wrapped inside another object (e.g., { badge: {...} })
    if (badge?.badge) {
      return resolveBadgeInfo(badge.badge)
    }

    if (badge?.activeCommunityBadge) {
      return resolveBadgeInfo(badge.activeCommunityBadge)
    }

    // Strings or simple identifiers
    if (typeof badge === 'string') {
      const info = getCommunityBadgeDisplay({ name: badge })
      return info ? { image: info.image, label: info.label } : null
    }

    if (typeof badge === 'number') {
      const info = getCommunityBadgeDisplay({ id: badge })
      return info ? { image: info.image, label: info.label } : null
    }

    if (typeof badge === 'object') {
      const info = getCommunityBadgeDisplay({
        id: badge.id,
        name: badge.name,
        imageUrl: badge.imageUrl || badge.image
      })
      return info ? { image: info.image, label: info.label } : null
    }

    return null
  }, [])

  const extractBadge = useCallback((entity: any) => {
    if (!entity) return null
    if (typeof entity === 'string' || typeof entity === 'number') return entity

    const source: any = entity as any

    return (
      source.badge ??
      source.activeCommunityBadge ??
      source.communityBadge ??
      source.badgeKey ??
      source.key ??
      null
    )
  }, [])

  const renderBadgeIcon = useCallback(
    (badge: any, size: number = 14) => {
      const badgeInfo = resolveBadgeInfo(badge)
      const image = badgeInfo?.image || '/images/custom/yellow-verified-badge.png'
      if (!image) return null
      return (
        <img
          src={image}
          alt={badgeInfo?.label || 'badge'}
          width={size}
          height={size}
        />
      )
    },
    [resolveBadgeInfo]
  )

  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>()
    return messages.filter((message: ChatMessage) => {
      const key = message.id !== undefined && message.id !== null
        ? String(message.id)
        : message.tempId || `${message.timestamp}-${message.content}`

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
  }, [messages])
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null)
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<{ x: number; y: number; messageId: string } | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null) // Message ID to scroll to when opening from search
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null) // Search query to highlight in messages
  const currentGroup = (currentRoom as any)?.group
  const groupMeetingId = useMemo(() => {
    const roomLevelId = (currentRoom as any)?.meetingId
    const groupLevelId = currentGroup?.meetingId ?? currentGroup?.meeting?.id
    const rawId = roomLevelId ?? groupLevelId
    if (rawId === undefined || rawId === null || rawId === '') {
      return null
    }
    return String(rawId)
  }, [currentRoom, currentGroup])
  const groupIsHost = currentGroup?.isHost
  const handleViewMeetingDetails = useCallback(() => {
    if (!groupMeetingId) {
      navigate('/meeting')
      return
    }
    if (groupIsHost) {
      navigate(`/meeting/item-detail-host/${groupMeetingId}?view=details`)
    } else {
      navigate(`/meeting/cancel-meeting-confirm?id=${groupMeetingId}`)
    }
    setCurrentView('group-chat')
  }, [groupMeetingId, groupIsHost, navigate])
  // Helpers for timestamps and formatting in message list
  const formatKoreanTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const shouldShowTimeSeparator = (prev?: ChatMessage, curr?: ChatMessage) => {
    if (!curr) return false
    if (!prev) return true
    const prevDate = new Date(prev.timestamp)
    const currDate = new Date(curr.timestamp)
    // Show separator when the calendar day changes or gap >= 60 minutes
    const isNewDay = prevDate.toDateString() !== currDate.toDateString()
    const gapMinutes = Math.abs(currDate.getTime() - prevDate.getTime()) / (1000 * 60)
    return isNewDay || gapMinutes >= 60
  }

  // Handle initial room from URL query params
  useEffect(() => {
    if (initialRoomId && initialRoomType) {
      // First, try to find the room in the rooms list
      const room = rooms.find((r: ChatRoom) => {
        const idMatch = String(r.id) === String(initialRoomId)
        const typeMatch = r.type === initialRoomType
        return idMatch && typeMatch
      })

      if (room && (!currentRoom || currentRoom.id !== room.id)) {
        setCurrentRoom(room)
        if (room.type === 'user') {
          setCurrentView('user-chat')
        } else if (room.type === 'group') {
          setCurrentView('group-chat')
        }
      } else if (!room) {
        if (!loading) {
          // Room not found in list - fetch it directly from API
          const fetchRoomDetails = async () => {
            try {
              // Try multiple methods to get token
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
                } catch {
                  /* ignore */
                }
              }

              if (!authToken) {
                return
              }

              const response = await fetch(`/api/chat/rooms/${initialRoomId}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`
                }
              })

              if (!response.ok) {
                return
              }

              const data = await response.json()

              if (data.success && data.room) {
                setCurrentRoom(data.room)
                if (data.room.type === 'user') {
                  setCurrentView('user-chat')
                } else if (data.room.type === 'group') {
                  setCurrentView('group-chat')
                }
              }
            } catch {
              /* ignore */
            }
          }

          fetchRoomDetails()

          // Also set the view immediately so user sees loading state
          if (initialRoomType === 'user') {
            setCurrentView('user-chat')
          } else if (initialRoomType === 'group') {
            setCurrentView('group-chat')
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoomId, initialRoomType, rooms.length, currentRoom?.id, loading])

  useEffect(() => {
    // Only fetch messages when chat is open and we have a current room
    // Only refetch if room ID actually changed (not just room object reference)
    if (isOpen && currentRoom?.id && currentRoom?.type) {
      fetchMessages(currentRoom.id, currentRoom.type)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentRoom?.id, currentRoom?.type]) // fetchMessages is stable, no need in deps

  // Auto-scroll to bottom when messages change or room changes (unless scrolling to specific message)
  useEffect(() => {
    if (messages.length > 0 && (currentView === 'user-chat' || currentView === 'group-chat')) {
      // If we have a specific message to scroll to, scroll to that instead
      if (scrollToMessageId) {
        setTimeout(() => {
          const messageElement = document.querySelector(`[data-message-id="${scrollToMessageId}"]`)
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Highlight the message briefly
            const boxElement = messageElement as HTMLElement
            boxElement.style.backgroundColor = '#fef3c7' // Yellow highlight
            boxElement.style.transition = 'background-color 0.3s ease'
            setTimeout(() => {
              boxElement.style.backgroundColor = ''
              setTimeout(() => {
                boxElement.style.transition = ''
              }, 300)
            }, 2000)
            // Clear the scroll target
            setScrollToMessageId(null)
          } else {
            // Message not found yet, try scrolling to bottom as fallback
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            setScrollToMessageId(null)
          }
        }, 300) // Longer delay to ensure messages are rendered
      } else {
        // No specific message to scroll to, scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }
  }, [messages, currentView, currentRoom?.id, scrollToMessageId])

  // Scroll to bottom when opening a chat
  useEffect(() => {
    if (currentRoom && (currentView === 'user-chat' || currentView === 'group-chat')) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      }, 200)
    }
  }, [currentRoom?.id, currentView])

  // Notify parent when the view changes so it can toggle bottom UI
  useEffect(() => {
    onViewChange?.(currentView)
  }, [currentView, onViewChange])

  // Load default search results when search page opens
  const loadDefaultSearchResults = useCallback(async () => {
    setSearchLoading(true)
    setDisplayedMessagesCount(3)
    setDisplayedIndividualChatsCount(3)
    setDisplayedGroupChatsCount(3)
    try {
      // Try to get token from Redux store first, then fallback to localStorage
      const authToken = authTokenFromStore || getTokenFromStore()
      if (!authToken) {
        setSearchResults({ messages: [], chats: [] })
        setHasMoreMessages(false)
        setHasMoreIndividualChats(false)
        setHasMoreGroupChats(false)
        setSearchLoading(false)
        return
      }

      // Fetch default/recent results (no query) - fetch more than 3 to check if there are more
      const response = await fetch('/api/chat/search?limit=50', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load default results')
      }

      const data = await response.json()
      if (data.success) {
        const messages = data.messages || []
        const chats = data.chats || []
        setSearchResults({ messages, chats })
        setHasMoreMessages(messages.length > 3)

        // Separate individual and group chats
        const individualChats = chats.filter((chat: any) => chat.type === 'user')
        const groupChats = chats.filter((chat: any) => chat.type === 'club')
        setHasMoreIndividualChats(individualChats.length > 3)
        setHasMoreGroupChats(groupChats.length > 3)
      } else {
        setSearchResults({ messages: [], chats: [] })
        setHasMoreMessages(false)
        setHasMoreIndividualChats(false)
        setHasMoreGroupChats(false)
      }
    } catch (error) {
      setSearchResults({ messages: [], chats: [] })
      setHasMoreMessages(false)
      setHasMoreIndividualChats(false)
      setHasMoreGroupChats(false)
    } finally {
      setSearchLoading(false)
    }
  }, [authTokenFromStore])

  // Handle search view opening from footer - removed to prevent duplicate API calls
  // The debounced query useEffect will handle loading default results when search view opens
  // useEffect(() => {
  //   if (currentView === 'search') {
  //     loadDefaultSearchResults()
  //   }
  // }, [currentView, loadDefaultSearchResults])

  // Function to fetch user's meetings
  const fetchMeetings = useCallback(async () => {
    if (!isAuthenticated || !currentUser?.id) {
      setMeetingsError('Authentication required')
      return
    }

    setMeetingsLoading(true)
    setMeetingsError(null)

    try {
      // Try multiple methods to get token (same as chat system)
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

      if (!authToken) {
        setMeetingsError('Authentication token not found')
        setMeetingsLoading(false)
        return
      }

      const response = await fetch(`/api/users/meetings?type=all`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch meetings: ${response.status}`)
      }

      const data = await response.json()
      const fetchedMeetings = data.data?.meetings || data.meetings || []

      // Filter only approved meetings (exclude draft, pending, reject)
      const approvedMeetings = fetchedMeetings.filter((meeting: any) =>
        meeting.status === 'approved' || meeting.status === 'completed'
      )

      setMeetings(approvedMeetings)
    } catch (err) {
      setMeetingsError(err instanceof Error ? err.message : 'Failed to fetch meetings')
    } finally {
      setMeetingsLoading(false)
    }
  }, [isAuthenticated, currentUser?.id, authTokenFromStore])

  // Fetch meetings when club-select view is opened
  useEffect(() => {
    if (currentView === 'club-select' && isAuthenticated && currentUser?.id) {
      fetchMeetings()
    }
  }, [currentView, isAuthenticated, currentUser?.id, fetchMeetings])

  // Handle case where chat view is active but currentRoom is missing
  useEffect(() => {
    if (currentView === 'user-chat' && !currentRoom?.user && !initialRoomId) {
      // If we're on user-chat but don't have a valid room, go back to main
      setCurrentView('main')
      setCurrentRoom(null) // CRITICAL FIX: Clear currentRoom when going back to main
    } else if (currentView === 'group-chat' && !currentRoom?.group && !initialRoomId) {
      // If we're on group-chat but don't have a valid room, go back to main
      setCurrentView('main')
      setCurrentRoom(null) // CRITICAL FIX: Clear currentRoom when going back to main
    } else if (currentView === 'main' && currentRoom) {
      // CRITICAL FIX: Clear currentRoom when view is 'main' to ensure unread counts work correctly
      // This is a safety check in case currentRoom wasn't cleared elsewhere
      setCurrentRoom(null)
    }
  }, [currentView, currentRoom, initialRoomId])

  // Format date in Korean format: "2025년 05월 14일에 진행"
  const formatMeetingDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}년 ${month}월 ${day}일에 진행`
    } catch (error) {
      return '날짜 미정'
    }
  }

  // Format meeting time with date and time: "6월 12일 월요일 15:45분"
  const formatMeetingTime = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
      const weekday = weekdays[date.getDay()]
      return `${month}월 ${day}일 ${weekday} ${hours}:${minutes}분`
    } catch (error) {
      return ''
    }
  }

  // Strip HTML tags from text to display plain text only (SSR-safe)
  const stripHtmlTags = (html: string): string => {
    if (!html) return '설명 없음'

    // Remove HTML tags using regex (works on both client and server)
    let text = html
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim()

    // Limit description length for preview
    if (text.length > 100) {
      text = text.substring(0, 100) + '...'
    }

    return text || '설명 없음'
  }

  // Highlight search query in text (returns JSX with highlighted portions)
  const highlightText = (text: string, query: string | null): React.ReactNode => {
    // Handle null/undefined/empty cases
    if (!text || typeof text !== 'string') {
      return text || ''
    }

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return text
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return text
    }

    const lowerText = text.toLowerCase()
    const lowerQuery = trimmedQuery.toLowerCase()
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let currentIndex = lowerText.indexOf(lowerQuery, lastIndex)
    let matchCount = 0

    // Find all occurrences of the query
    while (currentIndex !== -1) {
      // Add text before the match
      if (currentIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, currentIndex)
        if (beforeText) {
          parts.push(beforeText)
        }
      }
      // Add the highlighted match (preserve original case)
      const match = text.substring(currentIndex, currentIndex + trimmedQuery.length)
      if (match) {
        parts.push(
          <span key={`highlight-${currentIndex}-${matchCount}`} className="bg-yellow-300 font-medium">{match}</span>
        )
      }
      lastIndex = currentIndex + trimmedQuery.length
      currentIndex = lowerText.indexOf(lowerQuery, lastIndex)
      matchCount++
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText) {
        parts.push(remainingText)
      }
    }

    // If no matches found, return original text
    if (parts.length === 0) {
      return text
    }

    // Filter out any empty or invalid parts
    const validParts = parts.filter(part => part !== null && part !== undefined && part !== '')

    // If no valid parts after filtering, return original text
    if (validParts.length === 0) {
      return text
    }

    // Return fragment with all valid parts
    return <>{validParts}</>
  }

  // Highlight search query in preview text with blue color (matching name highlight style)
  const highlightPreviewText = (text: string, query: string | null): React.ReactNode => {
    // Handle null/undefined/empty cases
    if (!text || typeof text !== 'string') {
      return text || ''
    }

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return text
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return text
    }

    const lowerText = text.toLowerCase()
    const lowerQuery = trimmedQuery.toLowerCase()
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let currentIndex = lowerText.indexOf(lowerQuery, lastIndex)
    let matchCount = 0

    // Find all occurrences of the query
    while (currentIndex !== -1) {
      // Add text before the match
      if (currentIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, currentIndex)
        if (beforeText) {
          parts.push(beforeText)
        }
      }
      // Add the highlighted match (preserve original case) with blue color
      const match = text.substring(currentIndex, currentIndex + trimmedQuery.length)
      if (match) {
        parts.push(
          <span key={`preview-highlight-${currentIndex}-${matchCount}`} className="text-[#007AFF] font-medium">{match}</span>
        )
      }
      lastIndex = currentIndex + trimmedQuery.length
      currentIndex = lowerText.indexOf(lowerQuery, lastIndex)
      matchCount++
    }

    // Add remaining text after last match
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex)
      if (remainingText) {
        parts.push(remainingText)
      }
    }

    // If no matches found, return original text
    if (parts.length === 0) {
      return text
    }

    // Filter out any empty or invalid parts
    const validParts = parts.filter(part => part !== null && part !== undefined && part !== '')

    // If no valid parts after filtering, return original text
    if (validParts.length === 0) {
      return text
    }

    // Return fragment with all valid parts
    return <>{validParts}</>
  }

  // Close file options popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showFileOptions) {
        const target = event.target as Element
        if (!target.closest('.file-options-popover') && !target.closest('.plus-button')) {
          setShowFileOptions(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFileOptions])

  // Helper functions
  const formatTime = (timestamp: string) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return ''
    }

    const now = new Date()

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.floor((startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }

    if (diffDays === 1) {
      return '어제'
    }

    if (diffDays < 7) {
      return `${diffDays}일 전`
    }

    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  // Ref to store latest performSearch function
  const performSearchRef = useRef<((query: string) => Promise<void>) | null>(null)

  // Search function - performs actual API call
  const performSearch = useCallback(async (query: string) => {
    setDisplayedMessagesCount(3)
    setDisplayedIndividualChatsCount(3)
    setDisplayedGroupChatsCount(3)

    if (!query.trim()) {
      // Don't call API when query is empty - just clear results
      setSearchResults({ messages: [], chats: [] })
      setHasMoreMessages(false)
      setHasMoreIndividualChats(false)
      setHasMoreGroupChats(false)
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    try {
      // Try to get token from Redux store first, then fallback to localStorage
      const tokenFromStore = authTokenFromStore
      const tokenFromLocalStorage = getTokenFromStore()
      const authToken = tokenFromStore || tokenFromLocalStorage

      if (!authToken) {
        setSearchResults({ messages: [], chats: [] })
        setHasMoreMessages(false)
        setHasMoreIndividualChats(false)
        setHasMoreGroupChats(false)
        setSearchLoading(false)
        return
      }

      // Determine if we're searching within a specific room or across all chats
      const roomId = currentRoom?.id || null

      // Build search URL - fetch more than 3 to check if there are more
      const searchUrl = new URL('/api/chat/search', window.location.origin)
      searchUrl.searchParams.set('q', query.trim())
      if (roomId && (currentView === 'user-chat' || currentView === 'group-chat')) {
        searchUrl.searchParams.set('roomId', String(roomId))
      }
      searchUrl.searchParams.set('limit', '50')

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to search: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Highlight search query in results (case-insensitive)
        const highlightText = (text: string, query: string) => {
          if (!query.trim()) return undefined
          const lowerText = text.toLowerCase()
          const lowerQuery = query.toLowerCase()
          const index = lowerText.indexOf(lowerQuery)
          if (index === -1) return undefined
          // Return the actual matched text (case-preserved from original)
          return text.substring(index, index + query.length)
        }

        const highlightedMessages = data.messages?.map((msg: any) => ({
          ...msg,
          highlightedText: highlightText(msg.preview, query)
        })) || []

        const highlightedChats = data.chats?.map((chat: any) => ({
          ...chat,
          highlightedText: highlightText(chat.name, query)
        })) || []

        setSearchResults({
          messages: highlightedMessages,
          chats: highlightedChats
        })
        setHasMoreMessages(highlightedMessages.length > 3)

        // Separate individual and group chats
        const individualChats = highlightedChats.filter((chat: any) => chat.type === 'user')
        const groupChats = highlightedChats.filter((chat: any) => chat.type === 'club')
        setHasMoreIndividualChats(individualChats.length > 3)
        setHasMoreGroupChats(groupChats.length > 3)
      } else {
        setSearchResults({ messages: [], chats: [] })
        setHasMoreMessages(false)
        setHasMoreIndividualChats(false)
        setHasMoreGroupChats(false)
      }
    } catch (error) {
      setSearchResults({ messages: [], chats: [] })
      setHasMoreMessages(false)
      setHasMoreIndividualChats(false)
      setHasMoreGroupChats(false)
    } finally {
      setSearchLoading(false)
    }
  }, [currentRoom, currentView, loadDefaultSearchResults, authTokenFromStore])

  // Update ref whenever performSearch changes
  useEffect(() => {
    performSearchRef.current = performSearch
  }, [performSearch])

  // Handle input change - updates input state immediately
  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  // Trigger search when debounced query changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery)
    if (currentView === 'search') {
      // Only trigger search if there's a query (non-empty)
      if (debouncedSearchQuery.trim()) {
        if (performSearchRef.current) {
          performSearchRef.current(debouncedSearchQuery)
        }
      } else {
        // Clear results when query is empty
        setSearchResults({ messages: [], chats: [] })
        setHasMoreMessages(false)
        setHasMoreIndividualChats(false)
        setHasMoreGroupChats(false)
        setSearchLoading(false)
      }
    }
  }, [debouncedSearchQuery, currentView, authTokenFromStore])

  // Load more messages
  const handleLoadMoreMessages = () => {
    setLoadingMoreMessages(true)
    setTimeout(() => {
      setDisplayedMessagesCount(prev => {
        const newCount = prev + 3
        setHasMoreMessages(searchResults.messages.length > newCount)
        return newCount
      })
      setLoadingMoreMessages(false)
    }, 300)
  }

  // Load more individual chats
  const handleLoadMoreIndividualChats = () => {
    setLoadingMoreIndividualChats(true)
    setTimeout(() => {
      setDisplayedIndividualChatsCount(prev => {
        const newCount = prev + 3
        const individualChats = searchResults.chats.filter((chat: any) => chat.type === 'user')
        setHasMoreIndividualChats(individualChats.length > newCount)
        return newCount
      })
      setLoadingMoreIndividualChats(false)
    }, 300)
  }

  // Load more group chats
  const handleLoadMoreGroupChats = () => {
    setLoadingMoreGroupChats(true)
    setTimeout(() => {
      setDisplayedGroupChatsCount(prev => {
        const newCount = prev + 3
        const groupChats = searchResults.chats.filter((chat: any) => chat.type === 'club')
        setHasMoreGroupChats(groupChats.length > newCount)
        return newCount
      })
      setLoadingMoreGroupChats(false)
    }, 300)
  }

  // Function to open search view
  const openSearchView = () => {
    setSearchInput('') // Clear search input
    setSearchQuery('') // Clear search query
    setCurrentView('search')
    // Don't load default results immediately - wait for user to type or useEffect will handle it
    // loadDefaultSearchResults() // Removed to prevent duplicate API calls
  }

  // Handle clicking on a search result message
  const handleSearchMessageClick = (message: { roomId?: string; type?: 'user' | 'club'; messageId?: string }) => {
    if (!message.roomId) return

    // Store the messageId to scroll to after opening the chat
    if (message.messageId) {
      setScrollToMessageId(message.messageId)
    }

    // Store the search query to highlight matching text in messages
    if (searchQuery.trim()) {
      setActiveSearchQuery(searchQuery.trim())
    }

    // Find the room in the rooms list
    const room = rooms.find(r => r.id === message.roomId)
    if (room) {
      setCurrentRoom(room)
      if (room.type === 'user') {
        setCurrentView('user-chat')
      } else if (room.type === 'group') {
        setCurrentView('group-chat')
      }
    } else {
      // Room not in list, fetch it directly
      const fetchRoomAndOpen = async () => {
        try {
          const authToken = authTokenFromStore || getTokenFromStore()
          if (!authToken) return

          const response = await fetch(`/api/chat/rooms/${message.roomId}`, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.room) {
              setCurrentRoom(data.room)
              if (data.room.type === 'user') {
                setCurrentView('user-chat')
              } else if (data.room.type === 'group') {
                setCurrentView('group-chat')
              }
              // Refresh rooms list to include this room
              refreshRooms()
            }
          }
        } catch {
          /* ignore */
        }
      }
      fetchRoomAndOpen()
    }
  }

  // Handle clicking on a search result chat
  const handleSearchChatClick = (chat: { roomId?: string; type?: 'user' | 'club' }) => {
    handleSearchMessageClick(chat) // Same logic as message click
  }

  // TODO: Uncomment this when you want real time formatting
  // const date = new Date(timestamp)
  // const now = new Date()
  // const diff = now.getTime() - date.getTime()
  // const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  // if (days === 0) {
  //   return '오늘'
  // } else if (days === 1) {
  //   return '어제'
  // } else {
  //   return `${days}일 전`
  // }

  const handleRoomClick = (room: ChatRoom) => {
    setCurrentRoom(room)
    // Store previous view if coming from hidden requests
    if (currentView === 'hidden-requests') {
      setPreviousView('hidden-requests') // Remember we came from hidden requests
    } else if (currentView === 'user-chat' || currentView === 'group-chat') {
      // If already in a chat, keep the previous view
      setPreviousView(previousView || currentView)
    }
    if (room.type === 'user') {
      setCurrentView('user-chat')
    } else {
      setCurrentView('group-chat')
    }
  }



  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentRoom) return

    // Check if blocked
    if (blockStatus.isBlocked) {
      alert('이 사용자는 차단되어 있어 메시지를 보낼 수 없습니다.')
      return
    }

    sendMessage(newMessage, currentRoom.id)
    setNewMessage('')
    // Scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Message action handlers
  const copyTextToClipboard = async (text: string) => {
    if (!text) {
      return false
    }

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch {
        // fall back below
      }
    }

    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.setAttribute('readonly', '')
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      return false
    }
  }

  const handleCopyMessage = (message: ChatMessage) => {
    if (message.content) {
      copyTextToClipboard(message.content).finally(() => {
        setMessageMenuAnchor(null)
      })
    }
  }

  const handleShareMessage = async (message: ChatMessage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Message',
          text: message.content || 'Shared from chat'
        })
        setMessageMenuAnchor(null)
      } catch {
        /* ignore */
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyMessage(message)
    }
  }

  const handleDeleteMessage = async (message: ChatMessage) => {
    if (!currentRoom || !message.id) {
      return
    }

    try {
      const authToken = getTokenFromStore()
      if (!authToken) {
        alert('Authentication required. Please log in.')
        return
      }

      // Ensure message ID is a string (API will parse it to number)
      const messageId = String(message.id)

      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        // Refresh messages to show deleted state (message will show as '[삭제된 메시지]')
        if (currentRoom?.id && currentRoom?.type) {
          await fetchMessages(currentRoom.id, currentRoom.type)
        }
        setMessageMenuAnchor(null)
        // Clear selection after successful deletion
        setSelectedMessage(null)
        setSelectedMessages(new Set())
      } else {
        // Handle error - show alert or log
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete message' }))
        alert(errorData.error || `Failed to delete message (${response.status})`)
      }
    } catch (err) {
      alert('Failed to delete message. Please try again.')
    }
  }

  const handleMessageClick = (e: React.MouseEvent, message: ChatMessage) => {
    e.preventDefault()
    e.stopPropagation()

    // If selection mode is active, toggle message selection with checkbox
    if (isSelectionMode) {
      setSelectedMessages(prev => {
        const newSet = new Set(prev)
        if (newSet.has(message.id)) {
          newSet.delete(message.id)
          // Also clear selectedMessage if it's this message
          if (selectedMessage?.id === message.id) {
            setSelectedMessage(null)
          }
        } else {
          newSet.add(message.id)
        }
        return newSet
      })
    } else {
      // Normal mode: allow multiple message selection (flexibility)
      // Toggle selection - if already selected, deselect it; otherwise, select it
      const currentlySelected = new Set(selectedMessages)
      const isCurrentlySelected = currentlySelected.has(message.id)

      if (isCurrentlySelected) {
        // Deselect this message
        currentlySelected.delete(message.id)
        setSelectedMessages(currentlySelected)

        // If this was the last selected message, clear selectedMessage too
        if (currentlySelected.size === 0) {
          setSelectedMessage(null)
          setMessageMenuAnchor(null)
        } else if (selectedMessage?.id === message.id) {
          // If we deselected the current selectedMessage, set it to the first remaining one
          const firstRemaining = Array.from(currentlySelected)[0]
          const firstMsg = messages.find(m => m.id === firstRemaining)
          if (firstMsg) {
            setSelectedMessage(firstMsg)
          }
        }
      } else {
        // Select this message - add to set and update selectedMessage
        currentlySelected.add(message.id)
        setSelectedMessages(currentlySelected)
        setSelectedMessage(message)
        setMessageMenuAnchor(null)
      }
    }
  }

  const handleCloseMessageMenu = () => {
    setMessageMenuAnchor(null)
    setSelectedMessage(null)
  }

  const handleLongPress = (e: React.MouseEvent | React.TouchEvent, message: ChatMessage) => {
    // Enable selection mode on long press
    if (!isSelectionMode) {
      setIsSelectionMode(true)
      setSelectedMessages(new Set([message.id]))
    }
  }

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false)
    setSelectedMessages(new Set())
  }

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessages.size === 0 || !currentRoom) {
      return
    }

    // Check if user can delete these messages
    const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid
    const isGroupChat = currentRoom.type === 'group'
    const isAdmin = isGroupChat && currentRoom.group?.isHost

    try {
      const authToken = getTokenFromStore()
      if (!authToken) {
        alert('Authentication required. Please log in.')
        return
      }

      // Delete messages in batch (up to 10)
      const messageIds = Array.from(selectedMessages).slice(0, 10)

      // For each message, verify user can delete it
      const deletePromises = messageIds.map(async (messageId) => {
        // Find the message to check ownership
        const message = messages.find(m => m.id === messageId)
        if (!message) {
          return null
        }

        const messageSenderId = message.sender.id
        const isOwner = String(messageSenderId) === String(currentUserId) || messageSenderId === 'currentUser'

        // Group: admin can delete any, member can only delete own
        // Individual: user can only delete own
        const canDelete = isGroupChat
          ? (isAdmin || isOwner)  // Group: admin OR owner
          : isOwner              // Individual: only owner

        if (!canDelete) {
          return null
        }

        // Delete the message - ensure messageId is a string
        const msgIdStr = String(messageId)

        const response = await fetch(`/api/chat/messages/${msgIdStr}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        })

        if (response.ok) {
          return messageId
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          return null
        }
      })

      const deletedIds = (await Promise.all(deletePromises)).filter(id => id !== null)

      if (deletedIds.length > 0) {
        // Refresh messages to show deleted state (messages will show as '[삭제된 메시지]')
        if (currentRoom?.id && currentRoom?.type) {
          await fetchMessages(currentRoom.id, currentRoom.type)
        }
      }

      // Exit selection mode and clear selections
      setIsSelectionMode(false)
      setSelectedMessages(new Set())
      setSelectedMessage(null)
    } catch (err) {
      alert('Failed to delete messages. Please try again.')
    }
  }

  // File/image pickers and club link helpers
  const triggerImagePicker = () => imageInputRef.current?.click()
  const triggerFilePicker = () => fileInputRef.current?.click()

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && currentRoom) {
      sendAttachment(file, 'image', currentRoom.id)
      setShowFileOptions(false)
      e.target.value = ''
    }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && currentRoom) {
      sendAttachment(file, 'file', currentRoom.id)
      setShowFileOptions(false)
      e.target.value = ''
    }
  }

  const handleSendClubLink = () => {
    setShowFileOptions(false)
    // Store the current view before switching to club-select
    if (currentView === 'user-chat' || currentView === 'group-chat') {
      setPreviousView(currentView)
    }
    setCurrentView('club-select')
  }

  const [blockStatus, setBlockStatus] = useState<{ isBlocked: boolean; blockedBy?: number }>({ isBlocked: false })

  // Check block status when room changes
  useEffect(() => {
    const checkStatus = async () => {
      if (currentRoom?.user && checkBlockStatus) {
        const status = await checkBlockStatus(currentRoom.user.id)
        setBlockStatus(status)
      } else {
        setBlockStatus({ isBlocked: false })
      }
    }
    checkStatus()
  }, [currentRoom?.user?.id, checkBlockStatus])

  const handleBlockUser = async () => {
    if (currentRoom?.user) {
      await blockUser(currentRoom.user.id)
      setShowBlockConfirm(false)
      // Don't navigate away - keep chat visible
      setBlockStatus({ isBlocked: true })
    }
  }

  const handleUnblockUser = async () => {
    if (currentRoom?.user) {
      await unblockUser(currentRoom.user.id)
      setBlockStatus({ isBlocked: false })
    }
  }

  const handleLeaveChat = async () => {
    if (!currentRoom?.id) {
      alert('채팅방을 찾을 수 없습니다.')
      return
    }

    try {
      // Try multiple methods to get token (same pattern as elsewhere in the file)
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
        } catch {
          /* ignore */
        }
      }

      if (!authToken) {
        alert('인증이 필요합니다. 다시 로그인해주세요.')
        return
      }

      // First, clear all messages in the room
      const clearResponse = await fetch(`/api/chat/messages/clear?roomId=${currentRoom.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!clearResponse.ok) {
        // Check if it's an authentication error
        if (clearResponse.status === 401) {
          alert('인증이 필요합니다. 다시 로그인해주세요.')
          return
        }
        const errorData = await clearResponse.json().catch(() => ({ error: 'Failed to clear chat' }))
        alert(errorData.error || '채팅 삭제에 실패했습니다.')
        return
      }

      // Then leave the chat room (this will also clear messages from local state)
      await leaveChat(currentRoom.id)
      setShowLeaveConfirm(false)
      setCurrentView('main')
      setCurrentRoom(null) // CRITICAL FIX: Clear currentRoom when leaving chat

      // Refresh rooms list
      await refreshRooms()
    } catch (err) {
      alert('채팅방 나가기 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  // Download handler for images and files
  const handleDownload = async (url: string, fileName: string, type: 'image' | 'file') => {
    try {
      // Try multiple methods to get token
      let authToken = authTokenFromStore || getTokenFromStore()

      if (!authToken && typeof window !== 'undefined') {
        try {
          const persistData = localStorage.getItem('persist:noldam-root')
          if (persistData) {
            const parsed = JSON.parse(persistData)
            if (parsed.authReducer) {
              const authReducer = typeof parsed.authReducer === 'string'
                ? JSON.parse(parsed.authReducer)
                : parsed.authReducer
              authToken = authReducer.token || null
            }
            if (!authToken && parsed.auth) {
              const authData = typeof parsed.auth === 'string'
                ? JSON.parse(parsed.auth)
                : parsed.auth
              authToken = authData.token || null
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Fetch the file with authentication if token is available
      const response = await fetch(url, {
        headers: authToken ? {
          'Authorization': `Bearer ${authToken}`
        } : {}
      })

      if (!response.ok) {
        throw new Error('Failed to download file')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // Set appropriate file name
      if (fileName) {
        link.download = fileName
      } else if (type === 'image') {
        // Extract file extension from URL or use default
        const urlExtension = url.split('.').pop()?.split('?')[0] || 'jpg'
        link.download = `image_${Date.now()}.${urlExtension}`
      } else {
        link.download = `file_${Date.now()}`
      }

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      alert('파일 다운로드에 실패했습니다.')
    }
  }

  const handleKickUsers = async () => {
    if (currentRoom && selectedUsers.length > 0) {
      await kickUsers(currentRoom.id, selectedUsers)
      setShowKickConfirm(false)
      setCurrentView('group-chat')
      setSelectedUsers([])
    }
  }

  // Unified message input UI
  const renderMessageInput = () => {
    const isBlocked = blockStatus.isBlocked
    const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid
    const blockedByMe = blockStatus.blockedBy ? String(blockStatus.blockedBy) !== String(currentUserId) : false

    return (
      <Box className="p-4 border-t border-gray-200 bg-white z-60 relative">
        {/* Blocked message banner */}
        {isBlocked && (
          <Box className="mb-3 p-3 bg-gray-100 rounded-lg text-center">
            <Typography className="text-sm text-gray-600">
              {blockedByMe
                ? '이 사용자가 당신을 차단했습니다. 메시지를 보낼 수 없습니다.'
                : '이 사용자를 차단했습니다. 메시지를 보낼 수 없습니다.'}
            </Typography>
          </Box>
        )}
        <Box className="">
          {/* Plus button */}
          <IconButton
            onClick={() => setShowFileOptions(!showFileOptions)}
            disabled={isBlocked}
            className="plus-button absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center shadow-none z-10"
            sx={{
              width: 40,
              height: 40,
              zIndex: 2,
              opacity: isBlocked ? 0.5 : 1,
              '&:hover': { backgroundColor: '#d1d5db' }
            }}
          >
            <i className="ri-add-line" />
          </IconButton>

          {/* Options popover */}
          {showFileOptions && (
            <Box className="file-options-popover absolute bottom-16 right-0 left-0" sx={{ zIndex: 1000 }}>
              {/* Panel */}
              <Box className="to-white/50 backdrop-blur-md from-transparent border-gray-100 rounded-xl overflow-hidden min-w-[240px] bg-gradient-to-b" sx={{ zIndex: 1000 }}>
                <div className="divide-y pt-8 divide-gray-200">
                  <Button size="small" className="w-full justify-start py-2 px-4" onClick={handleSendClubLink}>
                    <span className="w-10 h-10 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                      <i className="ri-team-fill" />
                    </span>
                    <span className="text-gray-800">상대방의 모임</span>
                  </Button>
                  <Button size="small" className="w-full justify-start py-2 px-4" onClick={triggerImagePicker}>
                    <span className="w-10 h-10 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                      <i className="ri-image-line" />
                    </span>
                    <span className="text-gray-800">사진</span>
                  </Button>
                  <Button size="small" className="w-full justify-start py-2 px-4" onClick={triggerFilePicker}>
                    <span className="w-10 h-10 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                      <i className="ri-folder-2-line" />
                    </span>
                    <span className="text-gray-800">파일</span>
                  </Button>
                </div>
              </Box>
            </Box>
          )}

          {/* Input pill */}
          <TextField
            fullWidth
            placeholder={isBlocked ? '차단된 사용자입니다' : '메세지 보내기...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isBlocked}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: isBlocked ? '#e5e7eb' : '#f3f4f6',
                borderRadius: '9999px',
                paddingLeft: '33px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                opacity: isBlocked ? 0.6 : 1
              },
              '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              '& .MuiInputBase-input': {
                padding: '12px 16px',
                fontSize: '0.95rem'
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#9ca3af',
                opacity: 1
              }
            }}
          />
          {/* Hidden pickers */}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelected} disabled={isBlocked} />
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} disabled={isBlocked} />
        </Box>
      </Box>
    )
  }

  // Render functions
  const renderSearchView = () => (
    <Box className="h-full flex flex-col">
      {/* Header with back button and search bar */}
      <Box className="p-4 pl-0 bg-white">
        <Box className="flex items-center gap-3">
          <IconButton
            onClick={() => {
              setSearchInput('') // Clear search input
              setSearchQuery('') // Clear search query
              setCurrentView('main')
              // CRITICAL FIX: Clear currentRoom when going back to main view
              setCurrentRoom(null)
              setActiveSearchQuery(null) // Clear search highlighting
            }}
            size="small"
          >
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>
          <TextField
            fullWidth
            placeholder="검색"
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <i className="ri-search-line text-gray-400 mr-2" />
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#f9fafb',
                borderRadius: '25px',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiInputBase-input': { padding: '12px 5px' }
              }
            }}
          />
        </Box>
      </Box>

      {/* Search Results */}
      <Box className="flex-1 bg-white overflow-y-auto">
        {searchLoading && (
          <Box className="flex items-center justify-center py-8">
            <Typography className="text-gray-500">검색 중...</Typography>
          </Box>
        )}
        {!searchLoading && (
          <>
            {/* Individual Chats Section - Only show if there are individual chats */}
            {(() => {
              const individualChats = searchResults.chats.filter((chat: any) => chat.type === 'user')
              if (individualChats.length === 0) return null

              return (
                <Box className="p-4 border-t border-gray-100">
                  <Box className="flex items-center gap-3 mb-2">
                    <Box sx={{ visibility: 'hidden' }} className="w-11 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <i className="ri-message-3-line text-gray-600" />
                    </Box>
                    <Typography variant="h6" className="font-bold text-gray-800">
                      개인 채팅 ({individualChats.length})
                    </Typography>
                  </Box>
                  <Box className="flex flex-col">
                    {individualChats.slice(0, displayedIndividualChatsCount).map((chat) => (
                      <Box
                        key={chat.id}
                        onClick={() => handleSearchChatClick(chat)}
                        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        {/* Profile Picture */}
                        <Box className="w-11 h-11 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <i className={`ri-${chat.type === 'club' ? 'group-line' : 'user-line'} text-gray-600`} />
                        </Box>

                        <Box className="flex items-start border-t py-2 border-gray-300 justify-between w-full">
                          {/* Chat Content */}
                          <Box className="flex-1 min-w-0">
                            <Box className="flex items-center gap-2">
                              <Typography className="font-bold text-[17px] text-gray-800">
                                {chat.highlightedText && searchQuery ? (
                                  <>
                                    {(() => {
                                      const query = searchQuery.trim()
                                      const text = chat.name
                                      const lowerText = text.toLowerCase()
                                      const lowerQuery = query.toLowerCase()
                                      const index = lowerText.indexOf(lowerQuery)
                                      if (index === -1) return text
                                      const before = text.substring(0, index)
                                      const match = text.substring(index, index + query.length)
                                      const after = text.substring(index + query.length)
                                      return (
                                        <>
                                          {before}
                                          <span className="text-blue-600 font-medium">{match}</span>
                                          {after}
                                        </>
                                      )
                                    })()}
                                  </>
                                ) : (
                                  chat.name
                                )}
                              </Typography>
                              {chat.type === 'user' && renderBadgeIcon(extractBadge(chat), 20)}
                              {chat.participants && (
                                <Box className="flex items-start gap-1">
                                  <i className="ri-team-fill text-gray-500 text-sm" />
                                  <Typography className="text-[11px] text-gray-500">
                                    {chat.participants}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Typography className="text-[15px] text-gray-600 line-clamp-2">
                              {searchInput ? highlightPreviewText(chat.preview, searchInput) : chat.preview}
                            </Typography>
                          </Box>

                          {/* Timestamp */}
                          <Typography className="text-[15px] text-black flex-shrink-0">
                            {/* {chat.timestamp} */}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  {hasMoreIndividualChats && (
                    <Box className="text-center mt-4">
                      <Typography
                        onClick={handleLoadMoreIndividualChats}
                        className="text-[15px] text-black font-medium cursor-pointer hover:text-blue-600"
                      >
                        {loadingMoreIndividualChats ? '로딩 중...' : '검색 결과 더 보기'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )
            })()}

            {/* Group Chats Section - Only show if there are group chats */}
            {(() => {
              const groupChats = searchResults.chats.filter((chat: any) => chat.type === 'club')
              if (groupChats.length === 0) return null

              return (
                <Box className="p-4 border-t border-gray-100">
                  <Box className="flex items-center gap-3 mb-2">
                    <Box sx={{ visibility: 'hidden' }} className="w-11 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <i className="ri-message-3-line text-gray-600" />
                    </Box>
                    <Typography variant="h6" className="font-bold text-gray-800">
                      그룹 채팅 ({groupChats.length})
                    </Typography>
                  </Box>
                  <Box className="flex flex-col">
                    {groupChats.slice(0, displayedGroupChatsCount).map((chat) => (
                      <Box
                        key={chat.id}
                        onClick={() => handleSearchChatClick(chat)}
                        className="flex items-center gap-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                      >
                        {/* Profile Picture */}
                        <Box className="w-11 h-11 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <i className={`ri-${chat.type === 'club' ? 'group-line' : 'user-line'} text-gray-600`} />
                        </Box>

                        <Box className="flex items-start border-t py-2 border-gray-300 justify-between w-full">
                          {/* Chat Content */}
                          <Box className="flex-1 min-w-0">
                            <Box className="flex items-center gap-2">
                              <Typography className="font-bold text-[17px] text-gray-800">
                                {chat.highlightedText && searchQuery ? (
                                  <>
                                    {(() => {
                                      const query = searchQuery.trim()
                                      const text = chat.name
                                      const lowerText = text.toLowerCase()
                                      const lowerQuery = query.toLowerCase()
                                      const index = lowerText.indexOf(lowerQuery)
                                      if (index === -1) return text
                                      const before = text.substring(0, index)
                                      const match = text.substring(index, index + query.length)
                                      const after = text.substring(index + query.length)
                                      return (
                                        <>
                                          {before}
                                          <span className="text-blue-600 font-medium">{match}</span>
                                          {after}
                                        </>
                                      )
                                    })()}
                                  </>
                                ) : (
                                  chat.name
                                )}
                              </Typography>
                              {chat.participants && (
                                <Box className="flex items-start gap-1">
                                  <i className="ri-team-fill text-gray-500 text-sm" />
                                  <Typography className="text-[11px] text-gray-500">
                                    {chat.participants}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                            <Typography className="text-[15px] text-gray-600 line-clamp-2">
                              {searchInput ? highlightPreviewText(chat.preview, searchInput) : chat.preview}
                            </Typography>
                          </Box>

                          {/* Timestamp */}
                          <Typography className="text-[15px] text-black flex-shrink-0">
                            {/* {chat.timestamp} */}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                  {hasMoreGroupChats && (
                    <Box className="text-center mt-4">
                      <Typography
                        onClick={handleLoadMoreGroupChats}
                        className="text-[15px] text-black font-medium cursor-pointer hover:text-blue-600"
                      >
                        {loadingMoreGroupChats ? '로딩 중...' : '검색 결과 더 보기'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )
            })()}

            {/* No Results */}
            {searchResults.chats.length === 0 && searchQuery && (
              <Box className="p-8 text-center">
                <Typography className="text-[15px] text-black">
                  검색 결과가 없습니다.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  )

  const renderMainChat = () => {
    // Separate rooms into main chats and message requests
    const mainChats = rooms.filter(room => !room.isMessageRequest)
    const messageRequests = rooms.filter(room => room.isMessageRequest)
    const messageRequestsCount = messageRequests.length
    const totalUnreadRequests = messageRequests.reduce((sum, room) => sum + (room.unreadCount || 0), 0)

    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <Typography className="font-semibold text-black text-[25px]">
            채팅
          </Typography>
        </Box>

        {/* Hidden Requests Section (Instagram-style, below header) - Always show */}
        <Box
          onClick={() => setCurrentView('hidden-requests')}
          className="px-4 py-2 border-b border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2
          }}
        >
          <Box className="flex items-center gap-2.5">
            <Box
              className="flex items-center justify-center"
              sx={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="ri-eye-off-line text-gray-600" style={{ fontSize: '18px', fontWeight: 'bold' }} />
            </Box>
            <Box className="flex flex-col">
              <Typography className="font-semibold text-black text-[14px] leading-tight">
                요청된 메시지
              </Typography>
              <Typography className="text-gray-500 text-[12px] leading-tight">
                {messageRequestsCount}개의 요청
              </Typography>
            </Box>
          </Box>
          <Box className="flex items-center gap-2">
            {totalUnreadRequests > 0 && (
              <Badge
                badgeContent={totalUnreadRequests > 99 ? '99+' : totalUnreadRequests}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '9px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 3px',
                    fontWeight: 'bold'
                  }
                }}
              />
            )}
            <i className="ri-arrow-right-s-line text-gray-400" style={{ fontSize: '18px' }} />
          </Box>
        </Box>

        {/* Chat List - Only show main chats, NOT message requests */}
        <Box
          className="flex-1 bg-white relative"
          sx={{
            height: 'calc(100vh - 240px)',
            overflowY: 'auto',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#e0e0e0',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#bdbdbd',
            },
          }}
        >
          <Box className="pb-24 relative">
            <List className="p-0 bg-white">
              {/* Main Chats Section - Only show chats where users mutually follow or user has replied */}
              {mainChats.length > 0 ? (
                mainChats.map((room) => {
                  return (
                    <ListItem
                      key={`${room.id}-${room.unreadCount}`}
                      component="button"
                      onClick={() => handleRoomClick(room)}
                      className={` hover:bg-gray-50 cursor-pointer px-4 py-3 bg-white ${room.id === rooms[rooms.length - 1]?.id ? 'mb-8' : ''
                        }`}
                      sx={{ textAlign: 'left', width: '100%', position: 'relative' }}
                    >
                      {/* <ListItemAvatar className="min-w-0 mr-3"> */}
                      <ListItemAvatar className="min-w-0" sx={{ position: 'relative' }}>
                        {/* Red notification badge - only show when unreadCount > 0 */}
                        {/* CRITICAL: Key includes unread count to force re-render when it changes */}
                        {(() => {
                          const unread = room.unreadCount || 0
                          if (unread > 0) {
                            return (
                              <Box
                                key={`badge-${room.id}-${unread}`}
                                sx={{
                                  position: 'absolute',
                                  bottom: -2,
                                  right: -2,
                                  minWidth: '20px',
                                  height: '20px',
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  zIndex: 10,
                                  padding: unread > 9 ? '0 5px' : '0',
                                  border: '2px solid white',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {unread > 99 ? '99+' : unread}
                              </Box>
                            )
                          }
                          return null
                        })()}
                        {/* Different icons for user vs group chat */}
                        {room.type === 'user' ? (
                          <Avatar
                            className="w-10 h-10"
                            src={room.user?.avatar}
                            sx={{ backgroundColor: '#D9D9D9' }}
                          >
                            {room.user?.nickname?.charAt(0)?.toUpperCase() || <i className="ri-user-line text-xl" />}
                          </Avatar>
                        ) : (
                          <Avatar
                            className="w-10 h-10"
                            src={room.group?.avatar}
                            sx={{ backgroundColor: '#D9D9D9' }}
                          >
                            {room.group?.name?.charAt(0)?.toUpperCase() || <i className="ri-team-line text-xl" />}
                          </Avatar>
                        )}
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box className="flex items-center justify-between">
                            <Box className="flex items-center space-x-2">
                              <Typography variant="subtitle1" className="font-bold font-weight-600 text-gray-800 text-[14px] ">
                                {room.user?.nickname || room.group?.name}
                              </Typography>
                              {/* Add user/group type indicators - just dots */}
                              {room.type === 'user' && renderBadgeIcon(extractBadge(room.user as any), 14)}
                              {room.type === 'group' && (
                                <span className="flex items-center text-gray-500 mr-1 text-[10px]">
                                  <i className="ri-team-fill text-gray-500 mr-1 text-[10px]" />
                                  {currentRoom?.group?.members?.length || room.group?.members?.length || 0}
                                </span>
                              )}
                            </Box>
                            <Typography variant="caption" className="text-black text-md">
                              {formatTime(room.lastActivity)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            className="text-black line-clamp-2 text-left"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {room.lastMessage?.content || ''}
                          </Typography>
                        }
                        className="flex-1 border-b border-gray-100"
                      />
                    </ListItem>
                  )
                })
              ) : (
                <Box className="flex flex-col items-center justify-center h-64 px-4">
                  <Typography variant="body2" className="text-gray-500 text-center">
                    채팅방이 없습니다
                  </Typography>
                </Box>
              )}
            </List>
          </Box>

          {/* Floating search bar */}
          <Box className="fixed bottom-20 left-0 z-30 right-0 pb-4">
            <Box onClick={openSearchView} className="h-[49px] bg-gray-200/50 backdrop-blur-md border border-gray-100 rounded-full py-4 px-1 mx-6 gap-2 flex items-center justify-center">
              <TextField
                fullWidth
                placeholder="검색"
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputBase-input': { padding: '5px 0px' }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <i className="ri-search-line text-gray-400 mr-2" />
                  )

                }}
              />
            </Box>
          </Box>

        </Box>
      </Box>
    )
  }

  // Render Hidden Requests View (Instagram-style)
  const renderHiddenRequests = () => {
    const messageRequests = rooms.filter(room => room.isMessageRequest)

    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <Box className="flex items-center gap-2">
            <IconButton
              onClick={() => {
                setCurrentView('main')
                // CRITICAL FIX: Clear currentRoom when going back to main view
                setCurrentRoom(null)
              }}
              aria-label="back"
            >
              <i className="ri-arrow-left-s-line text-3xl" />
            </IconButton>
            <Typography className="font-semibold text-black text-[20px]">
              요청
            </Typography>
            {messageRequests.length > 0 && (
              <Badge
                badgeContent={messageRequests.length}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '10px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px'
                  }
                }}
              />
            )}
          </Box>
        </Box>

        {/* Message Requests List */}
        <Box
          className="flex-1 bg-white relative"
          sx={{
            height: 'calc(100vh - 240px)',
            overflowY: 'auto',
            scrollBehavior: 'smooth',
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#e0e0e0',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#bdbdbd',
            },
          }}
        >
          <Box className="pb-24 relative">
            <List className="p-0 bg-white">
              {messageRequests.length > 0 ? (
                messageRequests.map((room) => {
                  return (
                    <ListItem
                      key={`request-${room.id}-${room.unreadCount}`}
                      component="button"
                      onClick={() => handleRoomClick(room)}
                      className="hover:bg-gray-50 cursor-pointer px-4 py-3 bg-white"
                      sx={{ textAlign: 'left', width: '100%', position: 'relative' }}
                    >
                      <ListItemAvatar className="min-w-0" sx={{ position: 'relative' }}>
                        {(() => {
                          const unread = room.unreadCount || 0
                          if (unread > 0) {
                            return (
                              <Box
                                key={`badge-${room.id}-${unread}`}
                                sx={{
                                  position: 'absolute',
                                  bottom: -2,
                                  right: -2,
                                  minWidth: '20px',
                                  height: '20px',
                                  backgroundColor: '#ef4444',
                                  color: '#ffffff',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  zIndex: 10,
                                  padding: unread > 9 ? '0 5px' : '0',
                                  border: '2px solid white',
                                  boxSizing: 'border-box'
                                }}
                              >
                                {unread > 99 ? '99+' : unread}
                              </Box>
                            )
                          }
                          return null
                        })()}
                        <Avatar
                          className="w-10 h-10"
                          src={room.user?.avatar}
                          sx={{ backgroundColor: '#D9D9D9' }}
                        >
                          {room.user?.nickname?.charAt(0)?.toUpperCase() || <i className="ri-user-line text-xl" />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box className="flex items-center justify-between">
                            <Box className="flex items-center space-x-2">
                              <Typography variant="subtitle1" className="font-bold font-weight-600 text-gray-800 text-[14px]">
                                {room.user?.nickname}
                              </Typography>
                              {renderBadgeIcon(extractBadge(room.user as any), 14)}
                            </Box>
                            <Typography variant="caption" className="text-black text-md">
                              {formatTime(room.lastActivity)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            className="text-gray-600 line-clamp-2 text-left"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {room.lastMessage?.content || ''}
                          </Typography>
                        }
                        className="flex-1 border-b border-gray-100"
                      />
                    </ListItem>
                  )
                })
              ) : (
                <Box className="flex flex-col items-center justify-center h-64 px-4">
                  <Typography variant="body2" className="text-gray-500 text-center">
                    요청된 메시지가 없습니다
                  </Typography>
                </Box>
              )}
            </List>
          </Box>
        </Box>
      </Box>
    )
  }

  const renderUserChat = () => {
    // If room doesn't have user data yet, show loading or fetch it
    if (!currentRoom?.user) {
      // If we have initialRoomId, we're waiting for room data to load
      if (initialRoomId && initialRoomType === 'user') {
        return (
          <Box className="h-full flex flex-col items-center justify-center">
            <Typography className="text-gray-500">채팅방을 불러오는 중...</Typography>
          </Box>
        )
      }
      // Otherwise, show loading state while useEffect handles redirect
      return (
        <Box className="h-full flex flex-col items-center justify-center">
          <Typography className="text-gray-500">채팅방을 불러오는 중...</Typography>
        </Box>
      )
    }

    // Show empty state only when there are no messages
    const shouldShowEmptyChat = messages.length === 0

    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box
          className="p-3 px-4 border-b border-gray-200 flex items-center bg-white"
          data-chat-header
          sx={{ position: 'relative', zIndex: 1002 }}
        >
          {isSelectionMode ? (
            <>
              <IconButton onClick={handleExitSelectionMode} aria-label="back">
                <i className="ri-arrow-left-s-line text-3xl" />
              </IconButton>
              <Typography className="ml-2 flex-1 font-semibold text-[18px] text-black">
                {selectedMessages.size}개 선택
              </Typography>
              {selectedMessages.size > 0 && (
                <>
                  <IconButton
                    onClick={() => {
                      // Copy selected messages
                      const selectedMessagesList = Array.from(selectedMessages).map(id =>
                        messages.find(m => m.id === id)
                      ).filter(Boolean) as ChatMessage[]
                      if (selectedMessagesList.length > 0) {
                        const textToCopy = selectedMessagesList.map(m => m.content).join('\n')
                        navigator.clipboard.writeText(textToCopy)
                        handleExitSelectionMode()
                      }
                    }}
                    aria-label="copy"
                    sx={{ color: 'text.primary' }}
                  >
                    <i className="ri-file-copy-line text-2xl" />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      // Share selected messages
                      const selectedMessagesList = Array.from(selectedMessages).map(id =>
                        messages.find(m => m.id === id)
                      ).filter(Boolean) as ChatMessage[]
                      if (selectedMessagesList.length > 0 && navigator.share) {
                        const textToShare = selectedMessagesList.map(m => m.content).join('\n')
                        navigator.share({ text: textToShare })
                        handleExitSelectionMode()
                      }
                    }}
                    aria-label="share"
                    sx={{ color: 'text.primary' }}
                  >
                    <i className="ri-share-line text-2xl" />
                  </IconButton>
                  <IconButton
                    onClick={handleDeleteSelectedMessages}
                    aria-label="delete"
                    sx={{ color: 'error.main' }}
                  >
                    <i className="ri-delete-bin-line text-2xl" />
                  </IconButton>
                </>
              )}
            </>
          ) : (selectedMessage || selectedMessages.size > 0) ? (
            // WhatsApp-style header when message(s) are selected
            <>
              <IconButton
                onClick={() => {
                  setSelectedMessage(null)
                  setSelectedMessages(new Set())
                  setMessageMenuAnchor(null)
                }}
                aria-label="back"
              >
                <i className="ri-arrow-left-s-line text-3xl" />
              </IconButton>
              <Typography className="ml-2 flex-1 font-semibold text-[18px] text-black">
                {selectedMessages.size > 0 ? `${selectedMessages.size}개 선택` : '메시지 선택됨'}
              </Typography>
              <IconButton
                onClick={() => {
                  // Copy - handle both single and multiple
                  if (selectedMessages.size > 0) {
                    const selectedMessagesList = Array.from(selectedMessages).map(id =>
                      messages.find(m => m.id === id)
                    ).filter(Boolean) as ChatMessage[]
                    if (selectedMessagesList.length > 0) {
                      const textToCopy = selectedMessagesList.map(m => m.content).join('\n')
                      copyTextToClipboard(textToCopy)
                    }
                  } else if (selectedMessage) {
                    handleCopyMessage(selectedMessage)
                  }
                  setSelectedMessage(null)
                  setSelectedMessages(new Set())
                  setMessageMenuAnchor(null)
                }}
                aria-label="copy"
                sx={{ color: 'text.primary' }}
              >
                <i className="ri-file-copy-line text-2xl" />
              </IconButton>
              {(() => {
                const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid
                const isGroupChat = currentRoom?.type === 'group'
                const isAdmin = isGroupChat && currentRoom?.group?.isHost

                // Check if user can delete - only if all selected messages are from current user (or admin in group)
                let canDelete: boolean = false

                if (selectedMessages.size > 0) {
                  // Check all selected messages - can only delete if all are from current user (or admin)
                  const selectedMessagesList = Array.from(selectedMessages).map(id =>
                    messages.find(m => m.id === id)
                  ).filter(Boolean) as ChatMessage[]

                  canDelete = selectedMessagesList.length > 0 && selectedMessagesList.every(msg => {
                    const messageSenderId = msg.sender.id
                    const isOwner = String(messageSenderId) === String(currentUserId) || messageSenderId === 'currentUser'
                    return Boolean(isOwner || (isGroupChat && isAdmin))
                  })
                } else if (selectedMessage) {
                  const messageSenderId = selectedMessage.sender.id
                  const isOwner = String(messageSenderId) === String(currentUserId) || messageSenderId === 'currentUser'
                  canDelete = isOwner || (isGroupChat && isAdmin) || false
                }

                if (!canDelete) {
                  return null
                }

                return (
                  <IconButton
                    onClick={async (e) => {
                      e.stopPropagation()

                      try {
                        if (selectedMessages.size > 0) {
                          await handleDeleteSelectedMessages()
                        } else if (selectedMessage) {
                          await handleDeleteMessage(selectedMessage)
                        }
                        // Clear selections after deletion
                        setSelectedMessage(null)
                        setSelectedMessages(new Set())
                        setMessageMenuAnchor(null)
                      } catch (error) {
                        console.error('Error deleting messages:', error)
                      }

                      setSelectedMessage(null)
                      setSelectedMessages(new Set())
                      setMessageMenuAnchor(null)

                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    aria-label="delete"
                    sx={{
                      color: 'error.main',
                      position: 'relative',
                      zIndex: 1003
                    }}
                  >
                    <i className="ri-delete-bin-line text-2xl" />
                  </IconButton>
                )
              })()}
            </>
          ) : (
            <>
              <IconButton
                onClick={() => {
                  // Return to previous view (hidden-requests) or main
                  const viewToReturn = previousView === 'hidden-requests' ? 'hidden-requests' : 'main'
                  setCurrentView(viewToReturn)

                  if (viewToReturn === 'main') {
                    // CRITICAL FIX: Clear currentRoom when going back to main view
                    setCurrentRoom(null)
                    setPreviousView(null)
                    setActiveSearchQuery(null) // Clear search highlighting

                    // Remove chat query params so page doesn't immediately reopen same room
                    try {
                      router.replace('/web/chat', { scroll: false })
                    } catch (error) {
                      // Fallback for environments where router.replace throws
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href)
                        url.searchParams.delete('roomId')
                        url.searchParams.delete('type')
                        const search = url.searchParams.toString()
                        window.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`)
                      }
                    }
                  }
                }}
                aria-label="back"
              >
                <i className="ri-arrow-left-s-line text-3xl" />
              </IconButton>
              <IconButton
                onClick={() => setCurrentView('user-options')}
                className="ml-1 p-0"
                sx={{ borderRadius: '50%' }}
              >
                <Avatar
                  className="w-[28px] h-[28px]"
                  src={currentRoom.user.avatar}
                  sx={{ backgroundColor: '#D9D9D9' }}
                >
                  {currentRoom.user.nickname?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
              <Button
                onClick={() => setCurrentView('user-options')}
                className="ml-2 normal-case p-0 min-w-0 flex-1"
                variant="text"
                sx={{ justifyContent: 'flex-start' }}
              >
                <Box className="flex items-center">
                  <Typography className="font-semibold text-[22px] text-black mr-1 line-clamp-1">
                    {currentRoom.user.nickname}
                  </Typography>
                  {renderBadgeIcon(extractBadge(currentRoom.user as any), 16)}
                  <i className="ri-arrow-right-s-line text-gray-500 text-[16px] ml-1" />
                </Box>
              </Button>
            </>
          )}
        </Box>

        {/* Content */}
        {shouldShowEmptyChat ? (
          // Empty chat interface
          <Box className="flex-1 flex flex-col items-center justify-start p-4 pt-20">
            {/* Messaging icon */}
            <Box className="mb-4">
              <QuestionAnswerIcon className="text-6xl text-gray-400" />
              {/* <i className="ri-message-3-line text-6xl text-gray-400" /> */}
            </Box>

            {/* Empty message */}
            <Typography variant="body1" className="text-gray-500 text-center">
              아직 메세지가 없어요
            </Typography>
          </Box>
        ) : (
          // Existing chat with messages
          <Box
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            data-message-container
            sx={{
              scrollBehavior: 'smooth',
            }}
          >
            {uniqueMessages.map((message, index) => {
              // Determine if message is from current user
              const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid
              const msgSenderId = message.sender.id
              const isMine = String(msgSenderId) === String(currentUserId) || msgSenderId === 'currentUser'
              const prev = index > 0 ? uniqueMessages[index - 1] : undefined
              const showTime = shouldShowTimeSeparator(prev, message)

              const isSelected = selectedMessages.has(message.id)

              return (
                <Box key={message.id}>
                  {showTime && (
                    <Box className="text-center mb-2">
                      <Typography variant="caption" className="text-gray-500">
                        {formatKoreanTime(message.timestamp)}
                      </Typography>
                    </Box>
                  )}

                  <Box
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-start gap-2 relative`}
                    data-message-box
                    data-message-id={message.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMessageClick(e, message)
                    }}
                    sx={{
                      backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                      borderRadius: isSelected ? '6px' : '0',
                      padding: isSelected ? '4px' : '0',
                      margin: isSelected ? '2px 0' : '0',
                      border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                      transition: 'all 0.2s ease',
                      opacity: isSelected ? 1 : 1,
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 1000 // Higher than overlay
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      if (isSelectionMode) return
                      if (isSelectionMode) return
                      // Long press detection (700ms)
                      const timer = setTimeout(() => {
                        handleLongPress(e, message)
                      }, 700)

                      const handleMouseUp = () => {
                        clearTimeout(timer)
                        document.removeEventListener('mouseup', handleMouseUp)
                        document.removeEventListener('mousemove', handleMouseMove)
                      }

                      const handleMouseMove = () => {
                        clearTimeout(timer)
                        document.removeEventListener('mouseup', handleMouseUp)
                        document.removeEventListener('mousemove', handleMouseMove)
                      }

                      document.addEventListener('mouseup', handleMouseUp)
                      document.addEventListener('mousemove', handleMouseMove)
                    }}
                  >
                    {/* Selection checkbox - visible on left side for all messages */}
                    {isSelectionMode && (
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleMessageClick({ preventDefault: () => { }, stopPropagation: () => { } } as any, message)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          position: 'absolute',
                          left: '8px',
                          zIndex: 10,
                          top: '8px',
                          padding: '4px',
                          '& .MuiSvgIcon-root': {
                            fontSize: '22px'
                          },
                          '&.Mui-checked': {
                            color: '#3b82f6'
                          }
                        }}
                      />
                    )}
                    {/* Selected indicator for message selection (WhatsApp-style) - show if in selectedMessages */}
                    {isSelected && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                        }}
                      >
                        <i className="ri-check-line text-white" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                      </Box>
                    )}
                    {!isMine && (
                      <Avatar
                        className="w-9 h-9 flex-shrink-0"
                        src={message.sender.avatar}
                        sx={{ backgroundColor: '#D9D9D9' }}
                      >
                        {message.sender.nickname?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                    )}

                    {/* Message bubble variants */}
                    {message.type === 'text' && (
                      <Box className="flex flex-col">
                        {!isMine && (
                          <Typography className="text-gray-800 text-[11px] px-3 mb-1 block">
                            {message.sender.nickname || currentRoom?.user?.nickname || ''}
                          </Typography>
                        )}
                        <Box className={`max-w-xs lg:max-w-md ${isMine ? 'bg-gray-500 text-white rounded-xl' : 'bg-gray-100 text-gray-800 rounded-xl'} p-2 hover:opacity-90 transition-opacity ${message.content === '[삭제된 메시지]' ? 'opacity-50 italic' : ''}`}>
                          <Typography
                            variant="body2"
                            className={`${isMine ? 'text-white' : 'text-gray-800'} ${message.content === '[삭제된 메시지]' ? 'text-gray-500' : ''}`}
                          >
                            {message.content === '[삭제된 메시지]' ? '[삭제된 메시지]' : highlightText(message.content || '', activeSearchQuery)}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {message.type === 'image' && (
                      <Box className="relative overflow-hidden rounded-lg group">
                        <img
                          src={message.attachmentUrl || message.content}
                          alt="image"
                          className="rounded-lg max-w-[160px] max-h-[160px] object-cover"
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(
                              message.attachmentUrl || message.content,
                              message.fileName || '',
                              'image'
                            )
                          }}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
                          }}
                        >
                          <i className="ri-download-line text-sm" />
                        </IconButton>
                      </Box>
                    )}

                    {message.type === 'file' && (
                      <Box className="flex w-full max-w-xs / md:max-w-md items-center bg-gray-400 text-white rounded-lg px-3 py-2">
                        <Box className="w-6 h-6 flex items-center justify-center text-white flex-shrink-0">
                          <i className="ri-folder-2-line" />
                        </Box>
                        <span className="h-8 w-px bg-white mx-2 flex-shrink-0" />
                        <Typography variant="body2" className="truncate text-white flex-1 min-w-0">
                          {message.fileName || message.content}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(
                              message.attachmentUrl || message.content,
                              message.fileName || '',
                              'file'
                            )
                          }}
                          className="ml-2 text-white hover:bg-gray-500 flex-shrink-0"
                          sx={{
                            color: 'white',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                          }}
                        >
                          <i className="ri-download-line" />
                        </IconButton>
                      </Box>
                    )}

                    {message.type === 'club' && (
                      <Box
                        className={`w-full max-w-xs / md:max-w-md bg-gray-400 rounded-lg px-2 py-1 h-12 flex items-center cursor-pointer hover:bg-gray-500 transition-colors`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (message.clubMeeting?.id) {
                            const meetingId = message.clubMeeting.id
                            // Navigate to meeting detail page
                            navigate(`/meeting/item-detail/${meetingId}`)
                          }
                        }}
                      >
                        <Avatar
                          src={(message.clubMeeting?.image && message.clubMeeting.image.trim() !== '')
                            ? message.clubMeeting.image
                            : (message.club?.avatar && message.club.avatar.trim() !== '')
                              ? message.club.avatar
                              : undefined}
                          className="w-8 h-8 bg-gray-600"
                          imgProps={{
                            loading: 'lazy',
                            onError: (e) => {
                              // Prevent image loading errors from causing warnings
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }
                          }}
                        >
                          {(message.clubMeeting?.name || message.club?.name)?.charAt(0)?.toUpperCase() || 'C'}
                        </Avatar>
                        <span className="h-8 w-px bg-white mx-2" />
                        <Typography variant="body1" className="text-white mr-1">
                          {message.clubMeeting?.name || message.club?.name || message.content}
                        </Typography>
                        <i className="ri-arrow-right-s-line text-white ml-auto mr-2" />
                      </Box>
                    )}
                  </Box>

                  {/* Per-message time (small, below) to match reference */}
                  {!isMine && (
                    <Typography variant="caption" className="block mt-1 text-gray-500 ml-10">
                      {formatKoreanTime(message.timestamp)}
                    </Typography>
                  )}
                  {isMine && (
                    <Typography variant="caption" className="block mt-1 text-gray-500 text-right mr-2">
                      {formatKoreanTime(message.timestamp)}
                    </Typography>
                  )}
                </Box>
              )
            })}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </Box>
        )}

        {/* Input */}
        {renderMessageInput()}
      </Box>
    )
  }

  const renderGroupChat = () => {
    if (!currentRoom?.group) {
      // If we have initialRoomId, we're waiting for room data to load
      if (initialRoomId && initialRoomType === 'group') {
        return (
          <Box className="h-full flex flex-col items-center justify-center">
            <Typography className="text-gray-500">채팅방을 불러오는 중...</Typography>
          </Box>
        )
      }
      return null
    }

    // Show empty state only when there are no messages
    const shouldShowEmptyChat = messages.length === 0

    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box
          className="p-3 px-4 border-b border-gray-200 flex items-center bg-white"
          data-chat-header
          sx={{ position: 'relative', zIndex: 1002 }}
        >
          {isSelectionMode ? (
            <>
              <IconButton onClick={handleExitSelectionMode} aria-label="back">
                <i className="ri-arrow-left-s-line text-3xl" />
              </IconButton>
              <Typography className="ml-2 flex-1 font-semibold text-[18px] text-black">
                {selectedMessages.size}개 선택
              </Typography>
              {selectedMessages.size > 0 && (
                <>
                  <IconButton
                    onClick={() => {
                      // Copy selected messages
                      const selectedMessagesList = Array.from(selectedMessages).map(id =>
                        messages.find(m => m.id === id)
                      ).filter(Boolean) as ChatMessage[]
                      if (selectedMessagesList.length > 0) {
                        const textToCopy = selectedMessagesList.map(m => m.content).join('\n')
                        copyTextToClipboard(textToCopy).finally(() => {
                          handleExitSelectionMode()
                        })
                      }
                    }}
                    aria-label="copy"
                    sx={{ color: 'text.primary' }}
                  >
                    <i className="ri-file-copy-line text-2xl" />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      // Share selected messages
                      const selectedMessagesList = Array.from(selectedMessages).map(id =>
                        messages.find(m => m.id === id)
                      ).filter(Boolean) as ChatMessage[]
                      if (selectedMessagesList.length > 0 && navigator.share) {
                        const textToShare = selectedMessagesList.map(m => m.content).join('\n')
                        navigator.share({ text: textToShare })
                        handleExitSelectionMode()
                      }
                    }}
                    aria-label="share"
                    sx={{ color: 'text.primary' }}
                  >
                    <i className="ri-share-line text-2xl" />
                  </IconButton>
                  <IconButton
                    onClick={handleDeleteSelectedMessages}
                    aria-label="delete"
                    sx={{ color: 'error.main' }}
                  >
                    <i className="ri-delete-bin-line text-2xl" />
                  </IconButton>
                </>
              )}
            </>
          ) : (selectedMessage || selectedMessages.size > 0) ? (
            // WhatsApp-style header when message(s) are selected
            <>
              <IconButton
                onClick={() => {
                  setSelectedMessage(null)
                  setSelectedMessages(new Set())
                  setMessageMenuAnchor(null)
                }}
                aria-label="back"
              >
                <i className="ri-arrow-left-s-line text-3xl" />
              </IconButton>
              <Typography className="ml-2 flex-1 font-semibold text-[18px] text-black">
                {selectedMessages.size > 0 ? `${selectedMessages.size}개 선택` : '메시지 선택됨'}
              </Typography>
              <IconButton
                onClick={() => {
                  // Copy - handle both single and multiple
                  if (selectedMessages.size > 0) {
                    const selectedMessagesList = Array.from(selectedMessages).map(id =>
                      messages.find(m => m.id === id)
                    ).filter(Boolean) as ChatMessage[]
                    if (selectedMessagesList.length > 0) {
                      const textToCopy = selectedMessagesList.map(m => m.content).join('\n')
                      copyTextToClipboard(textToCopy)
                    }
                  } else if (selectedMessage) {
                    handleCopyMessage(selectedMessage)
                  }
                  setSelectedMessage(null)
                  setSelectedMessages(new Set())
                  setMessageMenuAnchor(null)
                }}
                aria-label="copy"
                sx={{ color: 'text.primary' }}
              >
                <i className="ri-file-copy-line text-2xl" />
              </IconButton>
              {(() => {
                const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid
                const isGroupChat = currentRoom?.type === 'group'
                const isAdmin = isGroupChat && currentRoom?.group?.isHost

                // Check if user can delete - only if all selected messages are from current user (or admin in group)
                let canDelete: boolean = false

                if (selectedMessages.size > 0) {
                  // Check all selected messages - can only delete if all are from current user (or admin)
                  const selectedMessagesList = Array.from(selectedMessages).map(id =>
                    messages.find(m => m.id === id)
                  ).filter(Boolean) as ChatMessage[]

                  canDelete = selectedMessagesList.length > 0 && selectedMessagesList.every(msg => {
                    const messageSenderId = msg.sender.id
                    const isOwner = String(messageSenderId) === String(currentUserId) || messageSenderId === 'currentUser'
                    return Boolean(isOwner || (isGroupChat && isAdmin))
                  })
                } else if (selectedMessage) {
                  const messageSenderId = selectedMessage.sender.id
                  const isOwner = String(messageSenderId) === String(currentUserId) || messageSenderId === 'currentUser'
                  canDelete = isOwner || (isGroupChat && isAdmin) || false
                }

                if (!canDelete) {
                  return null
                }

                return (
                  <IconButton
                    onClick={async (e) => {
                      e.stopPropagation()

                      if (selectedMessages.size > 0) {
                        await handleDeleteSelectedMessages()
                      } else if (selectedMessage) {
                        await handleDeleteMessage(selectedMessage)
                      }
                      // Clear selections after deletion
                      setSelectedMessage(null)
                      setSelectedMessages(new Set())
                      setMessageMenuAnchor(null)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                    aria-label="delete"
                    sx={{
                      color: 'error.main',
                      position: 'relative',
                      zIndex: 1003
                    }}
                  >
                    <i className="ri-delete-bin-line text-2xl" />
                  </IconButton>
                )
              })()}
            </>
          ) : (
            <>
              <IconButton
                onClick={() => {
                  // Return to previous view (hidden-requests) or main
                  const viewToReturn = previousView === 'hidden-requests' ? 'hidden-requests' : 'main'
                  setCurrentView(viewToReturn)
                  if (viewToReturn === 'main') {
                    setPreviousView(null)
                    setCurrentRoom(null) // Clear currentRoom when going back to main view
                    setActiveSearchQuery(null) // Clear search highlighting
                  }
                }}
                aria-label="back"
              >
                <i className="ri-arrow-left-s-line text-3xl" />
              </IconButton>
              <IconButton
                onClick={() => setCurrentView('group-options')}
                className="ml-1 p-0"
                sx={{ borderRadius: '50%' }}
              >
                <Avatar
                  className="w-[28px] h-[28px]"
                  src={currentRoom.group.avatar}
                  sx={{ backgroundColor: '#D9D9D9' }}
                >
                  {currentRoom.group.name?.charAt(0)?.toUpperCase() || 'G'}
                </Avatar>
              </IconButton>
              <Button
                onClick={() => setCurrentView('group-options')}
                className="ml-2 normal-case p-0 min-w-0 flex-1"
                variant="text"
                sx={{ justifyContent: 'flex-start' }}
              >
                <Box className="flex items-center">
                  <Typography className="font-semibold text-[22px] text-black mr-1 line-clamp-1">
                    {currentRoom.group.name}
                  </Typography>
                  <i className="ri-arrow-right-s-line text-[#88888C] h-[10px];
] ml-1" />
                </Box>
              </Button>
            </>
          )}
        </Box>

        {/* Content */}
        {shouldShowEmptyChat ? (
          // Empty chat interface
          <Box className="flex-1 flex flex-col items-center justify-start p-4 pt-20">
            {/* Messaging icon */}
            <Box className="mb-4">
              <QuestionAnswerIcon className="text-6xl text-gray-400" />
              {/* <i className="ri-message-3-line text-6xl text-gray-400" /> */}
            </Box>

            {/* Empty message */}
            <Typography variant="body1" className="text-gray-500 text-center">
              아직 메세지가 없어요
            </Typography>
          </Box>
        ) : (
          // Existing chat with messages
          <Box
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
            data-message-container
            sx={{
              scrollBehavior: 'smooth',
            }}
          >
            {uniqueMessages.map((message, index) => {
              // Determine if message is from current user
              const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid
              const msgSenderId = message.sender.id
              const isMineGroup = String(msgSenderId) === String(currentUserId) || msgSenderId === 'currentUser'
              const prev = index > 0 ? uniqueMessages[index - 1] : undefined
              const showTime = shouldShowTimeSeparator(prev, message)

              const isSelected = selectedMessages.has(message.id)
              const isGroupChat = currentRoom?.type === 'group'
              const isAdmin = isGroupChat && currentRoom?.group?.isHost

              return (
                <Box key={message.id}>
                  {showTime && (
                    <Box className="text-center mb-3">
                      <Typography variant="caption" className="text-gray-500">
                        {formatKoreanTime(message.timestamp)}
                      </Typography>
                    </Box>
                  )}

                  <Box
                    className={`flex ${isMineGroup ? 'justify-end' : 'justify-start'} items-start gap-2 relative`}
                    data-message-box
                    data-message-id={message.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMessageClick(e, message)
                    }}
                    sx={{
                      backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                      borderRadius: isSelected ? '6px' : '0',
                      padding: isSelected ? '4px' : '0',
                      margin: isSelected ? '2px 0' : '0',
                      border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                      transition: 'all 0.2s ease',
                      opacity: isSelected ? 1 : 1,
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 1000 // Higher than overlay
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      if (isSelectionMode) return
                      if (isSelectionMode) return
                      // Long press detection (700ms)
                      const timer = setTimeout(() => {
                        handleLongPress(e, message)
                      }, 700)

                      const handleMouseUp = () => {
                        clearTimeout(timer)
                        document.removeEventListener('mouseup', handleMouseUp)
                        document.removeEventListener('mousemove', handleMouseMove)
                      }

                      const handleMouseMove = () => {
                        clearTimeout(timer)
                        document.removeEventListener('mouseup', handleMouseUp)
                        document.removeEventListener('mousemove', handleMouseMove)
                      }

                      document.addEventListener('mouseup', handleMouseUp)
                      document.addEventListener('mousemove', handleMouseMove)
                    }}
                  >
                    {/* Selection checkbox - visible on left side for all messages */}
                    {isSelectionMode && (
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleMessageClick({ preventDefault: () => { }, stopPropagation: () => { } } as any, message)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          position: 'absolute',
                          left: '8px',
                          zIndex: 10,
                          top: '8px',
                          padding: '4px',
                          '& .MuiSvgIcon-root': {
                            fontSize: '22px'
                          },
                          '&.Mui-checked': {
                            color: '#3b82f6'
                          }
                        }}
                      />
                    )}
                    {/* Selected indicator for message selection (WhatsApp-style) - show if in selectedMessages */}
                    {isSelected && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10
                        }}
                      >
                        <i className="ri-check-line text-white" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                      </Box>
                    )}
                    {!isMineGroup && (
                      <Avatar
                        className="w-9 h-9 flex-shrink-0"
                        src={message.sender.avatar}
                        sx={{ backgroundColor: '#D9D9D9' }}
                      >
                        {message.sender.nickname?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                    )}

                    {/* Message bubble variants */}
                    {message.type === 'text' && (
                      <Box className="flex flex-col">
                        {!isMineGroup && (
                          <Typography className="text-gray-800 text-[11px] px-3 mb-1 block">
                            {message.sender.nickname || 'Unknown'}
                          </Typography>
                        )}
                        <Box className={`max-w-xs lg:max-w-md ${isMineGroup ? 'bg-gray-500 text-white rounded-xl' : 'bg-gray-100 text-gray-800 rounded-xl'} p-2 hover:opacity-90 transition-opacity ${message.content === '[삭제된 메시지]' ? 'opacity-50 italic' : ''}`}>
                          <Typography
                            variant="body2"
                            className={`${isMineGroup ? 'text-white' : 'text-gray-800'} ${message.content === '[삭제된 메시지]' ? 'text-gray-500' : ''}`}
                          >
                            {message.content === '[삭제된 메시지]' ? '[삭제된 메시지]' : highlightText(message.content || '', activeSearchQuery)}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {message.type === 'image' && (
                      <Box className="relative overflow-hidden rounded-lg group">
                        <img
                          src={message.attachmentUrl || message.content}
                          alt="image"
                          className="rounded-lg max-w-[160px] max-h-[160px] object-cover"
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(
                              message.attachmentUrl || message.content,
                              message.fileName || '',
                              'image'
                            )
                          }}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' }
                          }}
                        >
                          <i className="ri-download-line text-sm" />
                        </IconButton>
                      </Box>
                    )}

                    {message.type === 'file' && (
                      <Box className="flex w-full max-w-xs md:max-w-md items-center bg-gray-400 text-white rounded-lg px-3 py-2">
                        <Box className="w-6 h-6 flex items-center justify-center text-white flex-shrink-0">
                          <i className="ri-folder-2-line" />
                        </Box>
                        <span className="h-8 w-px bg-white mx-2 flex-shrink-0" />
                        <Typography variant="body2" className="truncate text-white flex-1 min-w-0">
                          {message.fileName || message.content}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(
                              message.attachmentUrl || message.content,
                              message.fileName || '',
                              'file'
                            )
                          }}
                          className="ml-2 text-white hover:bg-gray-500 flex-shrink-0"
                          sx={{
                            color: 'white',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                          }}
                        >
                          <i className="ri-download-line" />
                        </IconButton>
                      </Box>
                    )}

                    {message.type === 'club' && (
                      <Box
                        className={`w-full max-w-xs md:max-w-md bg-gray-400 rounded-lg px-2 py-1 h-12 flex items-center cursor-pointer hover:bg-gray-500 transition-colors`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (message.clubMeeting?.id) {
                            const meetingId = message.clubMeeting.id
                            // Navigate to meeting detail page
                            navigate(`/meeting/item-detail/${meetingId}`)
                          }
                        }}
                      >
                        <Avatar
                          src={(message.clubMeeting?.image && message.clubMeeting.image.trim() !== '')
                            ? message.clubMeeting.image
                            : (message.club?.avatar && message.club.avatar.trim() !== '')
                              ? message.club.avatar
                              : undefined}
                          className="w-8 h-8 bg-gray-600"
                          imgProps={{
                            loading: 'lazy',
                            onError: (e) => {
                              // Prevent image loading errors from causing warnings
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                            }
                          }}
                        >
                          {(message.clubMeeting?.name || message.club?.name)?.charAt(0)?.toUpperCase() || 'C'}
                        </Avatar>
                        <span className="h-8 w-px bg-white mx-2" />
                        <Typography variant="body1" className="text-white mr-1">
                          {message.clubMeeting?.name || message.club?.name || message.content}
                        </Typography>
                        <i className="ri-arrow-right-s-line text-white ml-auto mr-2" />
                      </Box>
                    )}
                  </Box>

                  {/* Per-message time */}
                  {!isMineGroup && (
                    <Typography variant="caption" className="block mt-1 text-gray-500 ml-10">
                      {formatKoreanTime(message.timestamp)}
                    </Typography>
                  )}
                  {isMineGroup && (
                    <Typography variant="caption" className="block mt-1 text-gray-500 text-right mr-2">
                      {formatKoreanTime(message.timestamp)}
                    </Typography>
                  )}
                </Box>
              )
            })}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </Box>
        )}

        {/* Input */}
        {renderMessageInput()}
      </Box>
    )
  }

  // Message action menu component
  const renderMessageMenu = () => {
    if (!messageMenuAnchor || !selectedMessage) return null

    // Calculate position to keep menu on screen
    const menuWidth = 150
    const menuHeight = 200
    const padding = 10

    let left = messageMenuAnchor.x
    let top = messageMenuAnchor.y

    // Adjust if too close to right edge
    if (left + menuWidth > window.innerWidth - padding) {
      left = window.innerWidth - menuWidth - padding
    }

    // Adjust if too close to bottom edge
    if (top + menuHeight > window.innerHeight - padding) {
      top = window.innerHeight - menuHeight - padding
    }

    return (
      <Box
        sx={{
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          bgcolor: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          zIndex: 1000,
          minWidth: '150px',
          padding: '4px 0',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          onClick={() => {
            handleCopyMessage(selectedMessage)
          }}
          className="w-full normal-case justify-start px-4 py-2 text-left hover:bg-gray-50"
          sx={{ color: 'text.primary', fontSize: '14px', justifyContent: 'flex-start' }}
        >
          <i className="ri-file-copy-line mr-2" />
          복사
        </Button>
        <Button
          onClick={() => {
            handleShareMessage(selectedMessage)
          }}
          className="w-full normal-case justify-start px-4 py-2 text-left hover:bg-gray-50"
          sx={{ color: 'text.primary', fontSize: '14px', justifyContent: 'flex-start' }}
        >
          <i className="ri-share-line mr-2" />
          공유
        </Button>
        {(() => {
          const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.uid || currentUser?.userUuid
          const messageSenderId = selectedMessage.sender.id
          const isOwner = String(messageSenderId) === String(currentUserId) || messageSenderId === 'currentUser'
          const isGroupChat = currentRoom?.type === 'group'
          const isAdmin = isGroupChat && currentRoom?.group?.isHost

          // Show delete if: (individual chat and owner) OR (group chat and (owner OR admin))
          const canDelete = isOwner || (isGroupChat && isAdmin)

          return canDelete && (
            <Button
              onClick={() => {
                handleDeleteMessage(selectedMessage)
              }}
              className="w-full normal-case justify-start px-4 py-2 text-left hover:bg-red-50"
              sx={{ color: 'error.main', fontSize: '14px', justifyContent: 'flex-start' }}
            >
              <i className="ri-delete-bin-line mr-2" />
              삭제
            </Button>
          )
        })()}
        <Divider />
        <Button
          onClick={handleCloseMessageMenu}
          className="w-full normal-case justify-start px-4 py-2 text-left hover:bg-gray-50"
          sx={{ color: 'text.secondary', fontSize: '14px', justifyContent: 'flex-start' }}
        >
          취소
        </Button>
      </Box>
    )
  }

  const renderUserOptions = () => {
    if (!currentRoom?.user) return null

    return (
      <Box>
        {/* Header - back only */}
        <Box className="p-3 px-0 flex items-start justify-between bg-white">
          <IconButton onClick={() => setCurrentView('user-chat')} aria-label="back">
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>
          <Box className="text-center mt-3 mb-6">
            <Avatar
              className="w-20 h-20 mx-auto mb-3"
              src={currentRoom.user.avatar}
              sx={{ backgroundColor: '#D9D9D9' }}
            >
              {currentRoom.user.nickname?.charAt(0)?.toUpperCase() || <i className="ri-user-line text-4xl text-gray-600" />}
            </Avatar>
            <Box className="flex items-center justify-center space-x-2">
              <Typography className="font-semibold text-black text-[20px]">
                {currentRoom.user.nickname}
              </Typography>
              {renderBadgeIcon(extractBadge(currentRoom.user as any), 16)}
            </Box>
          </Box>
          <IconButton sx={{ visibility: 'hidden' }} onClick={() => setCurrentView('user-chat')} aria-label="back">
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>
        </Box>

        <Box className="p-4">
          <List className="p-0">
            <ListItem
              component="button"
              className="bg-transparent p-0"
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                if (currentRoom?.user?.id) {
                  // Navigate to user profile
                  navigate(`/profile?userId=${currentRoom.user.id}`)
                }
              }}
            >
              <Box className="flex items-center w-full">
                <i className="ri-user-fill text-gray-700 mr-3" />
                <Typography className="py-3 flex-1 text-black font-medium border-y border-gray-200">프로필 보기</Typography>
              </Box>
            </ListItem>
            <ListItem component="button" className="bg-transparent p-0" sx={{ cursor: 'pointer' }} onClick={() => window.open('https://support.thenoldam.com/')}>
              <Box className="flex items-center w-full">
                <i className="ri-error-warning-line text-gray-700 mr-3" />
                <Typography className="text-black font-medium border-b border-gray-200 py-3 flex-1">보고</Typography>
              </Box>
            </ListItem>
            {blockStatus.isBlocked ? (
              <ListItem component="button" className="bg-transparent p-0" onClick={handleUnblockUser} sx={{ cursor: 'pointer' }}>
                <Box className="flex items-center w-full">
                  <i className="ri-checkbox-circle-line text-gray-700 mr-3" />
                  <Typography className="text-black font-medium border-b border-gray-200 py-3 flex-1">차단 해제</Typography>
                </Box>
              </ListItem>
            ) : (
              <ListItem component="button" className="bg-transparent p-0" onClick={() => setShowBlockConfirm(true)} sx={{ cursor: 'pointer' }}>
                <Box className="flex items-center w-full">
                  <i className="ri-forbid-line text-gray-700 mr-3" />
                  <Typography className="text-black font-medium border-b border-gray-200 py-3 flex-1">차단</Typography>
                </Box>
              </ListItem>
            )}
            <ListItem component="button" className="bg-transparent p-0" onClick={() => setShowLeaveConfirm(true)} sx={{ cursor: 'pointer' }}>
              <Box className="flex items-center w-full">
                <i className="ri-delete-bin-line text-red-700 mr-3" />
                <Typography className="text-red-500 font-medium  py-3 flex-1">채팅방 나가기</Typography>
              </Box>
            </ListItem>
          </List>
        </Box>
      </Box>
    )
  }

  const renderGroupOptions = () => {
    if (!currentRoom?.group) return null

    return (
      <Box>
        {/* Header - back only */}
        <Box className="p-3 px-0 flex items-start justify-between bg-white">
          <IconButton
            onClick={() => {
              setCurrentView('main')
              setCurrentRoom(null)
              setPreviousView(null)
              try {
                router.replace('/web/chat', { scroll: false })
              } catch (error) {
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href)
                  url.searchParams.delete('roomId')
                  url.searchParams.delete('type')
                  const search = url.searchParams.toString()
                  window.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`)
                }
              }
            }}
            aria-label="back"
          >
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>
          {/* Avatar and name */}
          <Box className="text-center mt-3 mb-6">
            <Avatar
              src={currentRoom.group.avatar}
              className="w-20 h-20 mx-auto mb-3 bg-gray-200"
            />
            <Box className="flex items-center justify-center space-x-2">
              <Typography className="font-semibold text-black text-[20px]">
                {currentRoom.group.name}
              </Typography>
            </Box>
          </Box>

          <IconButton sx={{ visibility: 'hidden' }} onClick={() => setCurrentView('group-chat')} aria-label="back">
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>
        </Box>

        <Box className="p-4">


          {/* <Divider className="mb-4" /> */}

          {/* 예약한 모임 카드 */}
          <Box className="mb-6">
            <Box className="shadow-sm rounded-xl p-3 bg-white">
              <Box className="flex items-start">
                <Box className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center mr-3">
                  <i className="ri-calendar-event-line text-white" />
                </Box>
                <Box className="flex-1">
                  <Typography className="text-gray-900 text-[16px] font-semibold mb-1">예약한 모임</Typography>
                  <Typography className="text-gray-600 text-[10px] leading-snug flex items-center mb-0.5">
                    {/* <i className="ri-user-3-line text-[14px] mr-1 text-gray-500" /> */}
                    {currentRoom.group.name}· {currentRoom.group.meetingTime && formatMeetingTime(currentRoom.group.meetingTime)}
                  </Typography>
                  <Typography className="text-gray-500 text-[10px] leading-snug">
                    {currentRoom.group.meetingAddress || currentRoom.group.meetingDetailedAddress || '주소 정보 없음'}
                  </Typography>
                  {groupMeetingId && (
                    <Button className="mt-2 px-0 py-1 text-blue-600 text-[16px] font-medium" variant="text"
                      onClick={handleViewMeetingDetails}
                    >
                      모임 자세히 보기
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Options list */}
          <List className="p-0">
            <ListItem component="button" className="bg-transparent p-0 " sx={{ cursor: 'pointer' }} onClick={() => window.open('https://support.thenoldam.com/')}>
              <Box className="flex items-center w-full" >
                <i className="ri-error-warning-line text-gray-700 mr-3" />
                <Typography className="text-black border-y border-gray-200 py-3 flex-1">보고</Typography>
              </Box>
            </ListItem>
            <ListItem component="button" className="bg-transparent p-0" onClick={() => setShowBlockConfirm(true)} sx={{ cursor: 'pointer' }}>
              <Box className="flex items-center w-full">
                <i className="ri-forbid-line text-gray-700 mr-3" />
                <Typography className="text-black border-b border-gray-200 py-3 flex-1">차단</Typography>
              </Box>
            </ListItem>
            <ListItem component="button" className="bg-transparent p-0" onClick={() => setShowLeaveConfirm(true)} sx={{ cursor: 'pointer' }}>
              <Box className="flex items-center w-full">
                <i className="ri-delete-bin-line text-red-500 mr-3" />
                <Typography className="text-red-500 py-3 flex-1">채팅방 나가기</Typography>
              </Box>
            </ListItem>
          </List>
        </Box>
      </Box>
    )
  }

  const renderThreadView = () => {
    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box className="p-3 px-0 border-b border-gray-200 flex items-center justify-between bg-white">
          <Box className="flex items-center">
            <IconButton onClick={() => setCurrentView('group-chat')} aria-label="back">
              <i className="ri-arrow-left-s-line text-3xl" />
            </IconButton>
            <Avatar className="w-7 h-7 bg-gray-300 ml-1" />
            <Button
              onClick={() => setCurrentView('group-options')}
              className="ml-2 normal-case p-0 min-w-0"
              variant="text"
            >
              <Typography className="font-semibold text-[18px] mr-1 text-gray-900">
                Club_name
              </Typography>
            </Button>
            {/* <IconButton
              
              className="p-1"
            > */}
            <i className="ri-arrow-right-s-line text-gray-500" onClick={() => setCurrentView('group-options')} />
            {/* </IconButton> */}
          </Box>
        </Box>

        {/* Thread Content */}
        <Box className="flex-1 overflow-y-auto space-y-0">
          {/* Main Post */}
          <Box className="space-y-2 p-4  border-b border-gray-200 pb-4">
            <Box className="flex items-center space-x-2">
              <Avatar className="w-8 h-8 bg-gray-300" />
              <Typography variant="body2" className="font-medium text-gray-800">
                김이나
              </Typography>
              <img src="/images/custom/profile-light-green.png" alt="check" width={14} height={14} />
              {/* <Box className="w-3 h-3 bg-green-200 rounded-full flex items-center justify-center">
                <i className="ri-check-line text-green-500 text-xs" />
              </Box> */}
              <Typography variant="caption" className="text-gray-400">
                2시간 전
              </Typography>
            </Box>
            <Box className="inline-block max-w-md">
              <Typography variant="body2" className="text-gray-800">
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
              </Typography>
            </Box>
            <Box className="flex items-center space-x-4">
              <Box className="flex items-center space-x-1">
                <i className="ri-heart-fill text-red-500" />
                <Typography variant="caption" className="text-red-600">23</Typography>
              </Box>
              <Box className="flex items-center space-x-1">
                <i className="ri-chat-1-line text-gray-500" />
                <Typography variant="caption" className="text-gray-600">2</Typography>
              </Box>
            </Box>
          </Box>

          {/* Reply 1 */}
          <Box className="space-y-2  p-4  border-b border-gray-200 pb-4">
            <Box className="flex items-center space-x-2">
              <Avatar className="w-8 h-8 bg-gray-300" />
              <Box className="flex flex-col">
                <Box className="flex items-center space-x-2">
                  <Typography variant="body2" className="font-medium text-gray-800">
                    김이나
                  </Typography>
                  <img src="/images/custom/profile-light-green.png" alt="check" width={14} height={14} />
                  <Typography variant="caption" className="text-gray-400">
                    2시간 전
                  </Typography>
                </Box>
                <Typography variant="body2" className="text-gray-800">
                  "Lorem ipsum dolor sit amet,
                </Typography>
              </Box>
            </Box>
            <Box className="relative">
              <Box className="absolute left-4 top-0 w-0.5 h-full bg-gray-300 border-l-2 border-dashed border-gray-300" />
              <Box className="ml-8">
                <Box className="flex items-center space-x-4 mt-2">
                  <Box className="flex items-center space-x-1">
                    <i className="ri-heart-fill text-red-500" />
                    <Typography variant="caption" className="text-red-600">23</Typography>
                  </Box>
                  <Box className="flex items-center space-x-1">
                    <i className="ri-chat-1-line text-gray-500" />
                    <Typography variant="caption" className="text-gray-600">2</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box className="flex items-center space-x-2 mt-2">
              <Box className="flex items-center">
                <Box className="w-4 h-4 bg-gray-300 border  border-gray-500 rounded-full" />
                <Box className="w-4 h-4 bg-black -ml-1 border border-white rounded-full" />
              </Box>

              <Typography variant="body2" className="text-gray-800">
                Show Replies
              </Typography>
            </Box>

          </Box>

          {/* Reply 2 */}
          <Box className="space-y-2 p-4  border-b border-gray-200 pb-4">
            <Box className="flex items-center space-x-2">
              <Avatar className="w-8 h-8 bg-gray-300" />
              <Box className="flex flex-col">
                <Box className="flex items-center space-x-2">
                  <Typography variant="body2" className="font-medium text-gray-800">
                    김이나
                  </Typography>
                  <img src="/images/custom/profile-light-green.png" alt="check" width={14} height={14} />
                  <Typography variant="caption" className="text-gray-400">
                    2시간 전
                  </Typography>
                </Box>
                <Typography variant="body2" className="text-gray-800">
                  May I Know how about Tesla Tonight?
                </Typography>
              </Box>
            </Box>
            <Box className="relative">
              <Box className="absolute left-4 top-0 w-0.5 h-full bg-gray-300 border-l-2 border-dashed border-gray-300" />
              <Box className="ml-8">
                <Box className="flex items-center space-x-4 mt-2">
                  <Box className="flex items-center space-x-1">
                    <i className="ri-heart-fill text-red-500" />
                    <Typography variant="caption" className="text-red-600">23</Typography>
                  </Box>
                  <Box className="flex items-center space-x-1">
                    <i className="ri-chat-1-line text-gray-500" />
                    <Typography variant="caption" className="text-gray-600">2</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box className="flex items-center space-x-2 mt-2">
              <Box className="flex items-center">
                <Box className="w-4 h-4 bg-gray-300 border  border-gray-500 rounded-full" />
                <Box className="w-4 h-4 bg-black -ml-1 border border-white rounded-full" />
              </Box>

              <Typography variant="body2" className="text-gray-800">
                Show Replies
              </Typography>
            </Box>
          </Box>

          {/* Reply 3 */}
          <Box className="space-y-2  p-4  ">
            <Box className="flex items-center space-x-2">
              <Avatar className="w-8 h-8 bg-gray-300" />
              <Box className="flex flex-col">
                <Box className="flex items-center space-x-2">
                  <Typography variant="body2" className="font-medium text-gray-800">
                    김이나
                  </Typography>
                  <img src="/images/custom/profile-light-green.png" alt="check" width={14} height={14} />
                  <Typography variant="caption" className="text-gray-400">
                    2시간 전
                  </Typography>
                </Box>
                <Typography variant="body2" className="text-gray-800">
                  May I Know how about Tesla Tonight?
                </Typography>
              </Box>
            </Box>
            <Box className="relative">
              <Box className="absolute left-4 top-0 w-0.5 h-full bg-gray-300 border-l-2 border-dashed border-gray-300" />
              <Box className="ml-8">
                <Box className="flex items-center space-x-4 mt-2">
                  <Box className="flex items-center space-x-1">
                    <i className="ri-heart-fill text-red-500" />
                    <Typography variant="caption" className="text-red-600">23</Typography>
                  </Box>
                  <Box className="flex items-center space-x-1">
                    <i className="ri-chat-1-line text-gray-500" />
                    <Typography variant="caption" className="text-gray-600">2</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box className="flex items-center space-x-2 mt-2">
              <Box className="flex items-center">
                <Box className="w-4 h-4 bg-gray-300 border  border-gray-500 rounded-full" />
                <Box className="w-4 h-4 bg-black -ml-1 border border-white rounded-full" />
              </Box>

              <Typography variant="body2" className="text-gray-800">
                Show Replies
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Bottom Action Bar */}
        <Box className="p-4 border-t border-gray-200">
          <Box className="flex items-center bg-gray-500 text-white justify-between rounded-lg">
            <input
              type="text"
              placeholder="답장하기"
              className="bg-transparent text-white px-4 py-2 outline-none flex-1 rounded-lg placeholder-white"
              style={{ border: 'none' }}
            />
            <Box className="flex items-center">
              <IconButton >
                <i className="ri-image-line text-white" />
              </IconButton>
              <IconButton >
                <i className="ri-add-line text-white" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  const renderKickSelect = () => {
    // Mock participant data
    const participants = [
      { id: '1', name: 'User_name', avatar: null },
      { id: '2', name: 'User_name', avatar: null },
      { id: '3', name: 'User_name', avatar: null },
      { id: '4', name: 'User_name', avatar: null },
      { id: '5', name: 'User_name', avatar: null },
      { id: '6', name: 'User_name', avatar: null },
      { id: '7', name: 'User_name', avatar: null },
      { id: '8', name: 'User_name', avatar: null },
    ]

    const handleUserToggle = (userId: string) => {
      setSelectedUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      )
    }

    const handleExport = () => {
      if (selectedUsers.length > 0) {
        setShowKickConfirm(true)
      }
    }

    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box className="p-3 px-0 border-b border-gray-200 flex items-center justify-between bg-white">
          <Box className="flex items-center">
            <IconButton onClick={() => setCurrentView('club-host-options')} aria-label="back">
              <i className="ri-arrow-left-s-line text-3xl" />
            </IconButton>
            <Typography variant="subtitle1" className="font-semibold text-gray-900">
              참가자 내보내기
            </Typography>
          </Box>
          <Button
            variant="text"
            className="text-black font-medium"
            // disabled={selectedUsers.length === 0}
            onClick={handleExport}
          >
            내보내기
          </Button>
        </Box>

        {/* Instructions or Selection Count */}
        <Box className="px-4 py-3">
          <Box className={`p-2 rounded-lg ${selectedUsers.length > 0 ? 'bg-blue-100/70' : 'bg-gray-100'}`}>
            <Typography
              variant="body2"
              className={`text-center ${selectedUsers.length > 0 ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
            >
              {selectedUsers.length > 0 ? `${selectedUsers.length}명 선택` : '내보낼 참가자를 선택해주세요'}
            </Typography>
          </Box>
        </Box>

        {/* Participant List */}
        <Box className="flex-1 mx-4 overflow-y-auto">
          <List className="p-0">
            {participants.map((participant) => {
              const isSelected = selectedUsers.includes(participant.id)
              return (
                <ListItem
                  key={participant.id}
                  component="button"
                  className={`transition-colors ${isSelected ? 'bg-blue-100/70' : 'bg-transparent'
                    }`}
                  sx={{ cursor: 'pointer', padding: '0px 12px 0px 12px' }}
                  onClick={() => handleUserToggle(participant.id)}
                >
                  <Avatar className="w-7 h-7 bg-gray-300" />
                  <Box className="flex items-center border-t border-gray-200 py-3 justify-between w-full">
                    <Box className="flex items-center space-x-2">
                      <Typography className={`text-[17px] font-medium ${isSelected ? 'text-blue-600' : 'text-gray-800'
                        }`}>
                        {participant.name}
                      </Typography>
                      {renderBadgeIcon(extractBadge(participant as any), 20)}
                    </Box>
                    <Box className={`w-6 h-6 rounded-full border-0 flex items-center justify-center ${isSelected
                      ? 'bg-white border-2 text-blue-500 border-blue-500'
                      : 'bg-white border-0 border-gray-300'
                      }`}>
                      {isSelected && (
                        <i className="ri-check-line text-blue-600 text-[20px] font-semibold" />
                      )}
                    </Box>
                  </Box>
                </ListItem>
              )
            })}
          </List>
        </Box>
      </Box>
    )
  }

  const renderClubSelect = () => {
    // Remove duplicate meetings by ID before formatting
    const uniqueMeetings = meetings.filter((meeting, index, self) =>
      index === self.findIndex((m) => m.id === meeting.id)
    )

    // Format meetings data for display
    const formattedClubs = uniqueMeetings.map((meeting) => ({
      id: String(meeting.id),
      name: meeting.meetingName || '이름 없음',
      description: stripHtmlTags(meeting.description || ''),
      date: formatMeetingDate(meeting.meetingTime),
      image: meeting.meetingBackground || '/images/illustrations/characters/5.png'
    }))

    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box className="p-3 px-0 border-b border-gray-200 flex items-center justify-between bg-white">
          <Box className="flex items-center">
            <IconButton
              onClick={() => {
                // Return to the previous view (user-chat or group-chat) or default to user-chat
                const viewToReturn = previousView || 'user-chat'
                setCurrentView(viewToReturn)
                setPreviousView(null)
              }}
              aria-label="back"
            >
              <i className="ri-arrow-left-s-line text-3xl" />
            </IconButton>
            <Typography className="font-semibold text-black text-[17px]">
              모임 선택하기
            </Typography>
          </Box>
          <Button
            className="text-black font-medium text-[15px]"
            disabled={!selectedClub}
            onClick={() => {
              if (selectedClub && currentRoom && currentRoom.id) {
                const meetingId = parseInt(selectedClub.id)
                // Send club link - uses optimistic update so message appears immediately
                sendClubLink({
                  id: meetingId,
                  name: selectedClub.name,
                  avatar: selectedClub.image
                }, currentRoom.id)

                // Clear selection and switch view back to previous view
                // The optimistic message will show, socket will confirm it
                setSelectedClub(null)
                // Return to the previous view (user-chat or group-chat) or default based on currentRoom type
                const viewToReturn = previousView || (currentRoom.type === 'group' ? 'group-chat' : 'user-chat')
                setCurrentView(viewToReturn)
                setPreviousView(null)
              } else {
                // If currentRoom is missing or invalid, go back to main view
                setSelectedClub(null)
                setCurrentView('main')
                setCurrentRoom(null) // CRITICAL FIX: Clear currentRoom when going back to main view
                setPreviousView(null)
              }
            }}
          >
            확인
          </Button>
        </Box>

        {/* Club List */}
        <Box className="flex-1 overflow-y-auto py-4">
          {meetingsLoading ? (
            <Box className="flex items-center justify-center h-64">
              <Typography variant="body2" className="text-gray-500">
                모임을 불러오는 중...
              </Typography>
            </Box>
          ) : meetingsError ? (
            <Box className="flex flex-col items-center justify-center h-64 space-y-2">
              <Typography variant="body2" className="text-red-500">
                {meetingsError}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={fetchMeetings}
              >
                다시 시도
              </Button>
            </Box>
          ) : formattedClubs.length === 0 ? (
            <Box className="flex items-center justify-center h-64">
              <Typography variant="body2" className="text-gray-500">
                선택할 수 있는 모임이 없습니다.
              </Typography>
            </Box>
          ) : (
            <Box className="space-y-5 p-4">
              {formattedClubs.map((club, index) => (
                <Box
                  key={club.id}
                  className={`bg-white overflow-hidden cursor-pointer h-[297px] transition-all duration-300 hover:scale-[1.01] ${selectedClub?.id === club.id
                    ? 'border-blue-500 ring-2 ring-blue-300'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => setSelectedClub(club)}
                  sx={{
                    marginLeft: 0,
                    marginRight: 0,
                    boxShadow: selectedClub?.id === club.id
                      ? '0 -2px 4px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(59, 130, 246, 0.1)'
                      : '0 -1px 2px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
                    '&:hover': {
                      boxShadow: selectedClub?.id === club.id
                        ? '0 -3px 6px rgba(59, 130, 246, 0.15), 0 3px 6px rgba(59, 130, 246, 0.15)'
                        : '0 -2px 4px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.08)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  {/* Club Image */}
                  <Box className="w-full h-48 relative overflow-hidden mb-1">
                    {club.image ? (
                      <img
                        src={club.image}
                        alt={club.name}
                        className="w-full h-full object-cover rounded-[8px]"
                        onError={(e) => {
                          // Fallback to placeholder if image fails to load
                          const target = e.target as HTMLImageElement
                          target.src = '/images/illustrations/characters/5.png'
                        }}
                      />
                    ) : (
                      <Box className="w-full h-full bg-black flex items-center justify-center">

                      </Box>
                    )}
                  </Box>

                  {/* Club Info */}
                  <Box className={`pt-2 pb-4 ${selectedClub?.id === club.id ? 'bg-blue-50' : 'bg-white'}`}>
                    <Typography className="text-gray-700 block text-[12px] font-weight-600 font-semibold">
                      {club.date}
                    </Typography>
                    <Typography className={`font-regular text-[18px] font-weight-400 mb-1 ${selectedClub?.id === club.id ? 'text-blue-700' : 'text-black'}`}>
                      {club.name}
                    </Typography>
                    <Typography className={`font-normal text-[14px] font-weight-400 line-clamp-2 ${selectedClub?.id === club.id ? 'text-gray-700' : 'text-gray-600'}`}>
                      {club.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  // Club Host Views
  const renderClubHostChat = () => {
    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box className="px-0 py-3 border-b border-gray-200 flex items-center justify-start bg-white">
          <IconButton
            onClick={() => {
              setCurrentView('main')
              // CRITICAL FIX: Clear currentRoom when going back to main view
              setCurrentRoom(null)
            }}
            aria-label="back"
            size="small"
          >
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>
          <Box className="flex items-center">
            <Avatar className="w-8 h-8 bg-gray-300" />
            <Button
              onClick={() => setCurrentView('club-host-options')}
              className="ml-2 normal-case p-0 min-w-0"
              variant="text"
            >
              <Typography className="font-semibold text-black text-[18px]">
                Club_name
              </Typography>
            </Button>
          </Box>
          <IconButton onClick={() => setCurrentView('club-host-options')} size="small">
            <i className="ri-arrow-right-s-line text-gray-500" />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Timestamp 1 */}
          <Box className="text-center">
            <Typography variant="caption" className="text-gray-500 text-xs">
              목요일 19:44
            </Typography>
          </Box>

          {/* My message (right aligned) */}
          <Box className="flex justify-end px-4">
            <Box className="bg-gray-500 text-white rounded-full p-3 max-w-xs">
              <Typography variant="body2" className="text-white">
                뭐야 이런게 있었네
              </Typography>
            </Box>
          </Box>

          {/* Timestamp */}
          <Box className="text-center">
            <Typography variant="caption" className="text-gray-500">
              목요일 21:35
            </Typography>
          </Box>

          {/* Other user's message */}
          <Box className="flex items-start mr-5 space-x-2">
            <Avatar className="w-8 h-8 bg-gray-300 flex-shrink-0" />
            <Box className="flex-1">
              <Typography className="px-3 text-gray-800 text-[11px] mb-1 block">
                User name
              </Typography>
              <Box className="bg-gray-100 rounded-full p-3 inline-block max-w-xs">
                <Typography variant="body2" className="text-gray-800">
                  뭐야 이런게 있었네
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Other user's message 2 (Lorem Ipsum) */}
          <Box className="flex items-start space-x-2 mr-5">
            <Avatar className="w-8 h-8 bg-gray-300 flex-shrink-0" />
            <Box className="flex-1">
              <Typography className="px-3 text-gray-800 text-[11px] mb-1 block">
                User name
              </Typography>
              <Box className="bg-gray-100 rounded-lg p-3 inline-block max-w-md">
                <Typography variant="body2" className="text-gray-800 text-sm leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Input Area */}
        <Box className="p-4 border-t border-gray-200 bg-white relative">
          <Box className="">
            {/* Plus button */}
            <IconButton
              onClick={() => setShowFileOptions(!showFileOptions)}
              className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-200 z-10 text-gray-600 flex items-center justify-center"
              size="small"
            >
              <i className="ri-add-line text-lg" />
            </IconButton>

            {/* Options popover */}
            {showFileOptions && (
              <Box className="file-options-popover absolute bottom-16 right-0 left-0" sx={{ zIndex: 1000 }}>
                {/* Panel */}
                <Box className="to-white/50 backdrop-blur-md from-transparent border-gray-100 rounded-xl overflow-hidden min-w-[240px] bg-gradient-to-b" sx={{ zIndex: 1000 }}>
                  <div className="divide-y pt-8 divide-gray-200">
                    <Button size="small" className="w-full justify-start py-2 px-4" onClick={triggerImagePicker}>
                      <span className="w-10 h-10 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                        <i className="ri-image-line" />
                      </span>
                      <span className="text-gray-800">사진</span>
                    </Button>
                    <Button size="small" className="w-full justify-start py-2 px-4" onClick={triggerFilePicker}>
                      <span className="w-10 h-10 rounded-full bg-gray-300 inline-flex items-center justify-center mr-2 text-gray-700">
                        <i className="ri-folder-2-line" />
                      </span>
                      <span className="text-gray-800">파일</span>
                    </Button>
                  </div>
                </Box>
              </Box>
            )}

            {/* Input field */}
            <TextField
              fullWidth
              placeholder="메세지 보내기..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f5f5f5',
                  borderRadius: '9999px',
                  paddingLeft: '33px',
                  height: '44px'
                },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiInputBase-input': {
                  padding: '12px 16px',
                  fontSize: '0.9rem'
                },
                '& .MuiInputBase-input::placeholder': {
                  color: '#9ca3af',
                  opacity: 1
                }
              }}
            />
          </Box>
        </Box>
      </Box>
    )
  }

  const renderClubHostOptions = () => {
    return (
      <Box className="h-full flex flex-col">
        {/* Header */}
        <Box className="p-3 px-0 flex items-start justify-between bg-white">
          <IconButton onClick={() => setCurrentView('club-host-chat')} aria-label="back">
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>
          {/* Club Profile */}
          <Box className="text-center mt-3 mb-6">
            <Avatar className="w-20 h-20 mx-auto mb-3 bg-gray-300" />
            <Typography className="font-semibold text-black text-[20px]">
              Club_name
            </Typography>
          </Box>
          <IconButton sx={{ visibility: 'hidden' }} onClick={() => setCurrentView('club-host-chat')} aria-label="back">
            <i className="ri-arrow-left-s-line text-3xl" />
          </IconButton>

        </Box>

        <Box className="flex-1 overflow-y-auto p-4">


          {/* Meeting Information Card */}
          <Box className="mb-6">
            <Box className="shadow-sm rounded-xl p-3 bg-white">
              <Box className="flex items-start">
                <Box className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center mr-3">
                  <i className="ri-calendar-event-line text-white" />
                </Box>
                <Box className="flex-1">
                  <Typography className="text-black text-[16px] font-semibold mb-1">예약한 모임</Typography>
                  <Typography className="text-gray-600 text-[10px] leading-snug flex items-center mb-0.5">
                    Club name 8월 12일 월요일 15:45
                  </Typography>
                  <Typography className="text-gray-500 text-[10px] leading-snug">테스트라이브 강좌진행</Typography>
                  {groupMeetingId && (

                    <Button className="mt-2 px-0 py-1 text-blue-600 text-[16px] font-medium" variant="text"
                      onClick={handleViewMeetingDetails}
                    >
                      모임 자세히 보기
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Chat Management Options */}
          <List className="p-0">
            <ListItem className="bg-transparent p-0">
              <Box className="flex items-center justify-between w-full">
                <Box className="w-8 h-8 flex items-center justify-center mr-3">
                  <i className="ri-chat-1-line text-gray-800" />
                </Box>
                <Box className="flex items-center justify-between flex-1 border-y border-gray-200">
                  <Typography className="text-black py-3 font-medium">참가자간 채팅 허용</Typography>
                  <Switch defaultChecked color="success" />
                </Box>
              </Box>
            </ListItem>

            <ListItem
              component="button"
              className="bg-transparent p-0"
              sx={{ cursor: 'pointer' }}
              onClick={() => setCurrentView('kick-select')}
            >
              <Box className="flex items-center justify-between w-full">
                <Box className="w-8 h-8 flex items-center justify-center mr-3">
                  <i className="ri-user-fill text-gray-800" />
                </Box>
                <Typography className="text-black py-3 flex-1 border-b border-gray-200 font-medium">참가자 내보내기</Typography>
              </Box>
            </ListItem>

            <ListItem className="bg-transparent p-0" onClick={() => window.open('https://support.thenoldam.com/')}>
              <Box className="flex items-center justify-between w-full">
                <Box className="w-8 h-8 flex items-center justify-center mr-3">
                  <i className="ri-error-warning-line text-gray-800" />
                </Box>
                <Typography className="text-black py-3 flex-1 border-b border-gray-200 font-medium">보고</Typography>
              </Box>
            </ListItem>

            <ListItem className="bg-transparent p-0" >
              <Box className="flex items-center justify-between w-full">
                <Box className="w-8 h-8 flex items-center justify-center mr-3">
                  <i className="ri-forbid-line text-gray-800" />
                </Box>
                <Typography className="text-black py-3 flex-1 border-b border-gray-200 font-medium">차단</Typography>
              </Box>
            </ListItem>

            <ListItem
              component="button"
              className="bg-transparent p-0"
              sx={{ cursor: 'pointer' }}
              onClick={() => setShowClubHostLeaveConfirm(true)}
            >
              <Box className="flex items-center justify-between w-full">
                <Box className="w-8 h-8 flex items-center justify-center mr-3">
                  <i className="ri-delete-bin-line text-red-700" />
                </Box>
                <Typography className="text-red-500 py-3 flex-1 font-medium">채팅방 나가기</Typography>
              </Box>
            </ListItem>
          </List>
        </Box>
      </Box>
    )
  }


  // Main render
  // Prevent body scroll when chat is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <Box className="fixed inset-0 bg-white z-40 flex flex-col overflow-hidden">
      {/* Error Display */}
      {/* {error && (
        <Box className="p-4 bg-red-100 border border-red-300 text-red-700">
          <Typography variant="body2">{error}</Typography>
        </Box>
      )} */}

      {/* Loading Overlay */}
      {loading && (
        <Box className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <Typography>로딩 중...</Typography>
        </Box>
      )}

      {/* Main content based on current view */}
      {currentView === 'main' && renderMainChat()}
      {currentView === 'hidden-requests' && renderHiddenRequests()}
      {currentView === 'user-chat' && renderUserChat()}
      {currentView === 'group-chat' && renderGroupChat()}
      {currentView === 'search' && renderSearchView()}
      {currentView === 'thread' && renderThreadView()}

      {currentView === 'user-options' && renderUserOptions()}
      {currentView === 'group-options' && renderGroupOptions()}

      {/* Message action menu - removed, actions now in header only */}

      {/* Click outside to deselect all messages */}
      {(selectedMessage || selectedMessages.size > 0 || messageMenuAnchor) && !isSelectionMode && (
        <Box
          data-nextjs-scroll-disabled="true"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 997, // Lower than message boxes and buttons (1000+) and header (1002)
            bgcolor: 'transparent',
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            // Only deselect if clicking directly on the overlay (not on any child elements)
            const target = e.target as HTMLElement

            // Don't deselect if clicking on buttons, icons, header elements, or message containers
            const isButton = target.closest('button') || target.closest('[role="button"]') || target.tagName === 'BUTTON' || target.closest('i')
            const isHeader = target.closest('[data-chat-header]')
            const isMessageArea = target.closest('[data-message-container]') || target.closest('[data-message-box]')

            // If click is directly on the overlay box itself (not on any child)
            if (target === e.currentTarget && !isButton && !isHeader && !isMessageArea) {
              setSelectedMessage(null)
              setSelectedMessages(new Set())
              setMessageMenuAnchor(null)
            }
          }}
          onMouseDown={(e) => {
            // Stop propagation to prevent overlay from intercepting button clicks
            const target = e.target as HTMLElement
            const isButton = target.closest('button') || target.closest('[role="button"]') || target.tagName === 'BUTTON' || target.closest('i')
            const isHeader = target.closest('[data-chat-header]')
            const isMessageArea = target.closest('[data-message-container]') || target.closest('[data-message-box]')

            if (isButton || isHeader || isMessageArea) {
              e.stopPropagation()
            }
          }}
        />
      )}
      {currentView === 'kick-select' && renderKickSelect()}
      {currentView === 'club-select' && renderClubSelect()}

      {/* Club Host Views */}
      {currentView === 'club-host-chat' && renderClubHostChat()}

      {currentView === 'club-host-options' && renderClubHostOptions()}

      {/* Confirmation Dialogs */}

      {/* Block User Dialog */}
      <Dialog open={showBlockConfirm} hideBackdrop onClose={() => setShowBlockConfirm(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(105, 104, 104, 0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none !important',
            borderRadius: '20px'
          }
        }}
      >
        <DialogTitle className='text-center text-black text-[17px] pb-0 px-3 font-semibold'>이 유저를 차단하시겠어요?</DialogTitle>
        <DialogContent>
          <Typography className='text-center text-[13px] text-black'>
            언제든지 나중에 차단을 해제할 수 있어요
          </Typography>
        </DialogContent>
        <DialogActions className='flex p-0 border-t border-gray-300 justify-between'>
          <Button className='w-1/2 p-3 text-blue-600' onClick={() => setShowBlockConfirm(false)}>취소</Button>
          <Divider orientation="vertical" className='border-gray-300 m-0' flexItem />
          <Button className='w-1/2 p-3 m-0 text-blue-600 font-bold' onClick={handleBlockUser} >확인</Button>
        </DialogActions>
      </Dialog>

      {/* Leave Chat Dialog */}
      <Dialog open={showLeaveConfirm} hideBackdrop onClose={() => setShowLeaveConfirm(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(105, 104, 104, 0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none !important',
            borderRadius: '20px'
          }
        }}
      >
        <DialogTitle className='text-center text-black text-[17px] pb-0 px-3 font-semibold'>채팅방을 나가시겠어요?</DialogTitle>
        <DialogContent>
          <Typography className='text-center text-[13px] text-black'>
            채팅방을 나가면 채팅목록 및 대화 내용이 삭제 <br></br>되고 복구할 수 없어요.
          </Typography>
        </DialogContent>
        <DialogActions className='flex p-0 border-t border-gray-300 justify-between'>
          <Button className='w-1/2 p-3 text-blue-600' onClick={() => setShowLeaveConfirm(false)}>취소</Button>
          <Divider orientation="vertical" className='border-gray-300 m-0' flexItem />
          <Button className='w-1/2 p-3 m-0 text-blue-600 font-bold' onClick={handleLeaveChat} >확인</Button>
        </DialogActions>
      </Dialog>

      {/* Kick Users Dialog */}
      <Dialog
        open={showKickConfirm}
        hideBackdrop
        onClose={() => setShowKickConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: '14px',
            maxWidth: '320px',
            width: '80%',
            backgroundColor: 'rgba(150, 147, 147, 0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none !important',
          }
        }}
      >
        <DialogContent className="p-4 text-center">
          <Typography className="font-semibold text-[17px] text-black">
            선택한 참가자를 내보낼까요?
          </Typography>
        </DialogContent>
        <DialogActions className="border-t flex justify-between border-gray-300 p-0">
          <Button
            onClick={() => setShowKickConfirm(false)}
            className="w-1/2 p-3 m-0 text-blue-600"
          >
            취소
          </Button>
          <Divider orientation="vertical" className="border-gray-300 m-0" flexItem />
          <Button
            onClick={() => {
              handleKickUsers()
              setShowKickConfirm(false)
              setCurrentView('club-host-options')
            }}

            className="w-1/2 p-3 m-0 text-blue-600 font-bold"
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* Club Host Leave Chat Dialog */}
      <Dialog
        open={showClubHostLeaveConfirm}
        hideBackdrop
        onClose={() => setShowClubHostLeaveConfirm(false)}
        PaperProps={{
          sx: {
            borderRadius: '14px',
            maxWidth: '320px',
            width: '80%',
            backgroundColor: 'rgba(150, 147, 147, 0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none !important',
          }
        }}
      >
        <DialogContent className="p-4 text-center">
          <Typography className="font-semibold text-[17px] text-black">
            채팅방을 나가시겠어요?
          </Typography>
          <Typography className="text-[13px] text-black">
            호스트가 나가면 채팅방이 비활성화되요.
          </Typography>
        </DialogContent>
        <DialogActions className="border-t flex justify-between border-gray-300 p-0">
          <Button
            onClick={() => setShowClubHostLeaveConfirm(false)}
            className="w-1/2 p-3 m-0 text-blue-600"
          >
            취소
          </Button>
          <Divider orientation="vertical" className="border-gray-300 m-0" flexItem />
          <Button
            onClick={() => {
              handleLeaveChat()
              setShowClubHostLeaveConfirm(false)
              setCurrentView('main')
              setCurrentRoom(null) // CRITICAL FIX: Clear currentRoom when leaving chat
            }}
            className="w-1/2 p-3 m-0 text-blue-600 font-bold"
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ChatSystem
