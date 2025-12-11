'use client'

// React Imports
import { usePathname } from 'next/navigation'

// MUI Imports
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'

// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import ClientProviders from '@components/ClientProviders'
import ScrollToTop from '@core/components/scroll-to-top'
import { ChatProvider } from '@/components/layout/ChatContext'
import FooterNavbar from '@/components/layout/FooterNavbar'
import ChatSystem from '@/components/chat/ChatSystem'
import { useChat } from '@/components/layout/ChatContext'
import ProtectedRoute from '@/components/ProtectedRoute'

// Wrapper component to use the chat context
const WebLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { showChat, chatView, setShowChat, setChatView, openChat, openSearch, closeChat } = useChat()
  const pathname = usePathname()

  // Hide footer on login page
  const isLoginPage = pathname === '/login' || pathname === '/web/login'

  // Hide footer on chat page - it manages its own footer
  const isChatPage = pathname === '/chat' || pathname === '/web/chat'

  return (
    <div className='min-h-screen bg-gray-50'>
      {children}

      {/* Search Bar - shown when chat is open and in main view, but not on login page */}
      {!isLoginPage && showChat && chatView === 'main' && (
        <Box className='md:hidden fixed bottom-20 left-0 right-0 bg-gray-100 z-50 px-4 py-3'>
          <Box className='bg-gray-200 rounded-2xl px-3 py-2 flex items-center space-x-2'>
            <IconButton
              size='small'
              className='text-gray-600 p-1'
              onClick={openSearch}
            >
              <i className='ri-search-line text-lg' />
            </IconButton>
            <TextField
              fullWidth
              placeholder='검색'
              size='small'
              variant='standard'
              className='bg-transparent'
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const searchValue = (e.target as HTMLInputElement).value
                  if (searchValue.trim()) {
                    openSearch()
                  }
                }
              }}
              sx={{
                '& .MuiInput-root': {
                  '&:before': {
                    display: 'none',
                  },
                  '&:after': {
                    display: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  padding: '8px 0',
                  fontSize: '14px',
                },
              }}
            />
          </Box>
        </Box>
      )}

      {/* Footer Navbar - Hide on login page and chat page (chat page manages its own footer) */}
      {!isLoginPage && !isChatPage && (
        <FooterNavbar
          onSearchClick={openSearch}
        />
      )}

      {/* Chat System */}
      <ChatSystem
        isOpen={showChat}
        onViewChange={(v) => setChatView(v as 'main' | 'user-chat' | 'group-chat' | 'user-options' | 'group-options' | 'thread' | 'search' | null)}
        onSearchClick={openSearch}
      />

      <ScrollToTop className='mui-fixed'>
        <Button variant='contained' className='is-10 bs-10 rounded-full p-0 min-is-0 flex items-center justify-center'>
          <i className='ri-arrow-up-line' />
        </Button>
      </ScrollToTop>
    </div>
  )
}

const WebLayout = (props: ChildrenType) => {
  const { children } = props

  // Vars
  const direction = 'ltr'

  return (
    <ClientProviders
      direction={direction}
      systemMode="light"
      settingsCookie={{}}
    >
      <ChatProvider>
        <ProtectedRoute>
          <WebLayoutContent>
            {children}
          </WebLayoutContent>
        </ProtectedRoute>
      </ChatProvider>
    </ClientProviders>
  )
}

export default WebLayout
