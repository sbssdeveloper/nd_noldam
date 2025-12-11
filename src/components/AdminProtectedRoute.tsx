'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

export default function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isAuthenticated, loading } = useAdminAuth()
  const router = useRouter()
  const { navigate } = useNavigation()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin-login')
    }
  }, [isAuthenticated, loading, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
