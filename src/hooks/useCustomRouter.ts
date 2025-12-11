import { useRouter as useNextRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { getActualRoute, getCustomRoute } from '@/config/routes'

export function useCustomRouter() {
  const router = useNextRouter()
  const { navigate } = useNavigation()

  const push = (href: string, options?: any) => {
    // Convert custom route to actual route for internal navigation
    const actualRoute = getActualRoute(href)
    navigate(actualRoute, options)
  }

  const replace = (href: string, options?: any) => {
    // Convert custom route to actual route for internal navigation
    const actualRoute = getActualRoute(href)
    router.replace(actualRoute, options)
  }

  const back = () => {
    router.back()
  }

  const forward = () => {
    router.forward()
  }

  const refresh = () => {
    router.refresh()
  }

  // Helper function to get the custom URL for display purposes
  const getCustomUrl = (actualPath: string) => {
    return getCustomRoute(actualPath)
  }

  return {
    push,
    replace,
    back,
    forward,
    refresh,
    getCustomUrl
  }
}
