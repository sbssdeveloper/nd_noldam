'use client'

// React Imports
import type { ReactNode } from 'react'

// Redux Imports
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'

// Store Imports
import { store, persistor } from '@/store'

interface ReduxProviderProps {
  children: ReactNode
}

const ReduxProvider = ({ children }: ReduxProviderProps) => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  )
}

export default ReduxProvider
