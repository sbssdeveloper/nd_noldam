import type { ChildrenType } from '@core/types'
import GuestOnlyRoute from '@/hocs/GuestOnlyRoute'

const LoginLayout = (props: ChildrenType) => {
  const { children } = props

  return (
    <GuestOnlyRoute>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </GuestOnlyRoute>
  )
}

export default LoginLayout
