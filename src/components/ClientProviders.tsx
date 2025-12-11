'use client'

// Type Imports
import type { ChildrenType, Direction } from '@core/types'

// Context Imports
import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'

import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'

// Client Component Imports
import ReduxProvider from '@components/ReduxProvider'
import AuthInitializer from '@/components/AuthInitializer'
// Removed NextAuth SessionProvider - using Redux instead
import { ChatProvider } from '@/components/layout/ChatContext'
import { CustomSessionProvider } from '@/components/CustomSessionProvider'
import { NavigationProvider } from '@/contexts/NavigationContext'

type Props = ChildrenType & {
  direction: Direction
  systemMode: 'light' | 'dark'
  settingsCookie: any
  disableChat?: boolean
}

const ClientProviders = (props: Props) => {
  // Props
  const { children, direction, systemMode, settingsCookie, disableChat = false } = props

  // Use custom session provider for login page to eliminate all session calls
  if (disableChat) {
    return (
      <CustomSessionProvider>
        <ReduxProvider>
          <NavigationProvider>
            <VerticalNavProvider>
              <SettingsProvider settingsCookie={settingsCookie} mode={systemMode}>
                <ThemeProvider direction={direction} systemMode={systemMode}>
                  <AuthInitializer />
                  {children}
                </ThemeProvider>
              </SettingsProvider>
            </VerticalNavProvider>
          </NavigationProvider>
        </ReduxProvider>
      </CustomSessionProvider>
    )
  }

  // Use Redux for authentication (no NextAuth needed)
  const providers = (
    <ReduxProvider>
      <NavigationProvider>
        <VerticalNavProvider>
          <SettingsProvider settingsCookie={settingsCookie} mode={systemMode}>
            <ThemeProvider direction={direction} systemMode={systemMode}>
              <AuthInitializer />
              {children}
            </ThemeProvider>
          </SettingsProvider>
        </VerticalNavProvider>
      </NavigationProvider>
    </ReduxProvider>
  )

  return (
    <ChatProvider>
      {providers}
    </ChatProvider>
  )
}

export default ClientProviders
