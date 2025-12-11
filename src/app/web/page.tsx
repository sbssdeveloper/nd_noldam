'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAppSelector } from '@/store/hooks'
import PageLoader from '@/components/PageLoader'
import type { MeetingData, FeedItem } from '@/services/types/frontend'

const WebRootPage = () => {
  const { user, loading, isAuthenticated } = useAppSelector((state: any) => state.authReducer)
  const router = useRouter()
  const { navigate } = useNavigation()
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
    }

    if (!loading) {
      // Add a small delay to prevent rapid redirects
      redirectTimeoutRef.current = setTimeout(() => {
        if (isAuthenticated && user) {
          // If user is authenticated, redirect to home
          navigate('/')
        } else {
          // If user is not authenticated, redirect to login
          navigate('/login')
        }
      }, 100)
    }

    // Cleanup timeout on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [isAuthenticated, user, loading, router])

  // Show loading spinner while checking authentication
  if (loading) {
    return <PageLoader />
  }

  return null
}

export default WebRootPage
