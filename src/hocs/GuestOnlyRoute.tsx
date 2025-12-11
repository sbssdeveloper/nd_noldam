// Next Imports
import { redirect } from 'next/navigation'

// Type Imports
import type { ChildrenType } from '@core/types'

const GuestOnlyRoute = async ({ children }: ChildrenType) => {
  // Simple guest-only route without complex auth checks
  // Authentication will be handled by client-side components
  return <>{children}</>
}

export default GuestOnlyRoute
