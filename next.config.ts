import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'thenoldam.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'thenoldam.com',
        pathname: '/uploads/**',
      },
    ],
    domains: ['localhost', 'thenoldam.com'],
    // Disable optimization for standalone mode (fixes 400 error)
    unoptimized: true,
    // Alternative: use loader if you have a CDN
    // loader: 'custom',
    // loaderFile: './imageLoader.js',
  },
  // Build optimizations
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material', '@mui/lab'],
  },
  // Disable development indicators (static/dynamic toast)
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // Disable all caching
  generateEtags: false,
  poweredByHeader: false,
  compress: false,
  redirects: async () => {
    return [
      // Custom routing handled by middleware
    ]
  },
  headers: async () => {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          },
        ],
      },
    ]
  },
  // Enable rewrites for custom routing - synchronized with src/config/routes.ts
  rewrites: async () => {
    return [
      // ==========================================
      // STATIC FILES (Uploads)
      // ==========================================
      // Ensure uploads are served from public folder
      { source: '/uploads/:path*', destination: '/uploads/:path*' },
      
      // ==========================================
      // WEB ROUTES (Clean URLs → /web/...)
      // ==========================================
      
      // Root & Core Pages
      { source: '/', destination: '/web/home' },
      { source: '/home', destination: '/web/home' },
      { source: '/login', destination: '/web/login' },
      { source: '/search', destination: '/web/search' },
      { source: '/chat', destination: '/web/chat' },
      { source: '/club-chat', destination: '/web/club-chat' },
      
      // Feed Routes
      { source: '/feed', destination: '/web/feed' },
      { source: '/feed/create', destination: '/web/feed/create' },
      { source: '/feed/feed-detail', destination: '/web/feed/feed-detail' },
      { source: '/feed/item-detail', destination: '/web/feed/item-detail' },
      { source: '/feed/item-detail-host', destination: '/web/feed/item-detail-host' },
      { source: '/feed/post-detail', destination: '/web/feed/post-detail' },
      { source: '/feed/post-detail-social', destination: '/web/feed/post-detail-social' },
      { source: '/feed/trending-feeds/lifestyle', destination: '/web/feed/trending-feeds/lifestyle' },
      
      // Meeting Routes
      { source: '/meeting/add-meeting', destination: '/web/meeting/add-meeting' },
      { source: '/meeting/host-meeting-detail', destination: '/web/meeting/host-meeting-detail' },
      { source: '/meeting/item-detail/:id', destination: '/web/meeting/item-detail/:id' },
      { source: '/meeting/item-detail-host/:id', destination: '/web/meeting/item-detail-host/:id' },
      { source: '/meeting/join-meeting-confirm', destination: '/web/meeting/join-meeting-confirm' },
      { source: '/meeting/cancel-meeting-confirm', destination: '/web/meeting/cancel-meeting-confirm' },
    //  { source: '/meeting/snap-flow?meetingId=${meetingData.id}', destination: '/web/meeting/snap-flow?meetingId=${meetingData.id}' },
      // Mypage Routes
      { source: '/profile', destination: '/web/Mypage/profile' },
      { source: '/Mypage/profile', destination: '/web/Mypage/profile' },
      { source: '/Mypage/settings', destination: '/web/Mypage/settings' },
      
      // Post Routes (Dynamic)
      { source: '/post/:path*', destination: '/web/post/:path*' },
      
      // Payment Routes
      { source: '/payment/test', destination: '/web/payment/test' },
      { source: '/payment/success', destination: '/web/payment/success' },
      { source: '/payment/fail', destination: '/web/payment/fail' },
      
      // Lifestyle
      { source: '/lifestyle', destination: '/web/lifestyle' },
      
      // Note: Admin routes (/admin/*) are handled by middleware.ts
      // They rewrite to /(dashboard)/* which is a Next.js route group
      // Route groups use parentheses for folder organization only
    ]
  }
}

export default nextConfig
