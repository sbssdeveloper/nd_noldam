'use client'

import React from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import { usePathname } from 'next/navigation'
import { useAppSelector } from '@/store/hooks'
import { useNavigation } from '@/contexts/NavigationContext'
import WindowRoundedIcon from '@mui/icons-material/WindowRounded'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import SearchSharpIcon from '@mui/icons-material/SearchSharp'
import MarkChatUnreadOutlinedIcon from '@mui/icons-material/MarkChatUnreadOutlined'
// import MarkChatUnreadOutlinedIcon from '@mui/icons-material/MarkChatUnreadOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import { useChat } from '../chat/useChat'

interface FooterNavbarProps {
  onSearchClick: () => void
}

const FooterNavbar: React.FC<FooterNavbarProps> = ({
  onSearchClick
}) => {
  const { navigate, canNavigate } = useNavigation()
  const { rooms } = useChat()
  const pathname = usePathname()
  const [forcedHidden, setForcedHidden] = React.useState(false)
  const { isAuthenticated } = useAppSelector((state: any) => state.authReducer)

  // Allow pages to signal footer visibility (e.g., in-page overlays)
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e && e.detail && typeof e.detail.hidden === 'boolean') {
        setForcedHidden(e.detail.hidden)
      }
    }
    window.addEventListener('footer-visibility', handler as any)
    return () => window.removeEventListener('footer-visibility', handler as any)
  }, [])

  // Don't show navbar when explicitly hidden
  if (forcedHidden) {
    return null
  }

  // Hide on feed create flow pages
  if (pathname && (pathname.startsWith('/feed/create'))) {
    return null
  }

  // Hide on item detail pages
  if (pathname && (pathname.startsWith('/feed/item-detail') || pathname.includes('/item-detail/') || pathname.includes('/item-detail-host/'))) {
    return null
  }

  // Hide on login page
  if (pathname === '/login') {
    return null
  }

  // Hide on settings pages
  if (pathname && pathname.startsWith('/Mypage/settings')) {
    return null
  }

  // Hide on add-meeting page
  if (pathname && pathname.startsWith('/meeting/add-meeting')) {
    return null
  }


  // Active state helpers based on current pathname
  const isHomeActive = pathname === '/' || pathname === '/home'
  const isFeedActive = !!pathname && pathname.startsWith('/feed')
  const isSearchActive = pathname === '/search'
  const isChatActive = pathname === '/chat'
  const isMyActive = pathname === '/profile' || pathname?.startsWith('/Mypage')
  const iconColor = isChatActive ? 'text-blue-500' : 'text-black';
  // Check if there are any unread messages across all rooms
  const hasUnreadMessages = rooms.some(room => (room.unreadCount || 0) > 0);
  const Icon = hasUnreadMessages ? MarkChatUnreadOutlinedIcon : ChatBubbleOutlineOutlinedIcon;

  // Handle chat click with authentication check
  const handleChatClick = () => {
    if (!canNavigate()) return
    if (isAuthenticated) {
      navigate('/chat')
    } else {
      navigate('/login')
    }
  }

  // Handle my page click with authentication check
  const handleMyPageClick = () => {
    if (!canNavigate()) return
    if (isAuthenticated) {
      navigate('/profile')
    } else {
      navigate('/login')
    }
  }

  // Handle home click
  const handleHomeClick = () => {
    if (!canNavigate()) return
    navigate('/')
  }

  // Handle feed click
  const handleFeedClick = () => {
    if (!canNavigate()) return
    navigate('/feed')
  }

  // Handle search click
  const handleSearchClick = () => {
    if (!canNavigate()) return
    navigate('/search')
  }

  return (
    <Box className='fixed bottom-4 left-0 right-0 bg-none z-50' data-nextjs-scroll-disabled="true">
      {/* Navigation Icons */}
      <Box className='grid grid-cols-5 max-w-md mx-4 p-1 border border-radius-50 rounded-full'
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.46)',
          backdropFilter: 'blur(50px)',
        }}
      >
        {/* Home */}
        <Box
          className='flex flex-col items-center py-1 rounded-full justify-center relative'
          sx={{
            padding: isHomeActive ? '8px 12px' : '8px',
            backgroundColor: isHomeActive ? '#e0e0e091' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <IconButton
            className={`${isHomeActive ? 'text-blue-500' : 'text-black'} p-0`}
            onClick={handleHomeClick}
            sx={{ padding: '4px' }}
          >
            <WindowRoundedIcon className='text-xl' />
          </IconButton>
          <Typography
            variant='caption'
            className={`text-xs mt-1 ${isHomeActive ? 'text-blue-500' : 'text-black'}`}
            sx={{ fontSize: '10px', lineHeight: 1.2 }}
          >
            홈
          </Typography>
        </Box>

        {/* Feed */}
        <Box
          className='flex flex-col items-center py-1 rounded-full justify-center relative'
          sx={{
            padding: isFeedActive ? '8px 12px' : '8px',
            backgroundColor: isFeedActive ? '#e0e0e091' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <IconButton
            className={`${isFeedActive ? 'text-blue-500' : 'text-black'} p-0`}
            onClick={handleFeedClick}
            sx={{ padding: '4px' }}
          >
            {/* <i className='ri-rss-line text-xl' /> */}
            <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.87155 12.6667C4.24373 13.1852 3.58975 13.4222 2.90961 13.3778C2.22947 13.3333 1.63529 13.1037 1.12705 12.6889C0.618816 12.2741 0.271272 11.7296 0.0844208 11.0556C-0.102431 10.3815 0.0208913 9.68889 0.454386 8.97778L2.13605 6.22222C1.76235 5.8963 1.46712 5.5037 1.25037 5.04444C1.03363 4.58519 0.925252 4.08889 0.925252 3.55556C0.925252 2.57778 1.27653 1.74074 1.97909 1.04444C2.68165 0.348148 3.52622 0 4.5128 0C5.49937 0 6.34394 0.348148 7.0465 1.04444C7.74906 1.74074 8.10034 2.57778 8.10034 3.55556C8.10034 4.53333 7.74906 5.37037 7.0465 6.06667C6.34394 6.76296 5.49937 7.11111 4.5128 7.11111C4.37826 7.11111 4.24373 7.1037 4.1092 7.08889C3.97467 7.07407 3.84761 7.05185 3.72802 7.02222L2.00152 9.91111C1.83709 10.1778 1.78477 10.4407 1.84456 10.7C1.90435 10.9593 2.03141 11.1704 2.22574 11.3333C2.42006 11.4963 2.65176 11.5889 2.92082 11.6111C3.18989 11.6333 3.45148 11.5407 3.7056 11.3333L13.1229 3.31111C13.7507 2.79259 14.4084 2.55926 15.0961 2.61111C15.7837 2.66296 16.3816 2.8963 16.8898 3.31111C17.3981 3.72593 17.7419 4.27037 17.9212 4.94444C18.1006 5.61852 17.9736 6.31111 17.5401 7.02222L15.8584 9.77778C16.2321 10.1037 16.5273 10.4963 16.7441 10.9556C16.9608 11.4148 17.0692 11.9111 17.0692 12.4444C17.0692 13.4222 16.7179 14.2593 16.0154 14.9556C15.3128 15.6519 14.4682 16 13.4817 16C12.4951 16 11.6505 15.6519 10.948 14.9556C10.2454 14.2593 9.89411 13.4222 9.89411 12.4444C9.89411 11.4667 10.2454 10.6296 10.948 9.93333C11.6505 9.23704 12.4951 8.88889 13.4817 8.88889C13.6162 8.88889 13.747 8.8963 13.874 8.91111C14.0011 8.92593 14.1244 8.94815 14.244 8.97778L15.9929 6.08889C16.1574 5.82222 16.2097 5.55926 16.1499 5.3C16.0901 5.04074 15.963 4.82963 15.7687 4.66667C15.5744 4.5037 15.3427 4.41111 15.0736 4.38889C14.8046 4.36667 14.543 4.45926 14.2889 4.66667L4.87155 12.6667ZM4.5128 5.33333C5.00608 5.33333 5.42837 5.15926 5.77965 4.81111C6.13093 4.46296 6.30657 4.04444 6.30657 3.55556C6.30657 3.06667 6.13093 2.64815 5.77965 2.3C5.42837 1.95185 5.00608 1.77778 4.5128 1.77778C4.01951 1.77778 3.59723 1.95185 3.24595 2.3C2.89466 2.64815 2.71902 3.06667 2.71902 3.55556C2.71902 4.04444 2.89466 4.46296 3.24595 4.81111C3.59723 5.15926 4.01951 5.33333 4.5128 5.33333ZM13.4817 14.2222C13.9749 14.2222 14.3972 14.0481 14.7485 13.7C15.0998 13.3519 15.2754 12.9333 15.2754 12.4444C15.2754 11.9556 15.0998 11.537 14.7485 11.1889C14.3972 10.8407 13.9749 10.6667 13.4817 10.6667C12.9884 10.6667 12.5661 10.8407 12.2148 11.1889C11.8635 11.537 11.6879 11.9556 11.6879 12.4444C11.6879 12.9333 11.8635 13.3519 12.2148 13.7C12.5661 14.0481 12.9884 14.2222 13.4817 14.2222Z" fill="#181919" />
            </svg>

          </IconButton>
          <Typography
            variant='caption'
            className={`text-xs mt-1 ${isFeedActive ? 'text-blue-500' : 'text-black'}`}
            sx={{ fontSize: '10px', lineHeight: 1.2 }}
          >
            피드
          </Typography>
        </Box>

        {/* Search */}
        <Box
          className='flex flex-col items-center py-1 rounded-full justify-center relative'
          sx={{
            padding: isSearchActive ? '8px 12px' : '8px',
            backgroundColor: isSearchActive ? '#e0e0e091' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <IconButton
            className={`${isSearchActive ? 'text-blue-500' : 'text-black'} p-0`}
            onClick={handleSearchClick}
            sx={{ padding: '4px' }}
          >
            {/* <<i className='ri-search-line text-xl' />> */}
            <SearchSharpIcon className='text-xl' />
          </IconButton>
          {/* No text label for search */}
        </Box>

        {/* Chat */}
        <Box
          className="flex flex-col items-center py-1 rounded-full justify-center relative"
          sx={{
            padding: isChatActive ? '8px 12px' : '8px',
            backgroundColor: isChatActive ? '#e0e0e091' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <IconButton onClick={handleChatClick} sx={{ padding: '4px' }}>
            <Icon className={`relative ${iconColor} p-0 text-xl`} />
          </IconButton>

          <Typography
            variant="caption"
            className={`text-xs mt-1 ${iconColor}`}
            sx={{ fontSize: '10px', lineHeight: 1.2 }}
          >
            채팅
          </Typography>
        </Box>

        {/* My Profile */}
        <Box
          className='flex flex-col items-center py-1 rounded-full justify-center relative'
          sx={{
            padding: isMyActive ? '8px 12px' : '8px',
            backgroundColor: isMyActive ? '#e0e0e091' : 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <IconButton
            className={`${isMyActive ? 'text-blue-500' : 'text-black'} p-0`}
            onClick={handleMyPageClick}
            sx={{ padding: '4px' }}
          >
            <AccountCircleOutlinedIcon className='text-xl' />
          </IconButton>
          <Typography
            variant='caption'
            className={`text-xs mt-1 ${isMyActive ? 'text-blue-500' : 'text-black'}`}
            sx={{ fontSize: '10px', lineHeight: 1.2 }}
          >
            MY
          </Typography>
        </Box>
      </Box>
    </Box >
  )
}

export default FooterNavbar
