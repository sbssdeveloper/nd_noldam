'use client'

// React Imports
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// Next Imports
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

// Component Imports
import PageLoader from '@/components/PageLoader'
import { useMounted } from '@/hooks/useMounted'

// Type Imports
import type { ChildrenType } from '@core/types'

// Redux Imports
import { useAppSelector } from '@/store/hooks'

export default function ProtectedRoute({ children }: ChildrenType) {
  const router = useRouter()
  const { navigate } = useNavigation()
  const pathname = usePathname()
  const { isAuthenticated: authState, token, loading } = useAppSelector((state) => state.authReducer)
  const [hasRedirected, setHasRedirected] = useState(false)
  const mounted = useMounted()

  // Pages that don't require authentication
  const publicPages = [
    '/web',
    '/web/home',
    '/web/login',
    '/login',
    // Allow unauthenticated access to Feed and Search
    '/web/feed',
    '/feed',
    '/web/search',
    '/search',
    // Allow unauthenticated access to meeting item detail
    '/web/meeting/item-detail',
    '/meeting/item-detail'
  ]

  // Check if current page is public
  const isPublicPage = publicPages.some(page => pathname.startsWith(page))

  useEffect(() => {
    // Don't redirect if it's a public page
    if (isPublicPage) {
      setHasRedirected(false)
      return
    }

    // Only redirect once and only if we haven't already redirected
    if (!authState && !token && !loading && !hasRedirected) {
      setHasRedirected(true)
      navigate('/login')
    }
  }, [authState, token, loading, isPublicPage, hasRedirected, navigate])

  // Before mount, render a stable shell to avoid SSR/client mismatch
  if (!mounted) {
    return <PageLoader />
  }

  // If it's a public page, render children directly
  if (isPublicPage) {
    return <>{children}</>
  }

  // Show loading while checking authentication
  if (loading) {
    return <PageLoader />
  }

  // If not authenticated and we're on a protected page, show simple message
  if (!authState || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Please log in to access this page</p>
          <p className="text-gray-500 text-sm mt-2">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
