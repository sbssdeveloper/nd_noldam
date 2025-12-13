'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Box, CircularProgress, Backdrop } from '@mui/material'

interface NavigationContextType {
    isNavigating: boolean
    navigate: (path: string, options?: { replace?: boolean }) => void
    canNavigate: () => boolean
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export const useNavigation = () => {
    const context = useContext(NavigationContext)
    if (!context) {
        throw new Error('useNavigation must be used within NavigationProvider')
    }
    return context
}

interface NavigationProviderProps {
    children: React.ReactNode
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
    const router = useRouter()
    const pathname = usePathname()
    const [isNavigating, setIsNavigating] = useState(false)
    const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const lastNavigationRef = useRef<string | null>(null)
    const currentPathRef = useRef<string>(pathname)

    // Update current path when pathname changes
    useEffect(() => {
        // If pathname changed, navigation is complete
        if (currentPathRef.current !== pathname) {
            currentPathRef.current = pathname
            setIsNavigating(false)

            // Clear timeout
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current)
                navigationTimeoutRef.current = null
            }

            lastNavigationRef.current = null
        }
    }, [pathname])

    const canNavigate = useCallback(() => {
        return !isNavigating
    }, [isNavigating])

    const navigate = useCallback((path: string, options?: { replace?: boolean }) => {
        // Prevent duplicate navigation
        if (isNavigating) {
            return
        }

        // Prevent navigating to the same page
        if (path === pathname) {
            return
        }

        // Prevent duplicate clicks within short time
        if (lastNavigationRef.current === path) {
            return
        }

        setIsNavigating(true)
        lastNavigationRef.current = path

        // Perform navigation
        if (options?.replace) {
            router.replace(path)
        } else {
            router.push(path)
        }

        // Safety timeout: if navigation takes too long (10 seconds), reset state
        navigationTimeoutRef.current = setTimeout(() => {
            setIsNavigating(false)
            lastNavigationRef.current = null
        }, 10000)
    }, [isNavigating, pathname, router])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current)
            }
        }
    }, [])

    return (
        <NavigationContext.Provider value={{ isNavigating, navigate, canNavigate }}>
            {children}

            {/* Global Navigation Loading Overlay */}
            <Backdrop
                open={isNavigating}
                sx={{
                    color: '#fff',
                    zIndex: (theme) => theme.zIndex.drawer + 9999,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(2px)',
                }}
                slotProps={{
                    root: {
                        'data-nextjs-scroll-disabled': 'true',
                    } as any,
                }}
            >
                <CircularProgress color="inherit" size={50} />
            </Backdrop>
        </NavigationContext.Provider>
    )
}

