// Component Imports
import ClientProviders from '@components/ClientProviders'
import BlankLayout from '@layouts/BlankLayout'
import NotFound from '@/components/NotFound'

// Util Imports
import { getSystemMode, getServerMode } from '@core/utils/serverHelpers'

const NotFoundPage = async () => {
  // Vars
  const direction = 'ltr'
  const systemMode = await getSystemMode()
  const mode = await getServerMode()

  return (
    <ClientProviders 
      direction={direction} 
      systemMode={systemMode}
      settingsCookie={{}}
    >
      <BlankLayout systemMode={systemMode}>
        <NotFound mode={mode} />
      </BlankLayout>
    </ClientProviders>
  )
}

export default NotFoundPage
