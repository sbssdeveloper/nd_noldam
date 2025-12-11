// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import ClientProviders from '@components/ClientProviders'
import GuestOnlyRoute from '@/hocs/GuestOnlyRoute'

const LoginLayout = (props: ChildrenType) => {
  const { children } = props

  // Vars
  const direction = 'ltr'

  return (
    <ClientProviders 
      direction={direction} 
      systemMode="light"
      settingsCookie={{}}
      disableChat={true} // Disable chat system on login page
    >
      <GuestOnlyRoute>
        <div className='min-h-screen bg-white'>
          {children}
        </div>
      </GuestOnlyRoute>
    </ClientProviders>
  )
}

export default LoginLayout
