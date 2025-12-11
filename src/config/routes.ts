// Custom routing configuration
export const customRoutes = {
  // ==========================================
  // WEB ROUTES (Clean URLs → /web/...)
  // ==========================================
  
  // Root & Core Pages
  '/': '/web/home',
  '/home': '/web/home',
  '/login': '/web/login',
  '/search': '/web/search',
  '/chat': '/web/chat',
  '/club-chat': '/web/club-chat',
  
  // Feed Routes
  '/feed': '/web/feed',
  '/feed/create': '/web/feed/create',
  '/feed/feed-detail': '/web/feed/feed-detail',
  '/feed/item-detail': '/web/feed/item-detail',
  '/feed/item-detail-host': '/web/feed/item-detail-host',
  '/feed/post-detail': '/web/feed/post-detail',
  '/feed/post-detail-social': '/web/feed/post-detail-social',
  '/feed/trending-feeds/lifestyle': '/web/feed/trending-feeds/lifestyle',
  
  // Meeting Routes
  '/meeting/add-meeting': '/web/meeting/add-meeting',
  '/meeting/host-meeting-detail': '/web/meeting/host-meeting-detail',
  '/meeting/item-detail': '/web/meeting/item-detail',
  '/meeting/item-detail-host': '/web/meeting/item-detail-host',
  '/meeting/join-meeting-confirm': '/web/meeting/join-meeting-confirm',
  '/meeting/cancel-meeting-confirm': '/web/meeting/cancel-meeting-confirm',
  
  // Mypage Routes
  '/profile': '/web/Mypage/profile',
  '/Mypage/profile': '/web/Mypage/profile',
  '/Mypage/settings': '/web/Mypage/settings',
  
  // Post Routes (Dynamic)
  '/post': '/web/post',
  
  // Lifestyle
  '/lifestyle': '/web/lifestyle',
  
  // ==========================================
  // ADMIN ROUTES (Clean URLs → /(dashboard)/...)
  // ==========================================
  '/admin/home': '/(dashboard)/home',
  '/admin/about': '/(dashboard)/about',
  '/admin/analytics': '/(dashboard)/analytics',
  '/admin/content-management': '/(dashboard)/content-management',
  '/admin/coupon-management': '/(dashboard)/coupon-management',
  '/admin/dashboard-overview': '/(dashboard)/dashboard-overview',
  '/admin/data-export': '/(dashboard)/data-export',
  '/admin/host-management': '/(dashboard)/host-management',
  '/admin/language': '/(dashboard)/language',
  '/admin/logs': '/(dashboard)/logs',
  '/admin/meetings': '/(dashboard)/meetings',
  '/admin/message-management': '/(dashboard)/message-management',
  '/admin/payments': '/(dashboard)/payments',
  '/admin/security-settings': '/(dashboard)/security-settings',
  '/admin/server-monitoring': '/(dashboard)/server-monitoring',
  '/admin/user-management': '/(dashboard)/user-management',
  '/admin/admin-settings': '/(dashboard)/admin-settings',
}

// Reverse mapping for internal redirects
export const reverseRoutes = {
  // ==========================================
  // WEB REVERSE ROUTES (/web/... → Clean URLs)
  // ==========================================
  
  // Root & Core Pages
  '/web/home': '/home',
  '/web/login': '/login',
  '/web/search': '/search',
  '/web/chat': '/chat',
  '/web/club-chat': '/club-chat',
  
  // Feed Reverse Routes
  '/web/feed': '/feed',
  '/web/feed/create': '/feed/create',
  '/web/feed/feed-detail': '/feed/feed-detail',
  '/web/feed/item-detail': '/feed/item-detail',
  '/web/feed/item-detail-host': '/feed/item-detail-host',
  '/web/feed/post-detail': '/feed/post-detail',
  '/web/feed/post-detail-social': '/feed/post-detail-social',
  '/web/feed/trending-feeds/lifestyle': '/feed/trending-feeds/lifestyle',
  
  // Meeting Reverse Routes
  '/web/meeting/add-meeting': '/meeting/add-meeting',
  '/web/meeting/host-meeting-detail': '/meeting/host-meeting-detail',
  '/web/meeting/item-detail': '/meeting/item-detail',
  '/web/meeting/item-detail-host': '/meeting/item-detail-host',
  '/web/meeting/join-meeting-confirm': '/meeting/join-meeting-confirm',
  '/web/meeting/cancel-meeting-confirm': '/meeting/cancel-meeting-confirm',
  
  // Mypage Reverse Routes
  '/web/Mypage/profile': '/profile',
  '/web/Mypage/settings': '/Mypage/settings',
  
  // Post Reverse Routes
  '/web/post': '/post',
  
  // Lifestyle
  '/web/lifestyle': '/lifestyle',
  
  // ==========================================
  // ADMIN REVERSE ROUTES (/(dashboard)/... → Clean URLs)
  // ==========================================
  '/(dashboard)/home': '/admin/home',
  '/(dashboard)/about': '/admin/about',
  '/(dashboard)/analytics': '/admin/analytics',
  '/(dashboard)/content-management': '/admin/content-management',
  '/(dashboard)/coupon-management': '/admin/coupon-management',
  '/(dashboard)/dashboard-overview': '/admin/dashboard-overview',
  '/(dashboard)/data-export': '/admin/data-export',
  '/(dashboard)/host-management': '/admin/host-management',
  '/(dashboard)/language': '/admin/language',
  '/(dashboard)/logs': '/admin/logs',
  '/(dashboard)/meetings': '/admin/meetings',
  '/(dashboard)/message-management': '/admin/message-management',
  '/(dashboard)/payments': '/admin/payments',
  '/(dashboard)/security-settings': '/admin/security-settings',
  '/(dashboard)/server-monitoring': '/admin/server-monitoring',
  '/(dashboard)/user-management': '/admin/user-management',
  '/(dashboard)/admin-settings': '/admin/admin-settings',
}

// Get the actual route for a custom route
export function getActualRoute(customRoute: string): string {
  return customRoutes[customRoute as keyof typeof customRoutes] || customRoute
}

// Get the custom route for an actual route
export function getCustomRoute(actualRoute: string): string {
  return reverseRoutes[actualRoute as keyof typeof reverseRoutes] || actualRoute
}

// Check if a route is a custom route
export function isCustomRoute(route: string): boolean {
  return route in customRoutes
}

// Check if a route is a web route that needs custom handling
export function isWebRoute(route: string): boolean {
  return route.startsWith('/web/')
}

// Check if a route is an admin route that needs custom handling
export function isAdminRoute(route: string): boolean {
  return route.startsWith('/(dashboard)/')
}
