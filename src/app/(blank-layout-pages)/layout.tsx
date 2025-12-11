// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import ClientProviders from '@components/ClientProviders'
import BlankLayout from '@layouts/BlankLayout'
import GuestOnlyRoute from '@/hocs/GuestOnlyRoute'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

type Props = ChildrenType

const Layout = async (props: Props) => {
  const { children } = props

  // Vars
  const direction = 'ltr'
  const systemMode = await getSystemMode()

  return (
    <ClientProviders 
      direction={direction} 
      systemMode={systemMode}
      settingsCookie={{}}
    >
      <GuestOnlyRoute>
        <BlankLayout systemMode={systemMode}>{children}</BlankLayout>
      </GuestOnlyRoute>
    </ClientProviders>
  )
}

export default Layout
