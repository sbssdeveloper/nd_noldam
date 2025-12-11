'use client'

import { Button } from '@mui/material'
import { useAppDispatch } from '@/store/hooks'
import { clearAuth } from '@/store/slices/authSlice'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

interface LogoutButtonProps {
  variant?: 'text' | 'outlined' | 'contained'
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function LogoutButton({
  variant = 'outlined',
  size = 'medium',
  className = ''
}: LogoutButtonProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { navigate } = useNavigation()

  const handleLogout = async () => {
    try {
      // Call logout API
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Clear auth state and redirect
        dispatch(clearAuth())
        navigate('/login')
      } else {
        // Logout failed
        // Still logout locally even if API fails
        dispatch(clearAuth())
        navigate('/login')
      }
    } catch (error) {
      // Logout error
      // Still logout locally even if API fails
      dispatch(clearAuth())
      navigate('/login')
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
      color="error"
    >
      Logout
    </Button>
  )
}
