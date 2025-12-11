// SEO and Open Graph utility functions

const FALLBACK_SITE_URL = 'https://thenoldam.com'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL
const DEFAULT_OG_IMAGE = '/images/open-graph-image.jpg'

/**
 * Convert relative image URL to absolute URL for Open Graph
 */
export function getAbsoluteImageUrl(relativePath: string | null | undefined): string {
  if (!relativePath) {
    return `${SITE_URL}${DEFAULT_OG_IMAGE}`
  }
  
  // If already absolute, return as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }
  
  // Ensure leading slash
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`
  return `${SITE_URL}${cleanPath}`
}

/**
 * Extract first image URL from post content
 * Handles both array format (with type: 'image') and HTML string format
 */
export function extractFirstImageFromPost(content: string | null | undefined, imageUrl: string | null | undefined): string | null {
  // First check explicit imageUrl
  if (imageUrl) {
    return imageUrl
  }
  
  if (!content) {
    return null
  }
  
  try {
    // Try parsing as JSON array (content might be array of content blocks)
    if (content.startsWith('[')) {
      const contentArray = JSON.parse(content)
      if (Array.isArray(contentArray)) {
        const firstImage = contentArray.find((item: any) => item.type === 'image' && item.url)
        if (firstImage?.url) {
          return firstImage.url
        }
      }
    }
    
    // Try extracting from HTML string
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1]
    }
  } catch (error) {
    // If parsing fails, continue with HTML extraction
  }
  
  return null
}

/**
 * Strip HTML tags and decode entities from text
 */
export function stripHTML(html: string | null | undefined): string {
  if (!html) return ''
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '')
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  
  return text.trim()
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string | null | undefined, maxLength: number = 160): string {
  if (!text) return ''
  
  const cleaned = stripHTML(text)
  if (cleaned.length <= maxLength) return cleaned
  
  return cleaned.substring(0, maxLength - 3) + '...'
}

/**
 * Generate default OG image URL (absolute)
 */
export function getDefaultOgImage(): string {
  return getAbsoluteImageUrl(DEFAULT_OG_IMAGE)
}

