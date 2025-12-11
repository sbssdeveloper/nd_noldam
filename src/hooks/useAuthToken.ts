'use client'

import { useAppSelector } from '@/store/hooks'

export const useAuthToken = (): string | undefined => {
  const { token } = useAppSelector((state) => state.authReducer)
  return token || undefined
}

export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated, token } = useAppSelector((state) => state.authReducer)
  return Boolean(isAuthenticated && token)
}


