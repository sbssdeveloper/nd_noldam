/**
 * Custom hook for safe navigation with loading state
 * Use this hook instead of useRouter().push() to prevent duplicate navigation calls
 * 
 * Example:
 * ```
 * const navigate = useSafeNavigation()
 * 
 * <button onClick={() => navigate('/my-page')}>
 *   Go to My Page
 * </button>
 * ```
 */

'use client'

import { useNavigation } from '@/contexts/NavigationContext'

export const useSafeNavigation = () => {
  const { navigate } = useNavigation()
  return navigate
}

export const useCanNavigate = () => {
  const { canNavigate } = useNavigation()
  return canNavigate
}

