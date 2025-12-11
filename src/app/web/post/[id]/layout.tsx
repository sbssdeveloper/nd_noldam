import type { Metadata } from 'next'
import { prisma } from '@/utils/prisma'
import {
    getAbsoluteImageUrl,
    extractFirstImageFromPost,
    truncateText,
    getDefaultOgImage,
    SITE_URL
} from '@/utils/seo'

type Props = {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params
    const postId = parseInt(id)

    if (isNaN(postId)) {
        return {
            title: '더놀담',
            description: '놀면서 담는 것들, 더 놀담.',
        }
    }

    try {
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: {
                id: true,
                title: true,
                content: true,
                imageUrl: true,
                isPublic: true,
                createdAt: true,
                user: {
                    select: {
                        nickname: true,
                    }
                }
            }
        })

        // If post doesn't exist or is private, return default metadata (no sharing)
        if (!post || !post.isPublic) {
            return {
                title: '더놀담',
                description: '놀면서 담는 것들, 더 놀담.',
                robots: {
                    index: false,
                    follow: false,
                }
            }
        }

        // Extract image
        const imageUrl = extractFirstImageFromPost(post.content, post.imageUrl)
        const ogImage = imageUrl ? getAbsoluteImageUrl(imageUrl) : getDefaultOgImage()

        // Generate title and description
        const title = post.title || `게시물 - 더놀담`
        const description = truncateText(post.content || '더놀담에서 게시물을 확인해보세요.')
        const url = new URL(`/post/${postId}`, SITE_URL).toString()

        return {
            title,
            description,
            openGraph: {
                type: 'article',
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
                publishedTime: post.createdAt.toISOString(),
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

export default function PostLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}

