'use client'

// React Imports
import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

// MUI Imports
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// Hook Imports
import { useAppSelector } from '@/store/hooks'

// Type Imports
import type { ReactNode } from 'react'

interface LoginRedirectHandlerProps {
  children: ReactNode
}

const LoginRedirectHandler = ({ children }: LoginRedirectHandlerProps) => {
  // Disabled to prevent conflicts with AuthContext
  // AuthContext now handles all authentication logic
  return <>{children}</>
}

export default LoginRedirectHandler
