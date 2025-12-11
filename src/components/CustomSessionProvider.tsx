'use client'

import React, { createContext, useContext, ReactNode } from 'react'

// Custom session context that doesn't make any API calls
interface CustomSessionContextType {
  data: null
  status: 'unauthenticated'
  update: () => Promise<any>
}

const CustomSessionContext = createContext<CustomSessionContextType>({
  data: null,
  status: 'unauthenticated',
  update: async () => null
})

export const useCustomSession = () => {
  return useContext(CustomSessionContext)
}

interface CustomSessionProviderProps {
  children: ReactNode
}

export const CustomSessionProvider: React.FC<CustomSessionProviderProps> = ({ children }) => {
  const value: CustomSessionContextType = {
    data: null,
    status: 'unauthenticated',
    update: async () => null
  }

  return (
    <CustomSessionContext.Provider value={value}>
      {children}
    </CustomSessionContext.Provider>
  )
}
