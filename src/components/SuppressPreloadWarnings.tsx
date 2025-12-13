'use client'

import { useEffect } from 'react'

/**
 * Suppresses CSS preload warnings in development mode.
 * These warnings occur because Next.js preloads CSS files during HMR,
 * but they may not be used immediately due to rapid code changes.
 */
const SuppressPreloadWarnings = () => {
  useEffect(() => {
    // Only suppress in development
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    // Store original console.warn
    const originalWarn = console.warn

    // Override console.warn to filter out preload warnings
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || ''
      
      // Check if this is a preload warning
      const isPreloadWarning = 
        message.includes('was preloaded using link preload') &&
        message.includes('not used within a few seconds')
      
      // Only suppress preload warnings
      if (!isPreloadWarning) {
        originalWarn.apply(console, args)
      }
      // Silently ignore preload warnings
    }

    // Cleanup: restore original console.warn on unmount
    return () => {
      console.warn = originalWarn
    }
  }, [])

  return null
}

export default SuppressPreloadWarnings

