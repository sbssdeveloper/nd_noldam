'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ChatSystem from '@/components/chat/ChatSystem'
import FooterNavbar from '@/components/layout/FooterNavbar'

export default function ChatPage() {
    const searchParams = useSearchParams()
    const [currentChatView, setCurrentChatView] = useState<'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'kick-select' | 'club-select' | 'search' | 'club-host-chat' | 'club-host-options' | 'hidden-requests'>('main')
    const [initialRoomId, setInitialRoomId] = useState<string | null>(null)
    const [initialRoomType, setInitialRoomType] = useState<'user' | 'group' | null>(null)

    // Read URL query parameters on mount
    useEffect(() => {
        const paramsObject = searchParams ? Object.fromEntries(Array.from(searchParams.entries())) : {}
        console.log('[ChatPage] Mounted with search params:', paramsObject)
        const roomId = searchParams?.get('roomId')
        const type = searchParams?.get('type') as 'user' | 'group' | null

        if (roomId && type) {
            setInitialRoomId(roomId)
            setInitialRoomType(type)
            // Set the view based on type
            if (type === 'user') {
                setCurrentChatView('user-chat')
            } else if (type === 'group') {
                setCurrentChatView('group-chat')
            }
        }
    }, [searchParams])

    useEffect(() => {
        console.log('[ChatPage] Rendered on client')
    }, [])

    const handleViewChange = (view: 'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'kick-select' | 'club-select' | 'search' | 'club-host-chat' | 'club-host-options' | 'hidden-requests') => {
        setCurrentChatView(view)
    }

    const handleSearchClick = () => {
        // Handle search click if needed
        // Search clicked
    }

    // Hide footer navbar when:
    // - Any chat view is open (user-chat, group-chat, club-host-chat)
    // - Any options view is open (user-options, group-options, club-host-options)
    // - Search view is open
    // Show footer navbar only on main list view
    const shouldHideFooter = currentChatView !== 'main'

    return (
        <div className="h-screen w-full flex flex-col">
            {/* Temporary placeholder - Uncomment below to enable chat */}
            {/* <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
                <div className="text-center px-6">
                    <div className="mb-6">
                        <svg
                            className="w-20 h-20 mx-auto text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        준비 중입니다
                    </h2>
                    <p className="text-gray-600 text-lg leading-relaxed">
                        이 기능은 베타 테스트 기간 동안<br />
                        업데이트될 예정입니다
                    </p>
                </div>
            </div> */}

            {/* Original Chat Implementation - Commented out for beta testing */}
            <div className="flex-1">
                <ChatSystem
                    isOpen={true}
                    onViewChange={handleViewChange}
                    initialRoomId={initialRoomId}
                    initialRoomType={initialRoomType}
                />
            </div>

            {/* Show footer navbar only on main chat list view */}
            {!shouldHideFooter && <FooterNavbar onSearchClick={handleSearchClick} />}
        </div>
    )
}
