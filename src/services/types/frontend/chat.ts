// Chat Types

export interface ChatUser {
  id: string
  nickname: string
  avatar?: string
  isOnline: boolean
  lastSeen: string
  level: number
  activeCommunityBadge?: {
    id?: number | null
    name?: string | null
    imageUrl?: string | null
  } | null
  badge?: {
    id?: number | null
    name?: string | null
    imageUrl?: string | null
  } | null
}

export interface ChatGroup {
  id: string
  name: string
  avatar?: string
  isHost: boolean
  meetingId?: string | null
  meetingName?: string | null
  meetingTime?: string | null
  meetingAddress?: string | null
  meetingDetailedAddress?: string | null
  meetingBackground?: string | null
  allowParticipantChat: boolean
  members: ChatUser[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  content: string
  type: 'text' | 'image' | 'file' | 'club'
  sender: ChatUser
  timestamp: string
  isRead: boolean
  replyTo?: string
  replyToId?: string
  threadCount?: number
  roomId?: string
  tempId?: string // For optimistic updates
  // Attachment fields
  attachmentUrl?: string
  fileName?: string
  fileSize?: number
  // Club link payload
  club?: {
    name: string
    avatar?: string
  }
  clubMeeting?: {
    id: string
    name: string
    image?: string
    meetingTime: string
  }
}

export interface ChatRoom {
  id: string
  type: 'user' | 'group'
  user?: ChatUser
  group?: ChatGroup
  meetingId?: string | null
  lastMessage?: ChatMessage
  unreadCount: number
  lastActivity: string
  isActive: boolean
  isBlocked?: boolean // Indicates if user is blocked (for individual chats)
  isMessageRequest?: boolean // Indicates if this is a message request (non-mutual follow)
  hasMutualFollow?: boolean // Indicates if users mutually follow each other
}

export interface ChatState {
  rooms: ChatRoom[]
  currentRoom: ChatRoom | null
  messages: ChatMessage[]
  loading: boolean
  error: string | null
  showFileOptions: boolean
  showUserOptions: boolean
  showGroupOptions: boolean
  showBlockConfirm: boolean
  showLeaveConfirm: boolean
  showKickConfirm: boolean
  selectedUsers: string[]
}
