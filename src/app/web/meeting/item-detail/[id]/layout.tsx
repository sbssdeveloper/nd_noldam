import type { Metadata } from 'next'
import { prisma } from '@/utils/prisma'
import {
    getAbsoluteImageUrl,
    truncateText,
    getDefaultOgImage,
    SITE_URL
} from '@/utils/seo'

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    const meetingId = parseInt(id)

    if (isNaN(meetingId)) {
        return {
            title: '더놀담',
            description: '놀면서 담는 것들, 더 놀담.',
        }
    }

    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            select: {
                id: true,
                meetingName: true,
                description: true,
                meetingBackground: true,
                status: true,
                meetingTime: true,
                roadNameAddress: true,
            }
        })

        // If meeting doesn't exist or is draft, return default metadata (no sharing)
        if (!meeting || meeting.status === 'draft') {
            return {
                title: '더놀담',
                description: '놀면서 담는 것들, 더 놀담.',
                robots: {
                    index: false,
                    follow: false,
                }
            }
        }

        // Prioritize meetingBackground over image
        const imageUrl = meeting.meetingBackground
        const ogImage = imageUrl ? getAbsoluteImageUrl(imageUrl) : getDefaultOgImage()

        // Generate title and description
        const title = meeting.meetingName || `모임 - 더놀담`
        const description = truncateText(meeting.description || `${meeting.meetingName} 모임에 참여해보세요.`)
        const url = new URL(`/meeting/item-detail/${meetingId}`, SITE_URL).toString()

        return {
            title,
            description,
            openGraph: {
                type: 'website',
                locale: 'ko_KR',
                url,
                siteName: 'thenoldam',
                title,
                description,
                images: [
                    {
                        url: ogImage,
                        width: 1200,
                        height: 630,
                        alt: title,
                    },
                ],
            },
            twitter: {
                card: 'summary_large_image',
                title,
                description,
                images: [ogImage],
            },
        }
    } catch (error) {
        // On error, return default metadata
        return {
            title: '더놀담',
            description: '놀면서 담는 것들, 더 놀담.',
        }
    }
}

export default function MeetingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}

