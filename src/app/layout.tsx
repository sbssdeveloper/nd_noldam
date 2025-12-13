// MUI Imports
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

// Third-party CSS Imports (local copy to avoid Next.js 15 flight CSS loader issues)
import '@/styles/perfect-scrollbar.css'

// Type Imports
import type { ChildrenType } from '@core/types'

// Component Imports
import ClientProviders from '@components/ClientProviders'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Style Imports
import '@/app/globals.css'

// Generated Icon CSS Imports
import '@assets/iconify-icons/generated-icons.css'

import type { Metadata } from 'next'
import { SITE_URL, getDefaultOgImage } from '@/utils/seo'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '더놀담',
  description: '놀면서 담는 것들, 더 놀담.',
  icons: {
    icon: '/app/favicon.ico',
    shortcut: '/app/favicon.ico',
    apple: '/app/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: 'thenoldam',
    title: '더놀담',
    description: '놀면서 담는 것들, 더 놀담.',
    images: [
      {
        url: getDefaultOgImage(),
        width: 1200,
        height: 630,
        alt: '더놀담',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '더놀담',
    description: '놀면서 담는 것들, 더 놀담.',
    images: [getDefaultOgImage()],
  },
  // Disable all caching
  other: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  }
}

const RootLayout = async (props: ChildrenType) => {
  const { children } = props

  // Vars
  const systemMode = (await getSystemMode()) as 'light' | 'dark'
  const direction = 'ltr'

  return (
    <html id='__next' lang='en' dir={direction} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link 
          rel="stylesheet" 
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          crossOrigin="anonymous"
        />
        {/* Suppress CSS preload warnings in development */}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  if (typeof window === 'undefined') return;
                  
                  // Suppress browser preload warnings
                  const originalWarn = console.warn;
                  console.warn = function() {
                    const args = Array.from(arguments);
                    const message = args[0]?.toString() || '';
                    
                    // Filter out CSS preload warnings
                    if (message.includes('was preloaded using link preload') && 
                        message.includes('not used within a few seconds')) {
                      return; // Suppress this warning
                    }
                    
                    originalWarn.apply(console, args);
                  };
                  
                  // Also intercept PerformanceObserver warnings if any
                  if (window.PerformanceObserver) {
                    try {
                      const observer = new PerformanceObserver(function(list) {
                        // Allow performance entries but suppress warnings
                      });
                      observer.observe({ entryTypes: ['resource'] });
                    } catch(e) {
                      // Ignore
                    }
                  }
                })();
              `,
            }}
          />
        )}
      </head>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <InitColorSchemeScript attribute='data' defaultMode={systemMode} />
        <ClientProviders
          direction={direction}
          systemMode={systemMode}
          settingsCookie={{}}
        >
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}

export default RootLayout
