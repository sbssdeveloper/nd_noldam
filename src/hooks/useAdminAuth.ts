'use client'

import { useState, useEffect } from 'react'
import { adminConfig, isAdminTokenValid } from '@/apiConfigs/admin'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  level: number
}

export const useAdminAuth = () => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAdminAuth = () => {
      try {
        const adminToken = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${adminConfig.session.cookieName}=`))
          ?.split('=')[1]
        
        const adminUserData = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${adminConfig.session.userDataCookieName}=`))
          ?.split('=')[1]

        if (adminToken && adminUserData) {
          const userData = JSON.parse(decodeURIComponent(adminUserData))
          
          // Check if token is valid using config
          if (isAdminTokenValid(adminToken)) {
            setUser(userData)
            setIsAuthenticated(true)
          } else {
            // Token expired or invalid, clear cookies
            clearAdminAuth()
          }
        } else {
          clearAdminAuth()
        }
      } catch (error) {
        console.error('Error checking admin auth:', error)
        clearAdminAuth()
      } finally {
        setLoading(false)
      }
    }

    checkAdminAuth()
  }, [])

  const clearAdminAuth = () => {
    document.cookie = `${adminConfig.session.cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    document.cookie = `${adminConfig.session.userDataCookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    setUser(null)
    setIsAuthenticated(false)
  }

  const logout = () => {
    clearAdminAuth()
  }

  return {
    user,
    loading,
    isAuthenticated,
    logout
  }
}
