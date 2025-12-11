'use client'

// React Imports
import { useEffect, useState } from 'react'

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

// Utils Imports
import { isAuthenticated } from '@/utils/api'

export default function AuthGuard({ children }: ChildrenType) {
  const router = useRouter()
  const { navigate } = useNavigation()
  const { isAuthenticated: authState, token } = useAppSelector((state) => state.authReducer)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const mounted = useMounted()

  useEffect(() => {
    // Check if user is authenticated through Redux state (which is persisted in localStorage)
    if (!authState || !token) {
      if (!isRedirecting) {
        setIsRedirecting(true)
        // Immediate redirect when auth is cleared
        const timer = setTimeout(() => {
          navigate('/login')
        }, 500) // Reduced delay for faster logout

        return () => clearTimeout(timer)
      }
    } else if (isRedirecting) {
      // Reset redirecting flag if auth state is restored
      setIsRedirecting(false)
    }
  }, [authState, token, router, isRedirecting])

  // Before mount, render a stable shell to avoid SSR/client mismatch
  if (!mounted) {
    return <PageLoader />
  }

  // Show loading with redirect message if not authenticated
  if (!authState || !token) {
    return <PageLoader />
  }

  return <>{children}</>
}
