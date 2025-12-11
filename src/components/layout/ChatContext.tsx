'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ChatContextType {
  showChat: boolean
  chatView: 'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'search' | null
  setShowChat: (show: boolean) => void
  setChatView: (view: 'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'search' | null) => void
  openChat: () => void
  closeChat: () => void
  openSearch: () => void
  hasMessages: boolean
  setHasMessages: (hasMessages: boolean) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: ReactNode
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [showChat, setShowChat] = useState(false)
  const [chatView, setChatView] = useState<'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'search' | null>(null)
  const [hasMessages, setHasMessages] = useState(false)

  const openChat = () => {
    setShowChat(true)
    setChatView('main')
  }

  const closeChat = () => {
    setShowChat(false)
    setChatView(null)
  }

  const openSearch = () => {
    setShowChat(true)
    setChatView('search')
  }

  const value: ChatContextType = {
    showChat,
    chatView,
    setShowChat,
    setChatView,
    openChat,
    closeChat,
    openSearch,
    hasMessages,
    setHasMessages
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}
