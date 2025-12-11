import type { Metadata } from 'next'
import { SITE_URL, getDefaultOgImage } from '@/utils/seo'

export const metadata: Metadata = {
    title: '더놀담',
    description: '놀면서 담는 것들, 더 놀담.',
    openGraph: {
        type: 'website',
        locale: 'ko_KR',
        url: new URL('/search', SITE_URL).toString(),
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
}

export default function SearchLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}

